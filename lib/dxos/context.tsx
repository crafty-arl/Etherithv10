/**
 * DXOS React Context Provider
 * Manages DXOS client state and provides hooks for social features
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { dxosClient, UserProfile, Memory, Connection, Community, Notification } from './client'
import type { MainDXOSClient } from './client'
import { getNetworkDiscovery } from '../../utils/network-discovery'

// Context types
interface DXOSContextType {
  client: MainDXOSClient | null
  isInitialized: boolean
  isConnected: boolean
  identity: any | null
  spaces: any[]
  currentSpace: any | null

  // Methods
  initialize: () => Promise<void>
  createIdentity: (displayName?: string, discordData?: any) => Promise<any>
  createSpace: (name?: string) => Promise<any>
  joinSpace: (invitationCode: string, authCode?: string) => Promise<void>
  setCurrentSpace: (space: any) => void
  joinGlobalDiscordSpace: () => Promise<any>
  getOrCreateGlobalDiscordSpace: () => Promise<any>

  // Social features
  userProfile: UserProfile | null
  setUserProfile: (profile: UserProfile) => void

  // Error handling
  error: string | null
  clearError: () => void
}

const DXOSContext = createContext<DXOSContextType | null>(null)

interface DXOSProviderProps {
  children: ReactNode
  autoInitialize?: boolean
}

/**
 * DXOS Context Provider Component
 */
