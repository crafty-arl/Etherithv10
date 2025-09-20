/**
 * DXOS React Context Provider
 * Manages DXOS client state and provides hooks for social features
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { EtherithDXOSClient, dxosClient, UserProfile, Memory, Connection, Community, Notification } from './client'

// Context types
interface DXOSContextType {
  client: EtherithDXOSClient | null
  isInitialized: boolean
  isConnected: boolean
  identity: any | null
  spaces: any[]
  currentSpace: any | null

  // Methods
  initialize: () => Promise<void>
  createIdentity: (displayName?: string) => Promise<any>
  createSpace: (name?: string) => Promise<any>
  joinSpace: (invitationCode: string, authCode?: string) => Promise<void>
  setCurrentSpace: (space: any) => void

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
      console.log('🔄 Initializing DXOS...')

      await dxosClient.initialize()
      setIsInitialized(true)

      // Check for existing identity
      const existingIdentity = dxosClient.getIdentity()
      if (existingIdentity) {
        setIdentity(existingIdentity)
        setIsConnected(true)
        console.log('👤 Found existing identity:', existingIdentity.displayName)
      }

      // Load available spaces
      const availableSpaces = dxosClient.getSpaces()
      setSpaces(availableSpaces)

      if (availableSpaces.length > 0 && !currentSpace) {
        setCurrentSpace(availableSpaces[0])
      }

      console.log('✅ DXOS initialized successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize DXOS'
      setError(errorMessage)
      console.error('❌ DXOS initialization failed:', err)
    }
  }, [currentSpace])

  /**
   * Create new identity
   */
  const createIdentity = useCallback(async (displayName?: string) => {
    try {
      setError(null)
      const newIdentity = await dxosClient.createIdentity(displayName)
      setIdentity(newIdentity)
      setIsConnected(true)

      // Create user profile in DXOS
      if (currentSpace) {
        const profile: UserProfile = {
          id: newIdentity.id,
          displayName: newIdentity.displayName || displayName || 'Anonymous',
          joinedAt: Date.now(),
          lastActive: Date.now()
        }

        await dxosClient.addObject(currentSpace, profile)
        setUserProfile(profile)
      }

      return newIdentity
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create identity'
      setError(errorMessage)
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
      dxosClient.queryObjects(currentSpace, { id: identity.id })
        .then((profiles: any[]) => {
          if (profiles.length > 0) {
            setUserProfile(profiles[0])
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
      const results = await client.queryObjects<T>(currentSpace, filter)
      setData(results)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [client, currentSpace, filter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData
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

    setLoading(true)
    setError(null)

    const unsubscribe = client.subscribeToSpace(currentSpace, (objects: T[]) => {
      const filteredObjects = filter ? objects.filter(filter) : objects
      setData(filteredObjects)
      setLoading(false)
    })

    return () => {
      unsubscribe()
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

    await client.removeObject(currentSpace, object)
  }, [client, currentSpace])

  return {
    addObject,
    removeObject,
    canMutate: !!(client && currentSpace)
  }
}