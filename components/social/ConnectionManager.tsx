/**
 * Connection Manager Component
 * Handles friend requests, follows, and social connections in the DXOS network
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDXOS, useMutation, useQuery } from '../../lib/dxos/context'
import { Connection, UserProfile, createConnection } from '../../lib/dxos/client'

interface ConnectionManagerProps {
  className?: string
  userId?: string // If provided, shows connections for specific user
  showPendingOnly?: boolean
}

interface ConnectionRequest {
  connection: Connection
  userProfile?: UserProfile
}

export default function ConnectionManager({
  className = '',
  userId,
  showPendingOnly = false
}: ConnectionManagerProps) {
  const { identity, currentSpace } = useDXOS()
  const { addObject, removeObject } = useMutation()

  // Query connections
  const { data: connections, loading: connectionsLoading, refetch: refetchConnections } = useQuery<Connection>(
    userId ? { $or: [{ fromUserId: userId }, { toUserId: userId }] } :
    identity ? { $or: [{ fromUserId: identity.id }, { toUserId: identity.id }] } : {}
  )

  // Query user profiles for connection requests
  const { data: userProfiles } = useQuery<UserProfile>()

  const [selectedTab, setSelectedTab] = useState<'following' | 'followers' | 'pending'>('following')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])

  // Filter connections by type and status
  const getConnectionsByType = (type: Connection['type'], status?: Connection['status']) => {
    return connections.filter(conn => {
      const matchesType = conn.type === type
      const matchesStatus = !status || conn.status === status
      const isRelevant = showPendingOnly ? conn.status === 'pending' : true
      return matchesType && matchesStatus && isRelevant
    })
  }

  const pendingRequests = getConnectionsByType('friend', 'pending')
    .filter(conn => conn.toUserId === identity?.id) // Incoming requests

  const sentRequests = getConnectionsByType('friend', 'pending')
    .filter(conn => conn.fromUserId === identity?.id) // Outgoing requests

  const friends = getConnectionsByType('friend', 'accepted')
  const following = getConnectionsByType('follow', 'accepted')
  const followers = connections.filter(conn =>
    conn.type === 'follow' &&
    conn.status === 'accepted' &&
    conn.toUserId === identity?.id
  )

  // Get user profile for connection
  const getUserProfile = (connection: Connection): UserProfile | undefined => {
    const targetUserId = connection.fromUserId === identity?.id ? connection.toUserId : connection.fromUserId
    return userProfiles.find(profile => profile.id === targetUserId)
  }

  // Create connection request
  const createConnectionRequest = async (targetUserId: string, type: Connection['type']) => {
    if (!identity || !currentSpace) return

    try {
      const connectionData: Connection = {
        id: `${identity.id}-${targetUserId}-${Date.now()}`,
        fromUserId: identity.id,
        toUserId: targetUserId,
        type,
        status: (type === 'follow' ? 'accepted' : 'pending') as Connection['status'], // Follow is immediate, friend needs approval
        timestamp: Date.now()
      }

      await createConnection(currentSpace, connectionData)
      await refetchConnections()

      console.log(`✅ ${type} request sent to user:`, targetUserId)
    } catch (error) {
      console.error(`Failed to send ${type} request:`, error)
    }
  }

  // Respond to connection request
  const respondToConnectionRequest = async (connection: Connection, response: 'accepted' | 'rejected') => {
    if (!currentSpace) return

    try {
      const updatedConnection: Connection = {
        ...connection,
        status: response,
        updatedAt: Date.now()
      }

      await removeObject(connection)
      await addObject(updatedConnection)
      await refetchConnections()

      console.log(`✅ Connection request ${response}:`, connection.id)
    } catch (error) {
      console.error(`Failed to ${response} connection request:`, error)
    }
  }

  // Remove connection
  const removeConnection = async (connection: Connection) => {
    if (!currentSpace) return

    try {
      await removeObject(connection)
      await refetchConnections()
      console.log('✅ Connection removed:', connection.id)
    } catch (error) {
      console.error('Failed to remove connection:', error)
    }
  }

  // Search for users
  const searchUsers = async (query: string) => {
    if (!query.trim() || !currentSpace) return

    setIsSearching(true)
    try {
      // Search user profiles by display name
      const results = userProfiles.filter(profile =>
        profile.displayName.toLowerCase().includes(query.toLowerCase()) &&
        profile.id !== identity?.id // Exclude self
      )
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, userProfiles, identity])

  // Check if connection exists
  const getConnectionStatus = (targetUserId: string): {
    status: 'none' | 'pending' | 'connected' | 'following' | 'follower'
    connection?: Connection
  } => {
    const existingConnection = connections.find(conn =>
      (conn.fromUserId === identity?.id && conn.toUserId === targetUserId) ||
      (conn.fromUserId === targetUserId && conn.toUserId === identity?.id)
    )

    if (!existingConnection) return { status: 'none' }

    if (existingConnection.status === 'pending') {
      return { status: 'pending', connection: existingConnection }
    }

    if (existingConnection.type === 'friend' && existingConnection.status === 'accepted') {
      return { status: 'connected', connection: existingConnection }
    }

    if (existingConnection.type === 'follow' && existingConnection.status === 'accepted') {
      const isFollowing = existingConnection.fromUserId === identity?.id
      return {
        status: isFollowing ? 'following' : 'follower',
        connection: existingConnection
      }
    }

    return { status: 'none' }
  }

  const renderConnectionCard = (connection: Connection, showActions = true) => {
    const userProfile = getUserProfile(connection)
    const isIncoming = connection.toUserId === identity?.id

    return (
      <motion.div
        key={connection.id}
        className="connection-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <div className="connection-info">
          <div className="user-avatar">
            {userProfile?.avatar ? (
              <img src={userProfile.avatar} alt={userProfile.displayName} />
            ) : (
              <span>{userProfile?.displayName?.charAt(0)?.toUpperCase() || '?'}</span>
            )}
          </div>
          <div className="user-details">
            <h4>{userProfile?.displayName || 'Unknown User'}</h4>
            <p className="connection-type">
              {connection.type === 'friend' ? '👥 Friend' : '👀 Following'}
              {connection.status === 'pending' && (
                <span className="status-badge pending">
                  {isIncoming ? 'Incoming' : 'Sent'}
                </span>
              )}
            </p>
            <p className="connection-date">
              {connection.type === 'friend' && connection.status === 'pending' ? 'Requested' : 'Connected'} {' '}
              {new Date(connection.createdAt || connection.timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>

        {showActions && (
          <div className="connection-actions">
            {connection.status === 'pending' && isIncoming && (
              <>
                <button
                  onClick={() => respondToConnectionRequest(connection, 'accepted')}
                  className="action-button accept"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => respondToConnectionRequest(connection, 'rejected')}
                  className="action-button reject"
                >
                  ✗ Decline
                </button>
              </>
            )}
            {connection.status === 'accepted' && (
              <button
                onClick={() => removeConnection(connection)}
                className="action-button remove"
              >
                Remove
              </button>
            )}
            {connection.status === 'pending' && !isIncoming && (
              <button
                onClick={() => removeConnection(connection)}
                className="action-button cancel"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  const renderUserSearchCard = (userProfile: UserProfile) => {
    const connectionStatus = getConnectionStatus(userProfile.id)

    return (
      <motion.div
        key={userProfile.id}
        className="user-search-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className="user-info">
          <div className="user-avatar">
            {userProfile.avatar ? (
              <img src={userProfile.avatar} alt={userProfile.displayName} />
            ) : (
              <span>{userProfile.displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="user-details">
            <h4>{userProfile.displayName}</h4>
            {userProfile.bio && <p className="user-bio">{userProfile.bio}</p>}
            <p className="user-stats">
              {userProfile.socialStats?.followers || 0} followers • {' '}
              {userProfile.socialStats?.posts || 0} posts
            </p>
          </div>
        </div>

        <div className="connection-actions">
          {connectionStatus.status === 'none' && (
            <>
              <button
                onClick={() => createConnectionRequest(userProfile.id, 'follow')}
                className="action-button follow"
              >
                👀 Follow
              </button>
              <button
                onClick={() => createConnectionRequest(userProfile.id, 'friend')}
                className="action-button friend"
              >
                👥 Add Friend
              </button>
            </>
          )}
          {connectionStatus.status === 'pending' && (
            <span className="status-text">Request Pending</span>
          )}
          {connectionStatus.status === 'connected' && (
            <span className="status-text">✓ Friends</span>
          )}
          {connectionStatus.status === 'following' && (
            <button
              onClick={() => connectionStatus.connection && removeConnection(connectionStatus.connection)}
              className="action-button unfollow"
            >
              Unfollow
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  if (connectionsLoading) {
    return (
      <div className={`connection-manager loading ${className}`}>
        <div className="loading-spinner">Loading connections...</div>
      </div>
    )
  }

  return (
    <div className={`connection-manager ${className}`}>
      {/* Search Section */}
      <div className="search-section">
        <div className="search-input-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for users to connect..."
            className="search-input"
          />
          {isSearching && <div className="search-spinner">🔍</div>}
        </div>

        {searchResults.length > 0 && (
          <motion.div
            className="search-results"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3>Search Results</h3>
            <div className="search-results-list">
              {searchResults.map(renderUserSearchCard)}
            </div>
          </motion.div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="pending-section">
          <h3>Pending Friend Requests ({pendingRequests.length})</h3>
          <div className="connections-list">
            {pendingRequests.map(connection => renderConnectionCard(connection))}
          </div>
        </div>
      )}

      {/* Connections Tabs */}
      {!showPendingOnly && (
        <>
          <div className="connections-tabs">
            <button
              onClick={() => setSelectedTab('following')}
              className={`tab-button ${selectedTab === 'following' ? 'active' : ''}`}
            >
              Following ({following.length})
            </button>
            <button
              onClick={() => setSelectedTab('followers')}
              className={`tab-button ${selectedTab === 'followers' ? 'active' : ''}`}
            >
              Followers ({followers.length})
            </button>
            <button
              onClick={() => setSelectedTab('pending')}
              className={`tab-button ${selectedTab === 'pending' ? 'active' : ''}`}
            >
              Pending ({sentRequests.length})
            </button>
          </div>

          <div className="connections-content">
            <AnimatePresence mode="wait">
              {selectedTab === 'following' && (
                <motion.div
                  key="following"
                  className="connections-list"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {following.length > 0 ? (
                    following.map(connection => renderConnectionCard(connection))
                  ) : (
                    <div className="empty-state">
                      <p>You're not following anyone yet</p>
                      <p>Search for users above to start connecting!</p>
                    </div>
                  )}
                </motion.div>
              )}

              {selectedTab === 'followers' && (
                <motion.div
                  key="followers"
                  className="connections-list"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {followers.length > 0 ? (
                    followers.map(connection => renderConnectionCard(connection))
                  ) : (
                    <div className="empty-state">
                      <p>No followers yet</p>
                      <p>Share some memories to attract followers!</p>
                    </div>
                  )}
                </motion.div>
              )}

              {selectedTab === 'pending' && (
                <motion.div
                  key="pending"
                  className="connections-list"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {sentRequests.length > 0 ? (
                    sentRequests.map(connection => renderConnectionCard(connection))
                  ) : (
                    <div className="empty-state">
                      <p>No pending requests</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Friends Section */}
      {friends.length > 0 && (
        <div className="friends-section">
          <h3>Friends ({friends.length})</h3>
          <div className="connections-list">
            {friends.map(connection => renderConnectionCard(connection))}
          </div>
        </div>
      )}
    </div>
  )
}