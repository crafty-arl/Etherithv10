/**
 * Unit Tests for DXOS Client
 * Tests core DXOS client functionality and schema validation
 */

import {
  EtherithDXOSClient,
  createUserProfile,
  createMemory,
  createConnection,
  createCommunity,
  createNotification,
  UserProfile,
  Memory,
  Connection
} from '../../../lib/dxos/client'

// Mock DXOS client for testing
jest.mock('../../../lib/dxos/mock-client', () => ({
  Client: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    addTypes: jest.fn(),
    halo: {
      createIdentity: jest.fn().mockResolvedValue({
        id: 'test-identity-id',
        displayName: 'Test User'
      }),
      identity: {
        get: jest.fn().mockReturnValue({
          id: 'test-identity-id',
          displayName: 'Test User'
        })
      }
    },
    spaces: {
      create: jest.fn().mockResolvedValue({
        id: 'test-space-id',
        db: {
          add: jest.fn(),
          remove: jest.fn(),
          query: jest.fn().mockReturnValue({
            run: jest.fn().mockResolvedValue([]),
            subscribe: jest.fn().mockReturnValue(() => {})
          })
        }
      }),
      get: jest.fn().mockReturnValue([]),
      join: jest.fn().mockReturnValue({
        authenticate: jest.fn()
      })
    },
    destroy: jest.fn().mockResolvedValue(undefined)
  })),
  Schema: {
    Struct: jest.fn(),
    String: 'string',
    Number: 'number',
    Boolean: 'boolean',
    Array: jest.fn(),
    optional: jest.fn(),
    Literal: jest.fn(),
    Record: jest.fn(),
    Any: 'any'
  },
  Type: {
    Obj: jest.fn()
  },
  Filter: jest.fn()
}))

describe('EtherithDXOSClient', () => {
  let client: EtherithDXOSClient

  beforeEach(() => {
    client = new EtherithDXOSClient()
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(client.initialize()).resolves.not.toThrow()
      expect(client.getClient).not.toThrow()
    })

    it('should not re-initialize if already initialized', async () => {
      await client.initialize()
      const mockClient = client.getClient()

      await client.initialize()
      expect(client.getClient()).toBe(mockClient)
    })

    it('should throw error when getting client before initialization', () => {
      expect(() => client.getClient()).toThrow('DXOS client not initialized')
    })
  })

  describe('Identity Management', () => {
    beforeEach(async () => {
      await client.initialize()
    })

    it('should create identity with display name', async () => {
      const identity = await client.createIdentity('Test User')

      expect(identity).toEqual({
        id: 'test-identity-id',
        displayName: 'Test User'
      })
    })

    it('should get existing identity', () => {
      const identity = client.getIdentity()

      expect(identity).toEqual({
        id: 'test-identity-id',
        displayName: 'Test User'
      })
    })
  })

  describe('Space Management', () => {
    beforeEach(async () => {
      await client.initialize()
    })

    it('should create new space', async () => {
      const space = await client.createSpace('Test Space')

      expect(space).toEqual({
        id: 'test-space-id',
        db: expect.any(Object)
      })
    })

    it('should get all spaces', () => {
      const spaces = client.getSpaces()
      expect(Array.isArray(spaces)).toBe(true)
    })

    it('should join space with invitation code', async () => {
      await expect(client.joinSpace('test-invitation')).resolves.not.toThrow()
    })

    it('should join space with invitation and auth code', async () => {
      await expect(client.joinSpace('test-invitation', 'auth123')).resolves.not.toThrow()
    })
  })

  describe('Object Management', () => {
    let mockSpace: any

    beforeEach(async () => {
      await client.initialize()
      mockSpace = await client.createSpace('Test Space')
    })

    it('should add object to space', async () => {
      const testObject = { id: 'test-object', data: 'test' }

      await expect(client.addObject(mockSpace, testObject)).resolves.not.toThrow()
      expect(mockSpace.db.add).toHaveBeenCalledWith(testObject)
    })

    it('should remove object from space', async () => {
      const testObject = { id: 'test-object', data: 'test' }

      await expect(client.removeObject(mockSpace, testObject)).resolves.not.toThrow()
      expect(mockSpace.db.remove).toHaveBeenCalledWith(testObject)
    })

    it('should query objects from space', async () => {
      const filter = { id: 'test-object' }

      const results = await client.queryObjects(mockSpace, filter)
      expect(Array.isArray(results)).toBe(true)
      expect(mockSpace.db.query).toHaveBeenCalledWith(filter)
    })

    it('should query all objects when no filter provided', async () => {
      const results = await client.queryObjects(mockSpace)
      expect(Array.isArray(results)).toBe(true)
      expect(mockSpace.db.query).toHaveBeenCalledWith()
    })

    it('should handle query errors gracefully', async () => {
      mockSpace.db.query.mockReturnValue({
        run: jest.fn().mockRejectedValue(new Error('Query failed'))
      })

      const results = await client.queryObjects(mockSpace, { test: true })
      expect(results).toEqual([])
    })

    it('should throw error when adding to invalid space', async () => {
      const testObject = { id: 'test-object' }

      await expect(client.addObject(null, testObject))
        .rejects.toThrow('Space is required to add objects')
    })

    it('should throw error when removing from invalid space', async () => {
      const testObject = { id: 'test-object' }

      await expect(client.removeObject(null, testObject))
        .rejects.toThrow('Space is required to remove objects')
    })
  })

  describe('Subscriptions', () => {
    let mockSpace: any

    beforeEach(async () => {
      await client.initialize()
      mockSpace = await client.createSpace('Test Space')
    })

    it('should subscribe to space changes', () => {
      const callback = jest.fn()

      const unsubscribe = client.subscribeToSpace(mockSpace, callback)

      expect(typeof unsubscribe).toBe('function')
      expect(mockSpace.db.query().subscribe).toHaveBeenCalled()
    })

    it('should handle subscription to invalid space', () => {
      const callback = jest.fn()

      const unsubscribe = client.subscribeToSpace(null, callback)

      expect(typeof unsubscribe).toBe('function')
      expect(unsubscribe()).toBeUndefined()
    })
  })

  describe('Cleanup', () => {
    beforeEach(async () => {
      await client.initialize()
    })

    it('should destroy client cleanly', async () => {
      await expect(client.destroy()).resolves.not.toThrow()
    })
  })
})

