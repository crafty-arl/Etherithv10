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
    console.log('🔄 [DEBUG] Refreshing network discovery...');

    const discovery = getNetworkDiscovery();
    const users = discovery.getNetworkUsers();
    const memories = discovery.getPublicMemories();
    const local = discovery.getLocalUser();
    const online = discovery.isOnNetwork();

    console.log('📊 [DEBUG] Network discovery results:', {
      networkUsersCount: users.length,
      publicMemoriesCount: memories.length,
      hasLocalUser: !!local,
      isOnNetwork: online,
      timestamp: new Date().toISOString()
    });

    if (users.length > 0) {
      console.log('👥 [DEBUG] Network users found:', users.map(user => ({
        id: user.id,
        name: user.name,
        memoriesCount: user.publicMemories.length,
        lastSeen: user.lastSeen
      })));
    }

    if (memories.length > 0) {
      console.log('💭 [DEBUG] Public memories available:', memories.map(memory => ({
        id: memory.id,
        title: memory.title,
        owner: memory.owner,
        source: memory.source
      })));
    }

    setNetworkUsers(users);
    setPublicMemories(memories);
    setLocalUser(local);
    setIsOnNetwork(online);

    console.log('✅ [DEBUG] Network state updated successfully');
  }, []);

  const sharePublicMemory = useCallback(async (memoryId: string, memoryData: any) => {
    console.log('📤 [DEBUG] Sharing public memory:', { memoryId, memoryData });

    try {
      const discovery = getNetworkDiscovery();
      await discovery.sharePublicMemory(memoryId, memoryData);
      console.log('✅ [DEBUG] Memory shared successfully');
      refreshNetwork();
    } catch (error) {
      console.error('❌ [DEBUG] Failed to share memory:', error);
      throw error;
    }
  }, [refreshNetwork]);

  useEffect(() => {
    console.log('🚀 [DEBUG] Initializing network discovery hook...');

    const discovery = getNetworkDiscovery();
    setIsDiscovering(true);

    // Initial refresh
    console.log('🔄 [DEBUG] Performing initial network refresh...');
    refreshNetwork();

    // Set up periodic refresh
    console.log('⏰ [DEBUG] Setting up periodic network refresh (every 2s)...');
    const refreshInterval = setInterval(() => {
      console.log('⏰ [DEBUG] Periodic network refresh triggered');
      refreshNetwork();
    }, 2000);

    // Listen for storage events (other tabs)
    const handleStorageChange = (event: StorageEvent) => {
      console.log('💾 [DEBUG] Storage change detected:', {
        key: event.key,
        newValue: event.newValue ? 'has value' : 'empty/null',
        timestamp: new Date().toISOString()
      });

      if (event.key === 'etherith_network_presence' || event.key === 'etherith_ipfs_network') {
        console.log('🔄 [DEBUG] Network-related storage change, refreshing...');
        refreshNetwork();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    console.log('👂 [DEBUG] Storage event listener added');

    return () => {
      console.log('🧹 [DEBUG] Cleaning up network discovery hook...');
      clearInterval(refreshInterval);
      window.removeEventListener('storage', handleStorageChange);
      setIsDiscovering(false);
      console.log('✅ [DEBUG] Network discovery cleanup completed');
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
