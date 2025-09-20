/**
 * Logux File Synchronization Component
 * Provides UI for shared file management with real-time collaboration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoguxFileSync } from '../hooks/useLoguxFileSync';
import {
  SyncedFile,
  FileConflict,
  FilePermissions,
  ConflictResolution,
} from '../types/logux-file-sync';

interface LoguxFileSyncProps {
  userId: string;
  className?: string;
  showCollaboration?: boolean;
  showConflicts?: boolean;
  autoSync?: boolean;
}

export default function LoguxFileSync({
  userId,
  className = '',
  showCollaboration = true,
  showConflicts = true,
  autoSync = true,
}: LoguxFileSyncProps) {
  const {
    files,
    publicFiles,
    userFiles,
    conflicts,
    isOnline,
    isSyncing,
    lastSyncTime,
    syncStatus,
    createFile,
    updateFile,
    deleteFile,
    moveFile,
    getFile,
    getFilePresence,
    updatePresence,
    resolveConflict,
    refreshSync,
    exportFiles,
    importFiles,
  } = useLoguxFileSync({ userId, autoSync });

  // Local state
  const [view, setView] = useState<'all' | 'public' | 'mine' | 'conflicts'>('all');
  const [selectedFile, setSelectedFile] = useState<SyncedFile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [showPresence, setShowPresence] = useState(true);

  // Filter files based on current view
  const getFilteredFiles = useCallback((): SyncedFile[] => {
    let filteredFiles: SyncedFile[] = [];

    switch (view) {
      case 'all':
        filteredFiles = files;
        break;
      case 'public':
        filteredFiles = publicFiles;
        break;
      case 'mine':
        filteredFiles = userFiles;
        break;
      default:
        filteredFiles = files;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredFiles = filteredFiles.filter(file =>
        file.name.toLowerCase().includes(query) ||
        file.content.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query)
      );
    }

    // Sort by last modified
    return filteredFiles.sort((a, b) => b.metadata.lastModified - a.metadata.lastModified);
  }, [view, files, publicFiles, userFiles, searchQuery]);

  // Handle file creation
  const handleCreateFile = useCallback(async () => {
    if (!newFileName.trim()) return;

    const permissions: FilePermissions = {
      owner: userId,
      readers: [],
      writers: [],
      public: true, // Default to public for shared files
      accessLevel: 'write',
    };

    try {
      const fileId = await createFile(
        newFileName,
        newFileContent,
        'text/plain',
        permissions
      );

      setNewFileName('');
      setNewFileContent('');
      setIsCreating(false);

      // Select the newly created file
      const newFile = getFile(fileId);
      if (newFile) {
        setSelectedFile(newFile);
      }
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file. Please try again.');
    }
  }, [newFileName, newFileContent, userId, createFile, getFile]);

  // Handle file editing
  const handleEditFile = useCallback(async (fileId: string, content: string) => {
    try {
      await updateFile(fileId, content);
      setEditingFileId(null);
    } catch (error) {
      console.error('Failed to update file:', error);
      alert('Failed to update file. Please try again.');
    }
  }, [updateFile]);

  // Handle conflict resolution
  const handleResolveConflict = useCallback(async (
    conflict: FileConflict,
    resolution: ConflictResolution
  ) => {
    try {
      await resolveConflict(conflict.id, resolution);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      alert('Failed to resolve conflict. Please try again.');
    }
  }, [resolveConflict]);

  // Update presence when viewing/editing files
  useEffect(() => {
    if (selectedFile) {
      updatePresence(selectedFile.id, editingFileId === selectedFile.id ? 'editing' : 'viewing');
    }
  }, [selectedFile, editingFileId, updatePresence]);

  // File export/import handlers
  const handleExport = useCallback(async () => {
    try {
      const blob = await exportFiles();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etherith-files-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export files:', error);
      alert('Failed to export files.');
    }
  }, [exportFiles]);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importFiles(file).catch(error => {
        console.error('Failed to import files:', error);
        alert('Failed to import files.');
      });
    }
  }, [importFiles]);

  const filteredFiles = getFilteredFiles();

  return (
    <div className={`logux-file-sync ${className}`}>
      {/* Header */}
      <div className="sync-header">
        <div className="header-title">
          <h2>Shared Files</h2>
          <div className="sync-status">
            <div className={`status-indicator ${syncStatus}`}>
              <span className="status-dot" />
              <span className="status-text">
                {isSyncing ? 'Syncing...' :
                 isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            {lastSyncTime > 0 && (
              <span className="last-sync">
                Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="header-controls">
          <button
            className="btn-refresh"
            onClick={refreshSync}
            disabled={isSyncing}
            title="Refresh sync"
          >
            <span className={`refresh-icon ${isSyncing ? 'spinning' : ''}`}>🔄</span>
          </button>

          <button
            className="btn-create"
            onClick={() => setIsCreating(true)}
            title="Create new file"
          >
            <span className="create-icon">📄</span>
            Create File
          </button>

          <div className="import-export">
            <button
              className="btn-export"
              onClick={handleExport}
              title="Export files"
            >
              <span className="export-icon">📤</span>
              Export
            </button>

            <label className="btn-import" title="Import files">
              <span className="import-icon">📥</span>
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sync-nav">
        <button
          className={`nav-tab ${view === 'all' ? 'active' : ''}`}
          onClick={() => setView('all')}
        >
          All Files ({files.length})
        </button>
        <button
          className={`nav-tab ${view === 'public' ? 'active' : ''}`}
          onClick={() => setView('public')}
        >
          Public ({publicFiles.length})
        </button>
        <button
          className={`nav-tab ${view === 'mine' ? 'active' : ''}`}
          onClick={() => setView('mine')}
        >
          My Files ({userFiles.length})
        </button>
        {showConflicts && conflicts.length > 0 && (
          <button
            className={`nav-tab conflicts ${view === 'conflicts' ? 'active' : ''}`}
            onClick={() => setView('conflicts')}
          >
            Conflicts ({conflicts.length})
          </button>
        )}
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>

      {/* Main Content */}
      <div className="sync-content">
        {/* File List */}
        <div className="file-list">
          {view === 'conflicts' ? (
            <ConflictsList
              conflicts={conflicts}
              onResolveConflict={handleResolveConflict}
              getFile={getFile}
            />
          ) : (
            <FilesList
              files={filteredFiles}
              selectedFile={selectedFile}
              editingFileId={editingFileId}
              onSelectFile={setSelectedFile}
              onEditFile={setEditingFileId}
              onUpdateFile={handleEditFile}
              onDeleteFile={deleteFile}
              onMoveFile={moveFile}
              getFilePresence={getFilePresence}
              showPresence={showPresence && showCollaboration}
              currentUserId={userId}
            />
          )}
        </div>

        {/* File Detail Panel */}
        {selectedFile && view !== 'conflicts' && (
          <div className="file-detail">
            <FileDetailPanel
              file={selectedFile}
              isEditing={editingFileId === selectedFile.id}
              onStartEdit={() => setEditingFileId(selectedFile.id)}
              onSaveEdit={(content) => handleEditFile(selectedFile.id, content)}
              onCancelEdit={() => setEditingFileId(null)}
              presence={getFilePresence(selectedFile.id)}
              showPresence={showPresence && showCollaboration}
              currentUserId={userId}
            />
          </div>
        )}
      </div>

      {/* Create File Modal */}
      <AnimatePresence>
        {isCreating && (
          <CreateFileModal
            fileName={newFileName}
            fileContent={newFileContent}
            onFileNameChange={setNewFileName}
            onFileContentChange={setNewFileContent}
            onCreateFile={handleCreateFile}
            onCancel={() => {
              setIsCreating(false);
              setNewFileName('');
              setNewFileContent('');
            }}
          />
        )}
      </AnimatePresence>

      {/* Presence Toggle */}
      {showCollaboration && (
        <div className="presence-controls">
          <label className="presence-toggle">
            <input
              type="checkbox"
              checked={showPresence}
              onChange={(e) => setShowPresence(e.target.checked)}
            />
            Show collaboration indicators
          </label>
        </div>
      )}
    </div>
  );
}

// File List Component
interface FilesListProps {
  files: SyncedFile[];
  selectedFile: SyncedFile | null;
  editingFileId: string | null;
  onSelectFile: (file: SyncedFile) => void;
  onEditFile: (fileId: string) => void;
  onUpdateFile: (fileId: string, content: string) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  onMoveFile: (fileId: string, newPath: string) => Promise<void>;
  getFilePresence: (fileId: string) => any[];
  showPresence: boolean;
  currentUserId: string;
}

function FilesList({
  files,
  selectedFile,
  editingFileId,
  onSelectFile,
  onEditFile,
  onUpdateFile,
  onDeleteFile,
  onMoveFile,
  getFilePresence,
  showPresence,
  currentUserId,
}: FilesListProps) {
  return (
    <div className="files-grid">
      {files.map((file) => {
        const presence = showPresence ? getFilePresence(file.id) : [];
        const isSelected = selectedFile?.id === file.id;
        const isEditing = editingFileId === file.id;

        return (
          <motion.div
            key={file.id}
            className={`file-card ${isSelected ? 'selected' : ''} ${file.syncStatus}`}
            onClick={() => onSelectFile(file)}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* File Status */}
            <div className="file-status">
              <span className={`status-badge ${file.syncStatus}`}>
                {file.syncStatus === 'synced' ? '✅' :
                 file.syncStatus === 'conflict' ? '⚠️' :
                 file.syncStatus === 'pending' ? '🔄' : '📴'}
              </span>
              {file.permissions.public && (
                <span className="public-badge" title="Public file">🌐</span>
              )}
            </div>

            {/* File Info */}
            <div className="file-info">
              <h3 className="file-name">{file.name}</h3>
              <p className="file-path">{file.path}</p>
              <div className="file-meta">
                <span className="file-size">
                  {formatFileSize(file.metadata.size)}
                </span>
                <span className="file-modified">
                  {formatDate(file.metadata.lastModified)}
                </span>
              </div>
            </div>

            {/* Presence Indicators */}
            {showPresence && presence.length > 0 && (
              <div className="presence-indicators">
                {presence.slice(0, 3).map((user) => (
                  <div
                    key={user.userId}
                    className={`presence-indicator ${user.status}`}
                    title={`${user.userName} (${user.status})`}
                  >
                    {user.userName.charAt(0).toUpperCase()}
                  </div>
                ))}
                {presence.length > 3 && (
                  <div className="presence-more">+{presence.length - 3}</div>
                )}
              </div>
            )}

            {/* File Actions */}
            <div className="file-actions">
              {file.permissions.owner === currentUserId && (
                <>
                  <button
                    className="action-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditFile(file.id);
                    }}
                    title="Edit file"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this file?')) {
                        onDeleteFile(file.id);
                      }
                    }}
                    title="Delete file"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>

            {/* Locks */}
            {file.locks.length > 0 && (
              <div className="file-locks">
                <span className="lock-icon" title="File is locked">🔒</span>
              </div>
            )}
          </motion.div>
        );
      })}

      {files.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No files found</h3>
          <p>Create a new file to get started with collaboration.</p>
        </div>
      )}
    </div>
  );
}

