import { Memory } from '../types/memory'
import { PublicMemoryEntry, RegistryConfig } from '../types/registry'
import { LocalStorage } from './storage'
import { RegistryManager } from './registry'

// Privacy and sharing permissions system
export class PrivacyManager {

  // Memory-level privacy controls

  static canShareMemory(memory: Memory): {
    canShare: boolean
    reason?: string
    requiredActions?: string[]
  } {
    const config = RegistryManager.getConfig()

    // Check if memory is marked as private
    if (memory.visibility === 'private') {
      return {
        canShare: false,
        reason: 'Memory is marked as private',
        requiredActions: ['Change memory visibility to public']
      }
    }

    // Check file size limits
    if (memory.fileSize && memory.fileSize > config.maxMemorySize * 1024 * 1024) {
      return {
        canShare: false,
        reason: `Memory exceeds size limit (${config.maxMemorySize}MB)`,
        requiredActions: ['Reduce file size or increase limit in settings']
      }
    }

    // Check file type restrictions
    if (memory.fileType && !config.allowedFileTypes.includes(memory.fileType)) {
      return {
        canShare: false,
        reason: `File type '${memory.fileType}' not allowed for sharing`,
        requiredActions: ['Change allowed file types in settings']
      }
    }

    // Check if memory has IPFS CID (required for sharing)
    if (!memory.ipfsCid) {
      return {
        canShare: false,
        reason: 'Memory not uploaded to IPFS',
        requiredActions: ['Upload memory to IPFS first']
      }
    }

    // Check content safety (basic implementation)
    const contentFlags = this.checkContentSafety(memory)
    if (contentFlags.length > 0) {
      return {
        canShare: false,
        reason: `Content safety concerns: ${contentFlags.join(', ')}`,
        requiredActions: ['Review and modify content', 'Override safety check if appropriate']
      }
    }

    return { canShare: true }
  }

  // Content safety checking
  static checkContentSafety(memory: Memory): string[] {
    const flags: string[] = []
    const content = (memory.title + ' ' + memory.content + ' ' + memory.memoryNote).toLowerCase()

    // Basic keyword detection (can be enhanced with ML models)
    const sensitivePatterns = [
      { pattern: /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/, flag: 'potential credit card number' },
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, flag: 'potential SSN' },
      { pattern: /password[:=]\s*\w+/i, flag: 'potential password exposure' },
      { pattern: /api[_-]?key[:=]\s*\w+/i, flag: 'potential API key exposure' },
      { pattern: /token[:=]\s*\w+/i, flag: 'potential token exposure' },
      { pattern: /private[_-]?key/i, flag: 'potential private key reference' }
    ]

    for (const { pattern, flag } of sensitivePatterns) {
      if (pattern.test(content)) {
        flags.push(flag)
      }
    }

