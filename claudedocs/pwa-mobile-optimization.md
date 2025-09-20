# PWA Mobile Optimization Strategies

## Core PWA Features for Mobile

### 1. App Manifest Optimization
```json
{
  "name": "Etherith Memory Vault",
  "short_name": "Etherith",
  "description": "Your personal digital memory preservation system",
  "start_url": "/memory-vault",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#d4af37",
  "background_color": "#1a1a1a",
  "categories": ["productivity", "utilities", "lifestyle"],
  "screenshots": [
    {
      "src": "screenshots/mobile-upload.png",
      "sizes": "640x1136",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Quick Capture",
      "short_name": "Capture",
      "description": "Quickly capture a new memory",
      "url": "/memory-vault?action=capture",
      "icons": [{ "src": "icons/capture-96.png", "sizes": "96x96" }]
    }
  ]
}
```

### 2. Service Worker Strategy
```typescript
// sw.js - Mobile-optimized service worker
const CACHE_NAME = 'etherith-v1'
const OFFLINE_URL = '/offline'

// Cache strategies by content type
const cacheStrategies = {
  documents: 'NetworkFirst',     // HTML, JS, CSS
  images: 'CacheFirst',          // User uploads, avatars
  api: 'NetworkFirst',           // API calls
  static: 'CacheFirst'           // Icons, fonts
}

// Install event - cache essential resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/memory-vault',
        '/offline',
        '/styles/mobile-upload.css',
        '/styles/mobile-visibility.css',
        '/icons/icon-192.png'
      ])
    })
  )
})

// Background sync for file uploads
self.addEventListener('sync', event => {
  if (event.tag === 'memory-upload') {
    event.waitUntil(uploadPendingMemories())
  }
})

// Push notifications for memory reminders
self.addEventListener('push', event => {
  const options = {
    body: event.data?.text() || 'Time to capture a new memory!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'memory-reminder',
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'capture',
        title: 'Capture Now',
        icon: '/icons/capture-96.png'
      },
      {
        action: 'dismiss',
        title: 'Later'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('Etherith', options)
  )
})
```

## Mobile Performance Optimizations

### 1. Critical Resource Loading
```typescript
// Preload critical resources
const criticalResources = [
  { href: '/styles/mobile-upload.css', as: 'style' },
  { href: '/fonts/inter.woff2', as: 'font', crossorigin: 'anonymous' },
  { href: '/icons/icon-192.png', as: 'image' }
]

// Add preload links to document head
criticalResources.forEach(resource => {
  const link = document.createElement('link')
  link.rel = 'preload'
  Object.assign(link, resource)
  document.head.appendChild(link)
})
```

### 2. Lazy Loading Strategy
```typescript
// Intersection Observer for lazy loading
const lazyLoadObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target as HTMLImageElement
      if (img.dataset.src) {
        img.src = img.dataset.src
        img.classList.remove('lazy')
        lazyLoadObserver.unobserve(img)
      }
    }
  })
}, {
  rootMargin: '50px 0px' // Start loading 50px before entering viewport
})

// Apply to memory images
document.querySelectorAll('img[data-src]').forEach(img => {
  lazyLoadObserver.observe(img)
})
```

### 3. Bundle Optimization
```javascript
// next.config.js - Mobile-first bundle optimization
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
        }
      }
    }
  ]
})

module.exports = withPWA({
  experimental: {
    optimizeCss: true,
    optimizeImages: true
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  webpack: (config) => {
    // Split vendor chunks
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    }
    return config
  }
})
```

## Offline-First Architecture

### 1. Data Synchronization
```typescript
// Offline-first data layer
class OfflineDataManager {
  private indexedDB: IDBDatabase
  private syncQueue: SyncItem[] = []

  async saveMemory(memory: Memory): Promise<void> {
    // Save locally first
    await this.saveToIndexedDB(memory)

    // Queue for sync when online
    if (!navigator.onLine) {
      this.addToSyncQueue({
        type: 'CREATE_MEMORY',
        data: memory,
        timestamp: Date.now()
      })
    } else {
      await this.syncToServer(memory)
    }
  }

  async syncWhenOnline(): Promise<void> {
    if (!navigator.onLine) return

    for (const item of this.syncQueue) {
      try {
        await this.processSyncItem(item)
        this.removeSyncQueueItem(item.id)
      } catch (error) {
        console.error('Sync failed:', error)
        // Keep in queue for retry
      }
    }
  }

  // Listen for online/offline events
  setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.syncWhenOnline()
    })

    window.addEventListener('offline', () => {
      console.log('App is now offline')
    })
  }
}
```

### 2. File Storage Strategy
```typescript
// Progressive file storage
class MobileFileManager {
  async storeFile(file: File, memory: Memory): Promise<string> {
    // For small files (< 1MB), store in IndexedDB
    if (file.size < 1024 * 1024) {
      const base64 = await this.fileToBase64(file)
      await this.storeInIndexedDB(memory.id, base64)
      return base64
    }

    // For larger files, use temporary local storage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const availableSpace = estimate.quota! - estimate.usage!

      if (file.size < availableSpace * 0.8) { // Use max 80% of available space
        return await this.storeInCache(file, memory.id)
      }
    }

    // Fallback: compress and store
    const compressed = await this.compressFile(file)
    return await this.storeInIndexedDB(memory.id, compressed)
  }

  private async compressFile(file: File): Promise<string> {
    if (file.type.startsWith('image/')) {
      return await this.compressImage(file, 0.8, 1920) // 80% quality, max 1920px
    }
    // For other files, store metadata only
    return JSON.stringify({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    })
  }
}
```