describe('Schema Creators', () => {
  describe('createUserProfile', () => {
    it('should create valid user profile with minimal data', () => {
      const profile = createUserProfile({
        displayName: 'Test User'
      })

      expect(profile).toMatchObject({
        id: expect.any(String),
        displayName: 'Test User',
        joinedAt: expect.any(Number),
        lastActive: expect.any(Number)
      })
    })

    it('should create user profile with Discord data', () => {
      const profile = createUserProfile({
        displayName: 'Discord User',
        discordId: 'discord123',
        discordUsername: 'discorduser',
        avatar: 'https://cdn.discordapp.com/avatar.jpg'
      })

      expect(profile).toMatchObject({
        displayName: 'Discord User',
        discordId: 'discord123',
        discordUsername: 'discorduser',
        avatar: 'https://cdn.discordapp.com/avatar.jpg'
      })
    })

    it('should create user profile with social stats', () => {
      const profile = createUserProfile({
        displayName: 'Social User',
        socialStats: {
          followers: 100,
          following: 50,
          posts: 25,
          likes: 500
        }
      })

      expect(profile.socialStats).toEqual({
        followers: 100,
        following: 50,
        posts: 25,
        likes: 500
      })
    })
  })

  describe('createMemory', () => {
    it('should create valid memory with minimal data', () => {
      const memory = createMemory({
        title: 'Test Memory',
        content: 'Test content'
      })

      expect(memory).toMatchObject({
        id: expect.any(String),
        title: 'Test Memory',
        content: 'Test content',
        timestamp: expect.any(Number),
        visibility: 'public',
        type: 'text',
        version: 1
      })
    })

    it('should create memory with all fields', () => {
      const memory = createMemory({
        title: 'Full Memory',
        content: 'Full content',
        authorId: 'author123',
        author: 'Author Name',
        visibility: 'private',
        tags: ['test', 'memory'],
        type: 'image',
        ipfsHash: 'QmTest...'
      })

      expect(memory).toMatchObject({
        title: 'Full Memory',
        content: 'Full content',
        authorId: 'author123',
        author: 'Author Name',
        visibility: 'private',
        tags: ['test', 'memory'],
        type: 'image',
        ipfsHash: 'QmTest...'
      })
    })
  })

  describe('createConnection', () => {
    it('should create valid connection with minimal data', () => {
      const connection = createConnection({
        fromUserId: 'user1',
        toUserId: 'user2'
      })

      expect(connection).toMatchObject({
        id: expect.any(String),
        fromUserId: 'user1',
        toUserId: 'user2',
        type: 'follow',
        status: 'pending',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number)
      })
    })

    it('should create friend connection', () => {
      const connection = createConnection({
        fromUserId: 'user1',
        toUserId: 'user2',
        type: 'friend',
        status: 'accepted'
      })

      expect(connection).toMatchObject({
        type: 'friend',
        status: 'accepted'
      })
    })
  })

  describe('createCommunity', () => {
    it('should create valid community with minimal data', () => {
      const community = createCommunity({
        name: 'Test Community',
        creatorId: 'creator123'
      })

      expect(community).toMatchObject({
        id: expect.any(String),
        name: 'Test Community',
        creatorId: 'creator123',
        visibility: 'public',
        memberCount: 0,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number)
      })
    })

    it('should create community with settings', () => {
      const community = createCommunity({
        name: 'Private Community',
        creatorId: 'creator123',
        visibility: 'private',
        settings: {
          allowInvites: false,
          moderationLevel: 'strict',
          contentPolicy: 'family-friendly'
        }
      })

      expect(community.settings).toEqual({
        allowInvites: false,
        moderationLevel: 'strict',
        contentPolicy: 'family-friendly'
      })
    })
  })

  describe('createNotification', () => {
    it('should create valid notification with minimal data', () => {
      const notification = createNotification({
        userId: 'user123',
        title: 'Test Notification',
        message: 'Test message'
      })

      expect(notification).toMatchObject({
        id: expect.any(String),
        userId: 'user123',
        type: 'system',
        title: 'Test Notification',
        message: 'Test message',
        read: false,
        createdAt: expect.any(Number)
      })
    })

    it('should create notification with expiration', () => {
      const expiresAt = Date.now() + 86400000 // 24 hours
      const notification = createNotification({
        userId: 'user123',
        type: 'like',
        title: 'New Like',
        message: 'Someone liked your memory',
        expiresAt
      })

      expect(notification).toMatchObject({
        type: 'like',
        expiresAt
      })
    })
  })
})

