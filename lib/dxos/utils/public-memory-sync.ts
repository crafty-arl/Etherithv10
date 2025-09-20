/**
 * Public Memory Synchronization Service
 * Handles cross-space synchronization of public memories in DXOS
 */

import { EtherithDXOSClient } from '../real-client'

export interface PublicMemorySync {
  id: string
  memoryId: string
  spaceId: string
  authorId: string
  timestamp: number
  lastSyncAt: number
  syncStatus: 'pending' | 'synced' | 'failed'
}

export interface CrossSpaceMemory {
  id: string
  title: string
  content: string
  timestamp: number
  visibility: 'public'
  tags: string[]
  fileType: string
  authorId: string
  authorName: string
  spaceId: string
  size?: number
  reactions?: Record<string, number>
}

/**
 * Public Memory Synchronization Service
 * Manages cross-space synchronization of public memories
 */
export class PublicMemorySyncService {
  private static instance: PublicMemorySyncService
  private client: EtherithDXOSClient | null = null
  private syncInterval: NodeJS.Timeout | null = null
  private isRunning = false
  private syncQueue: PublicMemorySync[] = []
  private crossSpaceMemories: Map<string, CrossSpaceMemory> = new Map()

  private constructor() {}

  static getInstance(): PublicMemorySyncService {
    if (!PublicMemorySyncService.instance) {
      PublicMemorySyncService.instance = new PublicMemorySyncService()
    }
    return PublicMemorySyncService.instance
  }

  /**
   * Initialize the sync service
   */
  initialize(client: EtherithDXOSClient): void {
    this.client = client
    console.log('🔄 [PUBLIC-SYNC] Initializing public memory sync service')
    console.log('🔍 [PUBLIC-SYNC-DEBUG] Client available:', !!client)
    console.log('🔍 [PUBLIC-SYNC-DEBUG] Client initialized:', client?.isInitialized())
    this.startSyncProcess()
  }

  /**
   * Start the synchronization process
   */
  private startSyncProcess(): void {
    if (this.isRunning) {
      console.log('🔍 [PUBLIC-SYNC-DEBUG] Sync process already running, skipping')
      return
    }

    this.isRunning = true
    console.log('🚀 [PUBLIC-SYNC] Starting public memory sync process')
    console.log('🔍 [PUBLIC-SYNC-DEBUG] Client available for sync:', !!this.client)

    // Initial sync
    this.performSync()

    // Set up periodic sync every 30 seconds
    this.syncInterval = setInterval(() => {
      console.log('🔍 [PUBLIC-SYNC-DEBUG] Periodic sync triggered')
      this.performSync()
    }, 30000)

    // Set up real-time sync on space changes
    this.setupRealtimeSync()
    
    console.log('✅ [PUBLIC-SYNC] Sync process started successfully')
  }

  /**
   * Stop the synchronization process
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    this.isRunning = false
    console.log('🛑 [PUBLIC-SYNC] Stopped public memory sync service')
  }

  /**
   * Add a public memory to the sync queue
   */
  addToSyncQueue(memory: any, spaceId: string, authorId: string): void {
    const syncItem: PublicMemorySync = {
      id: `sync_${memory.id}_${Date.now()}`,
      memoryId: memory.id,
      spaceId,
      authorId,
      timestamp: memory.timestamp,
      lastSyncAt: 0,
      syncStatus: 'pending'
    }

    this.syncQueue.push(syncItem)
    console.log('📝 [PUBLIC-SYNC] Added memory to sync queue:', memory.id)
  }

  /**
   * Perform synchronization across all spaces
   */
  private async performSync(): Promise<void> {
    if (!this.client) {
      console.log('🔍 [PUBLIC-SYNC-DEBUG] No client available for sync')
      return
    }

    try {
      console.log('🔄 [PUBLIC-SYNC] Performing cross-space sync...')
      console.log('🔍 [PUBLIC-SYNC-DEBUG] Client connected:', this.client.isConnected())
      
      const spaces = this.client.getSpaces()
      console.log('🔍 [PUBLIC-SYNC-DEBUG] Available spaces:', spaces.length)
      
      const allPublicMemories: CrossSpaceMemory[] = []

      // Collect public memories from all spaces
      for (const space of spaces) {
        try {
          console.log('🔍 [PUBLIC-SYNC-DEBUG] Querying space:', space.id)
          const memories = await this.getPublicMemoriesFromSpace(space)
          console.log('🔍 [PUBLIC-SYNC-DEBUG] Found memories in space:', space.id, memories.length)
          allPublicMemories.push(...memories)
        } catch (error) {
          console.warn('⚠️ [PUBLIC-SYNC] Failed to get memories from space:', space.id, error)
        }
      }

      // Update cross-space memory cache
      this.updateCrossSpaceCache(allPublicMemories)

      // Sync pending items
      await this.syncPendingItems()

      console.log('✅ [PUBLIC-SYNC] Sync completed:', {
        totalSpaces: spaces.length,
        totalMemories: allPublicMemories.length,
        pendingSync: this.syncQueue.length
      })

    } catch (error) {
      console.error('❌ [PUBLIC-SYNC] Sync failed:', error)
    }
  }

