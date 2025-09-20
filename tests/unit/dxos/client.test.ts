/**
 * DXOS Client Unit Tests
 * Tests for the DXOS integration and social media functionality
 */

import { EtherithDXOSClient, createMemory, createUserProfile, createConnection } from '../../../lib/dxos/client'

// Mock DXOS dependencies
jest.mock('@dxos/client', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      addTypes: jest.fn(),
      halo: {
        identity: {
          get: jest.fn().mockReturnValue({ id: 'test-identity', displayName: 'Test User' })
        },
        createIdentity: jest.fn().mockResolvedValue({ id: 'test-identity', displayName: 'Test User' })
      },
      spaces: {
        get: jest.fn().mockReturnValue([]),
        create: jest.fn().mockResolvedValue({
          id: 'test-space',
          db: {
            add: jest.fn(),
            remove: jest.fn(),
            query: jest.fn().mockReturnValue({
              run: jest.fn().mockResolvedValue([]),
              subscribe: jest.fn().mockReturnValue(() => {})
            })
          }
        }),
        join: jest.fn()
      },
      destroy: jest.fn().mockResolvedValue(undefined)
    }))
  }
})

jest.mock('@effect/schema', () => ({
  Schema: {
    Struct: jest.fn(),
    String: 'string',
    Number: 'number',
    Boolean: 'boolean',
    Array: jest.fn(),
    Record: jest.fn(),
    Literal: jest.fn(),
    optional: jest.fn(),
    Any: 'any'
  },
  Type: {
    Obj: jest.fn()
  },
  Filter: {}
}))

describe('EtherithDXOSClient', () => {
  let client: EtherithDXOSClient

  beforeEach(() => {
    client = new EtherithDXOSClient()
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await client.destroy()
  })

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      await expect(client.initialize()).resolves.not.toThrow()
    })

    test('should not re-initialize if already initialized', async () => {
      await client.initialize()
      await client.initialize() // Should not throw or cause issues
    })

    test('should provide client instance after initialization', async () => {
      await client.initialize()
      const dxosClient = client.getClient()
      expect(dxosClient).toBeDefined()
    })

    test('should throw error when accessing client before initialization', () => {
      expect(() => client.getClient()).toThrow('DXOS client not initialized')
    })
  })

  describe('identity management', () => {
    beforeEach(async () => {
      await client.initialize()
    })

    test('should create identity with display name', async () => {
      const identity = await client.createIdentity('Test User')
      expect(identity).toEqual({
        id: 'test-identity',
        displayName: 'Test User'
      })
    })

    test('should get existing identity', () => {
      const identity = client.getIdentity()
      expect(identity).toEqual({
        id: 'test-identity',
        displayName: 'Test User'
      })
    })
  })

  describe('space management', () => {
    beforeEach(async () => {
      await client.initialize()
    })

    test('should create new space', async () => {
      const space = await client.createSpace('Test Space')
      expect(space).toEqual({
        id: 'test-space',
        db: expect.any(Object)
      })
    })

    test('should get all spaces', () => {
      const spaces = client.getSpaces()
      expect(Array.isArray(spaces)).toBe(true)
    })

    test('should join space with invitation code', async () => {
      await expect(client.joinSpace('test-invitation')).resolves.not.toThrow()
    })

    test('should join space with invitation and auth code', async () => {
      await expect(client.joinSpace('test-invitation', 'auth-code')).resolves.not.toThrow()
    })
  })

  describe('object management', () => {
    let mockSpace: any

    beforeEach(async () => {
      await client.initialize()
      mockSpace = await client.createSpace()
    })

    test('should add object to space', async () => {
      const memory = createMemory({
        title: 'Test Memory',
        content: 'Test content'
      })

      await expect(client.addObject(mockSpace, memory)).resolves.not.toThrow()
      expect(mockSpace.db.add).toHaveBeenCalledWith(memory)
    })

    test('should remove object from space', async () => {
      const memory = createMemory({
        title: 'Test Memory',
        content: 'Test content'
      })

      await expect(client.removeObject(mockSpace, memory)).resolves.not.toThrow()
      expect(mockSpace.db.remove).toHaveBeenCalledWith(memory)
    })

    test('should query objects from space', async () => {
      const results = await client.queryObjects(mockSpace)
      expect(Array.isArray(results)).toBe(true)
      expect(mockSpace.db.query().run).toHaveBeenCalled()
    })

    test('should query objects with filter', async () => {
      const filter = { type: 'text' }
      await client.queryObjects(mockSpace, filter)
      expect(mockSpace.db.query).toHaveBeenCalledWith(filter)
    })

    test('should subscribe to space changes', () => {
      const callback = jest.fn()
      const unsubscribe = client.subscribeToSpace(mockSpace, callback)

      expect(typeof unsubscribe).toBe('function')
      expect(mockSpace.db.query().subscribe).toHaveBeenCalled()
    })

    test('should handle null space gracefully', async () => {
      await expect(client.addObject(null, {})).rejects.toThrow('Space is required')
      await expect(client.removeObject(null, {})).rejects.toThrow('Space is required')

      const results = await client.queryObjects(null)
      expect(results).toEqual([])

      const unsubscribe = client.subscribeToSpace(null, jest.fn())
      expect(typeof unsubscribe).toBe('function')
    })
  })
})

