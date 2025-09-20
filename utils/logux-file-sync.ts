/**
 * Logux File Synchronization Engine
 * Implements peer-to-peer file synchronization using Logux actions
 */

import {
  FileAction,
  SyncedFile,
  FileConflict,
  VectorClock,
  LoguxFileMeta,
  FilePermissions,
  FileMetadata,
  FileDiff,
  ConflictResolution,
  FileChannel
} from '../types/logux-file-sync';

// Simplified Logux client interface for demonstration
interface LoguxClient {
  log: {
    add: (action: FileAction, meta?: Partial<LoguxFileMeta>) => Promise<void>;
    on: (filter: any, callback: (action: FileAction, meta: LoguxFileMeta) => void) => void;
  };
  node: {
    id: string;
  };
  subscribe: (channel: FileChannel) => Promise<void>;
  unsubscribe: (channel: FileChannel) => Promise<void>;
}

export class LoguxFileSyncEngine {
  private client: LoguxClient;
  private files: Map<string, SyncedFile> = new Map();
  private conflicts: Map<string, FileConflict> = new Map();
  private vectorClock: VectorClock;
  private subscribedChannels: Set<FileChannel> = new Set();
  private storage: IDBDatabase | null = null;
  private userId: string;

  constructor(client: LoguxClient, userId: string) {
    this.client = client;
    this.userId = userId;
    this.vectorClock = {
      nodeId: client.node.id,
      clocks: {}
    };

    this.initializeStorage();
    this.setupActionHandlers();
    this.startSyncProcess();
  }

  // ===== INITIALIZATION =====

  private async initializeStorage(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EtherithFileSync', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.storage = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Files store
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('path', 'path', { unique: false });
          filesStore.createIndex('hash', 'hash', { unique: false });
          filesStore.createIndex('lastSyncTime', 'lastSyncTime', { unique: false });
        }

        // Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictsStore.createIndex('fileId', 'fileId', { unique: false });
          conflictsStore.createIndex('status', 'status', { unique: false });
        }

        // Vector clocks store
        if (!db.objectStoreNames.contains('vectorClocks')) {
          db.createObjectStore('vectorClocks', { keyPath: 'nodeId' });
        }
      };
    });
  }

  private setupActionHandlers(): void {
    // File creation
    this.client.log.on({ type: 'file/create' }, (action, meta) => {
      this.handleFileCreate(action as any, meta);
    });

    // File updates
    this.client.log.on({ type: 'file/update' }, (action, meta) => {
      this.handleFileUpdate(action as any, meta);
    });

    // File deletion
    this.client.log.on({ type: 'file/delete' }, (action, meta) => {
      this.handleFileDelete(action as any, meta);
    });

    // File moves
    this.client.log.on({ type: 'file/move' }, (action, meta) => {
      this.handleFileMove(action as any, meta);
    });

    // Permission changes
    this.client.log.on({ type: 'file/permission' }, (action, meta) => {
      this.handleFilePermission(action as any, meta);
    });

    // Conflict resolution
    this.client.log.on({ type: 'file/conflict' }, (action, meta) => {
      this.handleFileConflict(action as any, meta);
    });

    // Locks and presence
    this.client.log.on({ type: 'file/lock' }, (action, meta) => {
      this.handleFileLock(action as any, meta);
    });

    this.client.log.on({ type: 'file/unlock' }, (action, meta) => {
      this.handleFileUnlock(action as any, meta);
    });

    this.client.log.on({ type: 'file/presence' }, (action, meta) => {
      this.handleFilePresence(action as any, meta);
    });
  }

  private async startSyncProcess(): Promise<void> {
    // Load existing files from storage
    await this.loadFilesFromStorage();

    // Subscribe to essential channels
    await this.subscribeToUserFiles();
    await this.subscribeToPublicFiles();

    // Start periodic sync
    setInterval(() => this.performPeriodicSync(), 30000); // Every 30 seconds
  }

  // ===== PUBLIC API =====

  async createFile(
    fileName: string,
    content: string,
    mimeType: string,
    permissions: FilePermissions,
    parentDirectory?: string
  ): Promise<string> {
    const fileId = this.generateFileId();
    const hash = await this.calculateHash(content);

    const metadata: FileMetadata = {
      size: content.length,
      hash,
      encoding: 'utf-8',
      created: Date.now(),
      lastModified: Date.now(),
      tags: [],
    };

    const action = {
      type: 'file/create' as const,
      fileId,
      fileName,
      content,
      mimeType,
      permissions,
      metadata,
      authorId: this.userId,
      parentDirectory,
    };

    await this.client.log.add(action, {
      channels: [`file:${fileId}`, `user:${this.userId}:files`],
      reasons: [`file:${fileId}`],
    });

    return fileId;
  }

  async updateFile(
    fileId: string,
    content: string,
    reason: 'edit' | 'auto-save' | 'conflict-resolution' = 'edit'
  ): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) throw new Error(`File ${fileId} not found`);

    // Check permissions
    if (!this.canWriteFile(file, this.userId)) {
      throw new Error('Insufficient permissions to edit file');
    }

    // Calculate diff
    const diff = this.calculateDiff(file.content, content);
    const newHash = await this.calculateHash(content);
    const newVersion = this.generateVersion();

    const action = {
      type: 'file/update' as const,
      fileId,
      content,
      version: newVersion,
      diff,
      reason,
      authorId: this.userId,
    };

    await this.client.log.add(action, {
      channels: [`file:${fileId}`],
      reasons: [`file:${fileId}`],
      fileHash: newHash,
      parentVersion: file.version,
      vectorClock: this.updateVectorClock(),
    });
  }

  async deleteFile(fileId: string, soft: boolean = true): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) throw new Error(`File ${fileId} not found`);

    if (!this.canWriteFile(file, this.userId)) {
      throw new Error('Insufficient permissions to delete file');
    }

    const action = {
      type: 'file/delete' as const,
      fileId,
      soft,
      authorId: this.userId,
    };

    await this.client.log.add(action, {
      channels: [`file:${fileId}`],
      reasons: [`file:${fileId}`],
    });
  }

  async moveFile(fileId: string, newPath: string): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) throw new Error(`File ${fileId} not found`);

    if (!this.canWriteFile(file, this.userId)) {
      throw new Error('Insufficient permissions to move file');
    }

    const action = {
      type: 'file/move' as const,
      fileId,
      fromPath: file.path,
      toPath: newPath,
      authorId: this.userId,
    };

    await this.client.log.add(action, {
      channels: [`file:${fileId}`],
      reasons: [`file:${fileId}`],
    });
  }

  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) throw new Error(`Conflict ${conflictId} not found`);

    const action = {
      type: 'file/conflict' as const,
      fileId: conflict.fileId,
      conflictId,
      conflictingVersions: conflict.conflictingVersions.map(v => v.version),
      resolution: resolution.type === 'merge' ? 'manual' : resolution.type,
      mergedContent: resolution.resolvedContent,
      authorId: this.userId,
    };

    await this.client.log.add(action, {
      channels: [`file:${conflict.fileId}`],
      reasons: [`file:${conflict.fileId}`],
    });
  }

  // ===== ACTION HANDLERS =====

  private async handleFileCreate(action: any, meta: LoguxFileMeta): Promise<void> {
    const file: SyncedFile = {
      id: action.fileId,
      name: action.fileName,
      path: this.buildFilePath(action.fileName, action.parentDirectory),
      content: action.content,
      version: this.generateVersion(),
      hash: action.metadata.hash,
      permissions: action.permissions,
      metadata: action.metadata,
      syncStatus: 'synced',
      lastSyncTime: meta.time,
      vectorClock: meta.vectorClock || {},
      locks: [],
      presence: [],
    };

    this.files.set(action.fileId, file);
    await this.saveFileToStorage(file);
    this.updateVectorClockFromMeta(meta);

    this.notifyFileChange('created', file);
  }

  private async handleFileUpdate(action: any, meta: LoguxFileMeta): Promise<void> {
    const file = this.files.get(action.fileId);
    if (!file) {
      console.warn(`Received update for unknown file: ${action.fileId}`);
      return;
    }

    // Check for conflicts
    if (this.detectConflict(file, action, meta)) {
      await this.handleConflict(file, action, meta);
      return;
    }

    // Apply update
    file.content = action.content;
    file.version = action.version;
    file.hash = meta.fileHash || await this.calculateHash(action.content);
    file.metadata.lastModified = meta.time;
    file.lastSyncTime = meta.time;
    file.vectorClock = meta.vectorClock || file.vectorClock;
    file.syncStatus = 'synced';

    this.files.set(action.fileId, file);
    await this.saveFileToStorage(file);
    this.updateVectorClockFromMeta(meta);

    this.notifyFileChange('updated', file);
  }

  private async handleFileDelete(action: any, meta: LoguxFileMeta): Promise<void> {
    const file = this.files.get(action.fileId);
    if (!file) return;

    if (action.soft) {
      // Soft delete - mark as deleted but keep in storage
      file.metadata.tags = file.metadata.tags || [];
      if (!file.metadata.tags.includes('deleted')) {
        file.metadata.tags.push('deleted');
      }
      file.lastSyncTime = meta.time;
      await this.saveFileToStorage(file);
    } else {
      // Hard delete - remove completely
      this.files.delete(action.fileId);
      await this.removeFileFromStorage(action.fileId);
    }

    this.updateVectorClockFromMeta(meta);
    this.notifyFileChange('deleted', file);
  }

  private async handleFileMove(action: any, meta: LoguxFileMeta): Promise<void> {
    const file = this.files.get(action.fileId);
    if (!file) return;

    file.path = action.toPath;
    file.lastSyncTime = meta.time;
    file.syncStatus = 'synced';

    this.files.set(action.fileId, file);
    await this.saveFileToStorage(file);
    this.updateVectorClockFromMeta(meta);

    this.notifyFileChange('moved', file);
  }

  private async handleFilePermission(action: any, meta: LoguxFileMeta): Promise<void> {
    const file = this.files.get(action.fileId);
    if (!file) return;

    file.permissions = action.permissions;
    file.lastSyncTime = meta.time;

    this.files.set(action.fileId, file);
    await this.saveFileToStorage(file);
    this.updateVectorClockFromMeta(meta);

    this.notifyFileChange('permissions', file);
  }

  private async handleFileConflict(action: any, meta: LoguxFileMeta): Promise<void> {
    const conflict = this.conflicts.get(action.conflictId);
    if (!conflict) return;

    if (action.resolution && action.mergedContent) {
      // Apply conflict resolution
      const file = this.files.get(conflict.fileId);
      if (file) {
        file.content = action.mergedContent;
        file.version = this.generateVersion();
        file.hash = await this.calculateHash(action.mergedContent);
        file.syncStatus = 'synced';
        file.conflictVersions = undefined;
        file.lastSyncTime = meta.time;

        this.files.set(conflict.fileId, file);
        await this.saveFileToStorage(file);
      }

      // Mark conflict as resolved
      conflict.status = 'resolved';
      conflict.resolved = meta.time;
      conflict.resolution = {
        type: action.resolution,
        resolvedContent: action.mergedContent,
        resolvedBy: action.authorId,
        timestamp: meta.time,
      };

      await this.saveConflictToStorage(conflict);
      this.notifyConflictResolved(conflict);
    }
  }

  private async handleFileLock(action: any, meta: LoguxFileMeta): Promise<void> {
    const file = this.files.get(action.fileId);
    if (!file) return;

    const lock = {
      id: this.generateId(),
      userId: action.authorId,
      type: action.lockType,
      acquired: meta.time,
      expires: meta.time + action.duration,
    };

    file.locks.push(lock);
    await this.saveFileToStorage(file);

    this.notifyFileChange('locked', file);
  }

  private async handleFileUnlock(action: any, meta: LoguxFileMeta): Promise<void> {
    const file = this.files.get(action.fileId);
    if (!file) return;

    file.locks = file.locks.filter(lock =>
      lock.id !== action.lockId && lock.userId !== action.authorId
    );

    await this.saveFileToStorage(file);
    this.notifyFileChange('unlocked', file);
  }

  private async handleFilePresence(action: any, meta: LoguxFileMeta): Promise<void> {
    const file = this.files.get(action.fileId);
    if (!file) return;

    // Update or add user presence
    const existingPresence = file.presence.find(p => p.userId === action.userId);
    if (existingPresence) {
      existingPresence.status = action.status;
      existingPresence.lastActivity = action.lastActivity;
    } else {
      file.presence.push({
        userId: action.userId,
        userName: meta.userId, // This would come from user metadata
        status: action.status,
        lastActivity: action.lastActivity,
      });
    }

    // Clean up old presence data
    const now = Date.now();
    file.presence = file.presence.filter(p =>
      now - p.lastActivity < 300000 // 5 minutes
    );

    await this.saveFileToStorage(file);
    this.notifyFileChange('presence', file);
  }

  // ===== CONFLICT DETECTION AND RESOLUTION =====

  private detectConflict(file: SyncedFile, action: any, meta: LoguxFileMeta): boolean {
    // Check if this update conflicts with local state
    if (file.version !== meta.parentVersion) {
      return true;
    }

    // Check vector clocks for concurrent modifications
    if (meta.vectorClock && file.vectorClock) {
      return this.hasVectorClockConflict(file.vectorClock, meta.vectorClock);
    }

    return false;
  }

  private hasVectorClockConflict(
    localClock: Record<string, number>,
    remoteClock: Record<string, number>
  ): boolean {
    const allNodes = new Set([...Object.keys(localClock), ...Object.keys(remoteClock)]);

    let localGreater = false;
    let remoteGreater = false;

    for (const node of Array.from(allNodes)) {
      const localTime = localClock[node] || 0;
      const remoteTime = remoteClock[node] || 0;

      if (localTime > remoteTime) localGreater = true;
      if (remoteTime > localTime) remoteGreater = true;
    }

    return localGreater && remoteGreater; // Concurrent modifications
  }

  private async handleConflict(file: SyncedFile, action: any, meta: LoguxFileMeta): Promise<void> {
    const conflictId = this.generateId();

    const conflict: FileConflict = {
      id: conflictId,
      fileId: file.id,
      conflictingVersions: [
        {
          version: file.version,
          authorId: file.permissions.owner,
          content: file.content,
          timestamp: file.lastSyncTime,
          vectorClock: file.vectorClock,
        },
        {
          version: action.version,
          authorId: action.authorId,
          content: action.content,
          timestamp: meta.time,
          vectorClock: meta.vectorClock || {},
        }
      ],
      status: 'pending',
      created: Date.now(),
    };

    this.conflicts.set(conflictId, conflict);
    await this.saveConflictToStorage(conflict);

    // Mark file as conflicted
    file.syncStatus = 'conflict';
    file.conflictVersions = conflict.conflictingVersions.map(v => v.version);
    await this.saveFileToStorage(file);

    this.notifyConflictDetected(conflict);
  }

  // ===== UTILITY FUNCTIONS =====

  private updateVectorClock(): Record<string, number> {
    this.vectorClock.clocks[this.vectorClock.nodeId] =
      (this.vectorClock.clocks[this.vectorClock.nodeId] || 0) + 1;
    return { ...this.vectorClock.clocks };
  }

  private updateVectorClockFromMeta(meta: LoguxFileMeta): void {
    if (meta.vectorClock) {
      Object.keys(meta.vectorClock).forEach(nodeId => {
        this.vectorClock.clocks[nodeId] = Math.max(
          this.vectorClock.clocks[nodeId] || 0,
          meta.vectorClock![nodeId]
        );
      });
    }
  }

  private async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private calculateDiff(oldContent: string, newContent: string): FileDiff {
    // Simplified diff calculation - in real implementation use proper diff library
    return {
      type: 'text',
      operations: [{
        type: 'replace',
        position: 0,
        content: newContent,
        length: oldContent.length,
      }],
      oldHash: '',
      newHash: '',
    };
  }

  private canWriteFile(file: SyncedFile, userId: string): boolean {
    return file.permissions.owner === userId ||
           file.permissions.writers.includes(userId) ||
           (file.permissions.public && file.permissions.accessLevel === 'write');
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVersion(): string {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildFilePath(fileName: string, parentDirectory?: string): string {
    return parentDirectory ? `${parentDirectory}/${fileName}` : fileName;
  }

  // ===== STORAGE OPERATIONS =====

  private async saveFileToStorage(file: SyncedFile): Promise<void> {
    if (!this.storage) return;

    const transaction = this.storage.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    await store.put(file);
  }

  private async saveConflictToStorage(conflict: FileConflict): Promise<void> {
    if (!this.storage) return;

    const transaction = this.storage.transaction(['conflicts'], 'readwrite');
    const store = transaction.objectStore('conflicts');
    await store.put(conflict);
  }

  private async removeFileFromStorage(fileId: string): Promise<void> {
    if (!this.storage) return;

    const transaction = this.storage.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    await store.delete(fileId);
  }

  private async loadFilesFromStorage(): Promise<void> {
    if (!this.storage) return;

    const transaction = this.storage.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    const request = store.getAll();

    request.onsuccess = () => {
      const files = request.result as SyncedFile[];
      files.forEach(file => {
        this.files.set(file.id, file);
      });
    };
  }

  // ===== SUBSCRIPTION MANAGEMENT =====

  private async subscribeToUserFiles(): Promise<void> {
    const channel: FileChannel = `user:${this.userId}:files`;
    await this.client.subscribe(channel);
    this.subscribedChannels.add(channel);
  }

  private async subscribeToPublicFiles(): Promise<void> {
    const channel: FileChannel = 'public:files';
    await this.client.subscribe(channel);
    this.subscribedChannels.add(channel);
  }

  async subscribeToFile(fileId: string): Promise<void> {
    const channel: FileChannel = `file:${fileId}`;
    await this.client.subscribe(channel);
    this.subscribedChannels.add(channel);
  }

  async unsubscribeFromFile(fileId: string): Promise<void> {
    const channel: FileChannel = `file:${fileId}`;
    await this.client.unsubscribe(channel);
    this.subscribedChannels.delete(channel);
  }

  // ===== PERIODIC OPERATIONS =====

  private async performPeriodicSync(): Promise<void> {
    // Clean expired locks
    this.cleanExpiredLocks();

    // Update presence status
    await this.updatePresenceStatus();

    // Sync file changes with network
    await this.syncPendingChanges();
  }

  private cleanExpiredLocks(): void {
    const now = Date.now();
    this.files.forEach(file => {
      const initialLength = file.locks.length;
      file.locks = file.locks.filter(lock => lock.expires > now);

      if (file.locks.length !== initialLength) {
        this.saveFileToStorage(file);
        this.notifyFileChange('unlocked', file);
      }
    });
  }

  private async updatePresenceStatus(): Promise<void> {
    // Update presence for files user is currently viewing/editing
    // Implementation depends on UI state management
  }

  private async syncPendingChanges(): Promise<void> {
    // Sync any files with pending status
    const pendingFiles = Array.from(this.files.values())
      .filter(file => file.syncStatus === 'pending');

    for (const file of pendingFiles) {
      try {
        // Attempt to re-sync the file
        await this.resyncFile(file);
      } catch (error) {
        console.warn(`Failed to sync file ${file.id}:`, error);
      }
    }
  }

  private async resyncFile(file: SyncedFile): Promise<void> {
    // Implementation for re-syncing a file that failed to sync
    file.syncStatus = 'synced';
    await this.saveFileToStorage(file);
  }

  // ===== EVENT NOTIFICATIONS =====

  private notifyFileChange(changeType: string, file: SyncedFile): void {
    // Emit events for UI updates
    window.dispatchEvent(new CustomEvent('file-sync-change', {
      detail: { changeType, file }
    }));
  }

  private notifyConflictDetected(conflict: FileConflict): void {
    window.dispatchEvent(new CustomEvent('file-sync-conflict', {
      detail: { conflict }
    }));
  }

  private notifyConflictResolved(conflict: FileConflict): void {
    window.dispatchEvent(new CustomEvent('file-sync-conflict-resolved', {
      detail: { conflict }
    }));
  }

  // ===== PUBLIC GETTERS =====

  getFile(fileId: string): SyncedFile | undefined {
    return this.files.get(fileId);
  }

  getAllFiles(): SyncedFile[] {
    return Array.from(this.files.values());
  }

  getConflicts(): FileConflict[] {
    return Array.from(this.conflicts.values())
      .filter(conflict => conflict.status === 'pending');
  }

  getUserFiles(userId: string): SyncedFile[] {
    return this.getAllFiles().filter(file =>
      file.permissions.owner === userId ||
      file.permissions.writers.includes(userId) ||
      file.permissions.readers.includes(userId)
    );
  }

  getPublicFiles(): SyncedFile[] {
    return this.getAllFiles().filter(file => file.permissions.public);
  }
}