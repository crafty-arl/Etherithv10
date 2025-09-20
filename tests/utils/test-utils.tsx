import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { Session } from 'next-auth'

// Mock session data
export const mockSession: Session = {
  user: {
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://example.com/avatar.jpg'
  } as any, // Cast to any to avoid NextAuth type constraints
  expires: '2099-01-01'
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null
}

const AllTheProviders = ({
  children,
  session = mockSession
}: {
  children: React.ReactNode
  session?: Session | null
}) => {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  )
}

export const customRender = (
  ui: ReactElement,
  { session, ...renderOptions }: CustomRenderOptions = {}
): RenderResult => {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders session={session}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }

// Mock implementations for common APIs
export const mockDXOSClient = {
  initialize: jest.fn().mockResolvedValue(undefined),
  halo: {
    identity: {
      get: jest.fn().mockReturnValue({
        id: 'test-identity',
        displayName: 'Test User'
      })
    },
    createIdentity: jest.fn().mockResolvedValue({
      id: 'test-identity',
      displayName: 'Test User'
    })
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
          subscribe: jest.fn()
        })
      }
    }),
    join: jest.fn()
  }
}

export const mockIPFSService = {
  upload: jest.fn().mockResolvedValue({
    IpfsHash: 'test-hash',
    PinSize: 1024,
    Timestamp: Date.now()
  }),
  pin: jest.fn().mockResolvedValue({ success: true }),
  unpin: jest.fn().mockResolvedValue({ success: true }),
  getStatus: jest.fn().mockResolvedValue({
    connected: true,
    peers: 5
  })
}

// Performance testing utilities
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now()
  fn()
  const end = performance.now()
  const duration = end - start

  console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`)
  return duration
}

// Accessibility testing helpers
export const axeConfig = {
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'aria-labels': { enabled: true },
    'heading-structure': { enabled: true }
  }
}

// PWA testing utilities
export const mockServiceWorker = {
  register: jest.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: { scriptURL: 'sw.js' },
    scope: '/',
    update: jest.fn(),
    unregister: jest.fn()
  }),
  getRegistration: jest.fn().mockResolvedValue({
    active: { scriptURL: 'sw.js' },
    scope: '/'
  })
}

// Mock Web APIs for PWA testing
export const setupPWAMocks = () => {
  // Mock manifest
  Object.defineProperty(document, 'getElementById', {
    value: jest.fn().mockReturnValue({
      href: '/manifest.json'
    })
  })

  // Mock beforeinstallprompt
  const mockInstallPrompt = {
    prompt: jest.fn(),
    userChoice: Promise.resolve({ outcome: 'accepted' })
  }

  Object.defineProperty(window, 'addEventListener', {
    value: jest.fn()
  })

  return mockInstallPrompt
}

// Network testing utilities
export const mockNetworkConditions = (condition: 'online' | 'offline' | 'slow') => {
  switch (condition) {
    case 'offline':
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      break
    case 'slow':
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: 'slow-2g',
          downlink: 0.05,
          rtt: 2000
        },
        writable: true
      })
      break
    default:
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
  }
}

// Wait utilities for async testing
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const start = Date.now()

  while (!condition() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`)
  }
}

// Test data generators
export const generateTestMemory = (overrides = {}) => ({
  id: `memory-${Date.now()}`,
  title: 'Test Memory',
  content: 'This is a test memory content',
  authorId: 'test-user-id',
  author: 'Test User',
  timestamp: Date.now(),
  visibility: 'public' as const,
  tags: ['test'],
  type: 'text' as const,
  fileType: 'text/plain',
  size: 100,
  checksum: 'test-checksum',
  version: 1,
  ...overrides
})

export const generateTestUser = (overrides = {}) => ({
  id: `user-${Date.now()}`,
  name: 'Test User',
  email: 'test@example.com',
  image: 'https://example.com/avatar.jpg',
  publicMemories: [],
  ...overrides
})