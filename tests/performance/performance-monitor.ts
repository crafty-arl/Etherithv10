/**
 * Performance monitoring utilities for PWA benchmarking
 */

export interface PerformanceMetrics {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  ttfb: number // Time to First Byte
  loadTime: number
  domContentLoaded: number
  memoryUsage?: {
    used: number
    total: number
  }
}

export interface PWAMetrics {
  isInstallable: boolean
  hasServiceWorker: boolean
  worksOffline: boolean
  isOnHttps: boolean
  hasManifest: boolean
  lighthouseScore?: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
    pwa: number
  }
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics
  private observer: PerformanceObserver | null = null

  constructor() {
    this.metrics = {
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 0,
      loadTime: 0,
      domContentLoaded: 0
    }
  }

  /**
   * Start monitoring performance metrics
   */
  startMonitoring(): void {
    // Monitor Core Web Vitals
    this.monitorWebVitals()

    // Monitor basic timing metrics
    this.monitorTimingMetrics()

    // Monitor memory usage if available
    this.monitorMemoryUsage()
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorWebVitals(): void {
    if (typeof window === 'undefined') return

    // Monitor FCP and LCP
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime
          }
        }

        if (entry.entryType === 'largest-contentful-paint') {
          const lcpEntry = entry as any
          this.metrics.lcp = lcpEntry.startTime
        }

        if (entry.entryType === 'layout-shift') {
          const clsEntry = entry as any
          if (!clsEntry.hadRecentInput) {
            this.metrics.cls += clsEntry.value
          }
        }
      }
    })

    // Observe different entry types
    try {
      this.observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] })
    } catch (e) {
      console.warn('Performance observer not supported:', e)
    }

    // Monitor FID using event timing
    this.monitorFirstInputDelay()
  }

  /**
   * Monitor First Input Delay
   */
  private monitorFirstInputDelay(): void {
    if (typeof window === 'undefined') return

    const firstInputs = ['mousedown', 'keydown', 'touchstart', 'pointerdown']

    const onFirstInput = (event: Event) => {
      const eventTime = event.timeStamp
      const navigationStart = performance.timeOrigin
      this.metrics.fid = eventTime - navigationStart

      // Remove listeners after first input
      firstInputs.forEach(eventType => {
        document.removeEventListener(eventType, onFirstInput, true)
      })
    }

    firstInputs.forEach(eventType => {
      document.addEventListener(eventType, onFirstInput, true)
    })
  }

  /**
   * Monitor basic timing metrics
   */
  private monitorTimingMetrics(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('load', () => {
      const timing = performance.timing
      this.metrics.ttfb = timing.responseStart - timing.navigationStart
      this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart
      this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart
    })
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if (typeof window === 'undefined' || !(performance as any).memory) return

    const memory = (performance as any).memory
    this.metrics.memoryUsage = {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Check PWA capabilities
   */
  async checkPWAMetrics(): Promise<PWAMetrics> {
    const metrics: PWAMetrics = {
      isInstallable: false,
      hasServiceWorker: false,
      worksOffline: false,
      isOnHttps: location.protocol === 'https:',
      hasManifest: false
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        metrics.hasServiceWorker = !!registration
      } catch (e) {
        console.warn('Service worker check failed:', e)
      }
    }

    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
    metrics.hasManifest = !!manifestLink

    // Check installability
    if ('getInstalledRelatedApps' in navigator) {
      try {
        const relatedApps = await (navigator as any).getInstalledRelatedApps()
        metrics.isInstallable = relatedApps.length === 0
      } catch (e) {
        console.warn('Install check failed:', e)
      }
    }

    return metrics
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    performance: PerformanceMetrics
    timestamp: number
    userAgent: string
    url: string
  } {
    return {
      performance: this.getMetrics(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}

/**
 * Utility function to run Lighthouse programmatically
 */
export const runLighthouseAudit = async (url: string): Promise<any> => {
  // This would typically use lighthouse programmatically
  // For now, return a mock structure
  console.warn('Lighthouse audit should be run via CLI or CI pipeline')

  return {
    lhr: {
      categories: {
        performance: { score: 0.9 },
        accessibility: { score: 0.95 },
        'best-practices': { score: 0.92 },
        seo: { score: 0.88 },
        pwa: { score: 0.9 }
      }
    }
  }
}

/**
 * Performance testing utilities for Jest
 */
export const performanceTestUtils = {
  /**
   * Measure component render time
   */
  measureRenderTime: <T extends (...args: any[]) => any>(
    fn: T,
    iterations = 100
  ): number => {
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      fn()
      const end = performance.now()
      times.push(end - start)
    }

    return times.reduce((sum, time) => sum + time, 0) / times.length
  },

  /**
   * Assert performance thresholds
   */
  assertPerformance: (
    actualTime: number,
    maxTime: number,
    description: string
  ): void => {
    if (actualTime > maxTime) {
      throw new Error(
        `Performance assertion failed: ${description} took ${actualTime.toFixed(2)}ms, expected <${maxTime}ms`
      )
    }
  },

  /**
   * Simulate slow network conditions
   */
  simulateSlowNetwork: (): void => {
    // Mock slow network for testing
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2s delay
      return originalFetch(input, init)
    })
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()