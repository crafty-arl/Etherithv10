/**
 * Real DXOS Client Implementation
 * Replaces the mock implementation with actual DXOS functionality
 */

// Import DXOS client with proper error handling for WASM
let Client: any;
let Config: any;

// Import public memory sync service
import { publicMemorySync } from './utils/public-memory-sync';

// Dynamic import to handle WASM loading issues
async function loadDXOS() {
  try {
    console.log('🔄 [REAL DXOS] Starting DXOS initialization sequence...');
    
    // Try the alternative Automerge setup first
    try {
      const { setupAutomergeForDXOS } = await import('./automerge-setup');
      setupAutomergeForDXOS();
      console.log('✅ [REAL DXOS] Alternative Automerge setup successful');
    } catch (altError) {
      console.warn('⚠️ [REAL DXOS] Alternative Automerge setup failed, trying original method:', altError);
      
      // Fallback to original setup method
      const { setupGlobalAutomerge } = await import('./automerge-global-setup');
      
      let automergeSetupSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!automergeSetupSuccess && retryCount < maxRetries) {
        try {
          await setupGlobalAutomerge();
          automergeSetupSuccess = true;
          console.log('✅ [REAL DXOS] Original Automerge setup successful');
        } catch (automergeError) {
          retryCount++;
          console.warn(`⚠️ [REAL DXOS] Automerge setup attempt ${retryCount} failed:`, automergeError);
          
          if (retryCount < maxRetries) {
            console.log(`🔄 [REAL DXOS] Retrying Automerge setup in 1 second...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw new Error(`Failed to setup Automerge after ${maxRetries} attempts`);
          }
        }
      }
    }

    // Wait longer to ensure Automerge is fully set up and available globally
    console.log('🔄 [REAL DXOS] Waiting for Automerge to be fully available...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify Automerge is available globally before proceeding
    if (typeof globalThis !== 'undefined' && !(globalThis as any).Automerge) {
      throw new Error('Automerge not available globally after setup');
    }

    // Then load DXOS client
    console.log('🔄 [REAL DXOS] Loading DXOS client...');
    const dxosModule = await import('@dxos/client');
    Client = dxosModule.Client;
    Config = dxosModule.Config;
    
    console.log('✅ [REAL DXOS] DXOS modules loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ [REAL DXOS] Failed to load DXOS client:', error);
    return false;
  }
}

// DXOS Configuration factory
function createDXOSConfig() {
  const baseConfig = {
      runtime: {
        client: {
          storage: {
            persistent: true,
            dataRoot: '.dxos'
          }
        },
        services: {
          signaling: [
            {
              server: 'wss://signal.dxos.org/.well-known/dx/signal'
            },
            {
              server: 'wss://kras1.dxos.network/.well-known/dx/signal'
            }
          ],
          ice: [
            {
              urls: 'stun:stun.l.google.com:19302'
            },
            {
              urls: 'stun:stun1.l.google.com:19302'
            }
          ]
        }
      }
  };

  if (!Config) {
    console.log('⚠️ [REAL DXOS] Config not available, using fallback configuration');
    return baseConfig;
  }

  try {
    const config = new Config(baseConfig);
    console.log('✅ [REAL DXOS] Configuration created successfully');
    return config;
  } catch (error) {
    console.warn('⚠️ [REAL DXOS] Failed to create Config object, using fallback:', error);
    return baseConfig;
  }
}

// User Profile interface for our application
export interface UserProfile {
  id: string
  displayName: string
  email?: string
  avatar?: string
  bio?: string
  location?: string
  website?: string
  joinedAt: number
  lastActive: number
  // Discord integration
  discordId?: string
  discordUsername?: string
  // Social stats
  socialStats?: {
    followers: number
    following: number
    posts: number
  }
}

// Online user interface
export interface OnlineUser {
  id: string
  profile?: UserProfile
  lastSeen: number
}

/**
 * Real DXOS Client wrapper for Etherith
 */
export class EtherithDXOSClient {
  private client: any
  private initialized = false
  private globalDiscordSpaceKey = 'etherith_global_discord_space'
  private dxosLoaded = false

  constructor() {
    console.log('🚀 [REAL DXOS] Initializing real DXOS client...')
    this.client = null
  }

  /**
   * Initialize the DXOS client
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('✅ [REAL DXOS] Client already initialized')
      return
    }

    try {
      console.log('🔄 [REAL DXOS] Loading DXOS modules...')

      // Try to load DXOS
      this.dxosLoaded = await loadDXOS()

      if (!this.dxosLoaded || !Client) {
        console.warn('⚠️ [REAL DXOS] DXOS not available, falling back to basic functionality')
        this.initialized = true
        return
      }

      console.log('🔄 [REAL DXOS] Creating DXOS client...')
      this.client = new Client({
        config: createDXOSConfig()
      })

      console.log('🔄 [REAL DXOS] Initializing client...')
      await this.client.initialize()

      // Set up connection monitoring
      this.setupConnectionMonitoring()

      // Wait for client to be ready with timeout
      try {
        await Promise.race([
          this.client.spaces.waitUntilReady(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Client initialization timeout')), 15000)
          )
        ])
        console.log('✅ [REAL DXOS] Client spaces ready')
      } catch (timeoutError) {
        console.warn('⚠️ [REAL DXOS] Client initialization timeout, continuing with limited functionality')
        console.log('💡 [REAL DXOS] This is normal if signal servers are unreachable - local functionality will still work')
        // Continue with limited functionality - the client might still work for local operations
      }

      this.initialized = true
      console.log('✅ [REAL DXOS] Client initialized successfully')
      
      // Initialize public memory sync service
      publicMemorySync.initialize(this)
      console.log('🔄 [REAL DXOS] Public memory sync service initialized')
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to initialize client:', error)
      
      // Check if it's an Automerge error specifically
      if (error instanceof Error && error.message.includes('Automerge.use() not called')) {
        console.error('❌ [REAL DXOS] Automerge initialization failed - this is a critical error')
        console.log('💡 [REAL DXOS] This may be due to a version compatibility issue between DXOS and Automerge')
        console.log('💡 [REAL DXOS] Try refreshing the page or clearing browser cache')
        console.log('💡 [REAL DXOS] If the issue persists, consider updating DXOS or Automerge versions')
      }
      
      console.log('⚠️ [REAL DXOS] Falling back to basic functionality')
      console.log('📝 [REAL DXOS] Local storage and basic features will still work')
      this.initialized = true
      this.dxosLoaded = false
    }
  }

  /**
   * Set up connection monitoring and retry logic
   */
  private setupConnectionMonitoring(): void {
    if (!this.client) return

    // Monitor connection status
    this.client.status.subscribe((status: any) => {
      console.log('📡 [REAL DXOS] Connection status:', status)
      
      if (status?.client === 'error') {
        console.warn('⚠️ [REAL DXOS] Connection error detected, attempting recovery...')
        this.handleConnectionError()
      }
    })
  }

  /**
   * Handle connection errors with retry logic
   */
  private async handleConnectionError(): Promise<void> {
    if (!this.client) return

    console.log('🔄 [REAL DXOS] Attempting to recover connection...')
    
    try {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Try to reinitialize
      await this.client.initialize()
      console.log('✅ [REAL DXOS] Connection recovered successfully')
    } catch (error) {
      console.error('❌ [REAL DXOS] Connection recovery failed:', error)
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized && (this.dxosLoaded ? this.client?.initialized : true)
  }

  /**
   * Get current identity
   */
  getIdentity(): any {
    if (!this.dxosLoaded || !this.client) {
      // Return mock identity for fallback
      return {
        identityKey: { toHex: () => 'fallback-identity' },
        profile: { displayName: 'Fallback User' }
      }
    }

    const identity = this.client.halo.identity.get()
    console.log('🔍 [REAL DXOS] Retrieved identity:', {
      hasIdentity: !!identity,
      id: identity?.identityKey?.toHex(),
      displayName: identity?.profile?.displayName,
      timestamp: new Date().toISOString()
    })
    return identity
  }

  /**
   * Create or get user identity
   */
  async createIdentity(displayName?: string, discordData?: any): Promise<any> {
    console.log('🔑 [REAL DXOS] Creating new identity...', { displayName, hasDiscordData: !!discordData })

    try {
      const profile = {
        displayName: displayName || 'Anonymous User',
        ...(discordData && {
          data: {
            discordId: discordData.discordId,
            discordUsername: discordData.username,
            avatar: discordData.avatar
          }
        })
      }

      const identity = await this.client.halo.createIdentity(profile)

      console.log('✅ [REAL DXOS] Identity created successfully:', {
        id: identity.identityKey?.toHex(),
        displayName: identity.profile?.displayName,
        discordId: profile.data?.discordId,
        timestamp: new Date().toISOString()
      })

      return identity
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to create identity:', error)
      throw error
    }
  }

  /**
   * Create a new space
   */
  async createSpace(name?: string): Promise<any> {
    try {
      const meta = name ? { name } : undefined
      const space = await this.client.spaces.create(meta)
      console.log('🌌 [REAL DXOS] Space created:', {
        id: space.id,
        key: space.key?.toHex(),
        name: name || 'Unnamed'
      })
      return space
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to create space:', error)
      throw error
    }
  }

  /**
   * Get all available spaces
   */
  getSpaces(): any[] {
    if (!this.dxosLoaded || !this.client) {
      console.log('📋 [REAL DXOS] Client not available, returning empty spaces array')
      return []
    }

    const spaces = this.client.spaces.get()
    console.log('📋 [REAL DXOS] Retrieved spaces:', {
      count: spaces.length,
      spaces: spaces.map((s: any) => ({
        id: s.id,
        key: s.key?.toHex(),
        properties: s.properties
      }))
    })
    return spaces
  }

  /**
   * Join an existing space via invitation
   */
  async joinSpace(invitationCode: string, authCode?: string): Promise<void> {
    try {
      const invitation = this.client.spaces.join(invitationCode)
      if (authCode) {
        await invitation.authenticate({ authCode })
      }
      console.log('✅ [REAL DXOS] Successfully joined space')
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to join space:', error)
      throw error
    }
  }

  /**
   * Get or create the global Discord space
   */
  async getOrCreateGlobalDiscordSpace(): Promise<any> {
    try {
      // Check if we already have a global space stored
      const storedSpaceId = typeof window !== 'undefined'
        ? localStorage.getItem(this.globalDiscordSpaceKey)
        : null

      if (storedSpaceId) {
        // Try to find the space in our available spaces
        const spaces = this.getSpaces()
        const existingGlobalSpace = spaces.find(space => space.id === storedSpaceId)

        if (existingGlobalSpace) {
          console.log('🌍 [REAL DXOS] Found existing global Discord space:', existingGlobalSpace.id)
          return existingGlobalSpace
        } else {
          console.log('🗑️ [REAL DXOS] Stored space ID not found, clearing...')
          if (typeof window !== 'undefined') {
            localStorage.removeItem(this.globalDiscordSpaceKey)
          }
        }
      }

      // Check if there's already a global space among our spaces
      const spaces = this.getSpaces()
      const globalSpace = spaces.find(space =>
        space.properties?.name === 'Etherith Global Discord Space' ||
        space.properties?.isGlobalDiscordSpace === true
      )

      if (globalSpace) {
        console.log('🌍 [REAL DXOS] Found global Discord space by properties:', globalSpace.id)
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.globalDiscordSpaceKey, globalSpace.id)
        }
        return globalSpace
      }

      // Create new global space
      console.log('🆕 [REAL DXOS] Creating new global Discord space...')
      const newGlobalSpace = await this.createSpace('Etherith Global Discord Space')

      // Mark it as the global Discord space
      try {
        newGlobalSpace.db.add({
          type: 'global_space_metadata',
          name: 'Etherith Global Discord Space',
          description: 'Global space for all Discord users to connect and share',
          isGlobalDiscordSpace: true,
          createdAt: Date.now(),
          version: '1.0'
        })
      } catch (metadataError) {
        console.warn('⚠️ [REAL DXOS] Could not add metadata to global space:', metadataError)
      }

      // Store the global space ID
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.globalDiscordSpaceKey, newGlobalSpace.id)
      }
      console.log('✅ [REAL DXOS] Created and stored new global Discord space:', newGlobalSpace.id)

      return newGlobalSpace
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to get or create global Discord space:', error)
      throw error
    }
  }

  /**
   * Join the global Discord space
   */
  async joinGlobalDiscordSpace(): Promise<any> {
    try {
      const globalSpace = await this.getOrCreateGlobalDiscordSpace()
      console.log('🌍 [REAL DXOS] Successfully joined global Discord space:', globalSpace.id)
      return globalSpace
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to join global Discord space:', error)
      throw error
    }
  }

  /**
   * Add an object to a space
   */
  async addObject(space: any, object: any): Promise<void> {
    try {
      space.db.add(object)
      console.log('📝 [REAL DXOS] Added object to space:', {
        spaceId: space.id,
        objectType: object.type || 'unknown'
      })

      // If this is a public memory, add it to the sync queue
      if (object.visibility === 'public' && object.type === 'memory') {
        const identity = this.getIdentity()
        if (identity) {
          publicMemorySync.addToSyncQueue(object, space.id, identity.identityKey?.toHex() || 'unknown')
          console.log('🔄 [REAL DXOS] Added public memory to sync queue:', object.id)
        }
      }
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to add object to space:', error)
      throw error
    }
  }

  /**
   * Get all cross-space public memories
   */
  async getCrossSpacePublicMemories(): Promise<any[]> {
    try {
      const memories = publicMemorySync.getAllCrossSpaceMemories()
      console.log('🌐 [REAL DXOS] Retrieved cross-space public memories:', memories.length)
      return memories
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to get cross-space public memories:', error)
      return []
    }
  }

  /**
   * Get public memory sync status
   */
  getPublicMemorySyncStatus(): any {
    return publicMemorySync.getSyncStatus()
  }

  /**
   * Force resync of public memories
   */
  async forceResyncPublicMemories(): Promise<void> {
    try {
      await publicMemorySync.forceResync()
      console.log('🔄 [REAL DXOS] Forced resync of public memories')
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to force resync:', error)
    }
  }

  /**
   * Get online users from all spaces
   */
  async getOnlineUsers(): Promise<any> {
    try {
      const spaces = this.getSpaces()
      const onlineUsers: any[] = []

      for (const space of spaces) {
        try {
          // Query for user profiles in this space
          const profiles = await space.db.query({ type: 'user_profile' }).run()

          if (profiles && profiles.length > 0) {
            onlineUsers.push({
              spaceId: space.id,
              users: profiles.map((profile: any) => ({
                id: profile.id,
                profile: {
                  displayName: profile.displayName
                },
                lastSeen: profile.lastActive || Date.now()
              }))
            })
          }
        } catch (spaceError) {
          console.warn('⚠️ [REAL DXOS] Could not query space for users:', space.id, spaceError)
        }
      }

      console.log('👥 [REAL DXOS] Retrieved online users:', {
        totalSpaces: spaces.length,
        spacesWithUsers: onlineUsers.length,
        totalUsers: onlineUsers.reduce((sum, space) => sum + space.users.length, 0)
      })

      return onlineUsers
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to get online users:', error)
      return []
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    if (!this.dxosLoaded || !this.client) {
      return false
    }
    return this.initialized && this.client.status.get()?.client === 'ready'
  }

  /**
   * Destroy the client
   */
  async destroy(): Promise<void> {
    try {
      await this.client.destroy()
      this.initialized = false
      console.log('🔥 [REAL DXOS] Client destroyed')
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to destroy client:', error)
    }
  }
}

// Export singleton instance
export const dxosClient = new EtherithDXOSClient()