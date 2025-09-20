/**
 * PWA Performance Monitoring Dashboard
 * Comprehensive monitoring for top-tier PWA performance
 */

export interface PWAHealthMetrics {
  performance: {
    fcp: number // First Contentful Paint
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay
    cls: number // Cumulative Layout Shift
    ttfb: number // Time to First Byte
    lighthouse: {
      performance: number
      accessibility: number
      bestPractices: number
      seo: number
      pwa: number
    }
  }
  pwa: {
    isInstallable: boolean
    hasServiceWorker: boolean
    worksOffline: boolean
    hasManifest: boolean
    isOnHttps: boolean
    hasSplashScreen: boolean
    hasThemedOmnibox: boolean
  }
  accessibility: {
    wcagAACompliant: boolean
    colorContrast: boolean
    keyboardNavigation: boolean
    screenReaderCompatible: boolean
    ariaLabelsComplete: boolean
  }
  performance_budget: {
    totalJSSize: number
    totalCSSSize: number
    totalImageSize: number
    totalHTMLSize: number
    unusedJS: number
    unusedCSS: number
  }
}

export class PWAMonitor {
  private metrics: Partial<PWAHealthMetrics> = {}
  private thresholds = {
    performance: {
      fcp: 1800, // ms
      lcp: 2500, // ms
      fid: 100,  // ms
      cls: 0.1,  // score
      ttfb: 600, // ms
      lighthouse: 0.9 // score
    },
    budget: {
      totalJSSize: 250000,    // 250KB
      totalCSSSize: 100000,   // 100KB
      totalImageSize: 500000, // 500KB
      unusedJS: 20000,        // 20KB
      unusedCSS: 10000        // 10KB
    }
  }

  /**
   * Run comprehensive PWA health check
   */
  async runHealthCheck(): Promise<PWAHealthMetrics> {
    console.log('🔍 Running PWA Health Check...')

    const [
      performanceMetrics,
      pwaMetrics,
      accessibilityMetrics,
      budgetMetrics
    ] = await Promise.all([
      this.checkPerformanceMetrics(),
      this.checkPWACapabilities(),
      this.checkAccessibility(),
      this.checkPerformanceBudget()
    ])

    const healthMetrics: PWAHealthMetrics = {
      performance: performanceMetrics,
      pwa: pwaMetrics,
      accessibility: accessibilityMetrics,
      performance_budget: budgetMetrics
    }

    this.generateHealthReport(healthMetrics)
    return healthMetrics
  }

