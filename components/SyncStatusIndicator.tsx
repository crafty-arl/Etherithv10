import React from 'react'
import { motion } from 'framer-motion'
import { useBackgroundSync, formatNextSyncTime, formatLastSyncTime } from '../hooks/useBackgroundSync'

interface SyncStatusIndicatorProps {
  compact?: boolean
  showDetails?: boolean
  className?: string
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  compact = false,
  showDetails = false,
  className = ''
}) => {
  const { status, syncNow } = useBackgroundSync()

  const getStatusIcon = () => {
    if (status.syncInProgress) return '🔄'
    if (!status.online) return '📡'
    if (!status.enabled) return '⏸️'
    return '✅'
  }

  const getStatusText = () => {
    if (status.syncInProgress) return 'Syncing...'
    if (!status.online) return 'Offline'
    if (!status.enabled) return 'Sync paused'
    return 'Synced'
  }

  const getStatusColor = () => {
    if (status.syncInProgress) return '#ff9800' // Orange
    if (!status.online) return '#f44336' // Red
    if (!status.enabled) return '#9e9e9e' // Gray
    return '#4caf50' // Green
  }

  if (compact) {
    return (
      <motion.div
        className={`sync-status-compact ${className}`}
        animate={{
          rotate: status.syncInProgress ? 360 : 0
        }}
        transition={{
          duration: 2,
          repeat: status.syncInProgress ? Infinity : 0,
          ease: 'linear'
        }}
        title={getStatusText()}
      >
        <span style={{ color: getStatusColor() }}>
          {getStatusIcon()}
        </span>
      </motion.div>
    )
  }

  return (
    <div className={`sync-status-indicator ${className}`}>
      <div className="sync-status-header">
        <motion.span
          className="sync-icon"
          animate={{
            rotate: status.syncInProgress ? 360 : 0
          }}
          transition={{
            duration: 2,
            repeat: status.syncInProgress ? Infinity : 0,
            ease: 'linear'
          }}
          style={{ color: getStatusColor() }}
        >
          {getStatusIcon()}
        </motion.span>
        <span className="sync-text" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </span>
        {!status.syncInProgress && status.online && status.enabled && (
          <button
            onClick={syncNow}
            className="sync-now-btn"
            aria-label="Sync now"
          >
            🔄
          </button>
        )}
      </div>

      {showDetails && (
        <div className="sync-details">
          <div className="sync-detail">
            <span className="detail-label">Last sync:</span>
            <span className="detail-value">
              {formatLastSyncTime(status.lastSyncTime)}
            </span>
          </div>
          <div className="sync-detail">
            <span className="detail-label">Next sync:</span>
            <span className="detail-value">
              {formatNextSyncTime(status.nextSyncTime)}
            </span>
          </div>
          <div className="sync-detail">
            <span className="detail-label">Connection:</span>
            <span className="detail-value">
              {status.online ? '🌐 Online' : '📡 Offline'}
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        .sync-status-indicator {
          padding: 12px;
          background: rgba(45, 45, 45, 0.8);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 8px;
          color: #f5f5dc;
          font-size: 12px;
        }

        .sync-status-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sync-icon {
          font-size: 16px;
          display: inline-block;
        }

        .sync-text {
          flex: 1;
          font-weight: 500;
        }

        .sync-now-btn {
          background: none;
          border: none;
          color: #d4af37;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .sync-now-btn:hover {
          background: rgba(212, 175, 55, 0.1);
        }

        .sync-now-btn:active {
          transform: scale(0.95);
        }

        .sync-details {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(212, 175, 55, 0.1);
        }

        .sync-detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .sync-detail:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          color: #b0b0b0;
        }

        .detail-value {
          color: #f5f5dc;
          font-weight: 500;
        }

        .sync-status-compact {
          display: inline-block;
          font-size: 16px;
          cursor: default;
        }

        /* Mobile responsive */
        @media (max-width: 480px) {
          .sync-status-indicator {
            padding: 8px;
            font-size: 11px;
          }

          .sync-icon {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}