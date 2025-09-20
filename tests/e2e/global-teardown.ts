import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 E2E test suite teardown completed')

  // Perform any global cleanup here
  // Examples:
  // - Clean up test databases
  // - Reset application state
  // - Clean up test files
}

export default globalTeardown