// File Detail Panel Component
interface FileDetailPanelProps {
  file: SyncedFile;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (content: string) => Promise<void>;
  onCancelEdit: () => void;
  presence: any[];
  showPresence: boolean;
  currentUserId: string;
}

function FileDetailPanel({
  file,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  presence,
  showPresence,
  currentUserId,
}: FileDetailPanelProps) {
  const [editContent, setEditContent] = useState(file.content);

  useEffect(() => {
    setEditContent(file.content);
  }, [file.content]);

  const handleSave = async () => {
    await onSaveEdit(editContent);
  };

  const canEdit = file.permissions.owner === currentUserId ||
                  file.permissions.writers.includes(currentUserId);

  return (
    <div className="file-detail-panel">
      {/* File Header */}
      <div className="detail-header">
        <h3>{file.name}</h3>
        <div className="detail-actions">
          {canEdit && !isEditing && (
            <button className="btn-edit" onClick={onStartEdit}>
              Edit
            </button>
          )}
          {isEditing && (
            <>
              <button className="btn-save" onClick={handleSave}>
                Save
              </button>
              <button className="btn-cancel" onClick={onCancelEdit}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Presence */}
      {showPresence && presence.length > 0 && (
        <div className="detail-presence">
          <h4>Currently viewing:</h4>
          <div className="presence-list">
            {presence.map((user) => (
              <div key={user.userId} className={`presence-user ${user.status}`}>
                <span className="user-avatar">{user.userName.charAt(0)}</span>
                <span className="user-name">{user.userName}</span>
                <span className="user-status">{user.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Content */}
      <div className="detail-content">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="content-editor"
            rows={20}
          />
        ) : (
          <pre className="content-viewer">{file.content}</pre>
        )}
      </div>

      {/* File Metadata */}
      <div className="detail-metadata">
        <h4>File Information</h4>
        <div className="metadata-grid">
          <div className="metadata-item">
            <span className="label">Size:</span>
            <span className="value">{formatFileSize(file.metadata.size)}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Created:</span>
            <span className="value">{formatDate(file.metadata.created)}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Modified:</span>
            <span className="value">{formatDate(file.metadata.lastModified)}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Version:</span>
            <span className="value">{file.version}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Sync Status:</span>
            <span className={`value status-${file.syncStatus}`}>{file.syncStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Conflicts List Component
interface ConflictsListProps {
  conflicts: FileConflict[];
  onResolveConflict: (conflict: FileConflict, resolution: ConflictResolution) => Promise<void>;
  getFile: (fileId: string) => SyncedFile | undefined;
}

function ConflictsList({ conflicts, onResolveConflict, getFile }: ConflictsListProps) {
  const handleResolve = async (conflict: FileConflict, selectedVersion: string) => {
    const version = conflict.conflictingVersions.find(v => v.version === selectedVersion);
    if (!version) return;

    const resolution: ConflictResolution = {
      type: 'manual',
      resolvedContent: version.content,
      resolvedBy: 'current-user',
      timestamp: Date.now(),
    };

    await onResolveConflict(conflict, resolution);
  };

  return (
    <div className="conflicts-list">
      {conflicts.map((conflict) => {
        const file = getFile(conflict.fileId);

        return (
          <motion.div
            key={conflict.id}
            className="conflict-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="conflict-header">
              <h3>Conflict in: {file?.name || conflict.fileId}</h3>
              <span className="conflict-time">
                {formatDate(conflict.created)}
              </span>
            </div>

            <div className="conflict-versions">
              {conflict.conflictingVersions.map((version, index) => (
                <div key={version.version} className="version-option">
                  <div className="version-header">
                    <h4>Version {index + 1}</h4>
                    <div className="version-meta">
                      <span className="author">by {version.authorId}</span>
                      <span className="time">{formatDate(version.timestamp)}</span>
                    </div>
                  </div>

                  <div className="version-content">
                    <pre>{version.content.substring(0, 200)}...</pre>
                  </div>

                  <button
                    className="btn-use-version"
                    onClick={() => handleResolve(conflict, version.version)}
                  >
                    Use This Version
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {conflicts.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h3>No conflicts</h3>
          <p>All files are synchronized without conflicts.</p>
        </div>
      )}
    </div>
  );
}

// Create File Modal Component
interface CreateFileModalProps {
  fileName: string;
  fileContent: string;
  onFileNameChange: (name: string) => void;
  onFileContentChange: (content: string) => void;
  onCreateFile: () => Promise<void>;
  onCancel: () => void;
}

function CreateFileModal({
  fileName,
  fileContent,
  onFileNameChange,
  onFileContentChange,
  onCreateFile,
  onCancel,
}: CreateFileModalProps) {
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="modal-content create-file-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Create New File</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="fileName">File Name:</label>
            <input
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => onFileNameChange(e.target.value)}
              placeholder="my-file.txt"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="fileContent">Content:</label>
            <textarea
              id="fileContent"
              value={fileContent}
              onChange={(e) => onFileContentChange(e.target.value)}
              placeholder="Enter file content..."
              rows={10}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-create"
            onClick={onCreateFile}
            disabled={!fileName.trim()}
          >
            Create File
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Utility functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}