import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Memory } from '../types/memory'
import { LocalStorage } from '../utils/storage'
import { RegistryManager } from '../utils/registry'
import { SyncStatusIndicator } from './SyncStatusIndicator'

interface MobileVisibilityPanelProps {
  memory?: Memory
  memories?: Memory[]
  onVisibilityChange?: (updatedMemories: Memory[]) => void
  onClose?: () => void
  isVisible: boolean
  mode?: 'single' | 'bulk'
}

export const MobileVisibilityPanel: React.FC<MobileVisibilityPanelProps> = ({
  memory,
  memories = [],
  onVisibilityChange,
  onClose,
  isVisible,
  mode = 'single'
}) => {
  const [selectedVisibility, setSelectedVisibility] = useState<'public' | 'private'>('private')
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    if (memory) {
      setSelectedVisibility(memory.visibility)
    }
  }, [memory])

  const targetMemories = mode === 'single' ? (memory ? [memory] : []) : memories
  const selectedMemories = mode === 'bulk'
    ? memories.filter(m => bulkSelection.has(m.id))
    : targetMemories

  const toggleBulkSelection = (memoryId: string) => {
    setBulkSelection(prev => {
      const newSet = new Set(prev)
      if (newSet.has(memoryId)) {
        newSet.delete(memoryId)
      } else {
        newSet.add(memoryId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setBulkSelection(new Set(memories.map(m => m.id)))
  }

  const clearSelection = () => {
    setBulkSelection(new Set())
  }

  const calculateImpact = (newVisibility: 'public' | 'private') => {
    const changing = selectedMemories.filter(m => m.visibility !== newVisibility)
    return {
      count: changing.length,
      needsIPFS: newVisibility === 'public' ? changing.filter(m => !m.ipfsCid).length : 0,
      affectsRegistry: changing.length > 0
    }
  }

  const applyVisibilityChange = async (newVisibility: 'public' | 'private') => {
    setLoading(true)

    try {
      const updatedMemories: Memory[] = []

      for (const mem of selectedMemories) {
        if (mem.visibility !== newVisibility) {
          const updatedMemory = { ...mem, visibility: newVisibility }
          LocalStorage.saveMemory(updatedMemory)
          updatedMemories.push(updatedMemory)
        }
      }

      // Update registry if needed
      if (updatedMemories.length > 0) {
        try {
          await RegistryManager.updateRegistryFromMemories()
        } catch (registryError) {
          console.warn('Registry update failed:', registryError)
          // Don't fail the visibility change if registry update fails
        }
      }

      onVisibilityChange?.(updatedMemories)
      onClose?.()

    } catch (error) {
      console.error('Failed to update visibility:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVisibilitySelect = (newVisibility: 'public' | 'private') => {
    setSelectedVisibility(newVisibility)
    const impact = calculateImpact(newVisibility)

    // Show confirmation for significant changes
    if (impact.count > 5 || impact.needsIPFS > 0) {
      setShowConfirmation(true)
    } else {
      applyVisibilityChange(newVisibility)
    }
  }

  const renderSingleMode = () => {
    if (!memory) return null

    return (
      <div className="single-memory-visibility">
        <div className="memory-preview">
          <div className="memory-header">
            <h3>{memory.title}</h3>
            <span className="current-visibility">
              Currently: {memory.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
            </span>
          </div>

          {memory.fileData && memory.fileType === 'image' && (
            <img src={memory.fileData} alt={memory.title} className="memory-thumbnail" />
          )}

          <div className="memory-meta">
            <span className="file-type">{memory.fileType}</span>
            {memory.fileSize && (
              <span className="file-size">
                {(memory.fileSize / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
            {!memory.ipfsCid && (
              <span className="local-only">📱 Local only</span>
            )}
          </div>
        </div>

        <div className="visibility-options">
          <h4>Change Visibility</h4>

          <div className="visibility-grid">
            <button
              onClick={() => handleVisibilitySelect('private')}
              className={`visibility-card ${selectedVisibility === 'private' ? 'selected' : ''}`}
              disabled={loading}
            >
              <div className="visibility-header">
                <span className="visibility-icon">🔒</span>
                <span className="visibility-title">Private</span>
              </div>
              <p className="visibility-description">
                Only you can see this memory
              </p>
              {memory.visibility === 'private' && (
                <span className="current-badge">Current</span>
              )}
            </button>

            <button
              onClick={() => handleVisibilitySelect('public')}
              className={`visibility-card ${selectedVisibility === 'public' ? 'selected' : ''}`}
              disabled={loading}
            >
              <div className="visibility-header">
                <span className="visibility-icon">🌍</span>
                <span className="visibility-title">Public</span>
              </div>
              <p className="visibility-description">
                Others can discover this memory
              </p>
              {memory.visibility === 'public' && (
                <span className="current-badge">Current</span>
              )}
              {!memory.ipfsCid && (
                <span className="warning-badge">Needs IPFS upload</span>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderBulkMode = () => (
    <div className="bulk-visibility-controls">
      <div className="bulk-header">
        <h3>Bulk Visibility Control</h3>
        <p>{bulkSelection.size} of {memories.length} memories selected</p>
      </div>

      <div className="bulk-actions">
        <button onClick={selectAll} className="bulk-action">
          Select All ({memories.length})
        </button>
        <button onClick={clearSelection} className="bulk-action secondary">
          Clear Selection
        </button>
      </div>

      <div className="memory-list">
        {memories.map(mem => (
          <div
            key={mem.id}
            className={`memory-item ${bulkSelection.has(mem.id) ? 'selected' : ''}`}
            onClick={() => toggleBulkSelection(mem.id)}
          >
            <div className="memory-checkbox">
              <input
                type="checkbox"
                checked={bulkSelection.has(mem.id)}
                onChange={() => toggleBulkSelection(mem.id)}
              />
            </div>

            <div className="memory-info">
              <span className="memory-title">{mem.title}</span>
              <div className="memory-status">
                <span className={`visibility-badge ${mem.visibility}`}>
                  {mem.visibility === 'public' ? '🌍' : '🔒'} {mem.visibility}
                </span>
                {!mem.ipfsCid && mem.visibility === 'public' && (
                  <span className="warning-badge">⚠️ No IPFS</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {bulkSelection.size > 0 && (
        <div className="bulk-visibility-options">
          <h4>Apply to Selected ({bulkSelection.size})</h4>
          <div className="visibility-buttons">
            <button
              onClick={() => handleVisibilitySelect('private')}
              className="visibility-button private"
              disabled={loading}
            >
              🔒 Make Private
            </button>
            <button
              onClick={() => handleVisibilitySelect('public')}
              className="visibility-button public"
              disabled={loading}
            >
              🌍 Make Public
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const renderConfirmation = () => {
    const impact = calculateImpact(selectedVisibility)

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="confirmation-overlay"
      >
        <div className="confirmation-dialog">
          <h3>Confirm Changes</h3>
          <div className="confirmation-details">
            <p>{impact.count} memories will become {selectedVisibility}</p>
            {impact.needsIPFS > 0 && (
              <p className="warning">
                ⚠️ {impact.needsIPFS} memories need IPFS upload for full public access
              </p>
            )}
          </div>

          <div className="confirmation-actions">
            <button
              onClick={() => applyVisibilityChange(selectedVisibility)}
              className="confirm-button"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Confirm'}
            </button>
            <button
              onClick={() => setShowConfirmation(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="mobile-visibility-panel"
        >
          <div className="panel-header">
            <div className="drag-handle" />
            <div className="header-content">
              <SyncStatusIndicator compact className="sync-indicator" />
              <h2>
                {mode === 'single' ? 'Memory Visibility' : 'Bulk Visibility'}
              </h2>
              <button onClick={onClose} className="close-button">
                ×
              </button>
            </div>
          </div>

          <div className="panel-content">
            {mode === 'single' ? renderSingleMode() : renderBulkMode()}
          </div>

          <AnimatePresence>
            {showConfirmation && renderConfirmation()}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}