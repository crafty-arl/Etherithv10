import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkDiscovery } from '../hooks/useNetworkDiscovery';
import { NetworkMemory, NetworkUser } from '../utils/network-discovery';
import MemoryViewer from './MemoryViewer';
import { Memory } from '../types/memory';
import SafeTimestamp from './SafeTimestamp';

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
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filteredMemories = selectedUser
    ? publicMemories.filter(memory => memory.owner === selectedUser)
    : publicMemories;

  const displayedMemories = filteredMemories.slice(0, visibleCount);

  const getUserName = (userId: string): string => {
    const user = networkUsers.find(u => u.id === userId) || localUser;
    return user?.name || 'Unknown User';
  };

  const getMemorySourceIcon = (source: 'local' | 'ipfs'): string => {
    return source === 'local' ? '🏠' : '🌐';
  };

  // Removed formatTimestamp function - now using SafeTimestamp component

  const convertNetworkMemoryToMemory = (networkMemory: NetworkMemory): Memory => {
    return {
      id: networkMemory.id,
      title: networkMemory.title,
      content: networkMemory.content,
      memoryNote: '',
      authorId: networkMemory.owner,
      authorName: getUserName(networkMemory.owner),
      timestamp: networkMemory.timestamp,
      visibility: 'public' as const,
      tags: [],
      fileType: 'text' as const
    };
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
                      <SafeTimestamp timestamp={memory.timestamp} format="relative" />
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
                      const convertedMemory = convertNetworkMemoryToMemory(memory);
                      setSelectedMemory(convertedMemory);
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

      {visibleCount < filteredMemories.length && (
        <div className="load-more-section">
          <button
            className="load-more-button"
            onClick={() => {
              setIsLoadingMore(true);
              setTimeout(() => {
                setVisibleCount(prev => Math.min(prev + 6, filteredMemories.length));
                setIsLoadingMore(false);
              }, 300);
            }}
            disabled={isLoadingMore}
          >
            {isLoadingMore
              ? 'Loading...'
              : `Load ${Math.min(6, filteredMemories.length - visibleCount)} More`
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
