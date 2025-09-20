/**
 * Space Invitation Manager Component
 * Handles creating, sharing, and managing space invitations
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDXOS, useMutation, useQuery } from '../../lib/dxos/context'
import { useSpaceUtils, SpaceInvitation } from '../../lib/dxos/utils/spaces'

interface SpaceInvitationManagerProps {
  className?: string
  spaceId?: string
  onInvitationCreated?: (invitation: SpaceInvitation) => void
}

export default function SpaceInvitationManager({
  className = '',
  spaceId,
  onInvitationCreated
}: SpaceInvitationManagerProps) {
  const { identity, currentSpace, spaces } = useDXOS()
  const { addObject, removeObject } = useMutation()
  const { createSpaceInvitation, useSpaceInvitation, hasPermission } = useSpaceUtils()

  const targetSpace = spaceId ? spaces.find(s => s.id === spaceId) : currentSpace

  // Query existing invitations
  const { data: invitations, loading: invitationsLoading, refetch: refetchInvitations } = useQuery<SpaceInvitation>(
    targetSpace ? { spaceId: targetSpace.id } : {}
  )

  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'join'>('create')
  const [isCreating, setIsCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinAuthCode, setJoinAuthCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  // Invitation creation form
  const [invitationForm, setInvitationForm] = useState({
    expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxUses: 10,
    requireAuth: false,
    description: ''
  })

  const [canInvite, setCanInvite] = useState(false)

  // Check permissions
  useEffect(() => {
    const checkPermissions = async () => {
      if (targetSpace && identity) {
        const hasInvitePermission = await hasPermission(targetSpace, identity.id, 'invite')
        setCanInvite(hasInvitePermission)
      }
    }
    checkPermissions()
  }, [targetSpace, identity, hasPermission])

  // Create new invitation
  const handleCreateInvitation = async () => {
    if (!targetSpace || !identity || !canInvite) return

    setIsCreating(true)
    try {
      const invitation = await createSpaceInvitation(targetSpace, identity.id, {
        expiresIn: invitationForm.expiresIn,
        maxUses: invitationForm.maxUses,
        requireAuth: invitationForm.requireAuth,
        metadata: {
          description: invitationForm.description,
          createdBy: identity.displayName
        }
      })

      await refetchInvitations()
      onInvitationCreated?.(invitation)

      console.log('✅ Invitation created:', invitation.id)

      // Reset form
      setInvitationForm({
        expiresIn: 7 * 24 * 60 * 60 * 1000,
        maxUses: 10,
        requireAuth: false,
        description: ''
      })
    } catch (error) {
      console.error('Failed to create invitation:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Join space using invitation
  const handleJoinSpace = async () => {
    if (!joinCode || !identity) return

    setIsJoining(true)
    try {
      // Find the invitation by code (simplified - in real implementation, would be more secure)
      const invitation = invitations.find(inv => inv.id === joinCode)
      if (!invitation) {
        throw new Error('Invalid invitation code')
      }

      const result = await useSpaceInvitation(
        targetSpace,
        invitation.id,
        identity.id,
        identity.displayName,
        joinAuthCode || undefined
      )

      if (result.success) {
        console.log('✅ Successfully joined space:', targetSpace?.id)
        setJoinCode('')
        setJoinAuthCode('')
        await refetchInvitations()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to join space:', error)
    } finally {
      setIsJoining(false)
    }
  }

  // Revoke invitation
  const handleRevokeInvitation = async (invitation: SpaceInvitation) => {
    if (!targetSpace) return

    try {
      await removeObject(invitation)
      await refetchInvitations()
      console.log('✅ Invitation revoked:', invitation.id)
    } catch (error) {
      console.error('Failed to revoke invitation:', error)
    }
  }

  // Copy invitation link
  const copyInvitationLink = (invitation: SpaceInvitation) => {
    const inviteUrl = `${window.location.origin}/space/join?code=${invitation.id}&space=${invitation.spaceId}`

    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl)
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = inviteUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    console.log('📋 Invitation link copied to clipboard')
  }

  // Format expiration time
  const formatExpirationTime = (expiresAt?: number) => {
    if (!expiresAt) return 'Never expires'

    const now = Date.now()
    const timeLeft = expiresAt - now

    if (timeLeft <= 0) return 'Expired'

    const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000))
    const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

    if (days > 0) return `Expires in ${days} day${days > 1 ? 's' : ''}`
    if (hours > 0) return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`
    return 'Expires soon'
  }

  // Get invitation status
  const getInvitationStatus = (invitation: SpaceInvitation) => {
    const isExpired = invitation.expiresAt && Date.now() > invitation.expiresAt
    const isMaxedOut = invitation.maxUses && invitation.currentUses >= invitation.maxUses

    if (isExpired) return { status: 'expired', color: 'red' }
    if (isMaxedOut) return { status: 'maxed', color: 'orange' }
    return { status: 'active', color: 'green' }
  }

  const renderCreateTab = () => (
    <motion.div
      className="create-invitation-form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h3>Create Space Invitation</h3>
      <p>Generate an invitation link for others to join this space.</p>

      <div className="form-section">
        <label>Description (optional)</label>
        <input
          type="text"
          value={invitationForm.description}
          onChange={(e) => setInvitationForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="What's this space about?"
          className="form-input"
        />
      </div>

      <div className="form-row">
        <div className="form-section">
          <label>Expires In</label>
          <select
            value={invitationForm.expiresIn}
            onChange={(e) => setInvitationForm(prev => ({ ...prev, expiresIn: Number(e.target.value) }))}
            className="form-select"
          >
            <option value={24 * 60 * 60 * 1000}>1 day</option>
            <option value={7 * 24 * 60 * 60 * 1000}>1 week</option>
            <option value={30 * 24 * 60 * 60 * 1000}>1 month</option>
            <option value={0}>Never</option>
          </select>
        </div>

        <div className="form-section">
          <label>Max Uses</label>
          <input
            type="number"
            value={invitationForm.maxUses}
            onChange={(e) => setInvitationForm(prev => ({ ...prev, maxUses: Number(e.target.value) }))}
            min="1"
            max="1000"
            className="form-input"
          />
        </div>
      </div>

      <div className="form-section">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={invitationForm.requireAuth}
            onChange={(e) => setInvitationForm(prev => ({ ...prev, requireAuth: e.target.checked }))}
          />
          Require authentication code
        </label>
        <small>When enabled, users will need an additional code to join</small>
      </div>

      <button
        onClick={handleCreateInvitation}
        disabled={isCreating || !canInvite}
        className="primary-button"
      >
        {isCreating ? 'Creating...' : 'Create Invitation'}
      </button>

      {!canInvite && (
        <p className="permission-warning">
          You don't have permission to create invitations in this space.
        </p>
      )}
    </motion.div>
  )

  const renderManageTab = () => (
    <motion.div
      className="manage-invitations"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h3>Manage Invitations</h3>

      {invitationsLoading ? (
        <div className="loading-state">Loading invitations...</div>
      ) : invitations.length === 0 ? (
        <div className="empty-state">
          <p>No invitations created yet</p>
          <p>Create your first invitation to start inviting others!</p>
        </div>
      ) : (
        <div className="invitations-list">
          {invitations.map(invitation => {
            const status = getInvitationStatus(invitation)

            return (
              <motion.div
                key={invitation.id}
                className="invitation-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="invitation-header">
                  <div className="invitation-info">
                    <h4>Invitation #{invitation.id.slice(-8)}</h4>
                    <p className="invitation-description">
                      {invitation.metadata?.description || 'No description'}
                    </p>
                  </div>
                  <div className={`invitation-status ${status.color}`}>
                    {status.status}
                  </div>
                </div>

                <div className="invitation-details">
                  <div className="detail-item">
                    <span className="label">Uses:</span>
                    <span className="value">
                      {invitation.currentUses} / {invitation.maxUses || '∞'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Expires:</span>
                    <span className="value">{formatExpirationTime(invitation.expiresAt)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Created:</span>
                    <span className="value">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {invitation.authCode && (
                    <div className="detail-item">
                      <span className="label">Auth Code:</span>
                      <span className="value auth-code">{invitation.authCode}</span>
                    </div>
                  )}
                </div>

                <div className="invitation-actions">
                  <button
                    onClick={() => copyInvitationLink(invitation)}
                    className="action-button copy"
                    disabled={status.status !== 'active'}
                  >
                    📋 Copy Link
                  </button>
                  <button
                    onClick={() => handleRevokeInvitation(invitation)}
                    className="action-button revoke"
                  >
                    🗑️ Revoke
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )

  const renderJoinTab = () => (
    <motion.div
      className="join-space-form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h3>Join Space</h3>
      <p>Enter an invitation code to join a space.</p>

      <div className="form-section">
        <label>Invitation Code</label>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter invitation code..."
          className="form-input"
        />
      </div>

      <div className="form-section">
        <label>Authentication Code (if required)</label>
        <input
          type="text"
          value={joinAuthCode}
          onChange={(e) => setJoinAuthCode(e.target.value)}
          placeholder="Enter auth code if required..."
          className="form-input"
        />
      </div>

      <button
        onClick={handleJoinSpace}
        disabled={isJoining || !joinCode}
        className="primary-button"
      >
        {isJoining ? 'Joining...' : 'Join Space'}
      </button>
    </motion.div>
  )

  if (!identity) {
    return (
      <div className={`space-invitation-manager ${className}`}>
        <div className="auth-required">
          <p>Please create an identity to manage space invitations.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-invitation-manager ${className}`}>
      <div className="invitation-tabs">
        <button
          onClick={() => setActiveTab('create')}
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
        >
          Create
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`}
        >
          Manage ({invitations.length})
        </button>
        <button
          onClick={() => setActiveTab('join')}
          className={`tab-button ${activeTab === 'join' ? 'active' : ''}`}
        >
          Join
        </button>
      </div>

      <div className="invitation-content">
        <AnimatePresence mode="wait">
          {activeTab === 'create' && renderCreateTab()}
          {activeTab === 'manage' && renderManageTab()}
          {activeTab === 'join' && renderJoinTab()}
        </AnimatePresence>
      </div>
    </div>
  )
}