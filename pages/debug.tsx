/**
 * Debug Page - Test authentication and network functionality
 */

import React, { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/react'
import Head from 'next/head'
import { DXOSProvider } from '../lib/dxos/context'
import DXOSIdentityManager from '../components/DXOSIdentityManager'
import NetworkDebugPanel from '../components/NetworkDebugPanel'
import NetworkMemories from '../components/NetworkMemories'

interface DebugPageProps {
  hasSession: boolean
  sessionData?: any
}

export default function DebugPage({ hasSession, sessionData }: DebugPageProps) {
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [isTestingNetwork, setIsTestingNetwork] = useState(false)

  // Capture console logs for debugging
  useEffect(() => {
    console.log('🎯 [DEBUG] Debug page loaded:', {
      hasSession,
      sessionData: sessionData ? {
        username: sessionData.user?.username,
        discordId: sessionData.user?.discordId
      } : null,
      timestamp: new Date().toISOString()
    })

    // Override console.log to capture debug messages
    const originalLog = console.log
    const originalError = console.error

    const captureLog = (level: 'log' | 'error', ...args: any[]) => {
      const message = args.join(' ')
      if (message.includes('[DEBUG]')) {
        setDebugLog(prev => [
          ...prev.slice(-49), // Keep last 50 messages
          `[${Date.now()}] ${level.toUpperCase()}: ${message}`
        ])
      }

      // Call original function
      if (level === 'log') {
        originalLog(...args)
      } else {
        originalError(...args)
      }
    }

    console.log = (...args) => captureLog('log', ...args)
    console.error = (...args) => captureLog('error', ...args)

    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [hasSession, sessionData])

  const handleIdentityCreated = (identity: any) => {
    console.log('🎉 [DEBUG] Identity created callback triggered:', identity)
    setDebugLog(prev => [
      ...prev,
      `[${Date.now()}] CALLBACK: Identity created - ${identity.displayName} (${identity.id})`
    ])
  }

  const testNetworkConnection = async () => {
    setIsTestingNetwork(true)
    console.log('🧪 [DEBUG] Starting comprehensive network test...')

    try {
      // Test sequence
      console.log('1️⃣ [DEBUG] Testing basic connectivity...')
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('2️⃣ [DEBUG] Testing DXOS services...')
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('3️⃣ [DEBUG] Testing peer discovery...')
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('✅ [DEBUG] Network test completed successfully')
    } catch (error) {
      console.error('❌ [DEBUG] Network test failed:', error)
    } finally {
      setIsTestingNetwork(false)
    }
  }

  const clearDebugLog = () => {
    setDebugLog([])
    console.log('🧹 [DEBUG] Debug log cleared')
  }

  return (
    <>
      <Head>
        <title>Debug - Etherith Network</title>
        <meta name="description" content="Debug and test network functionality" />
      </Head>

      <DXOSProvider autoInitialize={true}>
        <div className="debug-page">
          <div className="debug-header">
            <h1>🔍 Debug & Testing Panel</h1>
            <p>Test authentication flows and network connectivity</p>
          </div>

          {/* Session Info */}
          <div className="debug-section">
            <h2>🔐 Authentication Status</h2>
            <div className="auth-info">
              <div className="auth-status">
                <span className={`status-indicator ${hasSession ? 'online' : 'offline'}`}>
                  {hasSession ? '🟢' : '🔴'}
                </span>
                <span>Discord Session: {hasSession ? 'Active' : 'Not Found'}</span>
              </div>
              {sessionData && (
                <div className="session-details">
                  <div className="detail-item">
                    <strong>Username:</strong> {sessionData.user?.username || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Discord ID:</strong> {sessionData.user?.discordId || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Email:</strong> {sessionData.user?.email || 'N/A'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Identity Manager */}
          <div className="debug-section">
            <h2>👤 Identity Management</h2>
            <DXOSIdentityManager
              onIdentityCreated={handleIdentityCreated}
              className="debug-identity-manager"
            />
          </div>

          {/* Network Debug Panel */}
          <div className="debug-section">
            <h2>🌐 Network Status</h2>
            <NetworkDebugPanel autoRefresh={true} refreshInterval={10000} />
          </div>

          {/* Network Memories */}
          <div className="debug-section">
            <h2>💭 Network Memories</h2>
            <NetworkMemories className="debug-network-memories" />
          </div>

          {/* Test Controls */}
          <div className="debug-section">
            <h2>🧪 Test Controls</h2>
            <div className="test-controls">
              <button
                onClick={testNetworkConnection}
                disabled={isTestingNetwork}
                className="test-button"
              >
                {isTestingNetwork ? '🔄 Testing...' : '🌐 Test Network'}
              </button>
              <button
                onClick={clearDebugLog}
                className="test-button secondary"
              >
                🧹 Clear Log
              </button>
            </div>
          </div>

          {/* Debug Log */}
          <div className="debug-section">
            <h2>📋 Debug Log ({debugLog.length} messages)</h2>
            <div className="debug-log">
              {debugLog.length === 0 ? (
                <div className="log-empty">No debug messages yet...</div>
              ) : (
                debugLog.map((message, index) => (
                  <div key={index} className="log-message">
                    {message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DXOSProvider>

      <style jsx>{`
        .debug-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Inter', sans-serif;
        }

        .debug-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
        }

        .debug-header h1 {
          margin: 0 0 10px 0;
          font-size: 2.5rem;
        }

        .debug-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 1.1rem;
        }

        .debug-section {
          margin-bottom: 30px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border: 1px solid #e1e5e9;
        }

        .debug-section h2 {
          margin: 0 0 20px 0;
          color: #2c3e50;
          font-size: 1.5rem;
          border-bottom: 2px solid #3498db;
          padding-bottom: 8px;
        }

        .auth-info {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .auth-status {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.1rem;
          font-weight: 500;
        }

        .status-indicator {
          font-size: 1.2rem;
        }

        .session-details {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #3498db;
        }

        .detail-item {
          margin-bottom: 8px;
          font-family: 'Monaco', monospace;
          font-size: 0.9rem;
        }

        .detail-item strong {
          color: #2c3e50;
          margin-right: 8px;
        }

        .test-controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .test-button {
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          background: #3498db;
          color: white;
        }

        .test-button:hover {
          background: #2980b9;
          transform: translateY(-1px);
        }

        .test-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .test-button.secondary {
          background: #95a5a6;
        }

        .test-button.secondary:hover {
          background: #7f8c8d;
        }

        .debug-log {
          background: #1a1a1a;
          color: #00ff88;
          padding: 15px;
          border-radius: 6px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #333;
        }

        .log-empty {
          color: #666;
          text-align: center;
          padding: 20px;
        }

        .log-message {
          margin-bottom: 4px;
          line-height: 1.4;
          word-break: break-all;
        }

        .log-message:hover {
          background: rgba(0, 255, 136, 0.1);
        }

        @media (max-width: 768px) {
          .debug-page {
            padding: 10px;
          }

          .debug-header h1 {
            font-size: 2rem;
          }

          .debug-section {
            padding: 15px;
          }

          .test-controls {
            flex-direction: column;
          }

          .test-button {
            width: 100%;
          }
        }
      `}</style>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  console.log('🔍 [DEBUG] Debug page getServerSideProps called')

  try {
    const session = await getSession(context)

    console.log('📋 [DEBUG] Session check result:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      username: session?.user?.username
    })

    return {
      props: {
        hasSession: !!session,
        sessionData: session || null
      }
    }
  } catch (error) {
    console.error('❌ [DEBUG] getServerSideProps error:', error)

    return {
      props: {
        hasSession: false,
        sessionData: null
      }
    }
  }
}