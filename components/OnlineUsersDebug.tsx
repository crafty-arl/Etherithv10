import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useDXOS } from '../lib/dxos/context'
import { getNetworkDiscovery, NetworkUser } from '../utils/network-discovery'

interface OnlineUsersDebugProps {
  onClose?: () => void
}

export const OnlineUsersDebug: React.FC<OnlineUsersDebugProps> = ({ onClose }) => {
  const { client, identity, currentSpace, isConnected } = useDXOS()
  const [networkUsers, setNetworkUsers] = useState<NetworkUser[]>([])
  const [dxosUsers, setDxosUsers] = useState<any[]>([])
  const [networkDiscovery, setNetworkDiscovery] = useState<any>(null)
  const [refreshCount, setRefreshCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    setDebugLogs(prev => [logEntry, ...prev.slice(0, 49)]) // Keep last 50 logs
    console.log('🐛 [ONLINE USERS DEBUG]', message)
  }

  useEffect(() => {
    addDebugLog('OnlineUsersDebug component mounted')
    initializeDebugger()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshOnlineUsers()
    }, 3000) // Refresh every 3 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, networkDiscovery])

  const initializeDebugger = () => {
    try {
      addDebugLog('Initializing network discovery for debugging...')
      const discovery = getNetworkDiscovery()
      setNetworkDiscovery(discovery)

      addDebugLog(`DXOS Status: ${isConnected ? 'Connected' : 'Disconnected'}`)
      addDebugLog(`Current Space: ${currentSpace?.id || 'None'}`)
      addDebugLog(`Identity: ${identity?.displayName || 'None'} (${identity?.id || 'No ID'})`)

      refreshOnlineUsers()
    } catch (error) {
      addDebugLog(`Failed to initialize: ${error}`)
    }
  }

  const refreshOnlineUsers = async () => {
    setRefreshCount(prev => prev + 1)
    setLastUpdate(new Date())
    addDebugLog(`Refresh #${refreshCount + 1} - Checking online users...`)

    // Get network discovery users
    try {
      if (networkDiscovery) {
        const users = networkDiscovery.getNetworkUsers()
        const localUser = networkDiscovery.getLocalUser()
        setNetworkUsers(users)

        addDebugLog(`Network Discovery: Found ${users.length} other users`)
        addDebugLog(`Local User: ${localUser?.name || 'Unknown'} (${localUser?.ip || 'No IP'})`)

        users.forEach((user: any, index: number) => {
          addDebugLog(`  User ${index + 1}: ${user.name} @ ${user.ip} (${user.publicMemories.length} memories)`)
        })
      } else {
        addDebugLog('Network Discovery: Not initialized')
      }
    } catch (error) {
      addDebugLog(`Network Discovery Error: ${error}`)
    }

    // Get DXOS users
    try {
      if (client && isConnected) {
        const users = await client.getOnlineUsers()
        setDxosUsers(users || [])
        addDebugLog(`DXOS: Found ${users?.length || 0} online users`)

        if (users && users.length > 0) {
          users.forEach((user: any, index: number) => {
            addDebugLog(`  DXOS User ${index + 1}: ${user.profile?.displayName || 'Unknown'} (${user.id})`)
          })
        }
      } else {
        addDebugLog('DXOS: Not connected or client unavailable')
      }
    } catch (error) {
      addDebugLog(`DXOS Error: ${error}`)
    }

    // Check localStorage for network presence data
    try {
      const networkPresence = localStorage.getItem('etherith_network_presence')
      const ipfsNetwork = localStorage.getItem('etherith_ipfs_network')

      if (networkPresence) {
        const presence = JSON.parse(networkPresence)
        addDebugLog(`LocalStorage Network Presence: ${presence.name} @ ${presence.ip}`)
      }

      if (ipfsNetwork) {
        const ipfs = JSON.parse(ipfsNetwork)
        addDebugLog(`LocalStorage IPFS Network: ${ipfs.name} @ ${ipfs.ip}`)
      }
    } catch (error) {
      addDebugLog(`LocalStorage Error: ${error}`)
    }
  }

  const testNetworkBroadcast = () => {
    addDebugLog('Testing network broadcast...')
    try {
      if (networkDiscovery) {
        // Trigger a manual broadcast
        networkDiscovery.sharePublicMemory('test-memory-' + Date.now(), {
          title: 'Test Memory',
          content: 'This is a test memory for debugging',
          timestamp: Date.now(),
          fileType: 'text',
          tags: ['debug', 'test']
        })
        addDebugLog('Test broadcast sent successfully')
      }
    } catch (error) {
      addDebugLog(`Test broadcast failed: ${error}`)
    }
  }

  const clearDebugLogs = () => {
    setDebugLogs([])
    addDebugLog('Debug logs cleared')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="online-users-debug-overlay"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="online-users-debug-modal"
      >
        <div className="debug-header">
          <h2>🐛 Online Users Debug Panel</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="debug-content">
          {/* Status Section */}
          <div className="debug-section">
            <h3>📊 System Status</h3>
            <div className="status-grid">
              <div className="status-item">
                <span className="label">DXOS:</span>
                <span className={`status ${isConnected ? 'online' : 'offline'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Network Discovery:</span>
                <span className={`status ${networkDiscovery ? 'online' : 'offline'}`}>
                  {networkDiscovery ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Current Space:</span>
                <span className="value">{currentSpace?.id || 'None'}</span>
              </div>
              <div className="status-item">
                <span className="label">Identity:</span>
                <span className="value">{identity?.displayName || 'None'}</span>
              </div>
              <div className="status-item">
                <span className="label">Last Update:</span>
                <span className="value">{lastUpdate.toLocaleTimeString()}</span>
              </div>
              <div className="status-item">
                <span className="label">Refresh Count:</span>
                <span className="value">{refreshCount}</span>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="debug-section">
            <h3>🎮 Controls</h3>
            <div className="controls-grid">
              <button onClick={refreshOnlineUsers} className="debug-btn primary">
                🔄 Manual Refresh
              </button>
              <button onClick={testNetworkBroadcast} className="debug-btn secondary">
                📡 Test Broadcast
              </button>
              <button onClick={clearDebugLogs} className="debug-btn secondary">
                🧹 Clear Logs
              </button>
              <label className="auto-refresh-toggle">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto Refresh (3s)
              </label>
            </div>
          </div>

          {/* Users Section */}
          <div className="debug-section">
            <h3>👥 Online Users ({networkUsers.length} Network + {dxosUsers.length} DXOS)</h3>
            <div className="users-grid">
              <div className="user-category">
                <h4>Network Discovery Users</h4>
                {networkUsers.length === 0 ? (
                  <p className="no-users">No network users found</p>
                ) : (
                  networkUsers.map((user, index) => (
                    <div key={user.id} className="user-item">
                      <div className="user-info">
                        <span className="user-name">{user.name}</span>
                        <span className="user-ip">{user.ip}</span>
                        <span className="user-memories">{user.publicMemories.length} memories</span>
                        <span className="user-seen">
                          {Math.round((Date.now() - user.lastSeen) / 1000)}s ago
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="user-category">
                <h4>DXOS Users</h4>
                {dxosUsers.length === 0 ? (
                  <p className="no-users">No DXOS users found</p>
                ) : (
                  dxosUsers.map((user, index) => (
                    <div key={user.id || index} className="user-item">
                      <div className="user-info">
                        <span className="user-name">{user.profile?.displayName || 'Unknown'}</span>
                        <span className="user-id">{user.id}</span>
                        <span className="user-status">Active</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Debug Logs Section */}
          <div className="debug-section">
            <h3>📝 Debug Logs (Last 50)</h3>
            <div className="debug-logs">
              {debugLogs.map((log, index) => (
                <div key={index} className="log-entry">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}