describe('Data Type Creators', () => {
  describe('createMemory', () => {
    test('should create memory with default values', () => {
      const memory = createMemory({})

      expect(memory).toMatchObject({
        id: expect.stringMatching(/^memory-\d+$/),
        title: 'Untitled',
        content: '',
        authorId: '',
        author: 'Anonymous',
        visibility: 'public',
        tags: [],
        type: 'text',
        fileType: 'text/plain',
        size: 0,
        checksum: '',
        version: 1,
        timestamp: expect.any(Number)
      })
    })

    test('should create memory with provided values', () => {
      const customData = {
        title: 'Custom Title',
        content: 'Custom content',
        authorId: 'user-123',
        author: 'John Doe',
        visibility: 'private' as const,
        tags: ['tag1', 'tag2'],
        type: 'image' as const
      }

      const memory = createMemory(customData)

      expect(memory).toMatchObject(customData)
    })
  })

  describe('createUserProfile', () => {
    test('should create user profile with default values', () => {
      const profile = createUserProfile({})

      expect(profile).toMatchObject({
        id: expect.stringMatching(/^user-\d+$/),
        displayName: 'Anonymous',
        joinedAt: expect.any(Number),
        lastActive: expect.any(Number)
      })
    })

    test('should create user profile with provided values', () => {
      const customData = {
        id: 'user-custom',
        displayName: 'Jane Doe',
        email: 'jane@example.com',
        bio: 'Software developer'
      }

      const profile = createUserProfile(customData)

      expect(profile).toMatchObject(customData)
      expect(profile.joinedAt).toBeDefined()
      expect(profile.lastActive).toBeDefined()
    })
  })

  describe('createConnection', () => {
    test('should create connection with default values', () => {
      const connection = createConnection({})

      expect(connection).toMatchObject({
        id: expect.stringMatching(/^connection-\d+$/),
        fromUserId: '',
        toUserId: '',
        type: 'follow',
        status: 'pending',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number)
      })
    })

    test('should create connection with provided values', () => {
      const customData = {
        fromUserId: 'user-1',
        toUserId: 'user-2',
        type: 'friend' as const,
        status: 'accepted' as const
      }

      const connection = createConnection(customData)

      expect(connection).toMatchObject(customData)
    })
  })
})

describe('Integration Tests', () => {
  test('should handle complete workflow', async () => {
    const client = new EtherithDXOSClient()

    try {
      // Initialize client
      await client.initialize()

      // Create identity
      const identity = await client.createIdentity('Integration Test User')
      expect(identity.displayName).toBe('Integration Test User')

      // Create space
      const space = await client.createSpace()
      expect(space.id).toBe('test-space')

      // Create and add memory
      const memory = createMemory({
        title: 'Integration Test Memory',
        content: 'This is a test memory for integration testing',
        authorId: identity.id,
        author: identity.displayName
      })

      await client.addObject(space, memory)

      // Query memories
      const memories = await client.queryObjects(space)
      expect(Array.isArray(memories)).toBe(true)

    } finally {
      await client.destroy()
    }
  })
})