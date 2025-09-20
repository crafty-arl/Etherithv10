import {
  UserRegistry,
  PublicMemoryEntry,
  RegistrySubscription,
  SyncOperation,
  RegistryStats,
  RegistryConfig,
  MemoryDiscovery,
  RegistrySearchFilters,
  RegistrySearchResult
} from '../types/registry'
import { Memory, UserProfile } from '../types/memory'
import { LocalStorage } from './storage'
import { IPFSService } from './ipfs'
// Browser-compatible imports (no crypto import needed)

const REGISTRY_STORAGE_KEYS = {
  REGISTRY: 'etherith_registry',
  SUBSCRIPTIONS: 'etherith_subscriptions',
  SYNC_OPERATIONS: 'etherith_sync_operations',
  REGISTRY_CONFIG: 'etherith_registry_config',
  DISCOVERED_MEMORIES: 'etherith_discovered_memories',
  SYNC_CACHE: 'etherith_sync_cache'
}

export class RegistryManager {
  // Local Registry Management

  static createRegistry(userProfile: UserProfile): UserRegistry {
    const registryId = this.generateRegistryId(userProfile.id)
    const now = Date.now()

    const registry: UserRegistry = {
      version: '1.0.0',
      format: 'etherith-registry-v1',
      registryId,
      userId: userProfile.id,
      userProfile: {
        id: userProfile.id,
        displayName: userProfile.displayName,
        avatar: userProfile.avatar,
        contactLink: userProfile.contactLink,
        bio: '',
        publicKey: undefined
      },
      metadata: {
        created: now,
        updated: now,
        totalEntries: 0,
        totalSize: 0,
        description: `${userProfile.displayName}'s Public Memory Archive`,
        tags: [],
        language: 'en',
        location: undefined
      },
      publicMemories: [],
      ipfsMetadata: {
        registryCid: undefined,
        lastPublished: undefined,
        publishedSize: undefined,
        gatewayUrl: undefined
      }
    }

    this.saveRegistry(registry)
    return registry
  }

  static getRegistry(): UserRegistry | null {
    const data = localStorage.getItem(REGISTRY_STORAGE_KEYS.REGISTRY)
    return data ? JSON.parse(data) : null
  }

  static saveRegistry(registry: UserRegistry): void {
    registry.metadata.updated = Date.now()
    localStorage.setItem(REGISTRY_STORAGE_KEYS.REGISTRY, JSON.stringify(registry))
  }

  static updateRegistryFromMemories(): UserRegistry {
    let registry = this.getRegistry()
    const userProfile = LocalStorage.getUserProfile()

    if (!registry && userProfile) {
      registry = this.createRegistry(userProfile)
    }

    if (!registry) {
      throw new Error('No registry found and no user profile available')
    }

    // Get all public memories
    const publicMemories = LocalStorage.getPublicMemories()

    // Convert to registry format
    const publicMemoryEntries: PublicMemoryEntry[] = publicMemories
      .filter(memory => memory.ipfsCid) // Only include memories already on IPFS
      .map(memory => this.memoryToRegistryEntry(memory))

    // Update registry
    registry.publicMemories = publicMemoryEntries
    registry.metadata.totalEntries = publicMemoryEntries.length
    registry.metadata.totalSize = publicMemoryEntries.reduce((sum, entry) => sum + (entry.fileSize || 0), 0)

    this.saveRegistry(registry)
    return registry
  }

  static memoryToRegistryEntry(memory: Memory): PublicMemoryEntry {
    if (!memory.ipfsCid) {
      throw new Error('Memory must have IPFS CID to be included in registry')
    }

    return {
      id: memory.id,
      title: memory.title,
      content: memory.content,
      memoryNote: memory.memoryNote,
      fileType: memory.fileType,
      fileName: memory.fileName,
      fileSize: memory.fileSize,
      mimeType: memory.mimeType,
      ipfsCid: memory.ipfsCid,
      ipfsUrl: memory.ipfsUrl!,
      ipfsGatewayUrl: memory.ipfsGatewayUrl!,
      thumbnailUrl: memory.thumbnailUrl,
      timestamp: memory.timestamp,
      authorId: memory.authorId,
      authorName: memory.authorName,
      authorAvatar: memory.authorAvatar,
      authorContact: memory.authorContact,
      tags: memory.tags,
      registryVersion: '1.0.0',
      sharingPermissions: 'public', // Default for now
      contentHash: this.generateContentHash(memory.content + memory.memoryNote)
    }
  }

