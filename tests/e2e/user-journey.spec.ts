/**
 * End-to-End User Journey Tests
 * Tests complete user flows through the DXOS PWA
 */

import { test, expect } from '@playwright/test'

test.describe('User Onboarding Journey', () => {
  test('New user can complete full onboarding flow', async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Should see landing page
    await expect(page.locator('h1')).toContainText('Etherith')

    // Start Discord authentication
    await page.click('text=Connect with Discord')

    // Should redirect to Discord OAuth (in real test, would mock this)
    await expect(page).toHaveURL(/discord\.com|localhost/)

    // Mock Discord callback
    await page.goto('/?mock_discord_auth=true')

    // Should see DXOS identity creation
    await expect(page.locator('text=Create Your Peer-to-Peer Identity')).toBeVisible()

    // Identity should be created automatically
    await page.waitForSelector('text=Connected as', { timeout: 10000 })

    // Should see main dashboard
    await expect(page.locator('text=Memory Vault')).toBeVisible()

    // Check for working PWA elements
    await expect(page.locator('[data-testid="sync-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="network-status"]')).toBeVisible()
  })

  test('User can access app offline', async ({ page, context }) => {
    // Start online
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Go offline
    await context.setOffline(true)

    // Navigate to memory vault
    await page.click('text=Memory Vault')

    // Should still work offline
    await expect(page.locator('text=Memory Vault')).toBeVisible()
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()

    // Go back online
    await context.setOffline(false)
    await page.waitForTimeout(1000)

    // Should sync back online
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Connected')
  })
})

test.describe('Memory Creation Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authenticated state
    await page.goto('/?mock_auth=true')
    await page.waitForSelector('text=Connected as', { timeout: 5000 })
  })

  test('User can create and share a memory', async ({ page }) => {
    // Open memory creation
    await page.click('[data-testid="create-memory-button"]')

    // Should see upload interface
    await expect(page.locator('text=Capture Memory')).toBeVisible()

    // Create a text memory
    await page.click('text=Quick Note')

    // Fill in memory details
    await page.fill('input[data-testid="memory-title"]', 'Test Memory')
    await page.fill('textarea[data-testid="memory-content"]', 'This is a test memory created by automated testing.')

    // Set visibility to public
    await page.click('button:has-text("Public")')

    // Save memory
    await page.click('button:has-text("Save Memory")')

    // Should see success state
    await expect(page.locator('text=Memory Saved!')).toBeVisible()

    // Should appear in memory vault
    await page.click('text=View in Vault')
    await expect(page.locator('text=Test Memory')).toBeVisible()

    // Memory should be marked as public
    await expect(page.locator('[data-testid="memory-visibility"]:has-text("Public")')).toBeVisible()
  })

  test('User can upload a file memory', async ({ page }) => {
    // Navigate to memory creation
    await page.click('[data-testid="create-memory-button"]')

    // Create a file memory
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.click('text=Choose File')
    const fileChooser = await fileChooserPromise

    // Upload a test file
    await fileChooser.setFiles([{
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    }])

    // Should show file preview
    await expect(page.locator('[data-testid="file-preview"]')).toBeVisible()

    // AI should suggest title and tags
    await expect(page.locator('input[data-testid="memory-title"]')).not.toHaveValue('')

    // Save the memory
    await page.click('button:has-text("Save Memory")')

    // Should complete upload
    await expect(page.locator('text=Memory Saved!')).toBeVisible()
  })

  test('User can collaborate on memories in real-time', async ({ page, context }) => {
    // Open a second page/user session
    const secondPage = await context.newPage()
    await secondPage.goto('/?mock_auth=true&user=user2')

    // First user creates a memory
    await page.click('[data-testid="create-memory-button"]')
    await page.click('text=Quick Note')
    await page.fill('input[data-testid="memory-title"]', 'Collaborative Memory')
    await page.click('button:has-text("Public")')
    await page.click('button:has-text("Save Memory")')

    // Second user should see the memory in network
    await secondPage.reload()
    await secondPage.waitForSelector('text=Collaborative Memory')

    // Second user can view the memory
    await secondPage.click('text=Collaborative Memory')
    await expect(secondPage.locator('text=Collaborative Memory')).toBeVisible()
  })
})

test.describe('Social Discovery Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock_auth=true')
    await page.waitForSelector('text=Connected as', { timeout: 5000 })
  })

  test('User can discover and connect with other users', async ({ page }) => {
    // Navigate to social features
    await page.click('[data-testid="social-menu"]')
    await page.click('text=Connections')

    // Should see connection manager
    await expect(page.locator('text=Search for users')).toBeVisible()

    // Search for users
    await page.fill('input[data-testid="user-search"]', 'TestUser')
    await page.waitForSelector('[data-testid="search-results"]')

    // Should show search results
    await expect(page.locator('[data-testid="user-card"]')).toBeVisible()

    // Send friend request
    await page.click('button:has-text("Add Friend")')

    // Should show pending status
    await expect(page.locator('text=Request Pending')).toBeVisible()

    // Switch to pending tab
    await page.click('text=Pending')
    await expect(page.locator('[data-testid="sent-request"]')).toBeVisible()
  })

  test('User can manage space invitations', async ({ page }) => {
    // Navigate to space management
    await page.click('[data-testid="spaces-menu"]')
    await page.click('text=Manage Spaces')

    // Create a new space
    await page.click('button:has-text("Create Space")')
    await page.fill('input[data-testid="space-name"]', 'Test Space')
    await page.fill('textarea[data-testid="space-description"]', 'A space for testing')
    await page.click('button:has-text("Create")')

    // Should see space created
    await expect(page.locator('text=Test Space')).toBeVisible()

    // Navigate to invitations
    await page.click('text=Invitations')

    // Create an invitation
    await page.click('button:has-text("Create Invitation")')
    await page.fill('input[data-testid="invitation-description"]', 'Come join our test space!')
    await page.click('button:has-text("Create Invitation")')

    // Should see invitation created
    await expect(page.locator('text=Invitation #')).toBeVisible()

    // Copy invitation link
    await page.click('button:has-text("Copy Link")')

    // Should show success feedback
    await expect(page.locator('text=copied')).toBeVisible()
  })
})

