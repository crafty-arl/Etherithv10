import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Memory } from '../types/memory'
import AnimatedMemoryCard from './AnimatedMemoryCard'

interface AnimatedMemoryFeedProps {
  memories: Memory[]
  onView: (memory: Memory) => void
  onDelete?: (memory: Memory) => void
  showAuthor?: boolean
  canDelete?: boolean
  viewMode?: 'feed' | 'grid'
  searchQuery?: string
}

export default function AnimatedMemoryFeed({ 
  memories, 
  onView, 
  onDelete, 
  showAuthor = true, 
  canDelete = false, 
  viewMode = 'grid',
  searchQuery = ''
}: AnimatedMemoryFeedProps) {
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>(memories)

  // Filter memories based on search query
  const filteredResults = memories.filter(memory => 
    memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.memoryNote.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (memory.tags && memory.tags.some(tag => 
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  }

  const emptyStateVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 50
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        type: "spring",
        stiffness: 100
      }
    }
  }

  const searchResultsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  }

  const getEmptyStateContent = () => {
    if (searchQuery) {
      return {
        icon: '🔍',
        title: 'No memories found',
        description: `No memories match "${searchQuery}". Try adjusting your search terms.`
      }
    }
    
    return {
      icon: '📚',
      title: 'No memories yet',
      description: 'Start building your memory vault by creating your first memory.'
    }
  }

  const emptyState = getEmptyStateContent()

  return (
    <div className="animated-memory-feed">
      {/* Search Results Header */}
      {searchQuery && (
        <motion.div 
          className="search-results-header"
          variants={searchResultsVariants}
          initial="hidden"
          animate="visible"
        >
          <h3>
            <span aria-hidden="true">🔍</span>
            Search Results
          </h3>
          <p>
            Found {filteredResults.length} memory{filteredResults.length !== 1 ? 'ies' : ''} 
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        </motion.div>
      )}

      {/* Memory Grid/List */}
      <motion.div
        className={`memory-container ${viewMode}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {filteredResults.length > 0 ? (
            filteredResults.map((memory, index) => (
              <motion.div
                key={memory.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.8,
                  y: -20,
                  transition: { duration: 0.3 }
                }}
                transition={{
                  duration: 0.4,
                  type: "spring",
                  stiffness: 100
                }}
              >
                <AnimatedMemoryCard
                  memory={memory}
                  index={index}
                  onView={onView}
                  onDelete={onDelete}
                  showAuthor={showAuthor}
                  canDelete={canDelete}
                  viewMode={viewMode}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              className="empty-state"
              variants={emptyStateVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div 
                className="empty-icon"
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {emptyState.icon}
              </motion.div>
              
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {emptyState.title}
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {emptyState.description}
              </motion.p>

              {!searchQuery && (
                <motion.button
                  className="create-first-memory-btn"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ 
                    scale: 1.05,
                    y: -2
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span aria-hidden="true">✨</span>
                  Create Your First Memory
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading State Animation */}
      <AnimatePresence>
        {memories.length === 0 && !searchQuery && (
          <motion.div
            className="loading-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="loading-spinner"
              animate={{ rotate: 360 }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              📚
            </motion.div>
            <p>Loading your memories...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
