import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface IPFSStatusProps {
  isConnected: boolean
  replicas?: number
  lastSeen?: number
  className?: string
}

export default function IPFSStatus({ isConnected, replicas = 0, lastSeen = 0, className = '' }: IPFSStatusProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [pulseKey, setPulseKey] = useState(0)

  // Trigger pulse animation when connection status changes
  useEffect(() => {
    setPulseKey(prev => prev + 1)
  }, [isConnected])

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 20
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  }

  const pulseVariants = {
    pulse: {
      scale: [1, 1.1, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    static: {
      scale: 1,
      opacity: 1
    }
  }

  const networkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 1.5,
        ease: "easeInOut" as const
      }
    }
  }

  const nodeVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        type: "spring" as const,
        stiffness: 300
      }
    })
  }

  const detailsVariants = {
    hidden: { 
      height: 0, 
      opacity: 0,
      transition: { duration: 0.3 }
    },
    visible: { 
      height: "auto", 
      opacity: 1,
      transition: { 
        duration: 0.3,
        ease: "easeOut" as const
      }
    }
  }

  return (
    <motion.div
      className={`ipfs-status-container ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      key={pulseKey}
    >
      {/* Main Status Button */}
      <motion.button
        className={`ipfs-status-button ${isConnected ? 'connected' : 'disconnected'}`}
        onClick={() => setShowDetails(!showDetails)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        variants={pulseVariants}
        animate={isConnected ? "pulse" : "static"}
        aria-label={`IPFS Network ${isConnected ? 'Connected' : 'Disconnected'}`}
      >
        {/* Animated Network Visualization */}
        <div className="network-visualization">
          <svg width="40" height="40" viewBox="0 0 40 40" className="network-svg">
            {/* Central Node */}
            <motion.circle
              cx="20"
              cy="20"
              r="3"
              fill={isConnected ? "#10B981" : "#EF4444"}
              variants={nodeVariants}
              initial="hidden"
              animate="visible"
              custom={0}
            />
            
            {/* Network Connections */}
            <motion.path
              d="M20,20 L8,8 M20,20 L32,8 M20,20 L8,32 M20,20 L32,32 M20,20 L20,4 M20,20 L20,36 M20,20 L4,20 M20,20 L36,20"
              stroke={isConnected ? "#10B981" : "#EF4444"}
              strokeWidth="1.5"
              fill="none"
              variants={networkVariants}
              initial="hidden"
              animate="visible"
            />
            
            {/* Peripheral Nodes */}
            {[
              { x: 8, y: 8 },
              { x: 32, y: 8 },
              { x: 8, y: 32 },
              { x: 32, y: 32 },
              { x: 20, y: 4 },
              { x: 20, y: 36 },
              { x: 4, y: 20 },
              { x: 36, y: 20 }
            ].map((node, i) => (
              <motion.circle
                key={i}
                cx={node.x}
                cy={node.y}
                r="2"
                fill={isConnected ? "#10B981" : "#EF4444"}
                variants={nodeVariants}
                initial="hidden"
                animate="visible"
                custom={i + 1}
              />
            ))}
          </svg>
        </div>

        {/* Status Text */}
        <div className="status-text">
          <motion.span
            className="status-label"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {isConnected ? 'IPFS Connected' : 'IPFS Offline'}
          </motion.span>
          
          {isConnected && (
            <motion.span
              className="status-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {replicas} replicas
            </motion.span>
          )}
        </div>

        {/* Expand/Collapse Icon */}
        <motion.div
          className="expand-icon"
          animate={{ rotate: showDetails ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          ▼
        </motion.div>
      </motion.button>

      {/* Detailed Status Panel */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            className="ipfs-details-panel"
            variants={detailsVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="details-content">
              <div className="detail-item">
                <span className="detail-label">Network Status:</span>
                <motion.span
                  className={`detail-value ${isConnected ? 'connected' : 'disconnected'}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {isConnected ? 'Active' : 'Inactive'}
                </motion.span>
              </div>

              {isConnected && (
                <>
                  <div className="detail-item">
                    <span className="detail-label">Replicas:</span>
                    <motion.span
                      className="detail-value"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      {replicas} nodes
                    </motion.span>
                  </div>

                  {lastSeen > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">Last Seen:</span>
                      <motion.span
                        className="detail-value"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        {new Date(lastSeen).toLocaleTimeString()}
                      </motion.span>
                    </div>
                  )}

                  <div className="detail-item">
                    <span className="detail-label">Protocol:</span>
                    <motion.span
                      className="detail-value"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      IPFS v0.12+
                    </motion.span>
                  </div>
                </>
              )}

              {!isConnected && (
                <motion.div
                  className="disconnected-message"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p>Unable to connect to IPFS network. Your memories are stored locally and will sync when connection is restored.</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
