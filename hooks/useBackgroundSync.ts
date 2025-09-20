import { useState, useEffect, useCallback } from 'react'
import { backgroundSync } from '../utils/background-sync'

interface SyncStatus {
  enabled: boolean
  online: boolean
  syncInProgress: boolean
  nextSyncTime: number | null
  lastSyncTime: number | null
}

interface UseBackgroundSyncReturn {
  status: SyncStatus
  syncNow: () => Promise<boolean>
  toggleSync: (enabled: boolean) => void
  updateInterval: (minutes: number) => void
}

export const useBackgroundSync = (): UseBackgroundSyncReturn => {
  const [status, setStatus] = useState<SyncStatus>({
    enabled: true,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    syncInProgress: false,
    nextSyncTime: null,
    lastSyncTime: null
  })

  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = backgroundSync.getStatus()
      setStatus(prev => ({
        ...currentStatus,
        lastSyncTime: lastSyncTime
      }))
    }

    // Initial status update
    updateStatus()

    // Update status every 5 seconds
    const statusInterval = setInterval(updateStatus, 5000)

    // Listen for online/offline events
    const handleOnline = () => updateStatus()
    const handleOffline = () => updateStatus()

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }

    return () => {
      clearInterval(statusInterval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [lastSyncTime])

  // Manual sync trigger
  const syncNow = useCallback(async (): Promise<boolean> => {
    const success = await backgroundSync.syncNow()
    if (success) {
      setLastSyncTime(Date.now())
    }
    return success
  }, [])

  // Toggle sync on/off
  const toggleSync = useCallback((enabled: boolean) => {
    backgroundSync.updateConfig({ enabled })
  }, [])

  // Update sync interval
  const updateInterval = useCallback((minutes: number) => {
    backgroundSync.updateConfig({
      syncInterval: minutes * 60 * 1000
    })
  }, [])

  return {
    status,
    syncNow,
    toggleSync,
    updateInterval
  }
}

// Helper function to format next sync time
export const formatNextSyncTime = (nextSyncTime: number | null): string => {
  if (!nextSyncTime) return 'Not scheduled'

  const timeUntilSync = nextSyncTime - Date.now()
  if (timeUntilSync <= 0) return 'Syncing soon...'

  const minutes = Math.floor(timeUntilSync / (1000 * 60))
  const seconds = Math.floor((timeUntilSync % (1000 * 60)) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

// Helper function to format last sync time
export const formatLastSyncTime = (lastSyncTime: number | null): string => {
  if (!lastSyncTime) return 'Never'

  const timeSinceSync = Date.now() - lastSyncTime
  const minutes = Math.floor(timeSinceSync / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}