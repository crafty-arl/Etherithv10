/**
 * DXOS Identity Manager Component
 * Handles peer-to-peer identity creation and management
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDXOS, useIdentity } from '../lib/dxos/context'
import { useSession } from 'next-auth/react'

interface DXOSIdentityManagerProps {
  className?: string
  onIdentityCreated?: (identity: any) => void
}

export default function DXOSIdentityManager({
  className = '',
  onIdentityCreated
}: DXOSIdentityManagerProps) {
  const { data: session } = useSession()
  const { isInitialized, error, clearError } = useDXOS()
  const { identity, createIdentity, hasIdentity, isConnected } = useIdentity()

  const [isCreatingIdentity, setIsCreatingIdentity] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Auto-populate display name from Discord session
  useEffect(() => {
    if (session?.user && !displayName) {
      // Prefer Discord username over display name for consistency
      const discordName = session.user.username || session.user.name || 'Anonymous'
      setDisplayName(discordName)
    }
  }, [session, displayName])

  // Auto-create identity when Discord user is present and DXOS is ready
  useEffect(() => {
    console.log('🔍 [DEBUG] Identity creation check:', {
      hasSession: !!session?.user,
      isInitialized,
      hasIdentity,
      isCreatingIdentity,
      hasDisplayName: !!displayName,
      sessionUser: session?.user ? {
        username: session.user.username,
        name: session.user.name,
        discordId: session.user.discordId
      } : null,
      timestamp: new Date().toISOString()
    })

    if (session?.user && isInitialized && !hasIdentity && !isCreatingIdentity && displayName) {
      console.log('🎯 [DEBUG] All conditions met, auto-creating DXOS identity:', {
        displayName,
        discordUsername: session.user.username,
        timestamp: new Date().toISOString()
      })
      handleCreateIdentity()
    } else {
      console.log('⏸️ [DEBUG] Identity creation conditions not met, waiting...')
    }
  }, [session, isInitialized, hasIdentity, isCreatingIdentity, displayName])

  /**
   * Handle identity creation
   */
  const handleCreateIdentity = async () => {
    if (!displayName.trim()) {
      console.log('⚠️ [DEBUG] Cannot create identity - display name is empty')
      return
    }

    console.log('🚀 [DEBUG] Starting identity creation process...')

    try {
      setIsCreatingIdentity(true)
      clearError()

      // Use Discord-synced display name
      const identityName = displayName.trim()
      console.log('🔄 [DEBUG] Creating DXOS identity:', {
        identityName,
        originalDisplayName: displayName,
        trimmed: identityName,
        timestamp: new Date().toISOString()
      })

      // Prepare Discord data for identity creation
      const discordData = session?.user ? {
        discordId: session.user.discordId,
        username: session.user.username,
        avatar: session.user.avatar
      } : undefined

      console.log('📋 [DEBUG] Discord data prepared:', {
        hasDiscordData: !!discordData,
        discordData: discordData || 'None'
      })

      const createStart = Date.now()
      const newIdentity = await createIdentity(identityName, discordData)
      const createTime = Date.now() - createStart

      console.log('✅ [DEBUG] Identity creation completed:', {
        identityId: newIdentity.id,
        displayName: newIdentity.displayName,
        createTime: `${createTime}ms`,
        hasDiscordLink: !!discordData,
        timestamp: new Date().toISOString()
      })

      if (session?.user) {
        console.log('🔗 [DEBUG] DXOS identity successfully linked to Discord:', {
          dxosId: newIdentity.id,
          dxosName: newIdentity.displayName,
          discordId: session.user.discordId,
          discordUsername: session.user.username
        })
      }

      console.log('📞 [DEBUG] Calling onIdentityCreated callback...')
      onIdentityCreated?.(newIdentity)
      console.log('✅ [DEBUG] Identity creation process completed successfully')
    } catch (err) {
      console.error('❌ [DEBUG] Identity creation failed:', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace',
        displayName: displayName,
        hasSession: !!session?.user,
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsCreatingIdentity(false)
      console.log('🏁 [DEBUG] Identity creation process finished (cleanup completed)')
    }
  }

  // Show loading state while DXOS initializes
  if (!isInitialized) {
    return (
      <div className={`dxos-identity-manager ${className}`}>
        <motion.div
          className="initialization-state"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="init-icon">🌐</div>
          <h3>Initializing Peer-to-Peer Network</h3>
          <p>Setting up decentralized infrastructure...</p>
          <div className="loading-spinner">
            <motion.div
              className="spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              ⚡
            </motion.div>
          </div>
        </motion.div>
      </div>
    )
  }

  // Show identity connected state
  if (hasIdentity && isConnected) {
    return (
      <motion.div
        className={`dxos-identity-manager connected ${className}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="identity-status">
          <div className="status-header">
            <div className="identity-avatar">
              {identity.displayName?.charAt(0)?.toUpperCase() || '👤'}
            </div>
            <div className="identity-info">
              <h4>Connected as {identity.displayName}</h4>
              <p className="identity-id">ID: {identity.id?.slice(0, 12)}...</p>
              {session?.user && (
                <p className="discord-link">🔗 Linked to Discord: @{session.user.username}</p>
              )}
            </div>
            <div className="connection-indicator">
              <span className="status-dot online"></span>
              <span className="status-text">Connected</span>
            </div>
          </div>

          {showAdvanced && (
            <motion.div
              className="advanced-info"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="info-section">
                <h5>Identity Details</h5>
                <div className="detail-item">
                  <span className="label">Full ID:</span>
                  <span className="value">{identity.id}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Display Name:</span>
                  <span className="value">{identity.displayName}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Network Status:</span>
                  <span className="value">🟢 Online</span>
                </div>
              </div>
            </motion.div>
          )}

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="toggle-advanced-button"
          >
            {showAdvanced ? '📤 Hide Details' : '📥 Show Details'}
          </button>
        </div>
      </motion.div>
    )
  }

  // Show identity creation form
  return (
    <div className={`dxos-identity-manager ${className}`}>
      <AnimatePresence>
        {error && (
          <motion.div
            className="error-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button onClick={clearError} className="error-close">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="identity-creation"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="creation-header">
          <div className="creation-icon">🚀</div>
          <h3>Create Your Peer-to-Peer Identity</h3>
          <p>
            Join the decentralized social network. Your identity is cryptographically secured
            and owned entirely by you.
          </p>
        </div>

        <div className="creation-form">
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name..."
              disabled={isCreatingIdentity}
              className="display-name-input"
              maxLength={50}
            />
            <div className="input-help">
              This name will be visible to other users on the network
            </div>
          </div>

          {session?.user && (
            <div className="session-info">
              <div className="session-icon">🔗</div>
              <span>
                Synced with Discord: @{session.user.username}
              </span>
              <div className="auto-sync-notice">
                <small>Your DXOS identity will use your Discord username</small>
              </div>
            </div>
          )}

          <motion.button
            onClick={handleCreateIdentity}
            disabled={isCreatingIdentity || !displayName.trim()}
            className="create-identity-button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {isCreatingIdentity ? (
              <>
                <motion.span
                  className="button-spinner"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  ⚡
                </motion.span>
                Creating Identity...
              </>
            ) : (
              <>
                <span className="button-icon">✨</span>
                Create P2P Identity
              </>
            )}
          </motion.button>
        </div>

        <div className="security-notice">
          <div className="notice-icon">🔐</div>
          <div className="notice-content">
            <h5>Privacy & Security</h5>
            <ul>
              <li>Your identity is generated locally and cryptographically secured</li>
              <li>No personal data is sent to centralized servers</li>
              <li>You maintain full control over your digital identity</li>
              <li>All communications are peer-to-peer encrypted</li>
            </ul>
          </div>
        </div>

        <div className="features-preview">
          <h5>What you'll be able to do:</h5>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">💬</span>
              <span>Share memories with the network</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤝</span>
              <span>Connect with other users</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🌐</span>
              <span>Join communities and spaces</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔄</span>
              <span>Real-time collaboration</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}