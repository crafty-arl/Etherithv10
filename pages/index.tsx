import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import DiscordConnect from '../components/DiscordConnect'
import DXOSIdentityManager from '../components/DXOSIdentityManager'
import { useIdentity } from '../lib/dxos/context'

export default function Home() {
  const { data: session } = useSession()
  const { hasIdentity } = useIdentity()
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(true)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Redirect to memory vault if user is authenticated
  useEffect(() => {
    if (session && hasIdentity) {
      console.log('🚪 [DEBUG] User is authenticated and has DXOS identity, redirecting to memory vault')
      router.push('/memory-vault')
    }
  }, [session, hasIdentity, router])

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      setInstallPrompt(null)
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  }

  const logoVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.8,
        type: "spring" as const,
        stiffness: 200
      }
    },
    hover: {
      scale: 1.1,
      rotate: 5,
      transition: {
        duration: 0.3
      }
    }
  }

  const featureVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.2,
        duration: 0.6,
        type: "spring" as const,
        stiffness: 100
      }
    }),
    hover: {
      y: -10,
      scale: 1.05,
      transition: {
        duration: 0.3,
        type: "spring" as const,
        stiffness: 300
      }
    }
  }

  return (
    <>
      <Head>
        <title>Etherith - Local-First Archival Ecosystem</title>
        <meta name="description" content="Preserve and empower digital knowledge through local-first design. Your memories, your sovereignty." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#D4AF37" />
      </Head>
      
      {/* Skip to content link for screen readers */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <motion.div 
        className="etherith-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="etherith-background">
          <div className="etherith-particles"></div>
        </div>
        
        <main className="etherith-main" id="main-content" role="main">
          <motion.div 
            className="etherith-logo"
            variants={itemVariants}
          >
            <motion.div 
              className="logo-icon" 
              role="img" 
              aria-label="Etherith logo"
              variants={logoVariants}
              whileHover="hover"
            >
              <img 
                src="/image.png" 
                alt="Etherith Logo" 
                className="logo-image"
              />
            </motion.div>
            <motion.h1 
              className="etherith-title"
              variants={itemVariants}
            >
              Etherith
            </motion.h1>
            <motion.p 
              className="etherith-subtitle"
              variants={itemVariants}
            >
              Local-First Archival Ecosystem
            </motion.p>
          </motion.div>
          
          <motion.div 
            className="etherith-welcome"
            variants={itemVariants}
          >
            <motion.h2
              className="welcome-heading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Preserve. Empower. Remember.
            </motion.h2>
            <motion.p
              className="welcome-description"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {session && hasIdentity
                ? "Redirecting to your memory vault..."
                : "Connect your Discord account to access a local-first archival ecosystem where your digital knowledge lives with you first, backed by permanence through IPFS and blockchain technology."
              }
            </motion.p>
          </motion.div>


          <DiscordConnect />

          <DXOSIdentityManager
            className="dxos-identity-section"
            onIdentityCreated={(identity) => {
              console.log('Identity created on homepage:', identity)
            }}
          />

          {!session && !hasIdentity && (
            <motion.div
              className="login-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <p className="login-description">
                Start by connecting your Discord account and creating your digital identity to access the memory vault.
              </p>
            </motion.div>
          )}

          {installPrompt && !isInstalled && (
            <button 
              className="etherith-install-button" 
              onClick={handleInstallClick}
              aria-label="Install Etherith as a mobile app"
            >
              <span className="install-icon" aria-hidden="true">📱</span>
              Install Etherith App
            </button>
          )}

          {isInstalled && (
            <div className="etherith-installed" role="status" aria-live="polite">
              <span className="check-icon" aria-hidden="true">✓</span>
              Etherith is installed and ready!
            </div>
          )}

          {!session && !hasIdentity && (
            <motion.section
              className="etherith-features"
              aria-labelledby="features-heading"
              variants={itemVariants}
            >
              <motion.h3
                id="features-heading"
                className="features-heading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                Peer-to-Peer Social Media Ecosystem
              </motion.h3>
              <div className="features-grid" role="list">
                {[
                  {
                    icon: "🌐",
                    title: "Decentralized Network",
                    description: "No central servers, truly peer-to-peer social media"
                  },
                  {
                    icon: "🔐",
                    title: "Sovereign Identity",
                    description: "Own your digital identity with cryptographic security"
                  },
                  {
                    icon: "🤝",
                    title: "Real-time Collaboration",
                    description: "Instant synchronization across all connected peers"
                  },
                  {
                    icon: "🏠",
                    title: "Local-First",
                    description: "Your data lives with you, backed by IPFS permanence"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="feature-card"
                    role="listitem"
                    variants={featureVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    custom={index}
                  >
                    <motion.div
                      className="feature-icon"
                      role="img"
                      aria-label={`${feature.title} icon`}
                      whileHover={{
                        scale: 1.2,
                        rotate: 10,
                        transition: { duration: 0.2 }
                      }}
                    >
                      {feature.icon}
                    </motion.div>
                    <h4 className="feature-title">{feature.title}</h4>
                    <p className="feature-description">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </main>
      </motion.div>
    </>
  )
}
