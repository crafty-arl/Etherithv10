/**
 * DXOS Synchronization Utilities
 * Provides real-time sync management, conflict resolution, and network coordination
 */

import { dxosClient } from '../client'

export interface SyncStatus {
  isConnected: boolean
  isOnline: boolean
  peersCount: number
  lastSyncTime: number
  syncErrors: string[]
  pendingOperations: number
  networkLatency?: number
}

export interface ConflictResolution {
  id: string
  type: 'merge' | 'override' | 'manual'
  localVersion: any
  remoteVersion: any
  resolvedVersion?: any
  timestamp: number
  resolvedBy?: string
}

export interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  objectId: string
  objectType: string
  timestamp: number
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  retryCount: number
  error?: string
}

/**
 * Sync Service for managing DXOS synchronization
 */
export class SyncService {
  private static syncStatus: SyncStatus = {
    isConnected: false,
    isOnline: false,
    peersCount: 0,
    lastSyncTime: 0,
    syncErrors: [],
    pendingOperations: 0
  }

  private static syncOperations: Map<string, SyncOperation> = new Map()
  private static conflictQueue: ConflictResolution[] = []
  private static listeners: Set<(status: SyncStatus) => void> = new Set()

  /**
   * Initialize sync monitoring
   */
  static initialize() {
    if (typeof window !== 'undefined') {
      // Monitor network connectivity
      window.addEventListener('online', this.handleNetworkChange.bind(this))
      window.addEventListener('offline', this.handleNetworkChange.bind(this))

      // Initial network state
      this.syncStatus.isOnline = navigator.onLine
    }

    // Start periodic sync status updates
    setInterval(() => {
      this.updateSyncStatus()
    }, 5000) // Every 5 seconds
  }

  /**
   * Get current sync status
   */
  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * Subscribe to sync status changes
   */
  static subscribeSyncStatus(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback)

    // Send initial status
    callback(this.getSyncStatus())

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Update sync status and notify listeners
   */
  private static updateSyncStatus() {
    try {
      // Mock implementation - in real DXOS, this would query actual peer connections
      // Check if client is available and connected
      const isConnected = dxosClient.isConnected()

      this.syncStatus = {
        ...this.syncStatus,
        isConnected: isConnected,
        peersCount: Math.floor(Math.random() * 5), // Mock peer count
        lastSyncTime: Date.now(),
        pendingOperations: this.syncOperations.size
      }

      // Notify all listeners
      this.listeners.forEach(callback => {
        try {
          callback(this.getSyncStatus())
        } catch (error) {
          console.error('Sync status listener error:', error)
        }
      })
    } catch (error) {
      console.error('Failed to update sync status:', error)
    }
  }

  /**
   * Handle network connectivity changes
   */
  private static handleNetworkChange() {
    this.syncStatus.isOnline = navigator.onLine

    if (this.syncStatus.isOnline) {
      console.log('🌐 Network connected - resuming sync operations')
      this.retryFailedOperations()
    } else {
      console.log('📡 Network disconnected - queuing operations')
    }

    this.updateSyncStatus()
  }

  /**
   * Add sync operation to queue
   */
  static addSyncOperation(
    type: SyncOperation['type'],
    objectId: string,
    objectType: string
  ): string {
    const operation: SyncOperation = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      objectId,
      objectType,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    }

    this.syncOperations.set(operation.id, operation)
    this.updateSyncStatus()

    // Process immediately if online
    if (this.syncStatus.isOnline) {
      this.processSyncOperation(operation.id)
    }

