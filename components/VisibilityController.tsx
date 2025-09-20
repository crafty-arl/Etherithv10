import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Memory } from '../types/memory'
import { LocalStorage } from '../utils/storage'
import { PrivacyManager } from '../utils/privacy-controls'
import { RegistryManager } from '../utils/registry'

interface VisibilityControllerProps {
  memory?: Memory
  memories?: Memory[]
  onVisibilityChange?: (updatedMemories: Memory[]) => void
  onClose?: () => void
  mode?: 'single' | 'bulk'
}

export const VisibilityController: React.FC<VisibilityControllerProps> = ({
  memory,
  memories = [],
  onVisibilityChange,
  onClose,
  mode = 'single'
}) => {
  const [selectedVisibility, setSelectedVisibility] = useState<'public' | 'private'>(
    memory?.visibility || 'private'
  )
  const [bulkSelection, setBulkSelection] = useState<{[key: string]: boolean}>({})
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [impact, setImpact] = useState<VisibilityImpact | null>(null)
  const [loading, setLoading] = useState(false)

  const targetMemories = mode === 'single' ? (memory ? [memory] : []) : memories
  const selectedMemories = mode === 'bulk'
    ? memories.filter(m => bulkSelection[m.id])
    : targetMemories

  // Calculate impact of visibility changes
  const calculateImpact = (newVisibility: 'public' | 'private'): VisibilityImpact => {
    const memoriesToChange = selectedMemories.filter(m => m.visibility !== newVisibility)

    const impact: VisibilityImpact = {
      totalMemories: memoriesToChange.length,
      goingPublic: newVisibility === 'public' ? memoriesToChange.length : 0,
      goingPrivate: newVisibility === 'private' ? memoriesToChange.length : 0,
      willAffectRegistry: false,
      willNeedIPFSUpload: [],
      contentSafetyIssues: [],
      sizeLimitIssues: []
    }

    if (newVisibility === 'public') {
      // Check each memory for sharing readiness
      memoriesToChange.forEach(mem => {
        const shareCheck = PrivacyManager.canShareMemory(mem)

        if (!shareCheck.canShare) {
          if (shareCheck.reason?.includes('IPFS')) {
            impact.willNeedIPFSUpload.push(mem.id)
          } else if (shareCheck.reason?.includes('safety')) {
            impact.contentSafetyIssues.push(mem.id)
          } else if (shareCheck.reason?.includes('size')) {
            impact.sizeLimitIssues.push(mem.id)
          }
        }
      })

      // Check if registry will be affected
      const currentPublicCount = LocalStorage.getPublicMemories().length
      const newPublicCount = currentPublicCount + impact.goingPublic
      impact.willAffectRegistry = newPublicCount > currentPublicCount
    } else {
      // Going private
      const currentPublicMemories = LocalStorage.getPublicMemories()
      const affectedPublicMemories = memoriesToChange.filter(m =>
        currentPublicMemories.some(pub => pub.id === m.id)
      )
      impact.willAffectRegistry = affectedPublicMemories.length > 0
    }

    return impact
  }

  const handleVisibilityChange = (newVisibility: 'public' | 'private') => {
    setSelectedVisibility(newVisibility)
    const calculatedImpact = calculateImpact(newVisibility)
    setImpact(calculatedImpact)

    // Show confirmation if there are significant impacts
    const needsConfirmation = calculatedImpact.willAffectRegistry ||
                             calculatedImpact.contentSafetyIssues.length > 0 ||
                             calculatedImpact.sizeLimitIssues.length > 0 ||
                             calculatedImpact.willNeedIPFSUpload.length > 0

    if (needsConfirmation) {
      setShowConfirmation(true)
    } else {
      applyVisibilityChanges(newVisibility)
    }
  }

  const applyVisibilityChanges = async (newVisibility: 'public' | 'private') => {
    setLoading(true)

    try {
      const updatedMemories: Memory[] = []

      for (const mem of selectedMemories) {
        if (mem.visibility !== newVisibility) {
          const updatedMemory = { ...mem, visibility: newVisibility }

          // If going public and needs IPFS upload, handle that
          if (newVisibility === 'public' && !mem.ipfsCid) {
            // Note: In a real implementation, you'd trigger IPFS upload here
            console.log(`Memory ${mem.title} needs IPFS upload before going public`)
          }

          LocalStorage.saveMemory(updatedMemory)
          updatedMemories.push(updatedMemory)
        }
      }

      // Update registry if needed
      if (impact?.willAffectRegistry) {
        RegistryManager.updateRegistryFromMemories()
      }

      onVisibilityChange?.(updatedMemories)
      setShowConfirmation(false)

      if (mode === 'single') {
        onClose?.()
      }

    } catch (error) {
      console.error('Failed to update visibility:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleBulkSelection = (memoryId: string) => {
    setBulkSelection(prev => ({
      ...prev,
      [memoryId]: !prev[memoryId]
    }))
  }

  const selectAllVisible = () => {
    const newSelection: {[key: string]: boolean} = {}
    memories.forEach(mem => {
      newSelection[mem.id] = true
    })
    setBulkSelection(newSelection)
  }

  const clearSelection = () => {
    setBulkSelection({})
  }

  if (mode === 'single' && !memory) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {mode === 'single' ? 'Memory Visibility' : 'Bulk Visibility Management'}
            </h2>
            <p className="text-slate-400 mt-1">
              {mode === 'single'
                ? 'Control who can see this memory'
                : `Manage visibility for ${Object.keys(bulkSelection).filter(k => bulkSelection[k]).length} selected memories`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Bulk Selection Controls */}
          {mode === 'bulk' && (
            <div className="mb-6 p-4 bg-slate-800 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Select Memories</h3>
                <div className="space-x-2">
                  <button
                    onClick={selectAllVisible}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {memories.map(mem => (
                  <div key={mem.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={bulkSelection[mem.id] || false}
                      onChange={() => toggleBulkSelection(mem.id)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{mem.title}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          mem.visibility === 'public'
                            ? 'bg-green-900 text-green-100'
                            : 'bg-gray-900 text-gray-100'
                        }`}>
                          {mem.visibility}
                        </span>
                        {!mem.ipfsCid && (
                          <span className="px-2 py-1 bg-orange-900 text-orange-100 rounded text-xs">
                            No IPFS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Memory Info (Single Mode) */}
          {mode === 'single' && memory && (
            <div className="mb-6 p-4 bg-slate-800 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-2">{memory.title}</h3>
              <div className="flex items-center space-x-4 text-sm text-slate-300">
                <span>Current: <span className={`font-bold ${
                  memory.visibility === 'public' ? 'text-green-400' : 'text-gray-400'
                }`}>{memory.visibility}</span></span>
                <span>File Type: {memory.fileType}</span>
                {memory.ipfsCid && <span className="text-green-400">✅ On IPFS</span>}
                {!memory.ipfsCid && <span className="text-orange-400">⚠️ Local only</span>}
              </div>
            </div>
          )}

          {/* Visibility Options */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-bold text-white">Choose Visibility</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Private Option */}
              <motion.button
                onClick={() => handleVisibilityChange('private')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedVisibility === 'private'
                    ? 'border-gray-400 bg-gray-900'
                    : 'border-slate-600 bg-slate-800 hover:border-gray-500'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">🔒</span>
                  <span className="text-lg font-bold text-white">Private</span>
                </div>
                <p className="text-slate-300 text-sm">
                  Only you can see this memory. It won't be shared in your public registry
                  or discoverable by others.
                </p>
              </motion.button>

              {/* Public Option */}
              <motion.button
                onClick={() => handleVisibilityChange('public')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedVisibility === 'public'
                    ? 'border-green-400 bg-green-900'
                    : 'border-slate-600 bg-slate-800 hover:border-green-500'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">🌍</span>
                  <span className="text-lg font-bold text-white">Public</span>
                </div>
                <p className="text-slate-300 text-sm">
                  Others can discover and view this memory through your public registry.
                  It will be included in IPFS sharing.
                </p>
              </motion.button>
            </div>
          </div>

          {/* Impact Preview */}
          {impact && (
            <div className="mb-6 p-4 bg-blue-900 rounded-lg">
              <h4 className="font-bold text-white mb-2">Impact Preview</h4>
              <div className="space-y-2 text-sm text-blue-100">
                <p>• {impact.totalMemories} memories will change visibility</p>
                {impact.willAffectRegistry && (
                  <p>• Your public registry will be updated</p>
                )}
                {impact.willNeedIPFSUpload.length > 0 && (
                  <p className="text-orange-200">
                    • ⚠️ {impact.willNeedIPFSUpload.length} memories need IPFS upload first
                  </p>
                )}
                {impact.contentSafetyIssues.length > 0 && (
                  <p className="text-red-200">
                    • ⚠️ {impact.contentSafetyIssues.length} memories have content safety concerns
                  </p>
                )}
                {impact.sizeLimitIssues.length > 0 && (
                  <p className="text-red-200">
                    • ⚠️ {impact.sizeLimitIssues.length} memories exceed size limits
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        <AnimatePresence>
          {showConfirmation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4"
              >
                <h3 className="text-xl font-bold text-white mb-4">Confirm Changes</h3>
                <div className="space-y-3 text-slate-300 mb-6">
                  {impact && (
                    <>
                      <p>You're about to change {impact.totalMemories} memories to {selectedVisibility}.</p>
                      {impact.willNeedIPFSUpload.length > 0 && (
                        <p className="text-orange-300">
                          Note: {impact.willNeedIPFSUpload.length} memories will need IPFS upload
                          before they can be truly public.
                        </p>
                      )}
                      {impact.contentSafetyIssues.length > 0 && (
                        <p className="text-red-300">
                          Warning: {impact.contentSafetyIssues.length} memories have potential
                          content safety issues.
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => applyVisibilityChanges(selectedVisibility)}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// Types for impact calculation
interface VisibilityImpact {
  totalMemories: number
  goingPublic: number
  goingPrivate: number
  willAffectRegistry: boolean
  willNeedIPFSUpload: string[]
  contentSafetyIssues: string[]
  sizeLimitIssues: string[]
}