  // IPFS Registry Publishing

  static async publishRegistry(): Promise<{ cid: string; size: number }> {
    const registry = this.getRegistry()
    if (!registry) {
      throw new Error('No registry to publish')
    }

    // Update registry before publishing
    const updatedRegistry = this.updateRegistryFromMemories()

    // Upload to IPFS
    const result = await IPFSService.uploadToIPFS(
      JSON.stringify(updatedRegistry, null, 2),
      {
        title: `${updatedRegistry.userProfile.displayName}'s Registry`,
        memoryNote: `Public memory registry for ${updatedRegistry.userProfile.displayName}`,
        authorName: updatedRegistry.userProfile.displayName,
        fileType: 'document',
        tags: ['registry', 'public', 'memories', ...(updatedRegistry.metadata.tags || [])]
      }
    )

    // Update registry with IPFS metadata
    updatedRegistry.ipfsMetadata = {
      registryCid: result.cid,
      lastPublished: result.timestamp,
      publishedSize: result.size,
      gatewayUrl: IPFSService.getIPFSGatewayUrl(result.cid)
    }

    this.saveRegistry(updatedRegistry)

    return {
      cid: result.cid,
      size: result.size
    }
  }

  static async fetchRegistryFromIPFS(cid: string): Promise<UserRegistry> {
    const url = IPFSService.getIPFSGatewayUrl(cid)

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch registry: ${response.statusText}`)
      }

      const registry: UserRegistry = await response.json()

      // Validate registry format
      if (registry.format !== 'etherith-registry-v1') {
        throw new Error('Invalid registry format')
      }

      return registry
    } catch (error) {
      throw new Error(`Failed to fetch registry from IPFS: ${error}`)
    }
  }

  // Subscription Management

  static addSubscription(registryCid: string, autoSync: boolean = true): Promise<RegistrySubscription> {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch registry to get user info
        const registry = await this.fetchRegistryFromIPFS(registryCid)

        const subscription: RegistrySubscription = {
          id: this.generateId(),
          registryId: registry.registryId,
          registryCid,
          userId: registry.userId,
          displayName: registry.userProfile.displayName,
          avatar: registry.userProfile.avatar,
          contactLink: registry.userProfile.contactLink,
          subscribedAt: Date.now(),
          lastSyncAt: undefined,
          syncEnabled: true,
          autoSync,
          syncFrequency: 'daily',
          tags: registry.metadata.tags,
          notes: ''
        }

        const subscriptions = this.getSubscriptions()

        // Check if already subscribed
        const existing = subscriptions.find(sub => sub.registryCid === registryCid)
        if (existing) {
          throw new Error('Already subscribed to this registry')
        }

        subscriptions.push(subscription)
        this.saveSubscriptions(subscriptions)

        // Trigger initial sync if auto-sync enabled
        if (autoSync) {
          this.syncSubscription(subscription.id)
        }

        resolve(subscription)
      } catch (error) {
        reject(error)
      }
    })
  }

  static removeSubscription(subscriptionId: string): boolean {
    const subscriptions = this.getSubscriptions()
    const filteredSubscriptions = subscriptions.filter(sub => sub.id !== subscriptionId)

    if (filteredSubscriptions.length < subscriptions.length) {
      this.saveSubscriptions(filteredSubscriptions)
      return true
    }
    return false
  }

  static getSubscriptions(): RegistrySubscription[] {
    const data = localStorage.getItem(REGISTRY_STORAGE_KEYS.SUBSCRIPTIONS)
    return data ? JSON.parse(data) : []
  }

  static saveSubscriptions(subscriptions: RegistrySubscription[]): void {
    localStorage.setItem(REGISTRY_STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions))
  }

  static updateSubscription(subscriptionId: string, updates: Partial<RegistrySubscription>): boolean {
    const subscriptions = this.getSubscriptions()
    const index = subscriptions.findIndex(sub => sub.id === subscriptionId)

    if (index >= 0) {
      subscriptions[index] = { ...subscriptions[index], ...updates }
      this.saveSubscriptions(subscriptions)
      return true
    }
    return false
  }

  // Background Sync

  static async syncSubscription(subscriptionId: string): Promise<SyncOperation> {
    const subscription = this.getSubscriptions().find(sub => sub.id === subscriptionId)
    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const syncOp: SyncOperation = {
      id: this.generateId(),
      subscriptionId,
      type: 'full',
      status: 'running',
      startedAt: Date.now(),
      memoriesFound: 0,
      memoriesDownloaded: 0,
      memoriesSkipped: 0,
      totalSize: 0,
      errors: []
    }

    this.saveSyncOperation(syncOp)

    try {
      // Fetch latest registry
      const registry = await this.fetchRegistryFromIPFS(subscription.registryCid)

      // Check for newer version
      if (subscription.lastSyncAt && registry.metadata.updated <= subscription.lastSyncAt) {
        syncOp.status = 'completed'
        syncOp.completedAt = Date.now()
        this.saveSyncOperation(syncOp)
        return syncOp
      }

      const discoveredMemories = this.getDiscoveredMemories()
      const existingMemoryIds = new Set(discoveredMemories.map(dm => dm.memory.id))

      syncOp.memoriesFound = registry.publicMemories.length

      // Process each memory
      for (const memory of registry.publicMemories) {
        try {
          // Skip if already discovered
          if (existingMemoryIds.has(memory.id)) {
            syncOp.memoriesSkipped++
            continue
          }

          // Verify memory integrity
          if (this.getConfig().syncConfig.verifyIntegrity) {
            const expectedHash = memory.contentHash
            const actualHash = this.generateContentHash(memory.content + memory.memoryNote)

            if (expectedHash !== actualHash) {
              syncOp.errors?.push(`Content hash mismatch for memory: ${memory.title}`)
              continue
            }
          }

          // Add to discovered memories
          const discovery: MemoryDiscovery = {
            id: this.generateId(),
            registryId: registry.registryId,
            registryCid: subscription.registryCid,
            memory,
            discoveredAt: Date.now(),
            source: 'subscription',
            tags: memory.tags
          }

          this.addDiscoveredMemory(discovery)

          syncOp.memoriesDownloaded++
          syncOp.totalSize += memory.fileSize || 0

        } catch (error) {
          syncOp.errors?.push(`Failed to process memory ${memory.title}: ${error}`)
        }
      }

      // Update subscription
      this.updateSubscription(subscriptionId, { lastSyncAt: Date.now() })

      syncOp.status = 'completed'
      syncOp.completedAt = Date.now()
      syncOp.lastMemoryTimestamp = Math.max(...registry.publicMemories.map(m => m.timestamp))

    } catch (error) {
      syncOp.status = 'failed'
      syncOp.completedAt = Date.now()
      syncOp.errors?.push(`Sync failed: ${error}`)
    }

    this.saveSyncOperation(syncOp)
    return syncOp
  }

  static async syncAllSubscriptions(): Promise<SyncOperation[]> {
    const subscriptions = this.getSubscriptions().filter(sub => sub.syncEnabled)
    const operations: Promise<SyncOperation>[] = []

    for (const subscription of subscriptions) {
      operations.push(this.syncSubscription(subscription.id))
    }

    return Promise.all(operations)
  }

  // Discovered Memories Management

  static addDiscoveredMemory(discovery: MemoryDiscovery): void {
    const discoveries = this.getDiscoveredMemories()
    discoveries.push(discovery)
    localStorage.setItem(REGISTRY_STORAGE_KEYS.DISCOVERED_MEMORIES, JSON.stringify(discoveries))
  }

  static getDiscoveredMemories(): MemoryDiscovery[] {
    const data = localStorage.getItem(REGISTRY_STORAGE_KEYS.DISCOVERED_MEMORIES)
    return data ? JSON.parse(data) : []
  }

  static searchDiscoveredMemories(filters: RegistrySearchFilters): MemoryDiscovery[] {
    let discoveries = this.getDiscoveredMemories()

    if (filters.query) {
      const query = filters.query.toLowerCase()
      discoveries = discoveries.filter(d =>
        d.memory.title.toLowerCase().includes(query) ||
        d.memory.content.toLowerCase().includes(query) ||
        d.memory.memoryNote.toLowerCase().includes(query) ||
        (d.memory.tags && d.memory.tags.some(tag => tag.toLowerCase().includes(query)))
      )
    }

    if (filters.authorName) {
      discoveries = discoveries.filter(d =>
        d.memory.authorName.toLowerCase().includes(filters.authorName!.toLowerCase())
      )
    }

    if (filters.fileType) {
      discoveries = discoveries.filter(d => d.memory.fileType === filters.fileType)
    }

    if (filters.tags && filters.tags.length > 0) {
      discoveries = discoveries.filter(d =>
        d.memory.tags && d.memory.tags.some(tag => filters.tags!.includes(tag))
      )
    }

    if (filters.dateFrom) {
      discoveries = discoveries.filter(d => d.memory.timestamp >= filters.dateFrom!)
    }

    if (filters.dateTo) {
      discoveries = discoveries.filter(d => d.memory.timestamp <= filters.dateTo!)
    }

    return discoveries.sort((a, b) => b.memory.timestamp - a.memory.timestamp)
  }

  // Configuration Management

  static getConfig(): RegistryConfig {
    const data = localStorage.getItem(REGISTRY_STORAGE_KEYS.REGISTRY_CONFIG)
    return data ? JSON.parse(data) : this.getDefaultConfig()
  }

  static saveConfig(config: RegistryConfig): void {
    localStorage.setItem(REGISTRY_STORAGE_KEYS.REGISTRY_CONFIG, JSON.stringify(config))
  }

  static getDefaultConfig(): RegistryConfig {
    return {
      enabled: true,
      autoPublish: false,
      publishFrequency: 'manual',
      maxRegistrySize: 100, // 100MB
      maxMemorySize: 25,    // 25MB per memory
      allowedFileTypes: ['text', 'document', 'image', 'audio', 'video'],
      defaultSharingPermission: 'public',
      syncConfig: {
        enabled: true,
        maxConcurrentSyncs: 3,
        retryAttempts: 3,
        retryDelay: 30,
        verifyIntegrity: true
      },
      privacy: {
        shareProfile: true,
        shareContactInfo: false,
        shareLocation: false,
        requireApproval: false
      }
    }
  }

  // Statistics

  static getStats(): RegistryStats {
    const registry = this.getRegistry()
    const subscriptions = this.getSubscriptions()
    const syncOps = this.getSyncOperations()

    return {
      localRegistry: {
        totalMemories: registry?.metadata.totalEntries || 0,
        publicMemories: registry?.publicMemories.length || 0,
        totalSize: registry?.metadata.totalSize || 0,
        lastPublished: registry?.ipfsMetadata.lastPublished,
        registryCid: registry?.ipfsMetadata.registryCid
      },
      subscriptions: {
        total: subscriptions.length,
        active: subscriptions.filter(sub => sub.syncEnabled).length,
        lastSyncAt: Math.max(...subscriptions.map(sub => sub.lastSyncAt || 0))
      },
      sync: {
        totalOperations: syncOps.length,
        successfulOperations: syncOps.filter(op => op.status === 'completed').length,
        totalDownloaded: syncOps.reduce((sum, op) => sum + op.memoriesDownloaded, 0),
        totalSize: syncOps.reduce((sum, op) => sum + op.totalSize, 0),
        lastSuccessfulSync: Math.max(...syncOps.filter(op => op.status === 'completed').map(op => op.completedAt || 0))
      },
      ipfs: {
        connected: true, // Assume connected via Pinata
        gatewayReachable: true,
        publishingEnabled: this.getConfig().enabled
      }
    }
  }

  // Utility Methods

  private static saveSyncOperation(operation: SyncOperation): void {
    const operations = this.getSyncOperations()
    const index = operations.findIndex(op => op.id === operation.id)

    if (index >= 0) {
      operations[index] = operation
    } else {
      operations.push(operation)
    }

    // Keep only last 100 operations
    if (operations.length > 100) {
      operations.splice(0, operations.length - 100)
    }

    localStorage.setItem(REGISTRY_STORAGE_KEYS.SYNC_OPERATIONS, JSON.stringify(operations))
  }

  private static getSyncOperations(): SyncOperation[] {
    const data = localStorage.getItem(REGISTRY_STORAGE_KEYS.SYNC_OPERATIONS)
    return data ? JSON.parse(data) : []
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private static generateRegistryId(userId: string): string {
    return `reg_${userId}_${Date.now().toString(36)}`
  }

  private static generateContentHash(content: string): string {
    // Simple hash for browser environment (in production, use crypto.subtle)
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  // Cleanup and Maintenance

  static clearOldSyncOperations(daysOld: number = 30): void {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000)
    const operations = this.getSyncOperations()
    const filtered = operations.filter(op => op.startedAt > cutoff)
    localStorage.setItem(REGISTRY_STORAGE_KEYS.SYNC_OPERATIONS, JSON.stringify(filtered))
  }

  static clearAllRegistryData(): void {
    Object.values(REGISTRY_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }
}