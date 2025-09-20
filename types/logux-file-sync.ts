/**
 * Logux File Synchronization Types
 * Defines actions and metadata for distributed file synchronization
 */

// Base action interface following Logux patterns
export interface LoguxAction {
  type: string;
  [key: string]: any;
}

// Enhanced metadata for file operations
export interface LoguxFileMeta {
  id: string;
  time: number;
  added: number;
  reasons: string[];
  subprotocol: string;
  channels: string[];
  nodeId: string;
  userId: string;
  fileHash?: string;
  conflictResolution?: 'merge' | 'overwrite' | 'branch';
  parentVersion?: string;
  vectorClock?: Record<string, number>;
}

// File operation actions
export interface FileCreateAction extends LoguxAction {
  type: 'file/create';
  fileId: string;
  fileName: string;
  content: string;
  mimeType: string;
  permissions: FilePermissions;
  metadata: FileMetadata;
  authorId: string;
  parentDirectory?: string;
}

export interface FileUpdateAction extends LoguxAction {
  type: 'file/update';
  fileId: string;
  content: string;
  version: string;
  diff?: FileDiff;
  reason: 'edit' | 'auto-save' | 'conflict-resolution';
  authorId: string;
}

export interface FileDeleteAction extends LoguxAction {
  type: 'file/delete';
  fileId: string;
  soft: boolean; // true for trash, false for permanent
  authorId: string;
}

export interface FileMoveAction extends LoguxAction {
  type: 'file/move';
  fileId: string;
  fromPath: string;
  toPath: string;
  authorId: string;
}

export interface FilePermissionAction extends LoguxAction {
  type: 'file/permission';
  fileId: string;
  permissions: FilePermissions;
  authorId: string;
}

export interface FileVersionAction extends LoguxAction {
  type: 'file/version';
  fileId: string;
  version: string;
  operation: 'create' | 'branch' | 'merge';
  parentVersions: string[];
  authorId: string;
}

// Conflict resolution actions
export interface FileConflictAction extends LoguxAction {
  type: 'file/conflict';
  fileId: string;
  conflictId: string;
  conflictingVersions: string[];
  resolution: 'manual' | 'auto';
  mergedContent?: string;
  authorId: string;
}

// Real-time collaboration actions
export interface FileLockAction extends LoguxAction {
  type: 'file/lock';
  fileId: string;
  lockType: 'edit' | 'view' | 'exclusive';
  duration: number; // milliseconds
  authorId: string;
}

export interface FileUnlockAction extends LoguxAction {
  type: 'file/unlock';
  fileId: string;
  lockId: string;
  authorId: string;
}

export interface FileCursorAction extends LoguxAction {
  type: 'file/cursor';
  fileId: string;
  position: CursorPosition;
  selection?: TextSelection;
  authorId: string;
}

// File synchronization status actions
export interface FileSyncStatusAction extends LoguxAction {
  type: 'file/syncStatus';
  fileId: string;
  status: 'syncing' | 'synced' | 'conflict' | 'offline';
  lastSyncTime: number;
  nodeId: string;
}

// Presence and collaboration
export interface FilePresenceAction extends LoguxAction {
  type: 'file/presence';
  fileId: string;
  userId: string;
  status: 'viewing' | 'editing' | 'idle' | 'offline';
  lastActivity: number;
}

// Data structures
export interface FilePermissions {
  owner: string;
  readers: string[];
  writers: string[];
  public: boolean;
  accessLevel: 'read' | 'write' | 'admin';
}

export interface FileMetadata {
  size: number;
  hash: string;
  encoding: string;
  lastModified: number;
  created: number;
  tags: string[];
  description?: string;
  ipfsHash?: string;
}

export interface FileDiff {
  type: 'text' | 'binary';
  operations: DiffOperation[];
  oldHash: string;
  newHash: string;
}

export interface DiffOperation {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content: string;
  length?: number;
}

export interface CursorPosition {
  line: number;
  column: number;
  offset: number;
}

export interface TextSelection {
  start: CursorPosition;
  end: CursorPosition;
}

// File system structure
export interface SyncedFile {
  id: string;
  name: string;
  path: string;
  content: string;
  version: string;
  hash: string;
  permissions: FilePermissions;
  metadata: FileMetadata;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'offline';
  lastSyncTime: number;
  vectorClock: Record<string, number>;
  conflictVersions?: string[];
  locks: FileLock[];
  presence: UserPresence[];
}

export interface FileLock {
  id: string;
  userId: string;
  type: 'edit' | 'view' | 'exclusive';
  acquired: number;
  expires: number;
}

export interface UserPresence {
  userId: string;
  userName: string;
  status: 'viewing' | 'editing' | 'idle';
  cursor?: CursorPosition;
  selection?: TextSelection;
  lastActivity: number;
}

// Conflict resolution types
export interface FileConflict {
  id: string;
  fileId: string;
  conflictingVersions: ConflictVersion[];
  status: 'pending' | 'resolved';
  resolution?: ConflictResolution;
  created: number;
  resolved?: number;
}

export interface ConflictVersion {
  version: string;
  authorId: string;
  content: string;
  timestamp: number;
  vectorClock: Record<string, number>;
}

export interface ConflictResolution {
  type: 'manual' | 'auto' | 'merge';
  resolvedContent: string;
  resolvedBy: string;
  timestamp: number;
}

// Vector clock for distributed versioning
export interface VectorClock {
  nodeId: string;
  clocks: Record<string, number>;
}

// Subscription channels for Logux
export type FileChannel =
  | `file:${string}` // Individual file
  | `directory:${string}` // Directory contents
  | `user:${string}:files` // User's files
  | `public:files` // Public files
  | `project:${string}:files`; // Project files

// Action type union for type safety
export type FileAction =
  | FileCreateAction
  | FileUpdateAction
  | FileDeleteAction
  | FileMoveAction
  | FilePermissionAction
  | FileVersionAction
  | FileConflictAction
  | FileLockAction
  | FileUnlockAction
  | FileCursorAction
  | FileSyncStatusAction
  | FilePresenceAction;