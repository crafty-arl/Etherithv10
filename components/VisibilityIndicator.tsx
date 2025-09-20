import React from 'react'
import { motion } from 'framer-motion'
import { Memory } from '../types/memory'

interface VisibilityIndicatorProps {
  memory: Memory
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onClick?: () => void
  className?: string
}

export const VisibilityIndicator: React.FC<VisibilityIndicatorProps> = ({
  memory,
  showLabel = true,
  size = 'md',
  interactive = false,
  onClick,
  className = ''
}) => {
  const isPublic = memory.visibility === 'public'
  const hasIPFS = Boolean(memory.ipfsCid)

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'text-sm',
      label: 'text-xs'
    },
    md: {
      container: 'px-3 py-1.5 text-sm',
      icon: 'text-base',
      label: 'text-sm'
    },
    lg: {
      container: 'px-4 py-2 text-base',
      icon: 'text-lg',
      label: 'text-base'
    }
  }

  const config = sizeConfig[size]

  // Status determination
  const getStatus = () => {
    if (isPublic && hasIPFS) {
      return {
        type: 'public-shared',
        icon: '🌍',
        label: 'Public',
        bgColor: 'bg-green-900',
        textColor: 'text-green-100',
        borderColor: 'border-green-600',
        description: 'Shared publicly on IPFS'
      }
    } else if (isPublic && !hasIPFS) {
      return {
        type: 'public-pending',
        icon: '📤',
        label: 'Publishing...',
        bgColor: 'bg-orange-900',
        textColor: 'text-orange-100',
        borderColor: 'border-orange-600',
        description: 'Public but needs IPFS upload'
      }
    } else {
      return {
        type: 'private',
        icon: '🔒',
        label: 'Private',
        bgColor: 'bg-gray-900',
        textColor: 'text-gray-100',
        borderColor: 'border-gray-600',
        description: 'Visible only to you'
      }
    }
  }

  const status = getStatus()

  const IndicatorContent = () => (
    <div className={`
      inline-flex items-center space-x-2 rounded-full border
      ${config.container}
      ${status.bgColor}
      ${status.textColor}
      ${status.borderColor}
      ${interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      ${className}
    `}>
      <span className={config.icon}>{status.icon}</span>
      {showLabel && (
        <span className={`font-medium ${config.label}`}>
          {status.label}
        </span>
      )}
    </div>
  )

  if (interactive) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={status.description}
        className="inline-block"
      >
        <IndicatorContent />
      </motion.button>
    )
  }

  return (
    <div title={status.description} className="inline-block">
      <IndicatorContent />
    </div>
  )
}

// Bulk status indicator for multiple memories
interface BulkVisibilityIndicatorProps {
  memories: Memory[]
  className?: string
}

export const BulkVisibilityIndicator: React.FC<BulkVisibilityIndicatorProps> = ({
  memories,
  className = ''
}) => {
  const publicCount = memories.filter(m => m.visibility === 'public').length
  const privateCount = memories.filter(m => m.visibility === 'private').length
  const publicWithIPFS = memories.filter(m => m.visibility === 'public' && m.ipfsCid).length
  const publicPending = publicCount - publicWithIPFS

  if (memories.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Public indicators */}
      {publicWithIPFS > 0 && (
        <div className="inline-flex items-center space-x-1 px-2 py-1 bg-green-900 text-green-100 rounded-full text-xs">
          <span>🌍</span>
          <span>{publicWithIPFS} public</span>
        </div>
      )}

      {publicPending > 0 && (
        <div className="inline-flex items-center space-x-1 px-2 py-1 bg-orange-900 text-orange-100 rounded-full text-xs">
          <span>📤</span>
          <span>{publicPending} pending</span>
        </div>
      )}

      {/* Private indicator */}
      {privateCount > 0 && (
        <div className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-900 text-gray-100 rounded-full text-xs">
          <span>🔒</span>
          <span>{privateCount} private</span>
        </div>
      )}

      {/* Summary */}
      <span className="text-slate-400 text-xs">
        {memories.length} total
      </span>
    </div>
  )
}

// Status bar for visibility overview
interface VisibilityStatusBarProps {
  memories: Memory[]
  onManageVisibility?: () => void
  className?: string
}

export const VisibilityStatusBar: React.FC<VisibilityStatusBarProps> = ({
  memories,
  onManageVisibility,
  className = ''
}) => {
  const publicCount = memories.filter(m => m.visibility === 'public').length
  const privateCount = memories.filter(m => m.visibility === 'private').length
  const publicWithIPFS = memories.filter(m => m.visibility === 'public' && m.ipfsCid).length
  const publicPending = publicCount - publicWithIPFS

  const publicPercentage = memories.length > 0 ? (publicCount / memories.length) * 100 : 0

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-white">Memory Visibility</h3>
        {onManageVisibility && (
          <button
            onClick={onManageVisibility}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            Manage
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-3 mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-600 to-green-500 transition-all duration-300"
          style={{ width: `${publicPercentage}%` }}
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-400">{publicWithIPFS}</div>
          <div className="text-xs text-slate-400">Public & Shared</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-400">{publicPending}</div>
          <div className="text-xs text-slate-400">Public Pending</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-400">{privateCount}</div>
          <div className="text-xs text-slate-400">Private</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-400">{memories.length}</div>
          <div className="text-xs text-slate-400">Total Memories</div>
        </div>
      </div>

      {/* Quick actions */}
      {publicPending > 0 && (
        <div className="mt-4 p-3 bg-orange-900 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 font-medium">Action Required</p>
              <p className="text-orange-200 text-sm">
                {publicPending} public memories need IPFS upload
              </p>
            </div>
            <button className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm">
              Upload Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Memory card visibility badge
interface MemoryVisibilityBadgeProps {
  memory: Memory
  onToggle?: () => void
  showTooltip?: boolean
}

export const MemoryVisibilityBadge: React.FC<MemoryVisibilityBadgeProps> = ({
  memory,
  onToggle,
  showTooltip = true
}) => {
  const isPublic = memory.visibility === 'public'
  const hasIPFS = Boolean(memory.ipfsCid)

  let badgeContent
  let tooltipText

  if (isPublic && hasIPFS) {
    badgeContent = (
      <div className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white rounded-full text-xs">
        <span>🌍</span>
        <span>Public</span>
      </div>
    )
    tooltipText = 'Shared publicly on IPFS'
  } else if (isPublic && !hasIPFS) {
    badgeContent = (
      <div className="flex items-center space-x-1 px-2 py-1 bg-orange-600 text-white rounded-full text-xs">
        <span>📤</span>
        <span>Uploading</span>
      </div>
    )
    tooltipText = 'Public but uploading to IPFS'
  } else {
    badgeContent = (
      <div className="flex items-center space-x-1 px-2 py-1 bg-gray-600 text-white rounded-full text-xs">
        <span>🔒</span>
        <span>Private</span>
      </div>
    )
    tooltipText = 'Visible only to you'
  }

  if (onToggle) {
    return (
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={showTooltip ? `${tooltipText} (click to change)` : undefined}
        className="inline-block"
      >
        {badgeContent}
      </motion.button>
    )
  }

  return (
    <div title={showTooltip ? tooltipText : undefined} className="inline-block">
      {badgeContent}
    </div>
  )
}