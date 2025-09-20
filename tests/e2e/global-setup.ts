import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Perform any global setup here
  console.log('🚀 Starting E2E test suite setup...')

  // Pre-warm the application
  try {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    console.log('✅ Application pre-warmed successfully')
  } catch (error) {
    console.error('❌ Failed to pre-warm application:', error)
  }

  await browser.close()
}

export default globalSetup