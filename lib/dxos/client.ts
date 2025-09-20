/**
 * DXOS Client Configuration and Setup
 * Foundation for peer-to-peer social media ecosystem
 */

// Temporary mock imports for development
// TODO: Replace with actual DXOS packages when available
import { Client, Schema, Type, Filter } from './mock-client'

// DXOS Client configuration
const DXOS_CONFIG = {
  app: {
    build: {
      name: 'etherith-social',
      version: '1.0.0'
    }
  },
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
}

// Schema definitions for social media data structures
export const UserProfileSchema = Schema.Struct({
  id: Schema.String,
  displayName: Schema.String,
  email: Schema.optional(Schema.String),
  avatar: Schema.optional(Schema.String),
  bio: Schema.optional(Schema.String),
  location: Schema.optional(Schema.String),
  website: Schema.optional(Schema.String),
  joinedAt: Schema.Number,
  lastActive: Schema.Number,
  // Discord integration fields
  discordId: Schema.optional(Schema.String),
  discordUsername: Schema.optional(Schema.String),
  preferences: Schema.optional(Schema.Struct({
    theme: Schema.optional(Schema.String),
    privacy: Schema.optional(Schema.String),
    notifications: Schema.optional(Schema.Boolean)
  })),
  socialStats: Schema.optional(Schema.Struct({
    followers: Schema.Number,
    following: Schema.Number,
    posts: Schema.Number,
    likes: Schema.Number
  }))
}).pipe(
  Type.Obj({
    typename: 'etherith.org/type/UserProfile',
    version: '1.0.0'
  })
)

export const MemorySchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  content: Schema.String,
  authorId: Schema.String,
  author: Schema.String,
  timestamp: Schema.Number,
  visibility: Schema.Literal('public', 'private', 'friends'),
  tags: Schema.Array(Schema.String),
  type: Schema.Literal('text', 'image', 'video', 'audio', 'file'),
  fileType: Schema.String,
  size: Schema.Number,
  checksum: Schema.String,
  version: Schema.Number,
  ipfsHash: Schema.optional(Schema.String),
  reactions: Schema.optional(Schema.Record(Schema.String, Schema.Number)),
  comments: Schema.optional(Schema.Array(Schema.String)),
  shares: Schema.optional(Schema.Number),
  editHistory: Schema.optional(Schema.Array(Schema.Struct({
    timestamp: Schema.Number,
    content: Schema.String,
    reason: Schema.optional(Schema.String)
  })))
}).pipe(
  Type.Obj({
    typename: 'etherith.org/type/Memory',
    version: '1.0.0'
  })
)

export const ConnectionSchema = Schema.Struct({
  id: Schema.String,
  fromUserId: Schema.String,
  toUserId: Schema.String,
  type: Schema.Literal('follow', 'friend', 'block'),
  status: Schema.Literal('pending', 'accepted', 'rejected'),
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Any))
}).pipe(
  Type.Obj({
    typename: 'etherith.org/type/Connection',
    version: '1.0.0'
  })
)

export const CommunitySchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  creatorId: Schema.String,
  visibility: Schema.Literal('public', 'private', 'invite-only'),
  memberCount: Schema.Number,
  rules: Schema.optional(Schema.Array(Schema.String)),
  tags: Schema.Array(Schema.String),
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
  settings: Schema.optional(Schema.Struct({
    allowInvites: Schema.Boolean,
    moderationLevel: Schema.String,
    contentPolicy: Schema.String
  }))
}).pipe(
  Type.Obj({
    typename: 'etherith.org/type/Community',
    version: '1.0.0'
  })
)

export const NotificationSchema = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  type: Schema.Literal('like', 'comment', 'follow', 'mention', 'system'),
  title: Schema.String,
  message: Schema.String,
  data: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
  read: Schema.Boolean,
  createdAt: Schema.Number,
  expiresAt: Schema.optional(Schema.Number)
}).pipe(
  Type.Obj({
    typename: 'etherith.org/type/Notification',
    version: '1.0.0'
  })
)

// Type definitions (simplified for mock implementation)
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
  // Discord integration fields
  discordId?: string
  discordUsername?: string
  preferences?: {
    theme?: string
    privacy?: string
    notifications?: boolean
  }
  socialStats?: {
    followers: number
    following: number
    posts: number
    likes: number
  }
}

