/**
 * React Hook for Logux File Synchronization
 * Provides React integration for the file sync engine
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LoguxFileSyncEngine } from '../utils/logux-file-sync';
import {
  SyncedFile,
  FileConflict,
  FilePermissions,
  ConflictResolution,
} from '../types/logux-file-sync';

// Mock Logux client for demonstration
interface LoguxClient {
  log: {
    add: (action: any, meta?: any) => Promise<void>;
    on: (filter: any, callback: (action: any, meta: any) => void) => void;
  };
  node: {
    id: string;
  };
  subscribe: (channel: string) => Promise<void>;
  unsubscribe: (channel: string) => Promise<void>;
}

export interface UseLoguxFileSyncOptions {
  userId: string;
  autoSync?: boolean;
  syncInterval?: number;
  offlineSupport?: boolean;
}

export interface UseLoguxFileSyncReturn {
  // File operations
  files: SyncedFile[];
  publicFiles: SyncedFile[];
  userFiles: SyncedFile[];
  createFile: (name: string, content: string, mimeType: string, permissions: FilePermissions) => Promise<string>;
  updateFile: (fileId: string, content: string) => Promise<void>;
  deleteFile: (fileId: string, soft?: boolean) => Promise<void>;
  moveFile: (fileId: string, newPath: string) => Promise<void>;

  // File access
  getFile: (fileId: string) => SyncedFile | undefined;
  subscribeToFile: (fileId: string) => Promise<void>;
  unsubscribeFromFile: (fileId: string) => Promise<void>;

  // Conflict management
  conflicts: FileConflict[];
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => Promise<void>;

  // Sync status
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  syncStatus: 'connected' | 'disconnected' | 'syncing' | 'error';

  // Collaboration
  getFilePresence: (fileId: string) => any[];
  updatePresence: (fileId: string, status: 'viewing' | 'editing' | 'idle') => Promise<void>;

  // Utilities
  refreshSync: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  exportFiles: () => Promise<Blob>;
  importFiles: (data: File) => Promise<void>;
}

export function useLoguxFileSync(options: UseLoguxFileSyncOptions): UseLoguxFileSyncReturn {
  const { userId, autoSync = true, syncInterval = 30000, offlineSupport = true } = options;

  // State management
  const [files, setFiles] = useState<SyncedFile[]>([]);
  const [conflicts, setConflicts] = useState<FileConflict[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'syncing' | 'error'>('disconnected');

  // Refs for stable references
  const syncEngineRef = useRef<LoguxFileSyncEngine | null>(null);
  const clientRef = useRef<LoguxClient | null>(null);

  // Initialize Logux client and sync engine
  useEffect(() => {
    const initializeSync = async () => {
      try {
        // Create mock Logux client (replace with actual Logux client)
        const client: LoguxClient = {
          log: {
            add: async (action, meta) => {
              console.log('Logux action:', action, meta);
              // In real implementation, this would sync with Logux server
            },
            on: (filter, callback) => {
              console.log('Logux listener registered:', filter);
              // In real implementation, this would listen to Logux actions
            }
          },
          node: {
            id: `node_${userId}_${Date.now()}`
          },
          subscribe: async (channel) => {
            console.log('Subscribed to channel:', channel);
          },
          unsubscribe: async (channel) => {
            console.log('Unsubscribed from channel:', channel);
          }
        };

        clientRef.current = client;
        syncEngineRef.current = new LoguxFileSyncEngine(client, userId);

        setSyncStatus('connected');
        setLastSyncTime(Date.now());

        // Load initial files
        const initialFiles = syncEngineRef.current.getAllFiles();
        setFiles(initialFiles);

        const initialConflicts = syncEngineRef.current.getConflicts();
        setConflicts(initialConflicts);

      } catch (error) {
        console.error('Failed to initialize file sync:', error);
        setSyncStatus('error');
      }
    };

    initializeSync();

    return () => {
      // Cleanup
      syncEngineRef.current = null;
      clientRef.current = null;
    };
  }, [userId]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('connected');
      if (autoSync) {
        refreshSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync]);

  // Listen for file sync events
  useEffect(() => {
    const handleFileChange = (event: CustomEvent) => {
      const { changeType, file } = event.detail;

      setFiles(prevFiles => {
        const updatedFiles = [...prevFiles];
        const existingIndex = updatedFiles.findIndex(f => f.id === file.id);

        if (changeType === 'deleted' && !file.metadata.tags?.includes('deleted')) {
          // Remove permanently deleted files
          return updatedFiles.filter(f => f.id !== file.id);
        } else if (existingIndex >= 0) {
          // Update existing file
          updatedFiles[existingIndex] = file;
        } else {
          // Add new file
          updatedFiles.push(file);
        }

        return updatedFiles;
      });

      setLastSyncTime(Date.now());
    };

    const handleConflictDetected = (event: CustomEvent) => {
      const { conflict } = event.detail;
      setConflicts(prevConflicts => [...prevConflicts, conflict]);
    };

    const handleConflictResolved = (event: CustomEvent) => {
      const { conflict } = event.detail;
      setConflicts(prevConflicts =>
        prevConflicts.filter(c => c.id !== conflict.id)
      );
    };

    window.addEventListener('file-sync-change', handleFileChange as EventListener);
    window.addEventListener('file-sync-conflict', handleConflictDetected as EventListener);
    window.addEventListener('file-sync-conflict-resolved', handleConflictResolved as EventListener);

    return () => {
      window.removeEventListener('file-sync-change', handleFileChange as EventListener);
      window.removeEventListener('file-sync-conflict', handleConflictDetected as EventListener);
      window.removeEventListener('file-sync-conflict-resolved', handleConflictResolved as EventListener);
    };
  }, []);

  // Auto-sync interval
  useEffect(() => {
    if (!autoSync || !isOnline) return;

    const interval = setInterval(() => {
      refreshSync();
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, isOnline, syncInterval]);

  // File operations
  const createFile = useCallback(async (
    name: string,
    content: string,
    mimeType: string,
    permissions: FilePermissions
  ): Promise<string> => {
    if (!syncEngineRef.current) {
      throw new Error('Sync engine not initialized');
    }

    setIsSyncing(true);
    try {
      const fileId = await syncEngineRef.current.createFile(name, content, mimeType, permissions);
      setLastSyncTime(Date.now());
      return fileId;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const updateFile = useCallback(async (fileId: string, content: string): Promise<void> => {
    if (!syncEngineRef.current) {
      throw new Error('Sync engine not initialized');
    }

    setIsSyncing(true);
    try {
      await syncEngineRef.current.updateFile(fileId, content);
      setLastSyncTime(Date.now());
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string, soft: boolean = true): Promise<void> => {
    if (!syncEngineRef.current) {
      throw new Error('Sync engine not initialized');
    }

    setIsSyncing(true);
    try {
      await syncEngineRef.current.deleteFile(fileId, soft);
      setLastSyncTime(Date.now());
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const moveFile = useCallback(async (fileId: string, newPath: string): Promise<void> => {
    if (!syncEngineRef.current) {
      throw new Error('Sync engine not initialized');
    }

    setIsSyncing(true);
    try {
      await syncEngineRef.current.moveFile(fileId, newPath);
      setLastSyncTime(Date.now());
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // File access
  const getFile = useCallback((fileId: string): SyncedFile | undefined => {
    return syncEngineRef.current?.getFile(fileId);
  }, []);

  const subscribeToFile = useCallback(async (fileId: string): Promise<void> => {
    if (!syncEngineRef.current) return;
    await syncEngineRef.current.subscribeToFile(fileId);
  }, []);

  const unsubscribeFromFile = useCallback(async (fileId: string): Promise<void> => {
    if (!syncEngineRef.current) return;
    await syncEngineRef.current.unsubscribeFromFile(fileId);
  }, []);

  // Conflict resolution
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<void> => {
    if (!syncEngineRef.current) {
      throw new Error('Sync engine not initialized');
    }

    setIsSyncing(true);
    try {
      await syncEngineRef.current.resolveConflict(conflictId, resolution);
      setLastSyncTime(Date.now());
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Collaboration
  const getFilePresence = useCallback((fileId: string): any[] => {
    const file = syncEngineRef.current?.getFile(fileId);
    return file?.presence || [];
  }, []);

  const updatePresence = useCallback(async (
    fileId: string,
    status: 'viewing' | 'editing' | 'idle'
  ): Promise<void> => {
    if (!clientRef.current) return;

    const action = {
      type: 'file/presence',
      fileId,
      userId,
      status,
      lastActivity: Date.now(),
    };

    await clientRef.current.log.add(action, {
      channels: [`file:${fileId}`],
      reasons: [`file:${fileId}`],
    });
  }, [userId]);

  // Utilities
  const refreshSync = useCallback(async (): Promise<void> => {
    if (!syncEngineRef.current || !isOnline) return;

    setIsSyncing(true);
    try {
      // Force refresh of all files
      const allFiles = syncEngineRef.current.getAllFiles();
      setFiles(allFiles);

      const allConflicts = syncEngineRef.current.getConflicts();
      setConflicts(allConflicts);

      setLastSyncTime(Date.now());
      setSyncStatus('connected');
    } catch (error) {
      console.error('Sync refresh failed:', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  const clearOfflineData = useCallback(async (): Promise<void> => {
    if (!offlineSupport) return;

    try {
      // Clear IndexedDB data
      const databases = await indexedDB.databases();
      const etherithDbs = databases.filter(db =>
        db.name?.includes('EtherithFileSync')
      );

      for (const db of etherithDbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }

      setFiles([]);
      setConflicts([]);
      setLastSyncTime(0);
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }, [offlineSupport]);

  const exportFiles = useCallback(async (): Promise<Blob> => {
    const exportData = {
      files: files.map(file => ({
        ...file,
        locks: [], // Don't export locks
        presence: [], // Don't export presence
      })),
      exportTime: Date.now(),
      userId,
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  }, [files, userId]);

  const importFiles = useCallback(async (data: File): Promise<void> => {
    try {
      const text = await data.text();
      const importData = JSON.parse(text);

      if (!importData.files || !Array.isArray(importData.files)) {
        throw new Error('Invalid import data format');
      }

      // Import files through sync engine
      for (const fileData of importData.files) {
        if (syncEngineRef.current) {
          await syncEngineRef.current.createFile(
            fileData.name,
            fileData.content,
            fileData.metadata.mimeType || 'text/plain',
            fileData.permissions
          );
        }
      }

      await refreshSync();
    } catch (error) {
      console.error('Failed to import files:', error);
      throw error;
    }
  }, [refreshSync]);

  // Computed values
  const publicFiles = files.filter(file => file.permissions.public);
  const userFiles = files.filter(file =>
    file.permissions.owner === userId ||
    file.permissions.writers.includes(userId) ||
    file.permissions.readers.includes(userId)
  );

  return {
    // File operations
    files,
    publicFiles,
    userFiles,
    createFile,
    updateFile,
    deleteFile,
    moveFile,

    // File access
    getFile,
    subscribeToFile,
    unsubscribeFromFile,

    // Conflict management
    conflicts,
    resolveConflict,

    // Sync status
    isOnline,
    isSyncing,
    lastSyncTime,
    syncStatus,

    // Collaboration
    getFilePresence,
    updatePresence,

    // Utilities
    refreshSync,
    clearOfflineData,
    exportFiles,
    importFiles,
  };
}