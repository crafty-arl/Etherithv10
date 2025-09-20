import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Memory } from '../types/memory'

interface AnimatedMemoryCardProps {
  memory: Memory
  index: number
  onView: (memory: Memory) => void
  onDelete?: (memory: Memory) => void
  showAuthor?: boolean
  canDelete?: boolean
  viewMode?: 'feed' | 'grid'
}

export default function AnimatedMemoryCard({ 
  memory, 
  index, 
  onView, 
  onDelete, 
  showAuthor = true, 
  canDelete = false, 
  viewMode = 'grid' 
}: AnimatedMemoryCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.8,
      rotateX: -15
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        duration: 0.6,
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      rotateX: 5,
      transition: {
        duration: 0.3,
        type: "spring" as const,
        stiffness: 300
      }
    },
    tap: {
      scale: 0.98,
      rotateX: 0
    }
  }

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.3,
        duration: 0.4
      }
    }
  }

  const imageVariants = {
    hidden: { scale: 1.1, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.3
      }
    }
  }

  const tagVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        type: "spring" as const,
        stiffness: 200
      }
    },
    hover: {
      scale: 1.1,
      y: -2,
      transition: {
        duration: 0.2
      }
    }
  }

  const deleteVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        type: "spring" as const,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'audio': return '🎵'
      case 'document': return '📄'
      default: return '📝'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(memory)
    }
    setShowDeleteConfirm(false)
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <motion.article
        className={`animated-memory-card ${viewMode}-view`}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        whileTap="tap"
        transition={{
          delay: index * 0.1,
          duration: 0.6,
          type: "spring" as const,
          stiffness: 100,
          damping: 15
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => onView(memory)}
        role="button"
        tabIndex={0}
        aria-label={`View memory: ${memory.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onView(memory)
          }
        }}
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Animated Background Glow */}
        <motion.div
          className="card-glow"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: isHovered ? 0.3 : 0,
            scale: isHovered ? 1.1 : 1
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Card Content */}
        <motion.div 
          className="card-content"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header with Author Info */}
          {showAuthor && (
            <motion.header 
              className="card-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <div className="author-section">
                <motion.div 
                  className="author-avatar"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  {memory.authorAvatar ? (
                    <img
                      src={memory.authorAvatar}
                      alt={`${memory.authorName} profile picture`}
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {memory.authorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </motion.div>
                <div className="author-info">
                  <motion.div 
                    className="author-name"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    {memory.authorName}
                  </motion.div>
                  <motion.time 
                    className="memory-date"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                    dateTime={new Date(memory.timestamp).toISOString()}
                  >
                    {formatDate(memory.timestamp)}
                  </motion.time>
                </div>
              </div>
              
              {canDelete && onDelete && (
                <motion.button
                  className="delete-button"
                  onClick={handleDeleteClick}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, duration: 0.3 }}
                  aria-label={`Delete memory: ${memory.title}`}
                >
                  🗑️
                </motion.button>
              )}
            </motion.header>
          )}

          {/* Memory Title */}
          <motion.h2 
            className="memory-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {memory.title}
          </motion.h2>

          {/* File Type Badge */}
          <motion.div 
            className="file-type-badge"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3, type: "spring" }}
            whileHover={{ scale: 1.05 }}
          >
            <span aria-hidden="true">{getFileIcon(memory.fileType)}</span>
            <span>{memory.fileType}</span>
          </motion.div>

          {/* Memory Content Preview */}
          <motion.div 
            className="memory-preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {truncateText(memory.content, viewMode === 'feed' ? 200 : 120)}
          </motion.div>

          {/* Memory Note */}
          <motion.div 
            className="memory-note"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <div className="note-label">
              <span aria-hidden="true">💭</span>
              Why this matters:
            </div>
            <p>{truncateText(memory.memoryNote, viewMode === 'feed' ? 150 : 80)}</p>
          </motion.div>

          {/* Animated Tags */}
          {memory.tags && memory.tags.length > 0 && (
            <motion.div 
              className="tags-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.3 }}
            >
              {memory.tags.slice(0, viewMode === 'feed' ? 6 : 4).map((tag, i) => (
                <motion.span
                  key={i}
                  className="tag"
                  variants={tagVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  custom={i}
                >
                  #{tag}
                </motion.span>
              ))}
              {memory.tags.length > (viewMode === 'feed' ? 6 : 4) && (
                <motion.span 
                  className="tag-more"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + (viewMode === 'feed' ? 6 : 4) * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                >
                  +{memory.tags.length - (viewMode === 'feed' ? 6 : 4)}
                </motion.span>
              )}
            </motion.div>
          )}

          {/* Floating Action Buttons */}
          <motion.div 
            className="floating-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            <motion.button
              className="action-btn like-btn"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                // Handle like action
              }}
              aria-label="Like this memory"
            >
              ❤️
            </motion.button>
            
            <motion.button
              className="action-btn comment-btn"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                // Handle comment action
              }}
              aria-label="Comment on this memory"
            >
              💬
            </motion.button>
            
            <motion.button
              className="action-btn share-btn"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                // Handle share action
              }}
              aria-label="Share this memory"
            >
              📤
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.article>

      {/* Animated Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="delete-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDeleteCancel}
          >
            <motion.div
              className="delete-confirm-dialog"
              variants={deleteVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.h3
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Delete Memory
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Are you sure you want to delete "{memory.title}"? This action cannot be undone.
              </motion.p>
              <motion.div 
                className="confirm-buttons"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  className="cancel-button"
                  onClick={handleDeleteCancel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="delete-confirm-button"
                  onClick={handleDeleteConfirm}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Delete
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
