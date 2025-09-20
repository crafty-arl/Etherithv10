import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkDiscovery } from '../hooks/useNetworkDiscovery';
import { NetworkMemory, NetworkUser } from '../utils/network-discovery';

interface NetworkMemoriesProps {
  className?: string;
}

export default function NetworkMemories({ className = '' }: NetworkMemoriesProps) {
  const {
    networkUsers,
    publicMemories,
    localUser,
    isOnNetwork,
    isDiscovering,
    refreshNetwork
  } = useNetworkDiscovery();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showAllMemories, setShowAllMemories] = useState(false);

  const filteredMemories = selectedUser 
    ? publicMemories.filter(memory => memory.owner === selectedUser)
    : publicMemories;

  const displayedMemories = showAllMemories 
    ? filteredMemories 
    : filteredMemories.slice(0, 6);

  const getUserName = (userId: string): string => {
    const user = networkUsers.find(u => u.id === userId) || localUser;
    return user?.name || 'Unknown User';
  };

  const getMemorySourceIcon = (source: 'local' | 'ipfs'): string => {
    return source === 'local' ? '🏠' : '🌐';
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isOnNetwork && !isDiscovering) {
    return (
      <div className={`network-memories ${className}`}>
        <div className="network-status">
          <div className="status-indicator offline">
            <span className="status-icon">🔍</span>
            <span className="status-text">No users found on network</span>
          </div>
          <p className="status-description">
            Share public memories with users on the same network when they're detected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`network-memories ${className}`}>
      <div className="network-header">
        <div className="network-status">
          <div className="status-indicator online">
            <span className="status-icon">🌐</span>
            <span className="status-text">
              {isDiscovering ? 'Discovering...' : `${networkUsers.length} user${networkUsers.length !== 1 ? 's' : ''} on network`}
            </span>
          </div>
          <button 
            className="refresh-button"
            onClick={refreshNetwork}
            disabled={isDiscovering}
            aria-label="Refresh network discovery"
          >
            <span className="refresh-icon">🔄</span>
          </button>
        </div>

        {networkUsers.length > 0 && (
          <div className="user-filters">
            <button
              className={`filter-button ${selectedUser === null ? 'active' : ''}`}
              onClick={() => setSelectedUser(null)}
            >
              All Users ({publicMemories.length})
            </button>
            {networkUsers.map(user => (
              <button
                key={user.id}
                className={`filter-button ${selectedUser === user.id ? 'active' : ''}`}
                onClick={() => setSelectedUser(user.id)}
              >
                {user.name} ({user.publicMemories.length})
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {displayedMemories.length > 0 && (
          <motion.div
            className="memories-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {displayedMemories.map((memory, index) => (
              <motion.div
                key={memory.id}
                className="network-memory-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ 
                  duration: 0.2, 
                  delay: index * 0.1 
                }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="memory-header">
                  <div className="memory-source">
                    <span className="source-icon">
                      {getMemorySourceIcon(memory.source)}
                    </span>
                    <span className="source-text">
                      {memory.source === 'local' ? 'Local' : 'IPFS'}
                    </span>
                  </div>
                  <div className="memory-owner">
                    <span className="owner-name">{getUserName(memory.owner)}</span>
                    <span className="memory-timestamp">
                      {formatTimestamp(memory.timestamp)}
                    </span>
                  </div>
                </div>
                
                <div className="memory-content">
                  <h4 className="memory-title">{memory.title}</h4>
                  <p className="memory-preview">
                    {memory.content.length > 150 
                      ? `${memory.content.substring(0, 150)}...` 
                      : memory.content
                    }
                  </p>
                </div>
                
                <div className="memory-actions">
                  <button 
                    className="view-memory-button"
                    onClick={() => {
                      // TODO: Implement memory viewing
                      console.log('View memory:', memory.id);
                    }}
                  >
                    View Memory
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {filteredMemories.length > 6 && (
        <div className="load-more-section">
          <button
            className="load-more-button"
            onClick={() => setShowAllMemories(!showAllMemories)}
          >
            {showAllMemories 
              ? 'Show Less' 
              : `Show All ${filteredMemories.length} Memories`
            }
          </button>
        </div>
      )}

      {displayedMemories.length === 0 && isOnNetwork && (
        <div className="no-memories">
          <div className="no-memories-icon">📝</div>
          <p className="no-memories-text">
            No public memories found from network users
          </p>
        </div>
      )}
    </div>
  );
}