export function DXOSProvider({ children, autoInitialize = true }: DXOSProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [identity, setIdentity] = useState<any | null>(null)
  const [spaces, setSpaces] = useState<any[]>([])
  const [currentSpace, setCurrentSpace] = useState<any | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Initialize DXOS client
   */
  const initialize = useCallback(async () => {
    try {
      setError(null)
      console.log('🔄 [DEBUG] Initializing DXOS from context...')

      await dxosClient.initialize()
      setIsInitialized(true)

      // Check for existing identity
      console.log('🔍 [DEBUG] Checking for existing identity...')
      const existingIdentity = dxosClient.getIdentity()
      if (existingIdentity) {
        setIdentity(existingIdentity)
        setIsConnected(true)
        console.log('👤 [DEBUG] Found existing identity:', {
          id: existingIdentity.id,
          displayName: existingIdentity.displayName,
          timestamp: new Date().toISOString()
        })
      } else {
        console.log('🚫 [DEBUG] No existing identity found')
      }

      // Load available spaces with error handling
      console.log('🌌 [DEBUG] Loading available spaces...')
      try {
        const availableSpaces = dxosClient.getSpaces()
        setSpaces(availableSpaces)
        console.log(`📊 [DEBUG] Found ${availableSpaces.length} space(s)`)

        // Set current space if none exists and we have spaces
        if (availableSpaces.length > 0) {
          const currentCurrentSpace = currentSpace // Capture current state
          if (!currentCurrentSpace) {
            setCurrentSpace(availableSpaces[0])
            console.log('🎯 [DEBUG] Set current space to:', availableSpaces[0].id)
          }
        }
      } catch (spaceError) {
        console.warn('⚠️ [DEBUG] Could not load spaces, continuing without them:', spaceError)
        setSpaces([])
      }

      // Check connection status
      const isConnected = dxosClient.isConnected()
      setIsConnected(isConnected)
      console.log('📡 [DEBUG] Connection status:', isConnected ? 'Connected' : 'Disconnected')

      console.log('✅ [DEBUG] DXOS context initialization completed successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize DXOS'
      setError(errorMessage)
      console.error('❌ [DEBUG] DXOS context initialization failed:', {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      })
      
      // Still mark as initialized to prevent infinite retries
      setIsInitialized(true)
    }
  }, [])

  /**
   * Create new identity with Discord integration
   */
  const createIdentity = useCallback(async (displayName?: string, discordData?: any) => {
    const identityName = displayName || 'Anonymous'

    try {
      setError(null)

      console.log('🎆 [DEBUG] Creating DXOS identity from context:', {
        displayName: identityName,
        hasDiscordData: !!discordData,
        discordId: discordData?.discordId,
        timestamp: new Date().toISOString()
      })

      const newIdentity = await dxosClient.createIdentity(identityName)
      setIdentity(newIdentity)
      setIsConnected(true)

      console.log('✅ [DEBUG] Identity created and state updated:', {
        identityId: newIdentity.id,
        displayName: newIdentity.displayName,
        isConnected: true
      })

      // Update network discovery with the new identity
      const networkDiscovery = getNetworkDiscovery()
      networkDiscovery.updateLocalUserFromIdentity({
        id: newIdentity.id,
        displayName: newIdentity.displayName
      })

      // Join global Discord space for all Discord users
      let globalDiscordSpace = null
      if (discordData) {
        console.log('🌍 [DEBUG] Discord user detected, joining global Discord space...')
        try {
          globalDiscordSpace = await dxosClient.joinGlobalDiscordSpace()
          console.log('✅ [DEBUG] Successfully joined global Discord space:', globalDiscordSpace.id)
        } catch (globalSpaceError) {
          console.error('❌ [DEBUG] Failed to join global Discord space:', globalSpaceError)
          // Continue without global space, but log the issue
        }
      }

      // Create enhanced user profile with Discord linkage
      let spaceForProfile = globalDiscordSpace || currentSpace

      // If no space exists (including global space), create a personal one
      if (!spaceForProfile) {
        console.log('🌌 [DEBUG] No current space found, creating a new personal space for user profile...')
        try {
          spaceForProfile = await createSpace(`${identityName}'s Space`)
          console.log('✅ [DEBUG] New personal space created for user profile:', spaceForProfile.id)
        } catch (spaceError) {
          console.error('❌ [DEBUG] Failed to create personal space for profile:', spaceError)
          // Continue without space, but log the issue
        }
      }

      // Set the global Discord space as current space if it was created/joined
      if (globalDiscordSpace && !currentSpace) {
        setCurrentSpace(globalDiscordSpace)
        console.log('🎯 [DEBUG] Set global Discord space as current space:', globalDiscordSpace.id)
      }

      if (spaceForProfile) {
        const profile: UserProfile = {
          id: newIdentity.id,
          displayName: identityName,
          joinedAt: Date.now(),
          lastActive: Date.now(),
          // Add Discord metadata if available
          ...(discordData && {
            discordId: discordData.discordId,
            discordUsername: discordData.username,
            avatar: discordData.avatar
          })
        }

        console.log('💾 [DEBUG] Storing enhanced user profile in DXOS space:', {
          profile,
          spaceId: spaceForProfile.id,
          hasDiscordLink: !!discordData
        })

        await dxosClient.addObject(spaceForProfile, profile)
        setUserProfile(profile)

        // If user joined global Discord space, also store profile there for discoverability
        if (globalDiscordSpace && spaceForProfile.id !== globalDiscordSpace.id) {
          try {
            await dxosClient.addObject(globalDiscordSpace, {
              ...profile,
              type: 'global_user_profile' // Mark as global profile for easy identification
            })
            console.log('✅ [DEBUG] User profile also stored in global Discord space for discoverability')
          } catch (globalProfileError) {
            console.warn('⚠️ [DEBUG] Could not store profile in global space:', globalProfileError)
          }
        }

        // Log successful profile creation
        console.log('✅ [DEBUG] User profile stored successfully in space(s)')

        // Check online users after profile creation
        setTimeout(async () => {
          await dxosClient.getOnlineUsers()
        }, 2000)
      } else {
        console.log('⚠️ [DEBUG] No space available for profile storage after attempting to create one')
      }

      return newIdentity
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create identity'
      setError(errorMessage)
      console.error('❌ [DEBUG] Identity creation failed in context:', {
        error: errorMessage,
        displayName: identityName,
        hasCurrentSpace: !!currentSpace,
        stack: err instanceof Error ? err.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      })
      throw err
    }
  }, [currentSpace])

  /**
   * Create new space
   */
  const createSpace = useCallback(async (name?: string) => {
    try {
      setError(null)
      const newSpace = await dxosClient.createSpace(name)

      const updatedSpaces = dxosClient.getSpaces()
      setSpaces(updatedSpaces)

      // Set as current space if it's the first one
      if (!currentSpace) {
        setCurrentSpace(newSpace)
      }

      return newSpace
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create space'
      setError(errorMessage)
      throw err
    }
  }, [currentSpace])

  /**
   * Join existing space
   */
  const joinSpace = useCallback(async (invitationCode: string, authCode?: string) => {
    try {
      setError(null)
      await dxosClient.joinSpace(invitationCode, authCode)

      const updatedSpaces = dxosClient.getSpaces()
      setSpaces(updatedSpaces)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join space'
      setError(errorMessage)
      throw err
    }
  }, [])

  const joinGlobalDiscordSpace = useCallback(async () => {
    try {
      setError(null)
      const globalSpace = await dxosClient.joinGlobalDiscordSpace()

      // Refresh spaces after joining
      const updatedSpaces = dxosClient.getSpaces()
      setSpaces(updatedSpaces)

      // Set as current space if no current space exists
      if (!currentSpace) {
        setCurrentSpace(globalSpace)
      }

      console.log('✅ Successfully joined global Discord space:', globalSpace.id)
      return globalSpace
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join global Discord space'
      setError(errorMessage)
      throw err
    }
  }, [currentSpace])

  const getOrCreateGlobalDiscordSpace = useCallback(async () => {
    try {
      setError(null)
      return await dxosClient.getOrCreateGlobalDiscordSpace()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get or create global Discord space'
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * Set current active space
   */
  const setCurrentSpaceCallback = useCallback((space: any) => {
    setCurrentSpace(space)
    console.log('🌌 Current space changed:', space?.id)
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Auto-initialize on mount
   */
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initialize()
    }
  }, [autoInitialize, isInitialized, initialize])

  /**
   * Load user profile when identity and space are available
   */
  useEffect(() => {
    if (identity && currentSpace && !userProfile) {
      // Try to load existing user profile from the space
      dxosClient.getUserProfiles(currentSpace)
        .then((profiles: any[]) => {
          const userProfileData = profiles.find(p => p.id === identity.id)
          if (userProfileData) {
            setUserProfile(userProfileData)
          }
        })
        .catch(err => {
          console.warn('Failed to load user profile:', err)
        })
    }
  }, [identity, currentSpace, userProfile])

  const contextValue: DXOSContextType = {
    client: isInitialized ? dxosClient : null,
    isInitialized,
    isConnected,
    identity,
    spaces,
    currentSpace,
    initialize,
    createIdentity,
    createSpace,
    joinSpace,
    joinGlobalDiscordSpace,
    getOrCreateGlobalDiscordSpace,
    setCurrentSpace: setCurrentSpaceCallback,
    userProfile,
    setUserProfile,
    error,
    clearError
  }

  return (
    <DXOSContext.Provider value={contextValue}>
      {children}
    </DXOSContext.Provider>
  )
}

/**
 * Hook to use DXOS context
 */
export function useDXOS(): DXOSContextType {
  const context = useContext(DXOSContext)
  if (!context) {
    throw new Error('useDXOS must be used within a DXOSProvider')
  }
  return context
}

/**
 * Hook for identity management
 */
export function useIdentity() {
  const { identity, createIdentity, isConnected } = useDXOS()

  return {
    identity,
    createIdentity,
    isConnected,
    hasIdentity: !!identity
  }
}

/**
 * Hook for space management
 */
export function useSpaces() {
  const { spaces, currentSpace, createSpace, joinSpace, setCurrentSpace } = useDXOS()

  return {
    spaces,
    currentSpace,
    createSpace,
    joinSpace,
    setCurrentSpace,
    hasSpaces: spaces.length > 0
  }
}

/**
 * Hook for querying objects from current space
 */
export function useQuery<T = any>(filter?: any): {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const { client, currentSpace } = useDXOS()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!client || !currentSpace) {
      setData([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      // Use the space's database to query objects
      const results = await currentSpace.db.query(filter || {}).run()
      setData(results || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [client, currentSpace])

  useEffect(() => {
    fetchData()
  }, [fetchData, filter])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

/**
 * Hook for querying cross-space public memories
 */
export function useCrossSpaceQuery<T = any>(filter?: any): {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  syncStatus: any
} {
  const { client } = useDXOS()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState({
    isRunning: false,
    totalMemories: 0,
    pendingSync: 0,
    lastSyncAt: 0
  })

  const fetchData = useCallback(async () => {
    if (!client) {
      setData([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Get cross-space public memories
      const crossSpaceMemories = await client.getCrossSpacePublicMemories()
      setData(crossSpaceMemories || [])
      
      // Get sync status
      const status = client.getPublicMemorySyncStatus()
      setSyncStatus(status)
      
      console.log('🌐 [CROSS-SPACE-QUERY] Fetched memories:', {
        count: crossSpaceMemories?.length || 0,
        syncStatus: status
      })
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cross-space query failed'
      setError(errorMessage)
      console.error('❌ [CROSS-SPACE-QUERY] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up periodic updates
  useEffect(() => {
    if (!client) return

    const interval = setInterval(() => {
      fetchData()
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [client, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    syncStatus
  }
}

/**
 * Hook for real-time subscriptions
 */
export function useSubscription<T = any>(filter?: any): {
  data: T[]
  loading: boolean
  error: string | null
} {
  const { client, currentSpace } = useDXOS()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!client || !currentSpace) {
      setData([])
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const results = await currentSpace.db.query(filter || {}).run()
        setData(results || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Subscription failed'
        setError(errorMessage)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [client, currentSpace, filter])

  return {
    data,
    loading,
    error
  }
}

/**
 * Hook for mutations (add/remove objects)
 */
export function useMutation() {
  const { client, currentSpace } = useDXOS()

  const addObject = useCallback(async (object: any) => {
    if (!client || !currentSpace) {
      throw new Error('DXOS client or space not available')
    }

    await client.addObject(currentSpace, object)
  }, [client, currentSpace])

  const removeObject = useCallback(async (object: any) => {
    if (!client || !currentSpace) {
      throw new Error('DXOS client or space not available')
    }

    // Remove object from space database
    currentSpace.db.remove(object)
  }, [client, currentSpace])

  return {
    addObject,
    removeObject,
    canMutate: !!(client && currentSpace)
  }
}