## Device Integration Features

### 1. Camera Integration
```typescript
// Enhanced camera capture
class MobileCameraManager {
  async requestCameraAccess(): Promise<MediaStream> {
    try {
      // Request rear camera with optimal settings
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16/9 }
        }
      })
    } catch (error) {
      // Fallback to any available camera
      return await navigator.mediaDevices.getUserMedia({
        video: true
      })
    }
  }

  async capturePhoto(stream: MediaStream): Promise<Blob> {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    video.srcObject = stream
    await new Promise(resolve => video.onloadedmetadata = resolve)

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    })
  }

  // Handle device orientation for proper photo rotation
  getDeviceOrientation(): number {
    if (screen.orientation) {
      return screen.orientation.angle
    }
    return window.orientation || 0
  }
}
```

### 2. File System Access
```typescript
// Native file handling where supported
class NativeFileHandler {
  async showFilePicker(): Promise<FileSystemFileHandle[]> {
    if ('showOpenFilePicker' in window) {
      return await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'Images',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
            }
          },
          {
            description: 'Documents',
            accept: {
              'application/pdf': ['.pdf'],
              'text/*': ['.txt', '.md']
            }
          }
        ]
      })
    }

    // Fallback to traditional file input
    return this.showTraditionalFilePicker()
  }

  private showTraditionalFilePicker(): Promise<File[]> {
    return new Promise(resolve => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*,application/pdf,text/*'
      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || [])
        resolve(files)
      }
      input.click()
    })
  }
}
```

## Installation and Engagement

### 1. Smart Install Prompts
```typescript
// Intelligent PWA install prompting
class PWAInstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null
  private installCriteriaMet = false

  constructor() {
    this.setupInstallPrompt()
    this.trackEngagement()
  }

  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent default browser install prompt
      e.preventDefault()
      this.deferredPrompt = e as BeforeInstallPromptEvent

      // Show custom install prompt when criteria are met
      if (this.shouldShowInstallPrompt()) {
        this.showCustomInstallPrompt()
      }
    })
  }

  private shouldShowInstallPrompt(): boolean {
    const engagementScore = this.calculateEngagementScore()
    const timeSpent = this.getTimeSpentInApp()
    const memoriesCreated = this.getMemoriesCreated()

    return (
      engagementScore > 0.7 ||
      timeSpent > 300000 || // 5 minutes
      memoriesCreated > 2
    )
  }

  private calculateEngagementScore(): number {
    const pageViews = localStorage.getItem('pageViews') || '0'
    const sessionCount = localStorage.getItem('sessionCount') || '0'
    const returnVisitor = parseInt(sessionCount) > 1

    return (parseInt(pageViews) * 0.1) + (returnVisitor ? 0.5 : 0)
  }

  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) return false

    // Show the browser's install prompt
    this.deferredPrompt.prompt()

    // Wait for user response
    const { outcome } = await this.deferredPrompt.userChoice

    // Track install outcome
    this.trackInstallOutcome(outcome)

    this.deferredPrompt = null
    return outcome === 'accepted'
  }
}
```

### 2. Push Notification Strategy
```typescript
// Contextual push notifications
class MemoryNotificationManager {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  async scheduleMemoryReminder(days: number = 7): Promise<void> {
    if (!await this.requestPermission()) return

    // Schedule reminder using service worker
    const registration = await navigator.serviceWorker.ready
    await registration.sync.register('memory-reminder')

    // Store reminder preference
    localStorage.setItem('memoryReminder', JSON.stringify({
      enabled: true,
      frequency: days,
      nextReminder: Date.now() + (days * 24 * 60 * 60 * 1000)
    }))
  }

  // Context-aware reminders
  shouldSendReminder(): boolean {
    const lastMemory = localStorage.getItem('lastMemoryCreated')
    const daysSinceLastMemory = lastMemory
      ? (Date.now() - parseInt(lastMemory)) / (24 * 60 * 60 * 1000)
      : 7

    return daysSinceLastMemory >= 7
  }
}
```

## Performance Monitoring

### 1. Core Web Vitals Tracking
```typescript
// Mobile performance monitoring
class MobilePerformanceMonitor {
  constructor() {
    this.trackCoreWebVitals()
    this.trackCustomMetrics()
  }

  private trackCoreWebVitals(): void {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(this.sendToAnalytics)
      getFID(this.sendToAnalytics)
      getFCP(this.sendToAnalytics)
      getLCP(this.sendToAnalytics)
      getTTFB(this.sendToAnalytics)
    })
  }

  private trackCustomMetrics(): void {
    // File upload time
    performance.mark('upload-start')
    // ... upload code ...
    performance.mark('upload-end')
    performance.measure('upload-duration', 'upload-start', 'upload-end')

    // Camera capture time
    performance.mark('camera-start')
    // ... camera code ...
    performance.mark('camera-end')
    performance.measure('camera-duration', 'camera-start', 'camera-end')
  }

  private sendToAnalytics(metric: any): void {
    // Send to analytics service
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          userAgent: navigator.userAgent,
          url: location.href
        })
      })
    }
  }
}
```

This comprehensive mobile-first redesign transforms the Etherith memory upload and visibility system into a seamless, touch-friendly PWA experience that prioritizes file upload and provides optimal mobile usability.