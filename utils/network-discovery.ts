/**
 * Network Discovery Service
 * Detects users on the same local network and enables sharing of public memories
 */

export interface NetworkUser {
  id: string;
  name: string;
  ip: string;
  lastSeen: number;
  publicMemories: string[]; // Array of memory IDs that are public
}

export interface NetworkMemory {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  owner: string;
  source: 'local' | 'ipfs';
  ipfsHash?: string;
}

class NetworkDiscoveryService {
  private users: Map<string, NetworkUser> = new Map();
  private publicMemories: Map<string, NetworkMemory> = new Map();
  private discoveryInterval: NodeJS.Timeout | null = null;
  private isDiscovering = false;
  private localUserId: string;
  private localUserIP: string = '';

  constructor() {
    this.localUserId = this.generateUserId();
    this.initializeNetworkDiscovery();
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getLocalIP(): Promise<string> {
    try {
      // Use WebRTC to get local IP
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      return new Promise((resolve) => {
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
            if (ipMatch) {
              this.localUserIP = ipMatch[1];
              pc.close();
              resolve(ipMatch[1]);
            }
          }
        };
        
        // Fallback timeout
        setTimeout(() => {
          pc.close();
          resolve('127.0.0.1');
        }, 3000);
      });
    } catch (error) {
      console.warn('Could not get local IP:', error);
      return '127.0.0.1';
    }
  }

  private async initializeNetworkDiscovery() {
    this.localUserIP = await this.getLocalIP();
    this.startDiscovery();
  }

  private startDiscovery() {
    if (this.isDiscovering) return;
    
    this.isDiscovering = true;
    
    // Broadcast our presence every 5 seconds
    this.discoveryInterval = setInterval(() => {
      this.broadcastPresence();
      this.discoverNetworkUsers();
    }, 5000);

    // Initial broadcast
    this.broadcastPresence();
  }

  private stopDiscovery() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    this.isDiscovering = false;
  }

  private async broadcastPresence() {
    try {
      // Get our public memories from localStorage
      const publicMemories = this.getLocalPublicMemories();
      
      const presenceData = {
        id: this.localUserId,
        name: this.getLocalUserName(),
        ip: this.localUserIP,
        timestamp: Date.now(),
        publicMemories: publicMemories.map(m => m.id)
      };

      // Store our own presence
      this.users.set(this.localUserId, {
        id: this.localUserId,
        name: presenceData.name,
        ip: this.localUserIP,
        lastSeen: Date.now(),
        publicMemories: presenceData.publicMemories
      });

      // Broadcast via localStorage (for same-origin users)
      this.broadcastViaLocalStorage(presenceData);
      
      // Broadcast via IPFS (for cross-origin users on same network)
      await this.broadcastViaIPFS(presenceData);
      
    } catch (error) {
      console.warn('Failed to broadcast presence:', error);
    }
  }

  private getLocalUserName(): string {
    // Try to get from localStorage or generate a friendly name
    const storedName = localStorage.getItem('etherith_user_name');
    if (storedName) return storedName;
    
    // Generate a friendly name based on IP
    const ipParts = this.localUserIP.split('.');
    return `User-${ipParts[ipParts.length - 1]}`;
  }

  private getLocalPublicMemories(): any[] {
    try {
      const memories = JSON.parse(localStorage.getItem('etherith_memories') || '[]');
      return memories.filter((memory: any) => memory.visibility === 'public');
    } catch (error) {
      console.warn('Failed to get local public memories:', error);
      return [];
    }
  }

  private broadcastViaLocalStorage(presenceData: any) {
    // Store in localStorage with a timestamp for other tabs to pick up
    const networkData = {
      ...presenceData,
      type: 'network_presence',
      timestamp: Date.now()
    };
    
    localStorage.setItem('etherith_network_presence', JSON.stringify(networkData));
    
    // Trigger storage event for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'etherith_network_presence',
      newValue: JSON.stringify(networkData)
    }));
  }

  private async broadcastViaIPFS(presenceData: any) {
    try {
      // This would integrate with your existing IPFS service
      // For now, we'll use a simple approach with localStorage
      const ipfsData = {
        ...presenceData,
        type: 'ipfs_network_presence',
        timestamp: Date.now()
      };
      
      // Store in a special IPFS network discovery key
      localStorage.setItem('etherith_ipfs_network', JSON.stringify(ipfsData));
    } catch (error) {
      console.warn('Failed to broadcast via IPFS:', error);
    }
  }

  private discoverNetworkUsers() {
    // Listen for localStorage changes from other users
    this.checkLocalStorageForUsers();
    this.checkIPFSForUsers();
    
    // Clean up old users (haven't been seen in 30 seconds)
    const now = Date.now();
    this.users.forEach((user, userId) => {
      if (now - user.lastSeen > 30000) {
        this.users.delete(userId);
      }
    });
  }

  private checkLocalStorageForUsers() {
    try {
      const presenceData = localStorage.getItem('etherith_network_presence');
      if (presenceData) {
        const data = JSON.parse(presenceData);
        if (data.id !== this.localUserId && data.type === 'network_presence') {
          this.updateUser(data);
        }
      }
    } catch (error) {
      console.warn('Failed to check localStorage for users:', error);
    }
  }

  private checkIPFSForUsers() {
    try {
      const ipfsData = localStorage.getItem('etherith_ipfs_network');
      if (ipfsData) {
        const data = JSON.parse(ipfsData);
        if (data.id !== this.localUserId && data.type === 'ipfs_network_presence') {
          this.updateUser(data);
        }
      }
    } catch (error) {
      console.warn('Failed to check IPFS for users:', error);
    }
  }

  private updateUser(userData: any) {
    const user: NetworkUser = {
      id: userData.id,
      name: userData.name,
      ip: userData.ip,
      lastSeen: userData.timestamp,
      publicMemories: userData.publicMemories || []
    };
    
    this.users.set(user.id, user);
    
    // Load public memories from this user
    this.loadUserPublicMemories(user);
  }

  private async loadUserPublicMemories(user: NetworkUser) {
    try {
      // Load local public memories from this user
      const localMemories = await this.getUserLocalMemories(user);
      
      // Load IPFS public memories from this user
      const ipfsMemories = await this.getUserIPFSMemories(user);
      
      // Add to our public memories collection
      [...localMemories, ...ipfsMemories].forEach(memory => {
        this.publicMemories.set(memory.id, memory);
      });
      
    } catch (error) {
      console.warn(`Failed to load public memories from user ${user.name}:`, error);
    }
  }

  private async getUserLocalMemories(user: NetworkUser): Promise<NetworkMemory[]> {
    // This would need to be implemented based on your local storage structure
    // For now, return empty array
    return [];
  }

  private async getUserIPFSMemories(user: NetworkUser): Promise<NetworkMemory[]> {
    // This would integrate with your IPFS service to fetch public memories
    // For now, return empty array
    return [];
  }

  // Public API methods
  public getNetworkUsers(): NetworkUser[] {
    return Array.from(this.users.values()).filter(user => user.id !== this.localUserId);
  }

  public getPublicMemories(): NetworkMemory[] {
    return Array.from(this.publicMemories.values());
  }

  public getLocalUser(): NetworkUser | null {
    return this.users.get(this.localUserId) || null;
  }

  public isOnNetwork(): boolean {
    return this.getNetworkUsers().length > 0;
  }

  /**
   * Update local user information from DXOS identity
   */
  public updateLocalUserFromIdentity(identity: { id: string, displayName: string }) {
    console.log('🔗 [DEBUG] Updating network discovery with DXOS identity:', identity);

    // Store the user name for future use
    localStorage.setItem('etherith_user_name', identity.displayName);
    localStorage.setItem('etherith_dxos_identity', JSON.stringify(identity));

    // Update our local user record
    const existingUser = this.users.get(this.localUserId);
    const updatedUser: NetworkUser = {
      id: this.localUserId,
      name: identity.displayName,
      ip: this.localUserIP,
      lastSeen: Date.now(),
      publicMemories: existingUser?.publicMemories || []
    };

    this.users.set(this.localUserId, updatedUser);

    // Immediately broadcast the updated presence
    this.broadcastPresence();

    console.log('✅ [DEBUG] Network discovery updated with identity:', updatedUser);
  }

  public async sharePublicMemory(memoryId: string, memoryData: any) {
    try {
      // Add to our public memories
      const networkMemory: NetworkMemory = {
        id: memoryId,
        title: memoryData.title || 'Untitled Memory',
        content: memoryData.content || '',
        timestamp: memoryData.timestamp || Date.now(),
        owner: this.localUserId,
        source: 'local'
      };
      
      this.publicMemories.set(memoryId, networkMemory);
      
      // Update our presence with this new public memory
      const user = this.users.get(this.localUserId);
      if (user) {
        user.publicMemories.push(memoryId);
        this.users.set(this.localUserId, user);
      }
      
      // Broadcast the update
      this.broadcastPresence();
      
    } catch (error) {
      console.warn('Failed to share public memory:', error);
    }
  }

  public destroy() {
    this.stopDiscovery();
    this.users.clear();
    this.publicMemories.clear();
  }
}

// Singleton instance
let networkDiscovery: NetworkDiscoveryService | null = null;

export function getNetworkDiscovery(): NetworkDiscoveryService {
  if (!networkDiscovery) {
    networkDiscovery = new NetworkDiscoveryService();
  }
  return networkDiscovery;
}

export function destroyNetworkDiscovery() {
  if (networkDiscovery) {
    networkDiscovery.destroy();
    networkDiscovery = null;
  }
}
