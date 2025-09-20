import React from 'react';
import { motion } from 'framer-motion';
import { useNetworkDiscovery } from '../hooks/useNetworkDiscovery';

interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export default function NetworkStatusIndicator({ 
  className = '', 
  showDetails = false 
}: NetworkStatusIndicatorProps) {
  const { 
    networkUsers, 
    isOnNetwork, 
    isDiscovering, 
    refreshNetwork 
  } = useNetworkDiscovery();

  const getStatusColor = () => {
    if (isDiscovering) return '#F59E0B'; // Yellow
    if (isOnNetwork) return '#10B981'; // Green
    return '#6B7280'; // Gray
  };

  const getStatusText = () => {
    if (isDiscovering) return 'Discovering...';
    if (isOnNetwork) return `${networkUsers.length} user${networkUsers.length !== 1 ? 's' : ''} on network`;
    return 'No network users';
  };

  const getStatusIcon = () => {
    if (isDiscovering) return '🔍';
    if (isOnNetwork) return '🌐';
    return '🔒';
  };

  return (
    <motion.div 
      className={`network-status-indicator ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className="status-dot"
        style={{ backgroundColor: getStatusColor() }}
        title={getStatusText()}
      />
      
      {showDetails && (
        <div className="status-details">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
          <button 
            className="refresh-button"
            onClick={refreshNetwork}
            disabled={isDiscovering}
            aria-label="Refresh network discovery"
          >
            <span className="refresh-icon">🔄</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
