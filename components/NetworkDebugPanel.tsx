/**
 * Network Debug Panel Component
 * Provides real-time debug information for network connectivity and user detection
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDXOS } from '../lib/dxos/context'
import { useNetworkDiscovery } from '../hooks/useNetworkDiscovery'
import { dxosClient } from '../lib/dxos/client'
import SafeTimestamp from './SafeTimestamp'

interface NetworkStats {
  timestamp: string
  dxosInitialized: boolean
  dxosConnected: boolean
  identity: any
  spacesCount: number
  onlineUsers: Array<{ spaceId: string, users: any[] }>
  networkUsersCount: number
  publicMemoriesCount: number
  isOnNetwork: boolean
}

interface NetworkDebugPanelProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function NetworkDebugPanel({
  className = '',
  autoRefresh = true,
  refreshInterval = 5000
}: NetworkDebugPanelProps) {
  const { isInitialized, isConnected, identity, spaces, currentSpace } = useDXOS()
  const {
    networkUsers,
    publicMemories,
    localUser,
    isOnNetwork,
    isDiscovering,
    refreshNetwork
  } = useNetworkDiscovery()

  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  /**
   * Gather comprehensive network statistics
   */
  const gatherNetworkStats = useCallback(async (): Promise<NetworkStats> => {
    console.log('📊 [DEBUG] Gathering network statistics...')

    try {
      // Get DXOS online users
      const onlineUsers = isInitialized ? await dxosClient.getOnlineUsers() : []

      const stats: NetworkStats = {
        timestamp: new Date().toISOString(),
        dxosInitialized: isInitialized,
        dxosConnected: isConnected,
        identity: identity ? {
          id: identity.id,
          displayName: identity.displayName
        } : null,
        spacesCount: spaces.length,
        onlineUsers,
        networkUsersCount: networkUsers.length,
        publicMemoriesCount: publicMemories.length,
        isOnNetwork
      }

      console.log('✅ [DEBUG] Network statistics gathered:', stats)
      return stats
    } catch (error) {
      console.error('❌ [DEBUG] Failed to gather network statistics:', error)
      throw error
    }
  }, [isInitialized, isConnected, identity, spaces, networkUsers, publicMemories, isOnNetwork])

  /**
   * Refresh all network data
   */
  const handleRefresh = useCallback(async () => {
    console.log('🔄 [DEBUG] Manual network refresh triggered')
    setIsRefreshing(true)

    try {
      // Refresh network discovery
      refreshNetwork()

      // Network status logging removed - method not available

      // Gather fresh stats
      const freshStats = await gatherNetworkStats()
      setNetworkStats(freshStats)
      setLastUpdate(new Date())

      console.log('✅ [DEBUG] Manual refresh completed')
    } catch (error) {
      console.error('❌ [DEBUG] Manual refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [isInitialized, refreshNetwork, gatherNetworkStats])

  /**
   * Test network connectivity
   */
  const testConnectivity = useCallback(async () => {
    console.log('🌐 [DEBUG] Testing network connectivity...')

    try {
      if (isInitialized) {
        // Basic connectivity test - check if client is connected
        const connected = dxosClient.isConnected()
        console.log(`✅ [DEBUG] Connection status: ${connected ? 'Connected' : 'Disconnected'}`)
      } else {
        console.log('⚠️ [DEBUG] DXOS not initialized, skipping connectivity test')
      }
    } catch (error) {
      console.error('❌ [DEBUG] Network connectivity test failed:', error)
    }
  }, [isInitialized])

  /**
   * Auto-refresh stats
   */
  useEffect(() => {
    if (!autoRefresh) return

    const refreshStats = async () => {
      try {
        const stats = await gatherNetworkStats()
        setNetworkStats(stats)
        setLastUpdate(new Date())
      } catch (error) {
        console.error('❌ [DEBUG] Auto-refresh failed:', error)
      }
    }

    // Initial load
    refreshStats()

    // Set up interval
    const interval = setInterval(refreshStats, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, gatherNetworkStats])

  const getStatusIcon = (status: boolean) => status ? '🟢' : '🔴'
  const getStatusText = (status: boolean) => status ? 'Online' : 'Offline'

  return (
    <div className={`network-debug-panel ${className}`}>
      <div className="debug-header">
        <div className="header-left">
          <h3 className="debug-title">🔍 Network Debug Panel</h3>
          <div className="last-update">
            Last updated: <SafeTimestamp timestamp={lastUpdate} format="time" />
          </div>
        </div>
        <div className="header-controls">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="refresh-button"
            title="Refresh network data"
          >
            {isRefreshing ? '🔄' : '↻'}
          </button>
          <button
            onClick={testConnectivity}
            className="test-button"
            title="Test network connectivity"
          >
            🌐
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="expand-button"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '📤' : '📥'}
          </button>
        </div>
      </div>

      <div className="status-summary">
        <div className="status-grid">
          <div className="status-item">
            <span className="status-icon">{getStatusIcon(isInitialized)}</span>
            <span className="status-label">DXOS</span>
            <span className="status-value">{getStatusText(isInitialized)}</span>
          </div>
          <div className="status-item">
            <span className="status-icon">{getStatusIcon(isConnected)}</span>
            <span className="status-label">Connected</span>
            <span className="status-value">{getStatusText(isConnected)}</span>
          </div>
          <div className="status-item">
            <span className="status-icon">{getStatusIcon(isOnNetwork)}</span>
            <span className="status-label">Network</span>
            <span className="status-value">{getStatusText(isOnNetwork)}</span>
          </div>
          <div className="status-item">
            <span className="status-icon">👥</span>
            <span className="status-label">Users</span>
            <span className="status-value">{networkUsers.length}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="debug-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {networkStats && (
              <div className="stats-sections">
                {/* DXOS Status */}
                <div className="stats-section">
                  <h4>🔗 DXOS Status</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Initialized:</span>
                      <span className="stat-value">{networkStats.dxosInitialized ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Connected:</span>
                      <span className="stat-value">{networkStats.dxosConnected ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Identity:</span>
                      <span className="stat-value">
                        {networkStats.identity ? networkStats.identity.displayName : 'None'}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Spaces:</span>
                      <span className="stat-value">{networkStats.spacesCount}</span>
                    </div>
                  </div>
                </div>

                {/* Network Discovery */}
                <div className="stats-section">
                  <h4>🌐 Network Discovery</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Discovery Active:</span>
                      <span className="stat-value">{isDiscovering ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Network Users:</span>
                      <span className="stat-value">{networkStats.networkUsersCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Public Memories:</span>
                      <span className="stat-value">{networkStats.publicMemoriesCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Local User:</span>
                      <span className="stat-value">{localUser ? localUser.name : 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Online Users */}
                {networkUsers.length > 0 && (
                  <div className="stats-section">
                    <h4>👥 Online Users</h4>
                    <div className="users-list">
                      {networkUsers.map((user, index) => (
                        <div key={user.id} className="user-item">
                          <span className="user-name">{user.name}</span>
                          <span className="user-memories">{user.publicMemories.length} memories</span>
                          <span className="user-last-seen">
                            Last seen: <SafeTimestamp timestamp={user.lastSeen} format="time" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DXOS Spaces */}
                {spaces.length > 0 && (
                  <div className="stats-section">
                    <h4>🌌 DXOS Spaces</h4>
                    <div className="spaces-list">
                      {spaces.map((space, index) => (
                        <div key={space.id} className="space-item">
                          <span className="space-id">{space.id.slice(0, 12)}...</span>
                          <span className="space-status">
                            {space === currentSpace ? '📍 Current' : '🌌 Available'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw Debug Data */}
                <div className="stats-section">
                  <h4>🔍 Raw Debug Data</h4>
                  <pre className="debug-data">
                    {JSON.stringify(networkStats, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .network-debug-panel {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 16px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          color: #fff;
          max-width: 800px;
          margin: 16px auto;
        }

        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #333;
        }

        .debug-title {
          margin: 0;
          font-size: 16px;
          color: #00ff88;
        }

        .last-update {
          font-size: 10px;
          color: #888;
          margin-top: 4px;
        }

        .header-controls {
          display: flex;
          gap: 8px;
        }

        .header-controls button {
          background: #333;
          border: 1px solid #555;
          color: #fff;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .header-controls button:hover {
          background: #444;
          border-color: #777;
        }

        .header-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-summary {
          margin-bottom: 16px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px;
          background: #222;
          border-radius: 4px;
        }

        .status-icon {
          font-size: 14px;
        }

        .status-label {
          color: #ccc;
          font-weight: 500;
        }

        .status-value {
          color: #00ff88;
          font-weight: bold;
        }

        .debug-details {
          overflow: hidden;
        }

        .stats-sections {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .stats-section {
          background: #222;
          padding: 12px;
          border-radius: 6px;
        }

        .stats-section h4 {
          margin: 0 0 12px 0;
          color: #00ff88;
          font-size: 14px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
        }

        .stat-label {
          color: #ccc;
        }

        .stat-value {
          color: #fff;
          font-weight: bold;
        }

        .users-list, .spaces-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .user-item, .space-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: #333;
          border-radius: 4px;
        }

        .user-name, .space-id {
          color: #00ff88;
          font-weight: bold;
        }

        .user-memories, .user-last-seen, .space-status {
          color: #ccc;
          font-size: 10px;
        }

        .debug-data {
          background: #111;
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
          color: #ccc;
          font-size: 10px;
          line-height: 1.4;
          max-height: 300px;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .network-debug-panel {
            margin: 8px;
            padding: 12px;
          }

          .debug-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .status-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}