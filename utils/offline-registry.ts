import { RegistryManager } from './registry'
import { UserRegistry, RegistrySubscription, SyncOperation, RegistryStats } from '../types/registry'

// Offline-first registry manager with graceful degradation
export class OfflineRegistryManager {
  private static isOnline(): boolean {
    return navigator.onLine
  }

  private static async checkIPFSGateway(): Promise<boolean> {
    try {
      const response = await fetch('https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', {
        method: 'HEAD',
        timeout: 5000
      } as RequestInit)
      return response.ok
    } catch {
      return false
    }
  }

  // Enhanced registry operations with offline support

  static async publishRegistry(): Promise<{ cid?: string; size?: number; cached: boolean }> {
    if (!this.isOnline()) {
      // Queue for later publishing
      this.queueRegistryUpdate()
      return { cached: true }
    }

    const gatewayAvailable = await this.checkIPFSGateway()
    if (!gatewayAvailable) {
      this.queueRegistryUpdate()
      return { cached: true }
    }

    try {
      const result = await RegistryManager.publishRegistry()
      this.clearQueuedUpdates()
      return { ...result, cached: false }
    } catch (error) {
      console.warn('Failed to publish registry, caching for later:', error)
      this.queueRegistryUpdate()
      return { cached: true }
    }
  }

  static async syncSubscription(subscriptionId: string): Promise<{ operation?: SyncOperation; cached: boolean }> {
    if (!this.isOnline()) {
      this.queueSyncOperation(subscriptionId)
      return { cached: true }
    }

    const gatewayAvailable = await this.checkIPFSGateway()
    if (!gatewayAvailable) {
      this.queueSyncOperation(subscriptionId)
      return { cached: true }
    }

    try {
      const operation = await RegistryManager.syncSubscription(subscriptionId)
      this.clearQueuedSync(subscriptionId)
      return { operation, cached: false }
    } catch (error) {
      console.warn('Failed to sync subscription, queuing for later:', error)
      this.queueSyncOperation(subscriptionId)
      return { cached: true }
    }
  }

  static async addSubscription(registryCid: string, autoSync: boolean = true): Promise<{ subscription?: RegistrySubscription; cached: boolean }> {
    if (!this.isOnline()) {
      this.queueSubscriptionAdd(registryCid, autoSync)
      return { cached: true }
    }

    const gatewayAvailable = await this.checkIPFSGateway()
    if (!gatewayAvailable) {
      this.queueSubscriptionAdd(registryCid, autoSync)
      return { cached: true }
    }

    try {
      const subscription = await RegistryManager.addSubscription(registryCid, autoSync)
      this.clearQueuedSubscription(registryCid)
      return { subscription, cached: false }
    } catch (error) {
      console.warn('Failed to add subscription, queuing for later:', error)
      this.queueSubscriptionAdd(registryCid, autoSync)
      return { cached: true }
    }
  }

  // Queue management for offline operations

  private static queueRegistryUpdate(): void {
    const queue = this.getOfflineQueue()
    queue.registryUpdates.push({
      id: this.generateId(),
      type: 'publish_registry',
      timestamp: Date.now(),
      retryCount: 0
    })
    this.saveOfflineQueue(queue)
  }

  static queueSyncOperation(subscriptionId: string, additionalData?: any): void {
    const queue = this.getOfflineQueue()
    const existing = queue.syncOperations.find(op => op.subscriptionId === subscriptionId)

    if (!existing) {
      queue.syncOperations.push({
        id: this.generateId(),
        type: 'sync_subscription',
        subscriptionId,
        timestamp: additionalData?.timestamp || Date.now(),
        retryCount: additionalData?.retryCount || 0
      })
      this.saveOfflineQueue(queue)
    }
  }

  private static queueSubscriptionAdd(registryCid: string, autoSync: boolean): void {
    const queue = this.getOfflineQueue()
    const existing = queue.subscriptionAdds.find(sub => sub.registryCid === registryCid)

    if (!existing) {
      queue.subscriptionAdds.push({
        id: this.generateId(),
        type: 'add_subscription',
        registryCid,
        autoSync,
        timestamp: Date.now(),
        retryCount: 0
      })
      this.saveOfflineQueue(queue)
    }
  }

  private static clearQueuedUpdates(): void {
    const queue = this.getOfflineQueue()
    queue.registryUpdates = []
    this.saveOfflineQueue(queue)
  }

  private static clearQueuedSync(subscriptionId: string): void {
    const queue = this.getOfflineQueue()
    queue.syncOperations = queue.syncOperations.filter(op => op.subscriptionId !== subscriptionId)
    this.saveOfflineQueue(queue)
  }

  private static clearQueuedSubscription(registryCid: string): void {
    const queue = this.getOfflineQueue()
    queue.subscriptionAdds = queue.subscriptionAdds.filter(sub => sub.registryCid !== registryCid)
    this.saveOfflineQueue(queue)
  }

  // Process queued operations when back online

