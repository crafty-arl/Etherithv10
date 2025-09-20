import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock fetch
global.fetch = jest.fn()

// Mock crypto for hash generation (simplified for testing)
global.crypto = {
  subtle: {
    digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
  }
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()

  // Reset localStorage mock
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()

  // Set up localStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  })

  // Reset navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    value: true
  })
})