    return flags
  }

  // User consent and permissions

  static hasUserConsent(userId: string, action: 'share_profile' | 'share_contact' | 'share_location'): boolean {
    const config = RegistryManager.getConfig()

    switch (action) {
      case 'share_profile':
        return config.privacy.shareProfile
      case 'share_contact':
        return config.privacy.shareContactInfo
      case 'share_location':
        return config.privacy.shareLocation
      default:
        return false
    }
  }

  static requestUserConsent(action: 'share_profile' | 'share_contact' | 'share_location'): Promise<boolean> {
    return new Promise((resolve) => {
      const actionMessages = {
        share_profile: 'Allow sharing your profile information (name, avatar) in the registry?',
        share_contact: 'Allow sharing your contact information with registry subscribers?',
        share_location: 'Allow sharing your location information in the registry?'
      }

      const consent = confirm(actionMessages[action])

      if (consent) {
        // Update config with consent
        const config = RegistryManager.getConfig()
        const updatedConfig = { ...config }

        switch (action) {
          case 'share_profile':
            updatedConfig.privacy.shareProfile = true
            break
          case 'share_contact':
            updatedConfig.privacy.shareContactInfo = true
            break
          case 'share_location':
            updatedConfig.privacy.shareLocation = true
            break
        }

        RegistryManager.saveConfig(updatedConfig)
      }

      resolve(consent)
    })
  }

  // Data anonymization

  static anonymizeMemoryEntry(entry: PublicMemoryEntry, level: 'minimal' | 'moderate' | 'full'): PublicMemoryEntry {
    const anonymized = { ...entry }

    switch (level) {
      case 'minimal':
        // Remove direct contact info but keep authorship
        anonymized.authorContact = undefined
        break

      case 'moderate':
        // Remove contact and partially anonymize author
        anonymized.authorContact = undefined
        anonymized.authorAvatar = undefined
        anonymized.authorName = this.partiallyAnonymizeName(entry.authorName)
        break

      case 'full':
        // Remove all identifying information
        anonymized.authorContact = undefined
        anonymized.authorAvatar = undefined
        anonymized.authorName = 'Anonymous'
        anonymized.authorId = 'anon_' + this.generateAnonymousId(entry.authorId)
        break
    }

    return anonymized
  }

  private static partiallyAnonymizeName(name: string): string {
    const parts = name.split(' ')
    if (parts.length === 1) {
      return parts[0].charAt(0) + '*'.repeat(Math.max(1, parts[0].length - 1))
    }
    return parts[0] + ' ' + parts[1].charAt(0) + '.'
  }

  private static generateAnonymousId(originalId: string): string {
    // Generate consistent anonymous ID based on original
    let hash = 0
    for (let i = 0; i < originalId.length; i++) {
      const char = originalId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  // Access control and permissions

  static canAccessMemory(memory: PublicMemoryEntry, viewerUserId?: string): {
    canAccess: boolean
    reason?: string
    requiresPermission?: boolean
  } {
    // Public memories are accessible to all
    if (memory.sharingPermissions === 'public') {
      return { canAccess: true }
    }

    // If no viewer ID provided, deny access to restricted content
    if (!viewerUserId) {
      return {
        canAccess: false,
        reason: 'Authentication required for restricted content',
        requiresPermission: true
      }
    }

    // Owner always has access
    if (memory.authorId === viewerUserId) {
      return { canAccess: true }
    }

    // Check subscription-based access
    if (memory.sharingPermissions === 'subscribers-only') {
      const hasSubscription = this.isSubscribedToAuthor(viewerUserId, memory.authorId)
      if (hasSubscription) {
        return { canAccess: true }
      } else {
        return {
          canAccess: false,
          reason: 'Subscription required to access this content',
          requiresPermission: true
        }
      }
    }

    // Invite-only access
    if (memory.sharingPermissions === 'invite-only') {
      const hasInvite = this.hasInviteAccess(viewerUserId, memory.id)
      if (hasInvite) {
        return { canAccess: true }
      } else {
        return {
          canAccess: false,
          reason: 'Invitation required to access this content',
          requiresPermission: true
        }
      }
    }

    return {
      canAccess: false,
      reason: 'Access denied',
      requiresPermission: true
    }
  }

  private static isSubscribedToAuthor(viewerUserId: string, authorId: string): boolean {
    const subscriptions = RegistryManager.getSubscriptions()
    return subscriptions.some(sub => sub.userId === authorId)
  }

  private static hasInviteAccess(viewerUserId: string, memoryId: string): boolean {
    // Check invite access (implementation depends on invite system)
    const invites = this.getMemoryInvites(memoryId)
    return invites.includes(viewerUserId)
  }

  private static getMemoryInvites(memoryId: string): string[] {
    // Get invites for a specific memory
    const data = localStorage.getItem('etherith_memory_invites')
    const invites = data ? JSON.parse(data) : {}
    return invites[memoryId] || []
  }

  // Data export controls

  static sanitizeForExport(memories: Memory[], exportLevel: 'public' | 'personal' | 'full'): Memory[] {
    return memories.map(memory => {
      const sanitized = { ...memory }

      switch (exportLevel) {
        case 'public':
          // Only include public memories, remove sensitive data
          if (memory.visibility === 'private') return null
          sanitized.fileData = undefined // Remove file data for size
          break

        case 'personal':
          // Include all user's memories but sanitize sensitive content
          const safetyFlags = this.checkContentSafety(memory)
          if (safetyFlags.length > 0) {
            sanitized.content = '[Content removed for safety]'
            sanitized.memoryNote = '[Note removed for safety]'
          }
          break

        case 'full':
          // Include everything as-is
          break
      }

      return sanitized
    }).filter(Boolean) as Memory[]
  }

  // Privacy audit and compliance

  static generatePrivacyReport(): {
    totalMemories: number
    publicMemories: number
    privateMemories: number
    memoriesWithSensitiveContent: number
    sharedData: {
      profileShared: boolean
      contactShared: boolean
      locationShared: boolean
    }
    subscriptions: number
    dataSize: string
    lastAudit: number
  } {
    const memories = LocalStorage.getAllMemories()
    const config = RegistryManager.getConfig()
    const subscriptions = RegistryManager.getSubscriptions()

    const publicMemories = memories.filter(m => m.visibility === 'public')
    const memoriesWithFlags = memories.filter(m => this.checkContentSafety(m).length > 0)

    const totalSize = memories.reduce((sum, m) => sum + (m.fileSize || 0), 0)

    return {
      totalMemories: memories.length,
      publicMemories: publicMemories.length,
      privateMemories: memories.length - publicMemories.length,
      memoriesWithSensitiveContent: memoriesWithFlags.length,
      sharedData: {
        profileShared: config.privacy.shareProfile,
        contactShared: config.privacy.shareContactInfo,
        locationShared: config.privacy.shareLocation
      },
      subscriptions: subscriptions.length,
      dataSize: this.formatFileSize(totalSize),
      lastAudit: Date.now()
    }
  }

  // User data rights (GDPR-style)

  static exportUserData(): {
    profile: any
    memories: Memory[]
    subscriptions: any[]
    config: any
    stats: any
    exportDate: number
  } {
    return {
      profile: LocalStorage.getUserProfile(),
      memories: LocalStorage.getAllMemories(),
      subscriptions: RegistryManager.getSubscriptions(),
      config: RegistryManager.getConfig(),
      stats: RegistryManager.getStats(),
      exportDate: Date.now()
    }
  }

  static deleteAllUserData(): void {
    if (confirm('Are you sure you want to delete ALL user data? This cannot be undone.')) {
      // Clear all local storage
      LocalStorage.clearAllData()
      RegistryManager.clearAllRegistryData()

      // Note: IPFS data cannot be deleted, only unpinned
      console.warn('Note: Data on IPFS cannot be deleted, only unpinned from your account')
    }
  }

  // Utility methods

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}