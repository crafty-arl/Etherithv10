import { Memory, UserProfile } from './memory'

// Registry Types for IPFS-based decentralized sharing

export interface PublicMemoryEntry {
  id: string
  title: string
  content: string
  memoryNote: string
  fileType: 'text' | 'document' | 'audio' | 'image' | 'video'
  fileName?: string
  fileSize?: number
  mimeType?: string
  ipfsCid: string
  ipfsUrl: string
  ipfsGatewayUrl: string
  thumbnailUrl?: string
  timestamp: number
  authorId: string
  authorName: string
  authorAvatar?: string
  authorContact?: string
  tags?: string[]
  // Registry-specific metadata
  registryVersion: string
  sharingPermissions: 'public' | 'subscribers-only' | 'invite-only'
  contentHash: string // SHA-256 of memory content for integrity
}

export interface UserRegistry {
  version: string
  format: 'etherith-registry-v1'
  registryId: string
  userId: string
  userProfile: {
    id: string
    displayName: string
    avatar?: string
    contactLink?: string
    bio?: string
    publicKey?: string // For future encryption/verification
  }
  metadata: {
    created: number
    updated: number
    totalEntries: number
    totalSize: number
    description?: string
    tags?: string[]
    language?: string
    location?: string
  }
  publicMemories: PublicMemoryEntry[]
  ipfsMetadata: {
    registryCid?: string
    lastPublished?: number
    publishedSize?: number
    gatewayUrl?: string
  }
}

export interface RegistrySubscription {
  id: string
  registryId: string
  registryCid: string
  userId: string
  displayName: string
  avatar?: string
  contactLink?: string
  subscribedAt: number
  lastSyncAt?: number
  syncEnabled: boolean
  autoSync: boolean
  syncFrequency: 'manual' | 'hourly' | 'daily' | 'weekly'
  tags?: string[]
  notes?: string
}

export interface SyncOperation {
  id: string
  subscriptionId: string
  type: 'full' | 'incremental' | 'verify'
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: number
  completedAt?: number
  memoriesFound: number
  memoriesDownloaded: number
  memoriesSkipped: number
  totalSize: number
  errors?: string[]
  lastMemoryTimestamp?: number
}

export interface RegistryStats {
  localRegistry: {
    totalMemories: number
    publicMemories: number
    totalSize: number
    lastPublished?: number
    registryCid?: string
  }
  subscriptions: {
    total: number
    active: number
    lastSyncAt?: number
  }
  sync: {
    totalOperations: number
    successfulOperations: number
    totalDownloaded: number
    totalSize: number
    lastSuccessfulSync?: number
  }
  ipfs: {
    connected: boolean
    gatewayReachable: boolean
    publishingEnabled: boolean
  }
}

export interface RegistryConfig {
  enabled: boolean
  autoPublish: boolean
  publishFrequency: 'manual' | 'on-change' | 'daily' | 'weekly'
  maxRegistrySize: number // MB
  maxMemorySize: number // MB per memory
  allowedFileTypes: string[]
  defaultSharingPermission: 'public' | 'subscribers-only' | 'invite-only'
  syncConfig: {
    enabled: boolean
    maxConcurrentSyncs: number
    retryAttempts: number
    retryDelay: number // seconds
    verifyIntegrity: boolean
  }
  privacy: {
    shareProfile: boolean
    shareContactInfo: boolean
    shareLocation: boolean
    requireApproval: boolean
  }
}

export interface MemoryDiscovery {
  id: string
  registryId: string
  registryCid: string
  memory: PublicMemoryEntry
  discoveredAt: number
  source: 'subscription' | 'search' | 'recommendation'
  relevanceScore?: number
  tags?: string[]
}

// Search and Discovery
export interface RegistrySearchFilters {
  query?: string
  authorName?: string
  fileType?: string
  tags?: string[]
  dateFrom?: number
  dateTo?: number
  minSize?: number
  maxSize?: number
  registryIds?: string[]
  verified?: boolean
}

export interface RegistrySearchResult {
  registryId: string
  registryCid: string
  authorName: string
  authorAvatar?: string
  memories: PublicMemoryEntry[]
  totalMatches: number
  relevanceScore: number
  lastUpdated: number
}