/**
 * DXOS Memory Manager Component
 * Replaces local storage with DXOS-powered peer-to-peer memory management
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDXOS, useQuery, useMutation, useIdentity, useCrossSpaceQuery } from '../lib/dxos/context'
import { Memory, createMemory } from '../lib/dxos/client'
import SafeTimestamp from './SafeTimestamp'

interface DXOSMemoryManagerProps {
  className?: string
  visibility?: 'public' | 'private' | 'friends'
  onMemorySelect?: (memory: Memory) => void
  crossSpace?: boolean // Enable cross-space public memory viewing
}

export default function DXOSMemoryManager({
  className = '',
  visibility = 'public',
  onMemorySelect,
  crossSpace = false
}: DXOSMemoryManagerProps) {
  const { isInitialized, isConnected, currentSpace, error } = useDXOS()
  const { identity, hasIdentity } = useIdentity()
  const { addObject, removeObject, canMutate } = useMutation()

  // State management
  const [isCreating, setIsCreating] = useState(false)
  const [newMemory, setNewMemory] = useState({
    title: '',
    content: '',
    tags: ''
  })

  // Create stable filter function
  const memoryFilter = useCallback((memory: Memory) => {
    // Filter by visibility and optionally by current user
    return memory.visibility === visibility &&
           (visibility === 'public' || memory.authorId === identity?.id)
  }, [visibility, identity?.id])

  // Query memories with real-time updates
  const {
    data: memories,
    loading: memoriesLoading,
    error: memoriesError,
    refetch
  } = useQuery<Memory>(memoryFilter)

  // Cross-space query for public memories
  const {
    data: crossSpaceMemories,
    loading: crossSpaceLoading,
    error: crossSpaceError,
    refetch: refetchCrossSpace,
    syncStatus
  } = useCrossSpaceQuery<Memory>({ visibility: 'public' })

  // Use cross-space memories if crossSpace mode is enabled and visibility is public
  const displayMemories = crossSpace && visibility === 'public' ? crossSpaceMemories : memories
  const displayLoading = crossSpace && visibility === 'public' ? crossSpaceLoading : memoriesLoading
  const displayError = crossSpace && visibility === 'public' ? crossSpaceError : memoriesError
  const displayRefetch = crossSpace && visibility === 'public' ? refetchCrossSpace : refetch

  /**
   * Create a new memory
   */
  const handleCreateMemory = useCallback(async () => {
    if (!canMutate || !identity || !newMemory.title.trim()) return

    try {
      setIsCreating(true)

      const memory = createMemory({
        title: newMemory.title.trim(),
        content: newMemory.content.trim(),
        authorId: identity.id,
        author: identity.displayName || 'Anonymous',
        visibility,
        tags: newMemory.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        type: 'text',
        fileType: 'text/plain',
        size: newMemory.content.length,
        checksum: `checksum-${Date.now()}` // Simple checksum for demo
      })

      await addObject(memory)

      // Reset form
      setNewMemory({ title: '', content: '', tags: '' })
      console.log('✅ Memory created successfully')
    } catch (err) {
      console.error('❌ Failed to create memory:', err)
    } finally {
      setIsCreating(false)
    }
  }, [canMutate, identity, newMemory, visibility, addObject])

  /**
   * Delete a memory
   */
  const handleDeleteMemory = useCallback(async (memory: Memory) => {
    if (!canMutate) return

    try {
      await removeObject(memory)
      console.log('🗑️ Memory deleted successfully')
    } catch (err) {
      console.error('❌ Failed to delete memory:', err)
    }
  }, [canMutate, removeObject])

  // Remove formatTimestamp function - now using SafeTimestamp component

  // Show loading state while DXOS initializes
  if (!isInitialized) {
    return (
      <div className={`dxos-memory-manager ${className}`}>
        <div className="loading-state">
          <div className="loading-spinner">🔄</div>
          <p>Initializing peer-to-peer network...</p>
        </div>
      </div>
    )
  }

  // Show connection required state
  if (!isConnected || !hasIdentity) {
    return (
      <div className={`dxos-memory-manager ${className}`}>
        <div className="connection-required">
          <div className="connection-icon">🌐</div>
          <h3>Network Identity Required</h3>
          <p>Create an identity to start sharing memories on the peer-to-peer network.</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className={`dxos-memory-manager ${className}`}>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Connection Error</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`dxos-memory-manager ${className}`}>
      {/* Header */}
      <div className="memory-header">
        <div className="header-info">
          <h3>
            {crossSpace && visibility === 'public' ? '🌐 Cross-Space' : visibility === 'public' ? '🌐' : visibility === 'private' ? '🔒' : '👥'}
            {' '}
            {visibility.charAt(0).toUpperCase() + visibility.slice(1)} Memories
          </h3>
          <div className="connection-status">
            {crossSpace && visibility === 'public' && syncStatus ? (
              <div className="sync-status">
                <span className="memory-count">{syncStatus.totalMemories} memories</span>
                {syncStatus.pendingSync > 0 && (
                  <span className="pending-sync">{syncStatus.pendingSync} pending</span>
                )}
                <span className={`sync-indicator ${syncStatus.isRunning ? 'running' : 'idle'}`}>
                  {syncStatus.isRunning ? '🔄 Syncing...' : '✅ Synced'}
                </span>
              </div>
            ) : (
              <span className="status-indicator online">
                ⚡ Connected to {currentSpace?.id?.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>

        {displayLoading && (
          <div className="loading-indicator">
            <span className="spinner">🔄</span> {crossSpace ? 'Syncing across spaces...' : 'Syncing...'}
          </div>
        )}
      </div>

      {/* Create Memory Form */}
      {canMutate && (
        <motion.div
          className="create-memory-form"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="form-group">
            <input
              type="text"
              placeholder="Memory title..."
              value={newMemory.title}
              onChange={(e) => setNewMemory(prev => ({ ...prev, title: e.target.value }))}
              disabled={isCreating}
              className="memory-title-input"
            />
          </div>

          <div className="form-group">
            <textarea
              placeholder="Share your memory..."
              value={newMemory.content}
              onChange={(e) => setNewMemory(prev => ({ ...prev, content: e.target.value }))}
              disabled={isCreating}
              rows={3}
              className="memory-content-input"
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Tags (comma-separated)..."
              value={newMemory.tags}
              onChange={(e) => setNewMemory(prev => ({ ...prev, tags: e.target.value }))}
              disabled={isCreating}
              className="memory-tags-input"
            />
          </div>

          <button
            onClick={handleCreateMemory}
            disabled={isCreating || !newMemory.title.trim()}
            className="create-memory-button"
          >
            {isCreating ? '🔄 Creating...' : '✨ Create Memory'}
          </button>
        </motion.div>
      )}

      {/* Memories Grid */}
      <AnimatePresence>
        {displayMemories.length > 0 ? (
          <motion.div
            className="memories-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {displayMemories.map((memory, index) => (
              <motion.div
                key={memory.id}
                className="memory-card"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.1
                }}
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="memory-content-section">
                  <h4 className="memory-title">{memory.title}</h4>

                  <p className="memory-preview">
                    {memory.content.length > 150
                      ? `${memory.content.substring(0, 150)}...`
                      : memory.content
                    }
                  </p>

                  {memory.tags && memory.tags.length > 0 && (
                    <div className="memory-tags">
                      {memory.tags.map((tag: string, tagIndex: number) => (
                        <span key={tagIndex} className="memory-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="memory-metadata">
                  <div className="memory-author">
                    <span className="author-name">{memory.authorId || 'Unknown'}</span>
                    <span className="memory-timestamp">
                      <SafeTimestamp timestamp={memory.timestamp} format="relative" />
                    </span>
                  </div>

                  <div className="memory-actions">
                    <button
                      onClick={() => onMemorySelect?.(memory)}
                      className="view-button"
                      aria-label="View memory details"
                    >
                      👁️ View
                    </button>

                    {memory.authorId === identity.id && (
                      <button
                        onClick={() => handleDeleteMemory(memory)}
                        className="delete-button"
                        aria-label="Delete memory"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="memory-stats">
                  <span className="stat">
                    📏 {memory.size} bytes
                  </span>
                  <span className="stat">
                    🔒 {memory.visibility}
                  </span>
                  {memory.reactions && Object.keys(memory.reactions).length > 0 && (
                    <span className="stat">
                      ❤️ {Object.values(memory.reactions).reduce((sum: number, count: any) => sum + Number(count), 0)}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="empty-icon">📝</div>
            <h4>No memories yet</h4>
            <p>
              {crossSpace && visibility === 'public'
                ? 'No public memories found across spaces. Public memories from other users will appear here once synchronized.'
                : visibility === 'public'
                ? 'Share your first public memory with the network!'
                : 'Create your first private memory.'
              }
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {displayError && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          Error loading memories: {displayError}
        </div>
      )}
    </div>
  )
}