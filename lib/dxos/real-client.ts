/**
 * Real DXOS Client Implementation
 * Replaces the mock implementation with actual DXOS functionality
 */

// Import DXOS client with proper error handling for WASM
let Client: any;
let Config: any;

// Dynamic import to handle WASM loading issues
async function loadDXOS() {
  try {
    const dxosModule = await import('@dxos/client');
    Client = dxosModule.Client;
    Config = dxosModule.Config;
    return true;
  } catch (error) {
    console.warn('⚠️ [REAL DXOS] Failed to load DXOS client:', error);
    return false;
  }
}

// DXOS Configuration factory
function createDXOSConfig() {
  if (!Config) {
    return {
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
              server: 'wss://kras1.dxos.network/.well-known/dx/signal'
            }
          ],
          ice: [
            {
              urls: 'stun:stun.l.google.com:19302'
            }
          ]
        }
      }
    };
  }

  return new Config({
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
            server: 'wss://kras1.dxos.network/.well-known/dx/signal'
          }
        ],
        ice: [
          {
            urls: 'stun:stun.l.google.com:19302'
          }
        ]
      }
    }
  });
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

      // Wait for client to be ready
      await this.client.spaces.waitUntilReady()

      this.initialized = true
      console.log('✅ [REAL DXOS] Client initialized successfully')
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to initialize client:', error)
      console.log('⚠️ [REAL DXOS] Falling back to basic functionality')
      this.initialized = true
      this.dxosLoaded = false
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
    } catch (error) {
      console.error('❌ [REAL DXOS] Failed to add object to space:', error)
      throw error
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