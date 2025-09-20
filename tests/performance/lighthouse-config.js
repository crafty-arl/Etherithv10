// Lighthouse CI configuration for PWA performance monitoring

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/memory-vault',
      ],
      startServerCommand: 'npm run start',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox'
      }
    },
    assert: {
      assertions: {
        // Performance thresholds
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // PWA specific audits
        'service-worker': 'error',
        'works-offline': 'error',
        'is-on-https': 'off', // Allow for local development
        'splash-screen': 'error',
        'themed-omnibox': 'error',
        'manifest-short-name-length': 'error',
        'maskable-icon': 'warn',

        // Accessibility audits
        'color-contrast': 'error',
        'heading-order': 'error',
        'html-has-lang': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',

        // Best practices
        'uses-https': 'off', // Allow for local development
        'no-vulnerable-libraries': 'error',
        'is-crawlable': 'error'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}