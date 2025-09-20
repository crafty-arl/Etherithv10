/**
 * Mock DXOS Client Implementation
 * Provides a working demonstration of the DXOS architecture
 * This will be replaced with actual DXOS client once packages are available
 */

// Mock implementations for development/demo purposes
export const mockDXOSConfig = {
  app: {
    build: {
      name: 'etherith-social',
      version: '1.0.0'
    }
  }
}

// Mock Client class
export class MockClient {
  private initialized = false
  private mockSpaces: any[] = []
  private mockIdentity: any = null
  private mockObjects = new Map<string, any[]>() // Track objects per space
  private static globalDiscordSpace: any = null // Shared global space across all instances

  constructor(config: any) {
    console.log('🔧 Using Mock DXOS Client for demo purposes')
  }

  async initialize(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate initialization
    this.initialized = true

    // Load existing global Discord space from localStorage if it exists
    this.loadGlobalDiscordSpace()

    console.log('✅ Mock DXOS client initialized')
  }

  private loadGlobalDiscordSpace(): void {
    if (typeof window === 'undefined') return

    try {
      const storedGlobalSpace = localStorage.getItem('mock_global_discord_space')
      if (storedGlobalSpace) {
        const globalSpace = JSON.parse(storedGlobalSpace)
        MockClient.globalDiscordSpace = globalSpace

        // Add the global space to our local spaces if not already present
        const hasGlobalSpace = this.mockSpaces.some(space => space.id === globalSpace.id)
        if (!hasGlobalSpace) {
          this.mockSpaces.push(globalSpace)
          console.log('🌍 [MOCK] Loaded existing global Discord space:', globalSpace.id)
        }
      }
    } catch (error) {
      console.warn('⚠️ [MOCK] Failed to load global Discord space from storage:', error)
    }
  }

  private saveGlobalDiscordSpace(): void {
    if (typeof window === 'undefined' || !MockClient.globalDiscordSpace) return

    try {
      localStorage.setItem('mock_global_discord_space', JSON.stringify(MockClient.globalDiscordSpace))
      console.log('💾 [MOCK] Saved global Discord space to storage')
    } catch (error) {
      console.warn('⚠️ [MOCK] Failed to save global Discord space to storage:', error)
    }
  }

  addTypes(types: any[]): void {
    console.log('📋 Registered', types.length, 'schemas with mock client')
  }

  get halo() {
    return {
      identity: {
        get: () => this.mockIdentity
      },
      createIdentity: async (options?: { displayName?: string, discordData?: any }) => {
        // Create unique identity ID based on Discord ID if available, or timestamp + random for uniqueness
        let identityId: string
        if (options?.discordData?.discordId) {
          identityId = `dxos-discord-${options.discordData.discordId}`
        } else {
          identityId = `mock-identity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }

        this.mockIdentity = {
          id: identityId,
          displayName: options?.displayName || 'Mock User',
          ...(options?.discordData && {
            discordId: options.discordData.discordId,
            discordUsername: options.discordData.username,
            avatar: options.discordData.avatar
          })
        }

        // Add this user to all existing spaces as a member
        this.mockSpaces.forEach(space => {
          const existingMember = space.members.find((m: any) => m.id === this.mockIdentity.id)
          if (!existingMember) {
            space.members.push({
              id: this.mockIdentity.id,
              profile: {
                displayName: this.mockIdentity.displayName
              },
              lastSeen: Date.now()
            })
          }
        })

        return this.mockIdentity
      }
    }
  }

  get spaces() {
    return {
      get: () => this.mockSpaces,
      create: async () => {
        const spaceId = `mock-space-${Date.now()}`
        const newSpace = {
          id: spaceId,
          key: `space-key-${Date.now()}`,
          properties: { name: 'Mock Space' },
          isOpen: true,
          members: this.mockIdentity ? [
            {
              id: this.mockIdentity.id,
              profile: {
                displayName: this.mockIdentity.displayName
              },
              lastSeen: Date.now()
            }
          ] : [],
          db: {
            add: (object: any) => {
              console.log('📝 Added object to mock space:', object.id)
              if (!this.mockObjects.has(spaceId)) {
                this.mockObjects.set(spaceId, [])
              }
              this.mockObjects.get(spaceId)!.push(object)
            },
            remove: (object: any) => {
              console.log('🗑️ Removed object from mock space:', object.id)
              const objects = this.mockObjects.get(spaceId) || []
              const index = objects.findIndex(obj => obj.id === object.id)
              if (index > -1) {
                objects.splice(index, 1)
              }
            },
            query: (filter?: any) => ({
              run: async () => {
                // Return mock data based on filter
                const objects = this.mockObjects.get(spaceId) || []
                if (typeof filter === 'function') {
                  return objects.filter(filter)
                }
                return objects
              },
              subscribe: (callback: (result: { objects: any[] }) => void) => {
                // Simulate real-time updates
                setTimeout(() => {
                  const objects = this.mockObjects.get(spaceId) || []
                  callback({ objects })
                }, 1000)

                return () => console.log('🔌 Unsubscribed from mock space')
              }
            })
          }
        }

        this.mockSpaces.push(newSpace)
        this.mockObjects.set(spaceId, [])
        return newSpace
      },
      join: (invitationCode: string) => ({
        authenticate: async (authCode?: string) => {
          console.log('🔗 Joined mock space with invitation:', invitationCode)
        }
      })
    }
  }

  async destroy(): Promise<void> {
    this.initialized = false
    this.mockSpaces = []
    this.mockIdentity = null
    console.log('🧹 Mock DXOS client destroyed')
  }
}

// Mock Schema implementations
export const MockSchema = {
  Struct: (definition: any) => ({
    pipe: (options: any) => ({
      typename: options.typename,
      version: options.version,
      definition
    })
  }),
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Array: (type: any) => `array<${type}>`,
  Record: (key: any, value: any) => `record<${key}, ${value}>`,
  Literal: (...values: any[]) => `literal<${values.join('|')}>`,
  optional: (type: any) => `optional<${type}>`,
  Any: 'any'
}

export const MockType = {
  Obj: (options: any) => options
}

export const MockFilter = {}

// Export mocks as if they were the real DXOS packages
export const Client = MockClient
export const Schema = MockSchema
export const Type = MockType
export const Filter = MockFilter