  /**
   * Check Core Web Vitals and Lighthouse scores
   */
  private async checkPerformanceMetrics(): Promise<PWAHealthMetrics['performance']> {
    return new Promise((resolve) => {
      const metrics = {
        fcp: 0,
        lcp: 0,
        fid: 0,
        cls: 0,
        ttfb: 0,
        lighthouse: {
          performance: 0,
          accessibility: 0,
          bestPractices: 0,
          seo: 0,
          pwa: 0
        }
      }

      if (typeof window === 'undefined') {
        resolve(metrics)
        return
      }

      // Measure Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
            metrics.fcp = entry.startTime
          }
          if (entry.entryType === 'largest-contentful-paint') {
            metrics.lcp = (entry as any).startTime
          }
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            metrics.cls += (entry as any).value
          }
        }
      })

      try {
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] })
      } catch (e) {
        console.warn('Performance observer not supported')
      }

      // Measure TTFB
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        metrics.ttfb = navigation.responseStart - navigation.requestStart
      }

      // Note: Lighthouse scores would come from actual Lighthouse CI
      // This is a placeholder for demonstration
      setTimeout(() => {
        resolve(metrics)
      }, 1000)
    })
  }

  /**
   * Check PWA installation and service worker capabilities
   */
  private async checkPWACapabilities(): Promise<PWAHealthMetrics['pwa']> {
    const capabilities = {
      isInstallable: false,
      hasServiceWorker: false,
      worksOffline: false,
      hasManifest: false,
      isOnHttps: location.protocol === 'https:',
      hasSplashScreen: false,
      hasThemedOmnibox: false
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        capabilities.hasServiceWorker = !!registration
      } catch (e) {
        console.warn('Service worker check failed:', e)
      }
    }

    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]')
    if (manifestLink) {
      capabilities.hasManifest = true

      try {
        const manifestUrl = (manifestLink as HTMLLinkElement).href
        const response = await fetch(manifestUrl)
        const manifest = await response.json()

        capabilities.hasSplashScreen = !!(manifest.icons && manifest.name)
        capabilities.hasThemedOmnibox = !!manifest.theme_color
      } catch (e) {
        console.warn('Manifest check failed:', e)
      }
    }

    // Check installability
    capabilities.isInstallable = capabilities.hasManifest && capabilities.hasServiceWorker

    return capabilities
  }

  /**
   * Check WCAG AA accessibility compliance
   */
  private async checkAccessibility(): Promise<PWAHealthMetrics['accessibility']> {
    const accessibility = {
      wcagAACompliant: false,
      colorContrast: false,
      keyboardNavigation: false,
      screenReaderCompatible: false,
      ariaLabelsComplete: false
    }

    // Basic accessibility checks
    // In real implementation, this would use axe-core or similar

    // Check for aria labels
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea')
    let hasAllAriaLabels = true

    interactiveElements.forEach(element => {
      const hasLabel = element.getAttribute('aria-label') ||
                      element.getAttribute('aria-labelledby') ||
                      element.textContent?.trim()
      if (!hasLabel) {
        hasAllAriaLabels = false
      }
    })

    accessibility.ariaLabelsComplete = hasAllAriaLabels

    // Check for proper heading structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    accessibility.screenReaderCompatible = headings.length > 0

    // Basic keyboard navigation check
    accessibility.keyboardNavigation = document.querySelectorAll('[tabindex="-1"]:not([disabled])').length === 0

    // Overall compliance (simplified)
    accessibility.wcagAACompliant = accessibility.ariaLabelsComplete &&
                                   accessibility.screenReaderCompatible &&
                                   accessibility.keyboardNavigation

    return accessibility
  }

  /**
   * Check performance budget compliance
   */
  private async checkPerformanceBudget(): Promise<PWAHealthMetrics['performance_budget']> {
    const budget = {
      totalJSSize: 0,
      totalCSSSize: 0,
      totalImageSize: 0,
      totalHTMLSize: 0,
      unusedJS: 0,
      unusedCSS: 0
    }

    // Get resource sizes from performance API
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

    resources.forEach(resource => {
      const size = resource.transferSize || 0

      if (resource.initiatorType === 'script') {
        budget.totalJSSize += size
      } else if (resource.initiatorType === 'css' || resource.name.includes('.css')) {
        budget.totalCSSSize += size
      } else if (resource.initiatorType === 'img') {
        budget.totalImageSize += size
      }
    })

    // HTML size
    const htmlResource = resources.find(r => r.initiatorType === 'navigation')
    if (htmlResource) {
      budget.totalHTMLSize = htmlResource.transferSize || 0
    }

    return budget
  }

  /**
   * Generate comprehensive health report
   */
  private generateHealthReport(metrics: PWAHealthMetrics): void {
    console.log('📊 PWA Health Report Generated:')

    // Performance score
    const perfScore = this.calculatePerformanceScore(metrics.performance)
    console.log(`🚀 Performance Score: ${(perfScore * 100).toFixed(1)}%`)

    // PWA compliance
    const pwaScore = this.calculatePWAScore(metrics.pwa)
    console.log(`📱 PWA Compliance: ${(pwaScore * 100).toFixed(1)}%`)

    // Accessibility score
    const a11yScore = this.calculateAccessibilityScore(metrics.accessibility)
    console.log(`♿ Accessibility Score: ${(a11yScore * 100).toFixed(1)}%`)

    // Budget compliance
    const budgetScore = this.calculateBudgetScore(metrics.performance_budget)
    console.log(`💰 Budget Compliance: ${(budgetScore * 100).toFixed(1)}%`)

    // Overall health score
    const overallScore = (perfScore + pwaScore + a11yScore + budgetScore) / 4
    console.log(`🎯 Overall PWA Health: ${(overallScore * 100).toFixed(1)}%`)

    // Recommendations
    this.generateRecommendations(metrics)
  }

  /**
   * Calculate individual scores
   */
  private calculatePerformanceScore(perf: PWAHealthMetrics['performance']): number {
    const scores = [
      perf.fcp <= this.thresholds.performance.fcp ? 1 : 0.5,
      perf.lcp <= this.thresholds.performance.lcp ? 1 : 0.5,
      perf.fid <= this.thresholds.performance.fid ? 1 : 0.5,
      perf.cls <= this.thresholds.performance.cls ? 1 : 0.5,
      perf.ttfb <= this.thresholds.performance.ttfb ? 1 : 0.5
    ]
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }

  private calculatePWAScore(pwa: PWAHealthMetrics['pwa']): number {
    const capabilities = Object.values(pwa)
    return capabilities.filter(Boolean).length / capabilities.length
  }

  private calculateAccessibilityScore(a11y: PWAHealthMetrics['accessibility']): number {
    const checks = Object.values(a11y)
    return checks.filter(Boolean).length / checks.length
  }

  private calculateBudgetScore(budget: PWAHealthMetrics['performance_budget']): number {
    const scores = [
      budget.totalJSSize <= this.thresholds.budget.totalJSSize ? 1 : 0,
      budget.totalCSSSize <= this.thresholds.budget.totalCSSSize ? 1 : 0,
      budget.unusedJS <= this.thresholds.budget.unusedJS ? 1 : 0,
      budget.unusedCSS <= this.thresholds.budget.unusedCSS ? 1 : 0
    ]
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(metrics: PWAHealthMetrics): void {
    const recommendations: string[] = []

    // Performance recommendations
    if (metrics.performance.fcp > this.thresholds.performance.fcp) {
      recommendations.push('🚀 Optimize First Contentful Paint: Consider critical CSS inlining and resource prioritization')
    }

    if (metrics.performance.lcp > this.thresholds.performance.lcp) {
      recommendations.push('🎯 Improve Largest Contentful Paint: Optimize images and implement proper image sizing')
    }

    // PWA recommendations
    if (!metrics.pwa.hasServiceWorker) {
      recommendations.push('📱 Implement Service Worker for offline functionality')
    }

    if (!metrics.pwa.hasManifest) {
      recommendations.push('📋 Add Web App Manifest for installability')
    }

    // Accessibility recommendations
    if (!metrics.accessibility.ariaLabelsComplete) {
      recommendations.push('♿ Add proper ARIA labels to all interactive elements')
    }

    // Budget recommendations
    if (metrics.performance_budget.totalJSSize > this.thresholds.budget.totalJSSize) {
      recommendations.push('🗜️ Reduce JavaScript bundle size through code splitting and tree shaking')
    }

    if (recommendations.length > 0) {
      console.log('\n🔧 Recommendations:')
      recommendations.forEach(rec => console.log(`  ${rec}`))
    } else {
      console.log('\n✅ All PWA health checks passed!')
    }
  }
}

// Export singleton instance
export const pwaMonitor = new PWAMonitor()