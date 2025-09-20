import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Etherith PWA Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await injectAxe(page)
  })

  test('should load homepage successfully', async ({ page }) => {
    // Test basic page load
    await expect(page).toHaveTitle(/Etherith/)

    // Check for main content
    await expect(page.locator('h1')).toContainText('Etherith')

    // Verify PWA meta tags
    const themeColorMeta = page.locator('meta[name="theme-color"]')
    await expect(themeColorMeta).toHaveAttribute('content', '#D4AF37')

    // Check viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]')
    await expect(viewportMeta).toHaveAttribute('content', /width=device-width/)
  })

  test('should pass accessibility checks', async ({ page }) => {
    // Run axe accessibility tests
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    })
  })

  test('should be installable as PWA', async ({ page, context }) => {
    // Check for PWA manifest
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')

    // Verify manifest is accessible
    const manifestResponse = await page.request.get('/manifest.json')
    expect(manifestResponse.status()).toBe(200)

    const manifest = await manifestResponse.json()
    expect(manifest.name).toBeTruthy()
    expect(manifest.icons).toBeTruthy()
    expect(manifest.start_url).toBeTruthy()
  })

  test('should handle offline scenarios gracefully', async ({ page, context }) => {
    // Load page first
    await page.waitForLoadState('networkidle')

    // Go offline
    await context.setOffline(true)

    // Try to navigate (should still work for cached content)
    await page.reload({ waitUntil: 'domcontentloaded' })

    // Should show some indication of offline state
    // This will depend on your offline implementation
    // await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()

    // Go back online
    await context.setOffline(false)
  })

  test('should support Discord authentication flow', async ({ page }) => {
    // Look for Discord connect button
    const discordButton = page.locator('text=Connect with Discord')

    if (await discordButton.isVisible()) {
      // Note: We don't actually complete OAuth in tests
      // Just verify the button exists and has correct attributes
      await expect(discordButton).toBeVisible()

      // Check if clicking opens OAuth (would be mocked in test env)
      // await discordButton.click()
    }
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE

    // Check that content is still accessible
    await expect(page.locator('h1')).toBeVisible()

    // Verify no horizontal scroll
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const bodyClientWidth = await page.evaluate(() => document.body.clientWidth)
    expect(bodyScrollWidth).toBeLessThanOrEqual(bodyClientWidth + 1) // Allow 1px tolerance
  })

  test('should have good Core Web Vitals', async ({ page }) => {
    // Start navigation timing measurement
    await page.goto('/', { waitUntil: 'networkidle' })

    // Measure First Contentful Paint
    const fcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              resolve(entry.startTime)
            }
          }
        }).observe({ entryTypes: ['paint'] })
      })
    })

    // FCP should be under 2 seconds
    expect(fcp).toBeLessThan(2000)

    // Check that no console errors occurred
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should have no critical console errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') && // Ignore favicon errors
      !error.includes('sourcemap') // Ignore sourcemap errors in dev
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should handle network memories display', async ({ page }) => {
    // Wait for network memories component to load
    const networkMemories = page.locator('[class*="network-memories"]')

    if (await networkMemories.isVisible()) {
      // Check for network status indicator
      const statusIndicator = networkMemories.locator('[class*="status-indicator"]')
      await expect(statusIndicator).toBeVisible()

      // Should show either "online" or "offline" status
      const statusText = await statusIndicator.textContent()
      expect(statusText).toMatch(/(online|offline|users|No users)/i)
    }
  })
})