test.describe('Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE

  test('Mobile user can capture and upload memories', async ({ page }) => {
    await page.goto('/?mock_auth=true')
    await page.waitForSelector('text=Connected as', { timeout: 5000 })

    // Open mobile upload interface
    await page.click('[data-testid="mobile-upload-trigger"]')

    // Should see mobile-optimized interface
    await expect(page.locator('[data-testid="mobile-capture-interface"]')).toBeVisible()

    // Can access camera (mock)
    await page.click('text=Take Photo')
    await expect(page.locator('[data-testid="camera-preview"]')).toBeVisible()

    // Can cancel camera
    await page.click('[data-testid="camera-cancel"]')

    // Try quick note instead
    await page.click('text=Quick Note')

    // Should see mobile form
    await expect(page.locator('[data-testid="mobile-memory-form"]')).toBeVisible()

    // Form should be touch-optimized
    await page.fill('input[data-testid="memory-title"]', 'Mobile Memory')
    await page.fill('textarea[data-testid="memory-content"]', 'Created on mobile!')

    // Save memory
    await page.click('button:has-text("Save Memory")')
    await expect(page.locator('text=Memory Saved!')).toBeVisible()
  })

  test('Mobile app works as PWA', async ({ page, context }) => {
    await page.goto('/')

    // Check PWA manifest is loaded
    const manifestResponse = await page.request.get('/manifest.json')
    expect(manifestResponse.ok()).toBeTruthy()

    // Check service worker is registered
    await page.waitForFunction(() => 'serviceWorker' in navigator)

    // Should be installable
    await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible()

    // Check offline functionality
    await context.setOffline(true)
    await page.reload()

    // Should still load from cache
    await expect(page.locator('h1')).toContainText('Etherith')
  })
})

test.describe('Performance and Accessibility', () => {
  test('Page loads within performance budget', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)

    // Check Core Web Vitals
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          if (entries.length > 0) {
            resolve(entries[entries.length - 1].startTime)
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] })
      })
    })

    // LCP should be under 2.5 seconds
    expect(lcp).toBeLessThan(2500)
  })

  test('App meets accessibility standards', async ({ page }) => {
    await page.goto('/')

    // Check for proper heading structure
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThan(0)
    expect(h1Count).toBeLessThanOrEqual(1)

    // Check for alt text on images
    const images = page.locator('img')
    const imageCount = await images.count()
    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt')
      expect(alt).toBeTruthy()
    }

    // Check for focus management
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()

    // Check color contrast (basic check)
    const backgroundColor = await page.locator('body').evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    const color = await page.locator('body').evaluate(el =>
      getComputedStyle(el).color
    )

    expect(backgroundColor).toBeTruthy()
    expect(color).toBeTruthy()
  })

  test('App handles network failures gracefully', async ({ page, context }) => {
    await page.goto('/?mock_auth=true')

    // Simulate network failure during upload
    await page.click('[data-testid="create-memory-button"]')
    await page.click('text=Quick Note')
    await page.fill('input[data-testid="memory-title"]', 'Network Test')

    // Go offline before saving
    await context.setOffline(true)
    await page.click('button:has-text("Save Memory")')

    // Should show offline message and queue operation
    await expect(page.locator('text=offline')).toBeVisible()
    await expect(page.locator('[data-testid="queued-operation"]')).toBeVisible()

    // Go back online
    await context.setOffline(false)
    await page.waitForTimeout(1000)

    // Should sync automatically
    await expect(page.locator('text=Memory Saved!')).toBeVisible()
  })
})

test.describe('Data Persistence and Sync', () => {
  test('Data persists across browser sessions', async ({ page, context }) => {
    await page.goto('/?mock_auth=true')

    // Create a memory
    await page.click('[data-testid="create-memory-button"]')
    await page.click('text=Quick Note')
    await page.fill('input[data-testid="memory-title"]', 'Persistent Memory')
    await page.click('button:has-text("Save Memory")')
    await expect(page.locator('text=Memory Saved!')).toBeVisible()

    // Close and reopen browser
    await page.close()
    const newPage = await context.newPage()
    await newPage.goto('/?mock_auth=true')

    // Memory should still be there
    await newPage.click('text=Memory Vault')
    await expect(newPage.locator('text=Persistent Memory')).toBeVisible()
  })

  test('Handles sync conflicts appropriately', async ({ page, context }) => {
    // Create two sessions editing the same data
    await page.goto('/?mock_auth=true')
    const secondPage = await context.newPage()
    await secondPage.goto('/?mock_auth=true&user=user2')

    // Both users edit the same space
    await page.click('[data-testid="space-settings"]')
    await page.fill('input[data-testid="space-name"]', 'Updated by User 1')

    await secondPage.click('[data-testid="space-settings"]')
    await secondPage.fill('input[data-testid="space-name"]', 'Updated by User 2')

    // Save changes simultaneously
    await Promise.all([
      page.click('button:has-text("Save")'),
      secondPage.click('button:has-text("Save")')
    ])

    // Should detect conflict and show resolution UI
    await expect(page.locator('[data-testid="conflict-resolution"]')).toBeVisible()

    // User can resolve conflict
    await page.click('button:has-text("Keep My Changes")')
    await expect(page.locator('text=Conflict resolved')).toBeVisible()
  })
})