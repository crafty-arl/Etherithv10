import { RegistryManager } from './registry'
import { OfflineRegistryManager } from './offline-registry'

interface SyncConfig {
  enabled: boolean
  syncInterval: number // in milliseconds
  maxRetries: number
  retryDelay: number
}

class BackgroundSyncService {
  private config: SyncConfig = {
    enabled: true,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    retryDelay: 30 * 1000 // 30 seconds
  }

  private syncTimer: NodeJS.Timeout | null = null
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private syncInProgress: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))

      // Listen for visibility changes to pause/resume syncing
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
  }

  /**
   * Start the background sync service
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('Background sync is disabled')
      return
    }

    console.log('Starting background sync service')
    this.scheduleNextSync()
  }

  /**
   * Stop the background sync service
   */
  stop(): void {
    console.log('Stopping background sync service')
    if (this.syncTimer) {
      clearTimeout(this.syncTimer)
      this.syncTimer = null
    }
  }

  /**
   * Manually trigger a sync operation
   */
  async syncNow(): Promise<boolean> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping')
      return false
    }

    if (!this.isOnline) {
      console.log('Offline, queueing sync for later')
      OfflineRegistryManager.queueSyncOperation('manual_sync', {})
      return false
    }

    return this.performSync()
  }

  /**
   * Update sync configuration
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig }

    if (this.config.enabled && !this.syncTimer) {
      this.start()
    } else if (!this.config.enabled && this.syncTimer) {
      this.stop()
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): {
    enabled: boolean
    online: boolean
    syncInProgress: boolean
    nextSyncTime: number | null
  } {
    const nextSyncTime = this.syncTimer ? Date.now() + this.config.syncInterval : null

    return {
      enabled: this.config.enabled,
      online: this.isOnline,
      syncInProgress: this.syncInProgress,
      nextSyncTime
    }
  }

  private scheduleNextSync(): void {
    if (!this.config.enabled) return

    this.syncTimer = setTimeout(() => {
      this.performSync().finally(() => {
        // Schedule next sync regardless of success/failure
        this.scheduleNextSync()
      })
    }, this.config.syncInterval)
  }

  private async performSync(): Promise<boolean> {
    this.syncInProgress = true
    console.log('Starting background sync...')

    try {
      // Update our registry from local memories
      await RegistryManager.updateRegistryFromMemories()
      console.log('Registry updated from local memories')

      // Process offline queue
      const offlineSuccess = await OfflineRegistryManager.processOfflineQueue()
      if (offlineSuccess) {
        console.log('Offline queue processed successfully')
      }

      // Sync subscriptions
      const subscriptions = RegistryManager.getSubscriptions()
      for (const subscription of subscriptions) {
        try {
          await RegistryManager.syncSubscription(subscription.userId)
          console.log(`Synced subscription: ${subscription.displayName}`)
        } catch (error) {
          console.warn(`Failed to sync subscription ${subscription.displayName}:`, error)
        }
      }

      console.log('Background sync completed successfully')
      return true

    } catch (error) {
      console.error('Background sync failed:', error)

      // Queue retry if we have retries left
      OfflineRegistryManager.queueSyncOperation('background_sync', {
        timestamp: Date.now(),
        retryCount: 0
      })

      return false
    } finally {
      this.syncInProgress = false
    }
  }

  private handleOnline(): void {
    console.log('Back online, resuming sync')
    this.isOnline = true

    // Trigger immediate sync when coming back online
    setTimeout(() => {
      this.syncNow()
    }, 1000) // Brief delay to ensure connection is stable
  }

  private handleOffline(): void {
    console.log('Gone offline, pausing sync')
    this.isOnline = false
  }

  private handleVisibilityChange(): void {
    if (typeof document === 'undefined') return

    if (document.hidden) {
      // Page hidden, reduce sync frequency
      this.updateConfig({ syncInterval: 10 * 60 * 1000 }) // 10 minutes
    } else {
      // Page visible, restore normal frequency
      this.updateConfig({ syncInterval: 5 * 60 * 1000 }) // 5 minutes

      // Trigger sync when page becomes visible
      setTimeout(() => {
        this.syncNow()
      }, 2000)
    }
  }
}

// Singleton instance
export const backgroundSync = new BackgroundSyncService()

// Auto-start when imported (if in browser environment)
if (typeof window !== 'undefined') {
  // Start after a short delay to allow app initialization
  setTimeout(() => {
    backgroundSync.start()
  }, 10000) // 10 seconds
}

export { BackgroundSyncService }