    return operation.id
  }

  /**
   * Process a sync operation
   */
  private static async processSyncOperation(operationId: string) {
    const operation = this.syncOperations.get(operationId)
    if (!operation) return

    try {
      operation.status = 'syncing'
      this.updateSyncStatus()

      // Simulate sync processing (in real implementation, this would sync with DXOS)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

      // Randomly simulate conflicts or failures for demo
      const shouldSucceed = Math.random() > 0.1 // 90% success rate

      if (shouldSucceed) {
        operation.status = 'completed'
        this.syncOperations.delete(operationId)
      } else {
        throw new Error('Sync operation failed')
      }

    } catch (error) {
      operation.status = 'failed'
      operation.error = error instanceof Error ? error.message : 'Unknown error'
      operation.retryCount++

      // Add to errors
      this.syncStatus.syncErrors.push(
        `${operation.type} operation failed for ${operation.objectType}: ${operation.error}`
      )

      // Retry logic
      if (operation.retryCount < 3) {
        setTimeout(() => {
          this.processSyncOperation(operationId)
        }, Math.pow(2, operation.retryCount) * 1000) // Exponential backoff
      }
    }

    this.updateSyncStatus()
  }

  /**
   * Retry failed operations
   */
  private static retryFailedOperations() {
    const failedOperations = Array.from(this.syncOperations.values())
      .filter(op => op.status === 'failed' && op.retryCount < 3)

    failedOperations.forEach(operation => {
      operation.status = 'pending'
      this.processSyncOperation(operation.id)
    })
  }

  /**
   * Handle sync conflict
   */
  static handleConflict(
    objectId: string,
    localVersion: any,
    remoteVersion: any
  ): ConflictResolution {
    const conflict: ConflictResolution = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'manual', // Default to manual resolution
      localVersion,
      remoteVersion,
      timestamp: Date.now()
    }

    // Auto-resolve simple conflicts
    const autoResolved = this.autoResolveConflict(conflict)
    if (autoResolved) {
      conflict.type = 'merge'
      conflict.resolvedVersion = autoResolved
    } else {
      // Add to manual resolution queue
      this.conflictQueue.push(conflict)
    }

    return conflict
  }

  /**
   * Auto-resolve simple conflicts
   */
  private static autoResolveConflict(conflict: ConflictResolution): any | null {
    const { localVersion, remoteVersion } = conflict

    // Simple last-write-wins for timestamp-based objects
    if (localVersion.timestamp && remoteVersion.timestamp) {
      return localVersion.timestamp > remoteVersion.timestamp ? localVersion : remoteVersion
    }

    // Merge non-conflicting fields
    if (typeof localVersion === 'object' && typeof remoteVersion === 'object') {
      try {
        const merged = { ...remoteVersion, ...localVersion }

        // Prefer newer timestamp if available
        if (remoteVersion.timestamp && localVersion.timestamp) {
          merged.timestamp = Math.max(remoteVersion.timestamp, localVersion.timestamp)
        }

        return merged
      } catch (error) {
        console.warn('Failed to auto-merge conflict:', error)
        return null
      }
    }

    return null
  }

  /**
   * Resolve conflict manually
   */
  static resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    customVersion?: any,
    resolvedBy?: string
  ): boolean {
    const conflictIndex = this.conflictQueue.findIndex(c => c.id === conflictId)
    if (conflictIndex === -1) return false

    const conflict = this.conflictQueue[conflictIndex]

    switch (resolution) {
      case 'local':
        conflict.resolvedVersion = conflict.localVersion
        break
      case 'remote':
        conflict.resolvedVersion = conflict.remoteVersion
        break
      case 'merge':
        conflict.resolvedVersion = customVersion || this.autoResolveConflict(conflict)
        break
    }

    conflict.resolvedBy = resolvedBy
    conflict.type = resolution === 'merge' ? 'merge' : 'override'

    // Remove from queue
    this.conflictQueue.splice(conflictIndex, 1)

    return true
  }

  /**
   * Get pending conflicts
   */
  static getPendingConflicts(): ConflictResolution[] {
    return [...this.conflictQueue]
  }

  /**
   * Clear sync errors
   */
  static clearSyncErrors() {
    this.syncStatus.syncErrors = []
    this.updateSyncStatus()
  }

  /**
   * Get sync health score (0-100)
   */
  static getSyncHealthScore(): number {
    const status = this.getSyncStatus()
    let score = 0

    // Base connectivity (40 points)
    if (status.isConnected && status.isOnline) {
      score += 40
    } else if (status.isOnline) {
      score += 20
    }

    // Peer connections (30 points)
    score += Math.min(status.peersCount * 10, 30)

    // Recent sync activity (20 points)
    const timeSinceLastSync = Date.now() - status.lastSyncTime
    if (timeSinceLastSync < 60000) { // 1 minute
      score += 20
    } else if (timeSinceLastSync < 300000) { // 5 minutes
      score += 10
    }

    // Error status (10 points)
    if (status.syncErrors.length === 0) {
      score += 10
    } else if (status.syncErrors.length < 3) {
      score += 5
    }

    return Math.min(score, 100)
  }

  /**
   * Force sync for a space
   */
  static async forceSyncSpace(space: any): Promise<boolean> {
    try {
      console.log('🔄 Force syncing space:', space.id)

      // Mock implementation - trigger full space sync
      const syncOperation = this.addSyncOperation('update', space.id, 'space')

      // Wait for sync to complete
      return new Promise((resolve) => {
        const checkSync = () => {
          const operation = this.syncOperations.get(syncOperation)
          if (!operation || operation.status === 'completed') {
            resolve(true)
          } else if (operation.status === 'failed') {
            resolve(false)
          } else {
            setTimeout(checkSync, 100)
          }
        }
        checkSync()
      })
    } catch (error) {
      console.error('Failed to force sync space:', error)
      return false
    }
  }
}

// Initialize sync service
if (typeof window !== 'undefined') {
  SyncService.initialize()
}

/**
 * Hook for sync utilities
 */
export function useSyncUtils() {
  return {
    getSyncStatus: SyncService.getSyncStatus,
    subscribeSyncStatus: SyncService.subscribeSyncStatus,
    addSyncOperation: SyncService.addSyncOperation,
    handleConflict: SyncService.handleConflict,
    resolveConflict: SyncService.resolveConflict,
    getPendingConflicts: SyncService.getPendingConflicts,
    clearSyncErrors: SyncService.clearSyncErrors,
    getSyncHealthScore: SyncService.getSyncHealthScore,
    forceSyncSpace: SyncService.forceSyncSpace
  }
}