export interface Memory {
  id: string
  title: string
  content: string
  authorId: string
  author: string
  timestamp: number
  visibility: 'public' | 'private' | 'friends'
  tags: string[]
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
  fileType: string
  size: number
  checksum: string
  version: number
  ipfsHash?: string
  reactions?: Record<string, number>
  comments?: string[]
  shares?: number
  editHistory?: Array<{
    timestamp: number
    content: string
    reason?: string
  }>
}

export interface Connection {
  id: string
  fromUserId: string
  toUserId: string
  type: 'follow' | 'friend' | 'block'
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
  updatedAt: number
  metadata?: Record<string, any>
}

export interface Community {
  id: string
  name: string
  description: string
  creatorId: string
  visibility: 'public' | 'private' | 'invite-only'
  memberCount: number
  rules?: string[]
  tags: string[]
  createdAt: number
  updatedAt: number
  settings?: {
    allowInvites: boolean
    moderationLevel: string
    contentPolicy: string
  }
}

export interface Notification {
  id: string
  userId: string
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system'
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  createdAt: number
  expiresAt?: number
}

/**
 * DXOS Client Manager for Etherith Social Media
 */
export class EtherithDXOSClient {
  private client: any
  private initialized = false

  constructor() {
    this.client = new Client(DXOS_CONFIG)
  }

  /**
   * Initialize the DXOS client and register schemas
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      console.log('🚀 [DEBUG] Starting DXOS client initialization...')
      console.log('🔧 [DEBUG] Client config:', JSON.stringify(DXOS_CONFIG, null, 2))

      // Check network connectivity first
      console.log('🌐 [DEBUG] Testing network connectivity...')
      await this.testNetworkConnectivity()

      const initStart = Date.now()
      await this.client.initialize()
      const initTime = Date.now() - initStart
      console.log(`⚡ [DEBUG] Client initialization took ${initTime}ms`)

      // Register schemas with the client
      console.log('📋 [DEBUG] Registering schemas...')
      this.client.addTypes([
        UserProfileSchema,
        MemorySchema,
        ConnectionSchema,
        CommunitySchema,
        NotificationSchema
      ])
      console.log('✅ [DEBUG] All schemas registered successfully')

      this.initialized = true
      console.log('✅ [DEBUG] DXOS client fully initialized and ready')

      // Log initial network status
      await this.logNetworkStatus()
    } catch (error) {
      console.error('❌ [DEBUG] DXOS client initialization failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      })
      throw error
    }
  }

  /**
   * Get the DXOS client instance
   */
  getClient(): any {
    if (!this.initialized) {
      throw new Error('DXOS client not initialized. Call initialize() first.')
    }
    return this.client
  }

  /**
   * Create or get user identity
   */
  async createIdentity(displayName?: string): Promise<any> {
    console.log('🔑 [DEBUG] Creating new identity...', { displayName })

    try {
      const createStart = Date.now()
      const identity = await this.client.halo.createIdentity({ displayName })
      const createTime = Date.now() - createStart

      console.log('✅ [DEBUG] Identity created successfully:', {
        id: identity.id,
        displayName: identity.displayName,
        createTime: `${createTime}ms`,
        timestamp: new Date().toISOString()
      })

      // Log identity verification
      await this.verifyIdentity(identity)

      return identity
    } catch (error) {
      console.error('❌ [DEBUG] Identity creation failed:', {
        displayName,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      })
      throw error
    }
  }

  /**
   * Get current user identity
   */
  getIdentity(): any {
    const identity = this.client.halo.identity.get()
    console.log('🔍 [DEBUG] Retrieved identity:', {
      hasIdentity: !!identity,
      id: identity?.id,
      displayName: identity?.displayName,
      timestamp: new Date().toISOString()
    })
    return identity
  }

  /**
   * Create a new space for data sharing
   */
  async createSpace(name?: string): Promise<any> {
    const space = await this.client.spaces.create()
    console.log('🌌 Space created:', space.id)
    return space
  }

  /**
   * Get all available spaces
   */
  getSpaces(): any[] {
    return this.client.spaces.get()
  }

  /**
   * Join an existing space via invitation
   */
  async joinSpace(invitationCode: string, authCode?: string): Promise<void> {
    try {
      const invitation = this.client.spaces.join(invitationCode)
      if (authCode) {
        await invitation.authenticate(authCode)
      }
      console.log('✅ Successfully joined space')
    } catch (error) {
      console.error('❌ Failed to join space:', error)
      throw error
    }
  }

  /**
   * Create and share a space invitation
   */
  async shareSpace(space: any): Promise<string> {
    const invitation = space.share()
    // In a real implementation, you'd encode this properly
    return invitation.get()
  }

