import { useState, useEffect, useCallback } from 'react';
import { getNetworkDiscovery, destroyNetworkDiscovery, NetworkUser, NetworkMemory } from '../utils/network-discovery';

export interface UseNetworkDiscoveryReturn {
  networkUsers: NetworkUser[];
  publicMemories: NetworkMemory[];
  localUser: NetworkUser | null;
  isOnNetwork: boolean;
  isDiscovering: boolean;
  sharePublicMemory: (memoryId: string, memoryData: any) => Promise<void>;
  refreshNetwork: () => void;
}

export function useNetworkDiscovery(): UseNetworkDiscoveryReturn {
  const [networkUsers, setNetworkUsers] = useState<NetworkUser[]>([]);
  const [publicMemories, setPublicMemories] = useState<NetworkMemory[]>([]);
  const [localUser, setLocalUser] = useState<NetworkUser | null>(null);
  const [isOnNetwork, setIsOnNetwork] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const refreshNetwork = useCallback(() => {
    const discovery = getNetworkDiscovery();
    setNetworkUsers(discovery.getNetworkUsers());
    setPublicMemories(discovery.getPublicMemories());
    setLocalUser(discovery.getLocalUser());
    setIsOnNetwork(discovery.isOnNetwork());
  }, []);

  const sharePublicMemory = useCallback(async (memoryId: string, memoryData: any) => {
    const discovery = getNetworkDiscovery();
    await discovery.sharePublicMemory(memoryId, memoryData);
    refreshNetwork();
  }, [refreshNetwork]);

  useEffect(() => {
    const discovery = getNetworkDiscovery();
    setIsDiscovering(true);
    
    // Initial refresh
    refreshNetwork();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(refreshNetwork, 2000);
    
    // Listen for storage events (other tabs)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'etherith_network_presence' || event.key === 'etherith_ipfs_network') {
        refreshNetwork();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('storage', handleStorageChange);
      setIsDiscovering(false);
    };
  }, [refreshNetwork]);

  return {
    networkUsers,
    publicMemories,
    localUser,
    isOnNetwork,
    isDiscovering,
    sharePublicMemory,
    refreshNetwork
  };
}
