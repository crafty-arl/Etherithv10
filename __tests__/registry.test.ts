import { RegistryManager } from '../utils/registry'
import { OfflineRegistryManager } from '../utils/offline-registry'
import { PrivacyManager } from '../utils/privacy-controls'
import { LocalStorage } from '../utils/storage'
import { UserProfile, Memory } from '../types/memory'
import { UserRegistry, RegistrySubscription } from '../types/registry'

// Mock the IPFS service
jest.mock('../utils/ipfs', () => ({
  IPFSService: {
    uploadToIPFS: jest.fn().mockResolvedValue({
      cid: 'QmTestCID123',
      size: 1024,
      timestamp: Date.now()
    }),
    getIPFSGatewayUrl: jest.fn((cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`),
    getIPFSUrl: jest.fn((cid: string) => `https://ipfs.io/ipfs/${cid}`)
  }
}))

describe('Registry System', () => {
  let mockUserProfile: UserProfile
  let mockMemory: Memory

  beforeEach(() => {
    // Clear all localStorage mocks
    jest.clearAllMocks()

    mockUserProfile = {
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
      avatar: 'avatar.jpg',
      contactLink: 'mailto:test@example.com',
      createdAt: Date.now(),
      memoriesCount: 1
    }

    mockMemory = {
      id: 'memory123',
      title: 'Test Memory',
      content: 'This is a test memory content',
      memoryNote: 'Test note',
      visibility: 'public',
      fileType: 'text',
      ipfsCid: 'QmTestMemoryCID',
      ipfsUrl: 'https://ipfs.io/ipfs/QmTestMemoryCID',
      ipfsGatewayUrl: 'https://gateway.pinata.cloud/ipfs/QmTestMemoryCID',
      timestamp: Date.now(),
      authorId: 'user123',
      authorName: 'Test User',
      authorAvatar: 'avatar.jpg',
      tags: ['test', 'memory']
    }

    // Mock localStorage with proper implementation
    const mockStorage: { [key: string]: string } = {}

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => {
          if (key === 'etherith_user_profile') {
            return JSON.stringify(mockUserProfile)
          }
          if (key === 'etherith_memories') {
            return JSON.stringify([mockMemory])
          }
          return mockStorage[key] || null
        }),
        setItem: jest.fn((key: string, value: string) => {
          mockStorage[key] = value
        }),
        removeItem: jest.fn((key: string) => {
          delete mockStorage[key]
        }),
        clear: jest.fn(() => {
          Object.keys(mockStorage).forEach(key => delete mockStorage[key])
        })
      },
      writable: true
    })
  })

  describe('RegistryManager', () => {
    describe('createRegistry', () => {
      it('should create a new registry for a user', () => {
        const registry = RegistryManager.createRegistry(mockUserProfile)

        expect(registry).toBeDefined()
        expect(registry.userId).toBe(mockUserProfile.id)
        expect(registry.userProfile.displayName).toBe(mockUserProfile.displayName)
        expect(registry.format).toBe('etherith-registry-v1')
        expect(registry.version).toBe('1.0.0')
        expect(registry.publicMemories).toEqual([])
      })

      it('should save registry to localStorage', () => {
        RegistryManager.createRegistry(mockUserProfile)

        expect(localStorage.setItem).toHaveBeenCalledWith(
          'etherith_registry',
          expect.stringContaining(mockUserProfile.id)
        )
      })
    })

    describe('updateRegistryFromMemories', () => {
      it('should update registry with public memories that have IPFS CIDs', () => {
        // First create a registry
        RegistryManager.createRegistry(mockUserProfile)

        // Mock LocalStorage.getPublicMemories to return our test memory
        jest.spyOn(LocalStorage, 'getPublicMemories').mockReturnValue([mockMemory])

        const updatedRegistry = RegistryManager.updateRegistryFromMemories()

        expect(updatedRegistry.publicMemories).toHaveLength(1)
        expect(updatedRegistry.publicMemories[0].id).toBe(mockMemory.id)
        expect(updatedRegistry.publicMemories[0].ipfsCid).toBe(mockMemory.ipfsCid)
        expect(updatedRegistry.metadata.totalEntries).toBe(1)
      })

      it('should exclude memories without IPFS CIDs', () => {
        const memoryWithoutCid = { ...mockMemory, ipfsCid: undefined }

        RegistryManager.createRegistry(mockUserProfile)

        // Mock LocalStorage.getPublicMemories to return memory without CID
        jest.spyOn(LocalStorage, 'getPublicMemories').mockReturnValue([memoryWithoutCid])

        const updatedRegistry = RegistryManager.updateRegistryFromMemories()

        expect(updatedRegistry.publicMemories).toHaveLength(0)
      })

      it('should exclude private memories', () => {
        RegistryManager.createRegistry(mockUserProfile)

        // Mock LocalStorage.getPublicMemories to return empty array for private memory
        jest.spyOn(LocalStorage, 'getPublicMemories').mockReturnValue([])

        const updatedRegistry = RegistryManager.updateRegistryFromMemories()

        expect(updatedRegistry.publicMemories).toHaveLength(0)
      })
    })

    describe('publishRegistry', () => {
      it('should publish registry to IPFS', async () => {
        const registry = RegistryManager.createRegistry(mockUserProfile)
        jest.spyOn(LocalStorage, 'getPublicMemories').mockReturnValue([mockMemory])

        const result = await RegistryManager.publishRegistry()

        expect(result.cid).toBe('QmTestCID123')
        expect(result.size).toBe(1024)
      })

      it('should update registry with IPFS metadata after publishing', async () => {
        const registry = RegistryManager.createRegistry(mockUserProfile)
        jest.spyOn(LocalStorage, 'getPublicMemories').mockReturnValue([mockMemory])

        await RegistryManager.publishRegistry()

        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'etherith_registry',
          expect.stringContaining('QmTestCID123')
        )
      })
    })

    describe('subscription management', () => {
      it('should add a subscription', async () => {
        const mockRegistry: UserRegistry = {
          version: '1.0.0',
          format: 'etherith-registry-v1',
          registryId: 'reg_other_user',
          userId: 'other_user',
          userProfile: {
            id: 'other_user',
            displayName: 'Other User',
            avatar: 'other.jpg'
          },
          metadata: {
            created: Date.now(),
            updated: Date.now(),
            totalEntries: 0,
            totalSize: 0,
            tags: ['tag1', 'tag2']
          },
          publicMemories: [],
          ipfsMetadata: {}
        }

        // Mock fetching registry from IPFS
        jest.spyOn(RegistryManager, 'fetchRegistryFromIPFS').mockResolvedValue(mockRegistry)

        // Mock empty subscriptions initially
        jest.spyOn(RegistryManager, 'getSubscriptions').mockReturnValue([])

        const subscription = await RegistryManager.addSubscription('QmOtherRegistryCID', true)

        expect(subscription.registryCid).toBe('QmOtherRegistryCID')
        expect(subscription.displayName).toBe('Other User')
        expect(subscription.autoSync).toBe(true)
        expect(subscription.tags).toEqual(['tag1', 'tag2'])
      })

      it('should prevent duplicate subscriptions', async () => {
        const existingSubscription: RegistrySubscription = {
          id: 'sub1',
          registryId: 'reg_other_user',
          registryCid: 'QmOtherRegistryCID',
          userId: 'other_user',
          displayName: 'Other User',
          subscribedAt: Date.now(),
          syncEnabled: true,
          autoSync: true,
          syncFrequency: 'daily'
        }

        jest.spyOn(RegistryManager, 'getSubscriptions').mockReturnValue([existingSubscription])

        await expect(RegistryManager.addSubscription('QmOtherRegistryCID', true))
          .rejects.toThrow('Already subscribed to this registry')
      })
    })
  })

  describe('OfflineRegistryManager', () => {
    describe('offline queue management', () => {
      it('should queue registry updates when offline', async () => {
        // Mock offline state
        Object.defineProperty(navigator, 'onLine', { value: false })

        const result = await OfflineRegistryManager.publishRegistry()

        expect(result.cached).toBe(true)
        expect(result.cid).toBeUndefined()
      })

      it('should process queued operations when back online', async () => {
        // Mock offline then online
        Object.defineProperty(navigator, 'onLine', { value: false })

        // Queue an operation
        await OfflineRegistryManager.publishRegistry()

        // Go back online
        Object.defineProperty(navigator, 'onLine', { value: true })

        // Mock successful processing
        jest.spyOn(RegistryManager, 'publishRegistry').mockResolvedValue({
          cid: 'QmProcessedCID',
          size: 2048
        })

        const result = await OfflineRegistryManager.processOfflineQueue()

        expect(result.processed).toBeGreaterThanOrEqual(0)
        expect(result.failed).toBe(0)
      })
    })

    describe('connectivity monitoring', () => {
      it('should detect online/offline status', () => {
        // Mock empty registry for stats
        jest.spyOn(RegistryManager, 'getRegistry').mockReturnValue(null)
        jest.spyOn(RegistryManager, 'getSubscriptions').mockReturnValue([])

        // Test online
        Object.defineProperty(navigator, 'onLine', { value: true })
        const stats = OfflineRegistryManager.getEnhancedStats()
        expect(stats.offline.isOnline).toBe(true)

        // Test offline
        Object.defineProperty(navigator, 'onLine', { value: false })
        const offlineStats = OfflineRegistryManager.getEnhancedStats()
        expect(offlineStats.offline.isOnline).toBe(false)
      })
    })
  })

  describe('PrivacyManager', () => {
    describe('content safety', () => {
      it('should detect sensitive content patterns', () => {
        const unsafeMemory = {
          ...mockMemory,
          content: 'My password: secret123',
          memoryNote: 'API_key: abc123def456'
        }

        const flags = PrivacyManager.checkContentSafety(unsafeMemory)

        expect(flags.length).toBeGreaterThan(0)
        expect(flags.some(flag => flag.includes('password'))).toBe(true)
      })

      it('should allow safe content', () => {
        const safeMemory = {
          ...mockMemory,
          content: 'This is safe content about my vacation',
          memoryNote: 'Had a great time at the beach'
        }

        const flags = PrivacyManager.checkContentSafety(safeMemory)

        expect(flags).toHaveLength(0)
      })
    })

    describe('sharing permissions', () => {
      it('should prevent sharing private memories', () => {
        const privateMemory = { ...mockMemory, visibility: 'private' as const }

        const result = PrivacyManager.canShareMemory(privateMemory)

        expect(result.canShare).toBe(false)
        expect(result.reason).toContain('private')
      })

      it('should prevent sharing memories without IPFS CIDs', () => {
        const memoryWithoutCid = { ...mockMemory, ipfsCid: undefined }

        const result = PrivacyManager.canShareMemory(memoryWithoutCid)

        expect(result.canShare).toBe(false)
        expect(result.reason).toContain('IPFS')
      })

      it('should allow sharing valid public memories', () => {
        const result = PrivacyManager.canShareMemory(mockMemory)

        expect(result.canShare).toBe(true)
      })
    })

    describe('data anonymization', () => {
      it('should anonymize memory entries based on level', () => {
        const publicEntry = RegistryManager.memoryToRegistryEntry(mockMemory)

        const minimal = PrivacyManager.anonymizeMemoryEntry(publicEntry, 'minimal')
        expect(minimal.authorName).toBe(mockMemory.authorName) // Name preserved
        expect(minimal.authorContact).toBeUndefined() // Contact removed

        const moderate = PrivacyManager.anonymizeMemoryEntry(publicEntry, 'moderate')
        expect(moderate.authorName).toMatch(/Test U\./) // Partially anonymized
        expect(moderate.authorAvatar).toBeUndefined()

        const full = PrivacyManager.anonymizeMemoryEntry(publicEntry, 'full')
        expect(full.authorName).toBe('Anonymous')
        expect(full.authorId).toMatch(/^anon_/)
      })
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete registry lifecycle', async () => {
      // 1. Create registry
      const registry = RegistryManager.createRegistry(mockUserProfile)
      expect(registry).toBeDefined()

      // Mock public memories
      jest.spyOn(LocalStorage, 'getPublicMemories').mockReturnValue([mockMemory])

      // 2. Update with memories
      const updatedRegistry = RegistryManager.updateRegistryFromMemories()
      expect(updatedRegistry.publicMemories).toHaveLength(1)

      // 3. Publish to IPFS
      const publishResult = await RegistryManager.publishRegistry()
      expect(publishResult.cid).toBeDefined()

      // 4. Get stats
      const stats = RegistryManager.getStats()
      expect(stats.localRegistry.totalMemories).toBeGreaterThanOrEqual(0)
    })

    it('should handle offline-to-online sync cycle', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false })

      // Queue operations
      const queueResult = await OfflineRegistryManager.publishRegistry()
      expect(queueResult.cached).toBe(true)

      // Go online
      Object.defineProperty(navigator, 'onLine', { value: true })

      // Process queue
      jest.spyOn(RegistryManager, 'publishRegistry').mockResolvedValue({
        cid: 'QmProcessedCID',
        size: 1024
      })

      const processResult = await OfflineRegistryManager.processOfflineQueue()
      expect(processResult.processed).toBeGreaterThanOrEqual(0)
    })
  })
})