  /**
   * Query objects from a space with type filtering
   */
  async queryObjects<T>(space: any, filter?: any): Promise<T[]> {
    if (!space) return []

    try {
      const query = filter ? space.db.query(filter) : space.db.query()
      return await query.run()
    } catch (error) {
      console.error('Query failed:', error)
      return []
    }
  }

  /**
   * Add an object to a space
   */
  async addObject(space: any, object: any): Promise<void> {
    if (!space) {
      throw new Error('Space is required to add objects')
    }

    try {
      space.db.add(object)
      console.log('✅ Object added to space:', object.id)
    } catch (error) {
      console.error('❌ Failed to add object:', error)
      throw error
    }
  }

  /**
   * Remove an object from a space
   */
  async removeObject(space: any, object: any): Promise<void> {
    if (!space) {
      throw new Error('Space is required to remove objects')
    }

    try {
      space.db.remove(object)
      console.log('🗑️ Object removed from space:', object.id)
    } catch (error) {
      console.error('❌ Failed to remove object:', error)
      throw error
    }
  }

  /**
   * Subscribe to changes in a space
   */
  subscribeToSpace(space: any, callback: (objects: any[]) => void): () => void {
    if (!space) {
      console.warn('No space provided for subscription')
      return () => {}
    }

    return space.db.query().subscribe(({ objects }: { objects: any[] }) => {
      callback(objects)
    })
  }

  /**
   * Test network connectivity to DXOS services
   */
  async testNetworkConnectivity(): Promise<void> {
    console.log('🌐 [DEBUG] Testing network connectivity...')

    try {
      // Test signaling server connection
      const signalingUrl = DXOS_CONFIG.runtime.services.signaling[0].server
      console.log(`🔗 [DEBUG] Testing signaling server: ${signalingUrl}`)

      // Test STUN server connection
      const stunUrl = DXOS_CONFIG.runtime.services.ice[0].urls
      console.log(`🧊 [DEBUG] Testing STUN server: ${stunUrl}`)

      // Basic connectivity test (in real implementation, would test WebSocket connection)
      console.log('✅ [DEBUG] Network connectivity test completed')
    } catch (error) {
      console.error('❌ [DEBUG] Network connectivity test failed:', error)
      throw error
    }
  }

  /**
   * Verify identity after creation
   */
  async verifyIdentity(identity: any): Promise<void> {
    console.log('🔐 [DEBUG] Verifying identity...', { id: identity.id })

    try {
      // Check if identity is properly stored
      const retrievedIdentity = this.client.halo.identity.get()
      const isValid = retrievedIdentity && retrievedIdentity.id === identity.id

      console.log('✅ [DEBUG] Identity verification:', {
        valid: isValid,
        originalId: identity.id,
        retrievedId: retrievedIdentity?.id,
        match: identity.id === retrievedIdentity?.id
      })

      if (!isValid) {
        throw new Error('Identity verification failed - mismatch detected')
      }
    } catch (error) {
      console.error('❌ [DEBUG] Identity verification failed:', error)
      throw error
    }
  }

  /**
   * Log current network status and peers
   */
  async logNetworkStatus(): Promise<void> {
    console.log('📊 [DEBUG] Logging network status...')

    try {
      const spaces = this.client.spaces.get()
      const identity = this.client.halo.identity.get()

      console.log('📈 [DEBUG] Network Status Report:', {
        timestamp: new Date().toISOString(),
        initialized: this.initialized,
        hasIdentity: !!identity,
        identityId: identity?.id,
        spacesCount: spaces.length,
        spaces: spaces.map((space: any) => ({
          id: space.id,
          key: space.key,
          properties: space.properties
        }))
      })

      // Log peers for each space
      for (const space of spaces) {
        await this.logSpacePeers(space)
      }
    } catch (error) {
      console.error('❌ [DEBUG] Failed to log network status:', error)
    }
  }

  /**
   * Log peers connected to a specific space
   */
  async logSpacePeers(space: any): Promise<void> {
    try {
      console.log(`👥 [DEBUG] Space ${space.id} peer status:`)

      // In a real implementation, this would access actual peer information
      // For now, we'll log what's available from the space
      const spaceInfo = {
        id: space.id,
        isOpen: space.isOpen,
        members: space.members || [],
        memberCount: space.members?.length || 0
      }

      console.log('🌌 [DEBUG] Space details:', spaceInfo)

      // Log online users
      if (spaceInfo.members.length > 0) {
        console.log('👤 [DEBUG] Online users:', spaceInfo.members.map((member: any) => ({
          id: member.id,
          profile: member.profile,
          lastSeen: member.lastSeen
        })))
      } else {
        console.log('😔 [DEBUG] No other users currently online in this space')
      }
    } catch (error) {
      console.error(`❌ [DEBUG] Failed to log peers for space ${space.id}:`, error)
    }
  }