  /**
   * Get public memories from a specific space
   */
  private async getPublicMemoriesFromSpace(space: any): Promise<CrossSpaceMemory[]> {
    try {
      // Query for public memories in this space
      const memories = await space.db.query({ 
        type: 'memory',
        visibility: 'public'
      }).run()

      if (!memories || memories.length === 0) {
        return []
      }

      // Get author information
      const profiles = await space.db.query({ type: 'user_profile' }).run()
      const profileMap = new Map(profiles.map((p: any) => [p.id, p]))

      return memories.map((memory: any) => {
        const author = profileMap.get(memory.authorId)
        return {
          id: memory.id,
          title: memory.title,
          content: memory.content,
          timestamp: memory.timestamp,
          visibility: 'public',
          tags: memory.tags || [],
          fileType: memory.fileType || 'text',
          authorId: memory.authorId,
          authorName: (author as any)?.displayName || 'Unknown User',
          spaceId: space.id,
          size: memory.size,
          reactions: memory.reactions
        }
      })

    } catch (error) {
      console.warn('⚠️ [PUBLIC-SYNC] Failed to query space:', space.id, error)
      return []
    }
  }

  /**
   * Update the cross-space memory cache
   */
  private updateCrossSpaceCache(memories: CrossSpaceMemory[]): void {
    this.crossSpaceMemories.clear()
    
    memories.forEach(memory => {
      this.crossSpaceMemories.set(memory.id, memory)
    })

    console.log('💾 [PUBLIC-SYNC] Updated cross-space cache:', this.crossSpaceMemories.size, 'memories')
  }

  /**
   * Sync pending items to all spaces
   */
  private async syncPendingItems(): Promise<void> {
    if (!this.client || this.syncQueue.length === 0) return

    const spaces = this.client.getSpaces()
    const pendingItems = this.syncQueue.filter(item => item.syncStatus === 'pending')

    for (const item of pendingItems) {
      try {
        // Get the original memory from the source space
        const sourceSpace = spaces.find(s => s.id === item.spaceId)
        if (!sourceSpace) continue

        const memory = await sourceSpace.db.query({ id: item.memoryId }).run()
        if (!memory || memory.length === 0) continue

        const memoryData = memory[0]

        // Sync to all other spaces
        for (const space of spaces) {
          if (space.id === item.spaceId) continue // Skip source space

          try {
            // Check if memory already exists in this space
            const existing = await space.db.query({ id: item.memoryId }).run()
            if (existing && existing.length > 0) continue

            // Add the memory to this space
            await space.db.add({
              ...memoryData,
              type: 'cross_space_memory',
              originalSpaceId: item.spaceId,
              syncedAt: Date.now()
            })

            console.log('📤 [PUBLIC-SYNC] Synced memory to space:', {
              memoryId: item.memoryId,
              targetSpace: space.id
            })

          } catch (spaceError) {
            console.warn('⚠️ [PUBLIC-SYNC] Failed to sync to space:', space.id, spaceError)
          }
        }

        // Mark as synced
        item.syncStatus = 'synced'
        item.lastSyncAt = Date.now()

      } catch (error) {
        console.error('❌ [PUBLIC-SYNC] Failed to sync item:', item.memoryId, error)
        item.syncStatus = 'failed'
      }
    }

    // Remove synced items from queue
    this.syncQueue = this.syncQueue.filter(item => item.syncStatus === 'pending')
  }

  /**
   * Set up real-time synchronization
   */
  private setupRealtimeSync(): void {
    if (!this.client) return

    const spaces = this.client.getSpaces()
    
    spaces.forEach(space => {
      // Subscribe to changes in each space
      space.db.query({ type: 'memory', visibility: 'public' }).subscribe((memories: any[]) => {
        console.log('🔄 [PUBLIC-SYNC] Real-time update detected in space:', space.id)
        this.performSync()
      })
    })
  }

  /**
   * Get all cross-space public memories
   */
  getAllCrossSpaceMemories(): CrossSpaceMemory[] {
    return Array.from(this.crossSpaceMemories.values())
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get public memories from a specific author
   */
  getMemoriesByAuthor(authorId: string): CrossSpaceMemory[] {
    return this.getAllCrossSpaceMemories()
      .filter(memory => memory.authorId === authorId)
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isRunning: boolean
    totalMemories: number
    pendingSync: number
    lastSyncAt: number
  } {
    const lastSyncAt = this.syncQueue.length > 0 
      ? Math.max(...this.syncQueue.map(item => item.lastSyncAt))
      : 0

    return {
      isRunning: this.isRunning,
      totalMemories: this.crossSpaceMemories.size,
      pendingSync: this.syncQueue.length,
      lastSyncAt
    }
  }

  /**
   * Force a full resync
   */
  async forceResync(): Promise<void> {
    console.log('🔄 [PUBLIC-SYNC] Forcing full resync...')
    this.crossSpaceMemories.clear()
    this.syncQueue = []
    await this.performSync()
  }
}

// Export singleton instance
export const publicMemorySync = PublicMemorySyncService.getInstance()