describe('Data Validation', () => {
  it('should validate user profile structure', () => {
    const profile: UserProfile = createUserProfile({
      displayName: 'Valid User'
    })

    // Required fields
    expect(profile.id).toBeDefined()
    expect(profile.displayName).toBeDefined()
    expect(profile.joinedAt).toBeDefined()
    expect(profile.lastActive).toBeDefined()

    // Type checking
    expect(typeof profile.id).toBe('string')
    expect(typeof profile.displayName).toBe('string')
    expect(typeof profile.joinedAt).toBe('number')
    expect(typeof profile.lastActive).toBe('number')
  })

  it('should validate memory structure', () => {
    const memory: Memory = createMemory({
      title: 'Valid Memory',
      content: 'Valid content'
    })

    // Required fields
    expect(memory.id).toBeDefined()
    expect(memory.title).toBeDefined()
    expect(memory.content).toBeDefined()
    expect(memory.timestamp).toBeDefined()
    expect(memory.visibility).toBeDefined()
    expect(memory.version).toBeDefined()

    // Enum validation
    expect(['public', 'private', 'friends']).toContain(memory.visibility)
    expect(['text', 'image', 'video', 'audio', 'file']).toContain(memory.type)
  })

  it('should validate connection structure', () => {
    const connection: Connection = createConnection({
      fromUserId: 'user1',
      toUserId: 'user2'
    })

    // Required fields
    expect(connection.id).toBeDefined()
    expect(connection.fromUserId).toBeDefined()
    expect(connection.toUserId).toBeDefined()
    expect(connection.type).toBeDefined()
    expect(connection.status).toBeDefined()

    // Enum validation
    expect(['follow', 'friend', 'block']).toContain(connection.type)
    expect(['pending', 'accepted', 'rejected']).toContain(connection.status)
  })
})