  static async processOfflineQueue(): Promise<{
    processed: number
    failed: number
    errors: string[]
  }> {
    if (!this.isOnline()) {
      return { processed: 0, failed: 0, errors: ['Device is offline'] }
    }

    const gatewayAvailable = await this.checkIPFSGateway()
    if (!gatewayAvailable) {
      return { processed: 0, failed: 0, errors: ['IPFS gateway unavailable'] }
    }

    const queue = this.getOfflineQueue()
    let processed = 0
    let failed = 0
    const errors: string[] = []

    // Process registry updates
    for (const update of queue.registryUpdates) {
      try {
        await RegistryManager.publishRegistry()
        processed++
      } catch (error) {
        failed++
        errors.push(`Registry update failed: ${error}`)
        update.retryCount++
      }
    }

    // Process sync operations
    for (const syncOp of queue.syncOperations) {
      try {
        await RegistryManager.syncSubscription(syncOp.subscriptionId)
        processed++
      } catch (error) {
        failed++
        errors.push(`Sync operation failed: ${error}`)
        syncOp.retryCount++
      }
    }

    // Process subscription adds
    for (const subAdd of queue.subscriptionAdds) {
      try {
        await RegistryManager.addSubscription(subAdd.registryCid, subAdd.autoSync)
        processed++
      } catch (error) {
        failed++
        errors.push(`Subscription add failed: ${error}`)
        subAdd.retryCount++
      }
    }

    // Clean up successful operations and save updated queue
    const updatedQueue = {
      registryUpdates: queue.registryUpdates.filter((_, i) => i >= processed),
      syncOperations: queue.syncOperations.filter(op => op.retryCount < 3),
      subscriptionAdds: queue.subscriptionAdds.filter(sub => sub.retryCount < 3)
    }

    this.saveOfflineQueue(updatedQueue)

    return { processed, failed, errors }
  }

  // Offline queue storage

  private static getOfflineQueue(): OfflineQueue {
    const data = localStorage.getItem('etherith_offline_queue')
    return data ? JSON.parse(data) : {
      registryUpdates: [],
      syncOperations: [],
      subscriptionAdds: []
    }
  }

  private static saveOfflineQueue(queue: OfflineQueue): void {
    localStorage.setItem('etherith_offline_queue', JSON.stringify(queue))
  }

  // Connectivity monitoring

  static setupOfflineSupport(): void {
    // Monitor online/offline status
    window.addEventListener('online', async () => {
      console.log('Back online, processing queued operations...')
      const result = await this.processOfflineQueue()
      console.log('Processed offline queue:', result)
    })

    window.addEventListener('offline', () => {
      console.log('Gone offline, queuing operations...')
    })

    // Periodic retry for failed operations
    setInterval(async () => {
      if (this.isOnline()) {
        const queue = this.getOfflineQueue()
        const hasQueuedOps = queue.registryUpdates.length > 0 ||
                            queue.syncOperations.length > 0 ||
                            queue.subscriptionAdds.length > 0

        if (hasQueuedOps) {
          await this.processOfflineQueue()
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  // Enhanced stats with offline information

  static getEnhancedStats(): RegistryStats & {
    offline: {
      isOnline: boolean
      queuedOperations: number
      lastProcessedQueue?: number
    }
  } {
    const baseStats = RegistryManager.getStats()
    const queue = this.getOfflineQueue()

    return {
      ...baseStats,
      offline: {
        isOnline: this.isOnline(),
        queuedOperations: queue.registryUpdates.length +
                         queue.syncOperations.length +
                         queue.subscriptionAdds.length,
        lastProcessedQueue: this.getLastProcessedTime()
      }
    }
  }

  // Cache management for better offline experience

  static async preloadCriticalData(): Promise<void> {
    // Preload user's own registry
    const registry = RegistryManager.getRegistry()
    if (registry) {
      localStorage.setItem('etherith_registry_cache', JSON.stringify(registry))
    }

    // Cache subscription metadata
    const subscriptions = RegistryManager.getSubscriptions()
    localStorage.setItem('etherith_subscriptions_cache', JSON.stringify(subscriptions))

    // Cache recent discovered memories
    const discovered = RegistryManager.getDiscoveredMemories()
    const recent = discovered.filter(d => d.discoveredAt > Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    localStorage.setItem('etherith_recent_discovered_cache', JSON.stringify(recent))
  }

  static getCachedRegistry(): UserRegistry | null {
    const data = localStorage.getItem('etherith_registry_cache')
    return data ? JSON.parse(data) : null
  }

  // Utility methods

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private static getLastProcessedTime(): number | undefined {
    const data = localStorage.getItem('etherith_last_queue_processed')
    return data ? parseInt(data) : undefined
  }

  private static setLastProcessedTime(): void {
    localStorage.setItem('etherith_last_queue_processed', Date.now().toString())
  }
}

// Types for offline queue management

interface OfflineQueue {
  registryUpdates: QueuedRegistryUpdate[]
  syncOperations: QueuedSyncOperation[]
  subscriptionAdds: QueuedSubscriptionAdd[]
}

interface QueuedOperation {
  id: string
  type: string
  timestamp: number
  retryCount: number
}

interface QueuedRegistryUpdate extends QueuedOperation {
  type: 'publish_registry'
}

interface QueuedSyncOperation extends QueuedOperation {
  type: 'sync_subscription'
  subscriptionId: string
}

interface QueuedSubscriptionAdd extends QueuedOperation {
  type: 'add_subscription'
  registryCid: string
  autoSync: boolean
}