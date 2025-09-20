/**
 * DXOS Client Configuration and Setup
 * Foundation for peer-to-peer social media ecosystem
 */

// Real DXOS implementation
import { EtherithDXOSClient, dxosClient, UserProfile, OnlineUser } from './real-client'

// Export types and classes for use throughout the application
export type { UserProfile, OnlineUser }
export { EtherithDXOSClient }

// Memory interface
export interface Memory {
  id: string
  title: string
  content: string
  timestamp: number
  visibility: 'public' | 'private' | 'space'
  tags: string[]
  fileType: string
  authorId?: string
  size?: number
  reactions?: Record<string, number>
}

// Connection interface
export interface Connection {
  id: string
  fromUserId: string
  toUserId: string
  status: 'pending' | 'accepted' | 'blocked' | 'rejected'
  type: 'follow' | 'friend' | 'block'
  timestamp: number
  updatedAt?: number
  createdAt?: number
}

// Community interface
export interface Community {
  id: string
  name: string
  description: string
  members: string[]
  admins: string[]
  createdAt: number
}

// Notification interface
export interface Notification {
  id: string
  userId: string
  type: 'connection_request' | 'memory_shared' | 'community_invitation'
  message: string
  timestamp: number
  read: boolean
}

/**
 * Main DXOS Client wrapper that provides all functionality
 */
export class MainDXOSClient {
  private realClient: EtherithDXOSClient

  constructor() {
    this.realClient = dxosClient
  }

  /**
   * Initialize the DXOS client
   */
  async initialize(): Promise<void> {
    return this.realClient.initialize()
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.realClient.isInitialized()
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.realClient.isConnected()
  }

  /**
   * Get current identity
   */
  getIdentity(): any {
    return this.realClient.getIdentity()
  }

  /**
   * Create or get user identity
   */
  async createIdentity(displayName?: string, discordData?: any): Promise<any> {
    return this.realClient.createIdentity(displayName, discordData)
  }

  /**
   * Create a new space
   */
  async createSpace(name?: string): Promise<any> {
    return this.realClient.createSpace(name)
  }

  /**
   * Get all available spaces
   */
  getSpaces(): any[] {
    return this.realClient.getSpaces()
  }

  /**
   * Join an existing space via invitation
   */
  async joinSpace(invitationCode: string, authCode?: string): Promise<void> {
    return this.realClient.joinSpace(invitationCode, authCode)
  }

  /**
   * Get or create the global Discord space
   */
  async getOrCreateGlobalDiscordSpace(): Promise<any> {
    return this.realClient.getOrCreateGlobalDiscordSpace()
  }

  /**
   * Join the global Discord space
   */
  async joinGlobalDiscordSpace(): Promise<any> {
    return this.realClient.joinGlobalDiscordSpace()
  }

  /**
   * Add an object to a space
   */
  async addObject(space: any, object: any): Promise<void> {
    return this.realClient.addObject(space, object)
  }

  /**
   * Get online users from all spaces
   */
  async getOnlineUsers(): Promise<any> {
    return this.realClient.getOnlineUsers()
  }

  /**
   * Destroy the client
   */
  async destroy(): Promise<void> {
    return this.realClient.destroy()
  }

  // Additional methods for social features

  /**
   * Create a memory in a space
   */
  async createMemory(space: any, memory: Memory): Promise<void> {
    const memoryObject = {
      ...memory,
      type: 'memory',
      createdAt: Date.now()
    }
    return this.addObject(space, memoryObject)
  }

  /**
   * Get memories from a space
   */
  async getMemories(space: any): Promise<Memory[]> {
    try {
      const memories = await space.db.query({ type: 'memory' }).run()
      return memories || []
    } catch (error) {
      console.error('Failed to get memories:', error)
      return []
    }
  }

  /**
   * Add a user profile to a space
   */
  async addUserProfile(space: any, profile: UserProfile): Promise<void> {
    const profileObject = {
      ...profile,
      type: 'user_profile',
      updatedAt: Date.now()
    }
    return this.addObject(space, profileObject)
  }

  /**
   * Get user profiles from a space
   */
  async getUserProfiles(space: any): Promise<UserProfile[]> {
    try {
      const profiles = await space.db.query({ type: 'user_profile' }).run()
      return profiles || []
    } catch (error) {
      console.error('Failed to get user profiles:', error)
      return []
    }
  }

  /**
   * Get all cross-space public memories
   */
  async getCrossSpacePublicMemories(): Promise<any[]> {
    return this.realClient.getCrossSpacePublicMemories()
  }

  /**
   * Get public memory sync status
   */
  getPublicMemorySyncStatus(): any {
    return this.realClient.getPublicMemorySyncStatus()
  }

  /**
   * Force resync of public memories
   */
  async forceResyncPublicMemories(): Promise<void> {
    return this.realClient.forceResyncPublicMemories()
  }
}

// Export singleton instance
export const mainDXOSClient = new MainDXOSClient()

// For backward compatibility, export as dxosClient
export { mainDXOSClient as dxosClient }

// Export additional functions that components might need
export const createMemory = async (spaceOrMemory: any, memory?: Memory): Promise<void> => {
  // Handle both calling patterns: createMemory(memory) and createMemory(space, memory)
  if (memory) {
    // Two argument version: createMemory(space, memory)
    return mainDXOSClient.createMemory(spaceOrMemory, memory)
  } else {
    // Single argument version: createMemory(memory) - need to get current space
    const memoryObj = spaceOrMemory as Memory
    // For now, just return a resolved promise since we don't have space context here
    // The component should use the DXOS context methods instead
    return Promise.resolve()
  }
}

export const getMemories = async (space: any): Promise<Memory[]> => {
  return mainDXOSClient.getMemories(space)
}

export const addUserProfile = async (space: any, profile: UserProfile): Promise<void> => {
  return mainDXOSClient.addUserProfile(space, profile)
}

export const getUserProfiles = async (space: any): Promise<UserProfile[]> => {
  return mainDXOSClient.getUserProfiles(space)
}

export const createConnection = async (space: any, connection: Connection): Promise<void> => {
  const connectionObject = {
    ...connection,
    type: 'connection',
    createdAt: Date.now()
  }
  return mainDXOSClient.addObject(space, connectionObject)
}

export const createCommunity = async (space: any, community: Community): Promise<void> => {
  const communityObject = {
    ...community,
    type: 'community',
    createdAt: Date.now()
  }
  return mainDXOSClient.addObject(space, communityObject)
}