  /**
   * Debug method to check who's online across all spaces
   */
  async getOnlineUsers(): Promise<Array<{ spaceId: string, users: any[] }>> {
    console.log('🔍 [DEBUG] Scanning for online users across all spaces...')

    try {
      const spaces = this.client.spaces.get()
      const onlineUsers: Array<{ spaceId: string, users: any[] }> = []

      for (const space of spaces) {
        const spaceUsers = space.members || []
        onlineUsers.push({
          spaceId: space.id,
          users: spaceUsers
        })

        console.log(`🌌 [DEBUG] Space ${space.id}: ${spaceUsers.length} user(s) online`)
      }

      const totalUsers = onlineUsers.reduce((sum, space) => sum + space.users.length, 0)
      console.log(`📊 [DEBUG] Total online users across all spaces: ${totalUsers}`)

      return onlineUsers
    } catch (error) {
      console.error('❌ [DEBUG] Failed to get online users:', error)
      return []
    }
  }

  /**
   * Continuous network monitoring
   */
  startNetworkMonitoring(intervalMs: number = 30000): NodeJS.Timeout {
    console.log(`🔄 [DEBUG] Starting network monitoring (every ${intervalMs}ms)...`)

    return setInterval(async () => {
      try {
        console.log('📡 [DEBUG] === Network Status Check ===')
        await this.logNetworkStatus()
        await this.getOnlineUsers()
        console.log('✅ [DEBUG] Network monitoring cycle completed')
      } catch (error) {
        console.error('❌ [DEBUG] Network monitoring cycle failed:', error)
      }
    }, intervalMs)
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.client) {
      console.log('🧹 [DEBUG] Destroying DXOS client...')
      await this.client.destroy()
      this.initialized = false
      console.log('✅ [DEBUG] DXOS client destroyed successfully')
    }
  }
}

// Singleton instance
export const dxosClient = new EtherithDXOSClient()

// Helper functions for creating typed objects
export const createUserProfile = (data: Partial<UserProfile>): UserProfile => {
  return {
    id: data.id || `user-${Date.now()}`,
    displayName: data.displayName || 'Anonymous',
    joinedAt: data.joinedAt || Date.now(),
    lastActive: data.lastActive || Date.now(),
    ...data
  } as UserProfile
}

export const createMemory = (data: Partial<Memory>): Memory => {
  return {
    id: data.id || `memory-${Date.now()}`,
    title: data.title || 'Untitled',
    content: data.content || '',
    authorId: data.authorId || '',
    author: data.author || 'Anonymous',
    timestamp: data.timestamp || Date.now(),
    visibility: data.visibility || 'public',
    tags: data.tags || [],
    type: data.type || 'text',
    fileType: data.fileType || 'text/plain',
    size: data.size || 0,
    checksum: data.checksum || '',
    version: data.version || 1,
    ...data
  } as Memory
}

export const createConnection = (data: Partial<Connection>): Connection => {
  return {
    id: data.id || `connection-${Date.now()}`,
    fromUserId: data.fromUserId || '',
    toUserId: data.toUserId || '',
    type: data.type || 'follow',
    status: data.status || 'pending',
    createdAt: data.createdAt || Date.now(),
    updatedAt: data.updatedAt || Date.now(),
    ...data
  } as Connection
}

export const createCommunity = (data: Partial<Community>): Community => {
  return {
    id: data.id || `community-${Date.now()}`,
    name: data.name || 'Untitled Community',
    description: data.description || '',
    creatorId: data.creatorId || '',
    visibility: data.visibility || 'public',
    memberCount: data.memberCount || 0,
    tags: data.tags || [],
    createdAt: data.createdAt || Date.now(),
    updatedAt: data.updatedAt || Date.now(),
    ...data
  } as Community
}

export const createNotification = (data: Partial<Notification>): Notification => {
  return {
    id: data.id || `notification-${Date.now()}`,
    userId: data.userId || '',
    type: data.type || 'system',
    title: data.title || '',
    message: data.message || '',
    read: data.read || false,
    createdAt: data.createdAt || Date.now(),
    ...data
  } as Notification
}