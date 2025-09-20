import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PrivacyManager } from '../utils/privacy-controls'

interface VisibilityStepProps {
  title: string
  content: string
  memoryNote: string
  fileType: string
  fileSize?: number
  onVisibilitySelect: (visibility: 'public' | 'private', confirmed: boolean) => void
  initialVisibility?: 'public' | 'private'
  className?: string
}

export const VisibilityStep: React.FC<VisibilityStepProps> = ({
  title,
  content,
  memoryNote,
  fileType,
  fileSize,
  onVisibilitySelect,
  initialVisibility = 'private',
  className = ''
}) => {
  const [selectedVisibility, setSelectedVisibility] = useState<'public' | 'private'>(initialVisibility)
  const [shareCheck, setShareCheck] = useState<any>(null)
  const [showWarnings, setShowWarnings] = useState(false)

  // Create a mock memory object for checking
  const mockMemory = {
    id: 'temp',
    title,
    content,
    memoryNote,
    visibility: selectedVisibility,
    fileType: fileType as any,
    fileSize,
    ipfsCid: undefined, // New memory won't have IPFS CID yet
    timestamp: Date.now(),
    authorId: 'current-user',
    authorName: 'Current User'
  }

  useEffect(() => {
    if (selectedVisibility === 'public') {
      const check = PrivacyManager.canShareMemory(mockMemory)
      setShareCheck(check)
      setShowWarnings(!check.canShare)
    } else {
      setShareCheck(null)
      setShowWarnings(false)
    }
  }, [selectedVisibility, title, content, memoryNote, fileType, fileSize])

  const handleVisibilityChange = (visibility: 'public' | 'private') => {
    setSelectedVisibility(visibility)

    if (visibility === 'private' || (shareCheck && shareCheck.canShare)) {
      // No issues, can proceed immediately
      onVisibilitySelect(visibility, true)
    } else {
      // Has issues, but let user decide
      onVisibilitySelect(visibility, false)
    }
  }

  const handleForcePublic = () => {
    onVisibilitySelect('public', true)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Memory Visibility</h2>
        <p className="text-slate-400">
          Decide who can see and discover this memory
        </p>
      </div>

      {/* Visibility Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Private Option */}
        <motion.button
          onClick={() => handleVisibilityChange('private')}
          className={`p-6 rounded-xl border-2 transition-all text-left ${
            selectedVisibility === 'private'
              ? 'border-gray-400 bg-gray-900 ring-2 ring-gray-400'
              : 'border-slate-600 bg-slate-800 hover:border-gray-500'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center space-x-4 mb-3">
            <span className="text-3xl">🔒</span>
            <div>
              <span className="text-xl font-bold text-white">Private</span>
              <p className="text-green-400 text-sm">Recommended for personal content</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm mb-3">
            Only you can see this memory. It stays on your device and won't be shared
            with anyone else or included in your public registry.
          </p>
          <div className="space-y-1 text-xs text-slate-400">
            <p>✅ Complete privacy</p>
            <p>✅ Local storage only</p>
            <p>✅ No sharing risks</p>
          </div>
        </motion.button>

        {/* Public Option */}
        <motion.button
          onClick={() => handleVisibilityChange('public')}
          className={`p-6 rounded-xl border-2 transition-all text-left ${
            selectedVisibility === 'public'
              ? 'border-green-400 bg-green-900 ring-2 ring-green-400'
              : 'border-slate-600 bg-slate-800 hover:border-green-500'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center space-x-4 mb-3">
            <span className="text-3xl">🌍</span>
            <div>
              <span className="text-xl font-bold text-white">Public</span>
              <p className="text-blue-400 text-sm">Share with the community</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm mb-3">
            Others can discover this memory through your public registry on IPFS.
            It will be preserved and shareable across the decentralized network.
          </p>
          <div className="space-y-1 text-xs text-slate-400">
            <p>✅ IPFS preservation</p>
            <p>✅ Community discovery</p>
            <p>✅ Decentralized sharing</p>
          </div>
        </motion.button>
      </div>

      {/* Content Preview */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-3">Memory Preview</h3>
        <div className="space-y-2">
          <div>
            <span className="text-slate-400 text-sm">Title: </span>
            <span className="text-white">{title || 'Untitled'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-sm">Type: </span>
            <span className="text-white capitalize">{fileType}</span>
          </div>
          {fileSize && (
            <div>
              <span className="text-slate-400 text-sm">Size: </span>
              <span className="text-white">{formatFileSize(fileSize)}</span>
            </div>
          )}
          <div>
            <span className="text-slate-400 text-sm">Content preview: </span>
            <span className="text-white">
              {content.length > 100 ? content.substring(0, 100) + '...' : content}
            </span>
          </div>
        </div>
      </div>

      {/* Warnings and Issues */}
      {showWarnings && shareCheck && !shareCheck.canShare && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-900 border border-orange-600 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-orange-400 text-xl">⚠️</span>
            <h4 className="font-bold text-orange-100">Sharing Issues Detected</h4>
          </div>

          <div className="space-y-2 text-orange-200 text-sm">
            <p><strong>Reason:</strong> {shareCheck.reason}</p>

            {shareCheck.requiredActions && shareCheck.requiredActions.length > 0 && (
              <div>
                <p className="font-semibold">Required actions:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  {shareCheck.requiredActions.map((action: string, index: number) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => handleVisibilityChange('private')}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
            >
              Keep Private
            </button>
            <button
              onClick={handleForcePublic}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
            >
              Make Public Anyway
            </button>
          </div>
        </motion.div>
      )}

      {/* Success Confirmation */}
      {selectedVisibility === 'public' && shareCheck && shareCheck.canShare && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-900 border border-green-600 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2">
            <span className="text-green-400 text-xl">✅</span>
            <span className="font-bold text-green-100">Ready to Share Publicly</span>
          </div>
          <p className="text-green-200 text-sm mt-2">
            This memory meets all requirements for public sharing and will be included
            in your IPFS registry.
          </p>
        </motion.div>
      )}

      {/* Privacy Notice */}
      <div className="bg-blue-900 border border-blue-600 rounded-lg p-4">
        <h4 className="font-bold text-blue-100 mb-2">Privacy Notice</h4>
        <div className="space-y-2 text-blue-200 text-sm">
          <p>
            <strong>Private memories:</strong> Stored locally on your device only.
            Never uploaded to IPFS or shared with others.
          </p>
          <p>
            <strong>Public memories:</strong> Uploaded to IPFS and included in your
            public registry. Others can discover and view them. You can change
            visibility later, but data on IPFS is permanent.
          </p>
        </div>
      </div>
    </div>
  )
}

// Utility function to format file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}