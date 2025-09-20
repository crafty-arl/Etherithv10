import React, { useState, useEffect } from 'react'
import { getNetworkDiscovery } from '../utils/network-discovery'

interface NetworkDiagnosticsProps {
  onClose?: () => void
}

export const NetworkDiagnostics: React.FC<NetworkDiagnosticsProps> = ({ onClose }) => {
  const [diagnostics, setDiagnostics] = useState<any>({})
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    setLogs(prev => [logEntry, ...prev.slice(0, 19)]) // Keep last 20 logs
    console.log('🔍 [NETWORK DIAGNOSTICS]', message)
  }

  const runNetworkDiagnostics = async () => {
    setIsRunning(true)
    addLog('Starting comprehensive network diagnostics...')

    const results: any = {}

    try {
      // Test 1: Check local IP detection
      addLog('1. Testing local IP detection...')
      const localIP = await getLocalIPDiagnostic()
      results.localIP = localIP
      addLog(`Local IP detected: ${localIP}`)

      // Test 2: Check WebRTC capability
      addLog('2. Testing WebRTC capability...')
      const webrtcSupported = await testWebRTC()
      results.webrtcSupported = webrtcSupported
      addLog(`WebRTC supported: ${webrtcSupported}`)

      // Test 3: Check localStorage functionality
      addLog('3. Testing localStorage functionality...')
      const localStorageWorking = testLocalStorage()
      results.localStorageWorking = localStorageWorking
      addLog(`localStorage working: ${localStorageWorking}`)

      // Test 4: Check if behind NAT
      addLog('4. Checking NAT/Firewall status...')
      const natInfo = await checkNATStatus()
      results.natInfo = natInfo
      addLog(`NAT/Network info: ${JSON.stringify(natInfo)}`)

      // Test 5: Check network discovery service status
      addLog('5. Checking network discovery service...')
      const networkDiscovery = getNetworkDiscovery()
      const localUser = networkDiscovery.getLocalUser()
      const networkUsers = networkDiscovery.getNetworkUsers()
      results.networkService = {
        localUser,
        networkUsersCount: networkUsers.length,
        isOnNetwork: networkDiscovery.isOnNetwork()
      }
      addLog(`Network service - Local user: ${localUser?.name}, Users found: ${networkUsers.length}`)

      // Test 6: Check localStorage presence data
      addLog('6. Checking localStorage presence data...')
      const presenceData = {
        networkPresence: localStorage.getItem('etherith_network_presence'),
        ipfsNetwork: localStorage.getItem('etherith_ipfs_network'),
        userName: localStorage.getItem('etherith_user_name'),
        dxosIdentity: localStorage.getItem('etherith_dxos_identity')
      }
      results.presenceData = presenceData
      addLog(`Presence data keys found: ${Object.keys(presenceData).filter(k => presenceData[k as keyof typeof presenceData]).join(', ')}`)

      // Test 7: Test manual broadcast
      addLog('7. Testing manual presence broadcast...')
      try {
        networkDiscovery.sharePublicMemory('diagnostic-test-' + Date.now(), {
          title: 'Network Diagnostic Test',
          content: 'This is a diagnostic test memory',
          timestamp: Date.now(),
          fileType: 'text',
          tags: ['diagnostic']
        })
        addLog('Manual broadcast successful')
        results.manualBroadcast = true
      } catch (error) {
        addLog(`Manual broadcast failed: ${error}`)
        results.manualBroadcast = false
      }

      setDiagnostics(results)
      addLog('✅ Network diagnostics completed')

    } catch (error) {
      addLog(`❌ Diagnostics failed: ${error}`)
      results.error = error
      setDiagnostics(results)
    } finally {
      setIsRunning(false)
    }
  }

  // Helper functions for diagnostics
  const getLocalIPDiagnostic = async (): Promise<string> => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })

      return new Promise((resolve) => {
        pc.createDataChannel('')
        pc.createOffer().then(offer => pc.setLocalDescription(offer))

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate
            const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/)
            if (ipMatch) {
              pc.close()
              resolve(ipMatch[1])
            }
          }
        }

        setTimeout(() => {
          pc.close()
          resolve('127.0.0.1')
        }, 3000)
      })
    } catch (error) {
      return 'Failed to detect'
    }
  }

  const testWebRTC = async (): Promise<boolean> => {
    try {
      const pc = new RTCPeerConnection()
      pc.close()
      return true
    } catch (error) {
      return false
    }
  }

  const testLocalStorage = (): boolean => {
    try {
      const testKey = 'etherith_diagnostic_test'
      localStorage.setItem(testKey, 'test')
      const result = localStorage.getItem(testKey) === 'test'
      localStorage.removeItem(testKey)
      return result
    } catch (error) {
      return false
    }
  }

  const checkNATStatus = async (): Promise<any> => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })

      return new Promise((resolve) => {
        const candidates: string[] = []

        pc.createDataChannel('')
        pc.createOffer().then(offer => pc.setLocalDescription(offer))

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            candidates.push(event.candidate.candidate)
          }
        }

        setTimeout(() => {
          pc.close()
          const hasLocal = candidates.some(c => c.includes('typ host'))
          const hasReflexive = candidates.some(c => c.includes('typ srflx'))
          const hasRelay = candidates.some(c => c.includes('typ relay'))

          resolve({
            candidatesFound: candidates.length,
            hasLocalCandidates: hasLocal,
            hasReflexiveCandidates: hasReflexive,
            hasRelayCandidates: hasRelay,
            samples: candidates.slice(0, 3) // First 3 candidates for debugging
          })
        }, 5000)
      })
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }

  useEffect(() => {
    addLog('Network Diagnostics component initialized')
  }, [])

  return (
    <div className="online-users-debug-overlay">
      <div className="online-users-debug-modal">
        <div className="debug-header">
          <h2>🔍 Network Diagnostics</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="debug-content">
          {/* Controls */}
          <div className="debug-section">
            <h3>🎮 Diagnostic Controls</h3>
            <button
              onClick={runNetworkDiagnostics}
              disabled={isRunning}
              className="debug-btn primary"
              style={{ width: '200px', marginBottom: '10px' }}
            >
              {isRunning ? '🔄 Running...' : '🔍 Run Full Diagnostics'}
            </button>
          </div>

          {/* Results */}
          {Object.keys(diagnostics).length > 0 && (
            <div className="debug-section">
              <h3>📊 Diagnostic Results</h3>
              <div style={{ background: '#1a1a1a', color: '#00ff88', padding: '15px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(diagnostics, null, 2)}
              </div>
            </div>
          )}

          {/* Live Logs */}
          <div className="debug-section">
            <h3>📝 Diagnostic Logs</h3>
            <div className="debug-logs">
              {logs.length === 0 ? (
                <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  No diagnostic logs yet. Click "Run Full Diagnostics" to start.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Common Issues & Solutions */}
          <div className="debug-section">
            <h3>💡 Common Network Discovery Issues</h3>
            <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '15px' }}>
                <strong>🔴 No network users found:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  <li>Users must be on the same local network (WiFi/LAN)</li>
                  <li>Network discovery uses localStorage - may not work across different domains</li>
                  <li>Browsers may block WebRTC in some environments</li>
                  <li>Corporate firewalls may block peer discovery</li>
                </ul>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <strong>🟡 Local IP shows 127.0.0.1:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  <li>WebRTC is blocked or not working</li>
                  <li>STUN servers are unreachable</li>
                  <li>Browser security settings are too restrictive</li>
                </ul>
              </div>

              <div>
                <strong>🟢 To test with multiple users:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  <li>Open the app in multiple browser tabs/windows</li>
                  <li>Have other people on your network access the same URL</li>
                  <li>Ensure everyone has created DXOS identities</li>
                  <li>Check that localStorage is enabled in all browsers</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}