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

  constructor(config: any) {
    console.log('🔧 Using Mock DXOS Client for demo purposes')
  }

  async initialize(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate initialization
    this.initialized = true
    console.log('✅ Mock DXOS client initialized')
  }

  addTypes(types: any[]): void {
    console.log('📋 Registered', types.length, 'schemas with mock client')
  }

  get halo() {
    return {
      identity: {
        get: () => this.mockIdentity
      },
      createIdentity: async (options?: { displayName?: string }) => {
        this.mockIdentity = {
          id: `mock-identity-${Date.now()}`,
          displayName: options?.displayName || 'Mock User'
        }
        return this.mockIdentity
      }
    }
  }

  get spaces() {
    return {
      get: () => this.mockSpaces,
      create: async () => {
        const newSpace = {
          id: `mock-space-${Date.now()}`,
          db: {
            add: (object: any) => {
              console.log('📝 Added object to mock space:', object.id)
            },
            remove: (object: any) => {
              console.log('🗑️ Removed object from mock space:', object.id)
            },
            query: (filter?: any) => ({
              run: async () => {
                // Return mock data based on filter
                return []
              },
              subscribe: (callback: (result: { objects: any[] }) => void) => {
                // Simulate real-time updates
                setTimeout(() => {
                  callback({ objects: [] })
                }, 1000)

                return () => console.log('🔌 Unsubscribed from mock space')
              }
            })
          }
        }

        this.mockSpaces.push(newSpace)
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