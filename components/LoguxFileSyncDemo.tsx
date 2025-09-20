/**
 * Logux File Sync Demonstration Component
 * Shows integration with existing Etherith ecosystem
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoguxFileSync from './LoguxFileSync';
import { useLoguxFileSync } from '../hooks/useLoguxFileSync';
import { LocalStorage } from '../utils/storage';

interface LoguxFileSyncDemoProps {
  userId: string;
  userName: string;
  className?: string;
}

export default function LoguxFileSyncDemo({
  userId,
  userName,
  className = ''
}: LoguxFileSyncDemoProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'complete' | 'error'>('idle');

  const {
    files,
    conflicts,
    isOnline,
    syncStatus,
    createFile,
    exportFiles,
    importFiles
  } = useLoguxFileSync({
    userId,
    autoSync: isEnabled
  });

  // Migrate existing memories to shared files
  const handleMigrateMemories = async () => {
    setMigrationStatus('migrating');

    try {
      const memories = LocalStorage.getAllMemories();
      const publicMemories = memories.filter(m => m.visibility === 'public');

      for (const memory of publicMemories) {
        const permissions = {
          owner: userId,
          readers: [],
          writers: [],
          public: true,
          accessLevel: 'read' as const
        };

        const fileName = `${memory.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        const content = `# ${memory.title}\n\n${memory.content}\n\n---\n\n${memory.memoryNote}`;

        await createFile(fileName, content, 'text/markdown', permissions);
      }

      setMigrationStatus('complete');
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStatus('error');
    }
  };

  // Demo file creation
  const createDemoFiles = async () => {
    const demoFiles = [
      {
        name: 'Welcome.md',
        content: `# Welcome to Logux File Sync

This is a demonstration of real-time collaborative file sharing using Logux architecture.

## Features

- **Real-time synchronization**: Changes appear instantly across all connected users
- **Conflict resolution**: Automatic handling of simultaneous edits
- **Offline support**: Work offline and sync when reconnected
- **Version control**: Track file changes and maintain history
- **Collaboration**: See who's viewing and editing files in real-time

## Getting Started

1. Create a new file using the "Create File" button
2. Edit files and see changes sync across all users
3. Try editing the same file from multiple browsers to see conflict resolution
4. Go offline and make changes to test offline support

Happy collaborating!`,
        mimeType: 'text/markdown'
      },
      {
        name: 'Project_Notes.txt',
        content: `Project Development Notes
========================

## Phase 1: Architecture Design
- Logux action schemas defined ✓
- File synchronization engine implemented ✓
- React integration completed ✓

## Phase 2: User Interface
- File management components ✓
- Conflict resolution UI ✓
- Real-time collaboration indicators ✓

## Phase 3: Testing & Optimization
- Unit tests for core functionality
- Integration tests for sync protocol
- Performance optimization
- Security audit

## Future Enhancements
- Advanced merge algorithms
- File versioning with branches
- Rich text collaborative editing
- Mobile app support`,
        mimeType: 'text/plain'
      },
      {
        name: 'Shared_Todo.md',
        content: `# Shared Todo List

## Urgent Tasks
- [ ] Test conflict resolution in production
- [ ] Set up monitoring and alerting
- [ ] Create user documentation
- [ ] Performance optimization review

## In Progress
- [x] Implement file synchronization
- [x] Build user interface
- [x] Add real-time collaboration

## Completed
- [x] Design system architecture
- [x] Choose technology stack
- [x] Set up development environment

## Notes
Feel free to add your own tasks and check them off as you complete them.
This file demonstrates real-time collaborative editing!`,
        mimeType: 'text/markdown'
      }
    ];

    for (const file of demoFiles) {
      const permissions = {
        owner: userId,
        readers: [],
        writers: [],
        public: true,
        accessLevel: 'write' as const
      };

      try {
        await createFile(file.name, file.content, file.mimeType, permissions);
      } catch (error) {
        console.error(`Failed to create demo file ${file.name}:`, error);
      }
    }
  };

  // Handle feature toggle
  const handleToggleSync = () => {
    setIsEnabled(!isEnabled);
    if (!isEnabled && files.length === 0) {
      // Create demo files when enabling for the first time
      setTimeout(createDemoFiles, 1000);
    }
  };

  return (
    <div className={`logux-demo ${className}`}>
      {/* Demo Controls */}
      <div className="demo-controls">
        <div className="demo-header">
          <h2>Collaborative File Sharing</h2>
          <p>Powered by Logux peer-to-peer synchronization</p>
        </div>

        <div className="demo-status">
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Sync Status:</span>
              <span className={`status-value ${syncStatus}`}>
                {syncStatus === 'connected' && '🟢 Connected'}
                {syncStatus === 'disconnected' && '🔴 Offline'}
                {syncStatus === 'syncing' && '🟡 Syncing'}
                {syncStatus === 'error' && '🔴 Error'}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Files:</span>
              <span className="status-value">{files.length} shared</span>
            </div>

            <div className="status-item">
              <span className="status-label">Conflicts:</span>
              <span className={`status-value ${conflicts.length > 0 ? 'warning' : ''}`}>
                {conflicts.length > 0 ? `${conflicts.length} pending` : 'None'}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Network:</span>
              <span className={`status-value ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="demo-actions">
          <button
            className={`btn-toggle ${isEnabled ? 'enabled' : 'disabled'}`}
            onClick={handleToggleSync}
          >
            {isEnabled ? '🔗 File Sync Enabled' : '📎 Enable File Sync'}
          </button>

          {isEnabled && (
            <>
              <button
                className="btn-demo"
                onClick={() => setShowDemo(!showDemo)}
              >
                {showDemo ? 'Hide Demo' : 'Show Demo'}
              </button>

              <button
                className="btn-migrate"
                onClick={handleMigrateMemories}
                disabled={migrationStatus === 'migrating'}
              >
                {migrationStatus === 'migrating' ? 'Migrating...' :
                 migrationStatus === 'complete' ? 'Migration Complete' :
                 migrationStatus === 'error' ? 'Migration Failed' :
                 'Migrate Public Memories'}
              </button>
            </>
          )}
        </div>

        {/* Migration Status */}
        {migrationStatus !== 'idle' && (
          <div className={`migration-status ${migrationStatus}`}>
            {migrationStatus === 'migrating' && (
              <div className="migration-progress">
                <div className="progress-spinner">⟳</div>
                <span>Converting public memories to shared files...</span>
              </div>
            )}
            {migrationStatus === 'complete' && (
              <div className="migration-success">
                <span className="success-icon">✅</span>
                <span>Successfully migrated public memories to shared files!</span>
              </div>
            )}
            {migrationStatus === 'error' && (
              <div className="migration-error">
                <span className="error-icon">❌</span>
                <span>Migration failed. Please try again or contact support.</span>
              </div>
            )}
          </div>
        )}

        {/* Feature Overview */}
        {!isEnabled && (
          <div className="feature-overview">
            <h3>What is File Sync?</h3>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">🔄</div>
                <div className="feature-content">
                  <h4>Real-time Sync</h4>
                  <p>Changes appear instantly across all connected users</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">👥</div>
                <div className="feature-content">
                  <h4>Collaboration</h4>
                  <p>See who's viewing and editing files in real-time</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <div className="feature-content">
                  <h4>Offline Support</h4>
                  <p>Work offline and sync when reconnected</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🛡️</div>
                <div className="feature-content">
                  <h4>Conflict Resolution</h4>
                  <p>Intelligent handling of simultaneous edits</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Technical Details */}
        {isEnabled && (
          <div className="technical-details">
            <h3>How It Works</h3>
            <div className="tech-grid">
              <div className="tech-item">
                <strong>Logux Protocol:</strong>
                <span>Action-based synchronization with vector clocks</span>
              </div>
              <div className="tech-item">
                <strong>Storage:</strong>
                <span>IndexedDB for offline persistence</span>
              </div>
              <div className="tech-item">
                <strong>Network:</strong>
                <span>WebRTC peer-to-peer connections</span>
              </div>
              <div className="tech-item">
                <strong>Conflicts:</strong>
                <span>Three-way merge with user resolution</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Sync Interface */}
      <AnimatePresence>
        {isEnabled && showDemo && (
          <motion.div
            className="demo-interface"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LoguxFileSync
              userId={userId}
              className="demo-file-sync"
              showCollaboration={true}
              showConflicts={true}
              autoSync={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Usage Instructions */}
      {isEnabled && showDemo && (
        <div className="usage-instructions">
          <h3>Try It Out!</h3>
          <div className="instructions-grid">
            <div className="instruction-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Create a File</h4>
                <p>Click "Create File" to add a new shared document</p>
              </div>
            </div>

            <div className="instruction-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Edit in Real-time</h4>
                <p>Make changes and see them sync across all connected users</p>
              </div>
            </div>

            <div className="instruction-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Test Conflicts</h4>
                <p>Open the same file in multiple browsers and edit simultaneously</p>
              </div>
            </div>

            <div className="instruction-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h4>Go Offline</h4>
                <p>Disconnect your internet, make changes, then reconnect to see sync</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles for the demo component
const styles = `
.logux-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.demo-controls {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.demo-header {
  text-align: center;
  margin-bottom: 2rem;
}

.demo-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.demo-header p {
  margin: 0;
  color: #64748b;
  font-size: 1.125rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
}

.status-label {
  font-weight: 500;
  color: #475569;
}

.status-value {
  font-weight: 600;
}

.status-value.connected {
  color: #10b981;
}

.status-value.disconnected {
  color: #ef4444;
}

.status-value.syncing {
  color: #f59e0b;
}

.status-value.warning {
  color: #dc2626;
}

.demo-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.btn-toggle {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.125rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-toggle.disabled {
  background: #667eea;
  color: white;
}

.btn-toggle.enabled {
  background: #10b981;
  color: white;
}

.btn-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.btn-demo,
.btn-migrate {
  padding: 0.75rem 1.5rem;
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-demo:hover,
.btn-migrate:hover {
  background: #667eea;
  color: white;
  transform: translateY(-1px);
}

.btn-migrate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.migration-status {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.migration-status.migrating {
  background: #fef3c7;
  border: 2px solid #f59e0b;
}

.migration-status.complete {
  background: #d1fae5;
  border: 2px solid #10b981;
}

.migration-status.error {
  background: #fee2e2;
  border: 2px solid #ef4444;
}

.progress-spinner {
  animation: spin 1s linear infinite;
  font-size: 1.25rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.feature-overview,
.technical-details,
.usage-instructions {
  margin-top: 2rem;
}

.feature-overview h3,
.technical-details h3,
.usage-instructions h3 {
  margin: 0 0 1.5rem 0;
  text-align: center;
  color: #1e293b;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
}

.feature-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.feature-content h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
}

.feature-content p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.tech-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #f1f5f9;
  border-radius: 6px;
}

.tech-item strong {
  color: #1e293b;
}

.tech-item span {
  color: #64748b;
  font-size: 0.875rem;
}

.instructions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.instruction-step {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
  border-radius: 8px;
  border: 2px solid rgba(102, 126, 234, 0.2);
}

.step-number {
  width: 32px;
  height: 32px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
}

.step-content p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.demo-interface {
  overflow: hidden;
}

@media (max-width: 768px) {
  .logux-demo {
    padding: 1rem;
  }

  .demo-controls {
    padding: 1.5rem;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }

  .demo-actions {
    flex-direction: column;
    align-items: center;
  }

  .features-grid,
  .tech-grid,
  .instructions-grid {
    grid-template-columns: 1fr;
  }

  .feature-item,
  .instruction-step {
    flex-direction: column;
    text-align: center;
  }

  .feature-icon {
    align-self: center;
  }

  .step-number {
    align-self: center;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}