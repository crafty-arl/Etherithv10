/**
 * DXOS Identity Management Utilities
 * Provides high-level identity operations and Discord integration
 */

import { dxosClient, UserProfile, createUserProfile } from '../client'

export interface IdentityOptions {
  displayName?: string
  discordData?: {
    discordId: string
    username: string
    avatar?: string
    email?: string
  }
  preferences?: {
    theme?: string
    privacy?: string
    notifications?: boolean
  }
}

export interface IdentityValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Identity Service for managing DXOS identities with enhanced features
 */
export class IdentityService {
  /**
   * Create a new DXOS identity with enhanced profile
   */
  static async createEnhancedIdentity(options: IdentityOptions): Promise<{
    identity: any
    profile: UserProfile
  }> {
    const { displayName, discordData, preferences } = options

    // Create DXOS identity
    const identity = await dxosClient.createIdentity(displayName)

    // Create enhanced user profile
    const profile = createUserProfile({
      id: identity.id,
      displayName: displayName || identity.displayName,
      joinedAt: Date.now(),
      lastActive: Date.now(),
      // Discord integration
      ...(discordData && {
        discordId: discordData.discordId,
        discordUsername: discordData.username,
        avatar: discordData.avatar,
        email: discordData.email
      }),
      // User preferences
      preferences: {
        theme: 'system',
        privacy: 'friends',
        notifications: true,
        ...preferences
      },
      // Initialize social stats
      socialStats: {
        followers: 0,
        following: 0,
        posts: 0,
        likes: 0
      }
    })

    return { identity, profile }
  }

  /**
   * Validate identity data
   */
  static validateIdentity(identity: any): IdentityValidation {
    const errors: string[] = []
    const warnings: string[] = []

    if (!identity) {
      errors.push('Identity is required')
      return { isValid: false, errors, warnings }
    }

    if (!identity.id) {
      errors.push('Identity must have an ID')
    }

    if (!identity.displayName || identity.displayName.trim().length === 0) {
      errors.push('Identity must have a display name')
    }

    if (identity.displayName && identity.displayName.length > 50) {
      warnings.push('Display name is quite long and may be truncated in some views')
    }

    if (identity.displayName && identity.displayName.length < 2) {
      warnings.push('Display name is very short and may not be descriptive enough')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Update identity profile
   */
  static async updateIdentityProfile(
    space: any,
    identityId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile | null> {
    try {
      // Query existing profile
      const profiles = await dxosClient.queryObjects<UserProfile>(space, { id: identityId })

      if (profiles.length === 0) {
        console.warn('No profile found for identity:', identityId)
        return null
      }

      const existingProfile = profiles[0]

      // Merge updates
      const updatedProfile: UserProfile = {
        ...existingProfile,
        ...updates,
        lastActive: Date.now()
      }

      // Remove old profile and add updated one
      await dxosClient.removeObject(space, existingProfile)
      await dxosClient.addObject(space, updatedProfile)

      return updatedProfile
    } catch (error) {
      console.error('Failed to update identity profile:', error)
      throw error
    }
  }

  /**
   * Sync with Discord profile
   */
  static async syncWithDiscord(
    space: any,
    identityId: string,
    discordData: {
      discordId: string
      username: string
      avatar?: string
      email?: string
    }
  ): Promise<UserProfile | null> {
    return this.updateIdentityProfile(space, identityId, {
      discordId: discordData.discordId,
      discordUsername: discordData.username,
      avatar: discordData.avatar,
      email: discordData.email
    })
  }

  /**
   * Get identity reputation score
   */
  static calculateReputationScore(profile: UserProfile): number {
    const stats = profile.socialStats
    if (!stats) return 0

    // Simple reputation calculation
    const followersWeight = Math.min(stats.followers * 0.1, 10)
    const postsWeight = Math.min(stats.posts * 0.05, 5)
    const likesWeight = Math.min(stats.likes * 0.01, 5)

    return Math.round(followersWeight + postsWeight + likesWeight)
  }

  /**
   * Check if identity is trusted
   */
  static isTrustedIdentity(profile: UserProfile): boolean {
    const reputation = this.calculateReputationScore(profile)
    const hasDiscordLink = !!profile.discordId
    const isEstablished = profile.joinedAt < Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days old

    return reputation >= 5 && hasDiscordLink && isEstablished
  }

  /**
   * Generate identity backup data
   */
  static generateIdentityBackup(identity: any, profile: UserProfile): {
    timestamp: number
    identity: any
    profile: UserProfile
    checksum: string
  } {
    const backupData = {
      timestamp: Date.now(),
      identity,
      profile
    }

    // Simple checksum (in production, use proper crypto)
    const checksum = btoa(JSON.stringify(backupData)).slice(-16)

    return {
      ...backupData,
      checksum
    }
  }

  /**
   * Restore identity from backup
   */
  static async restoreIdentityFromBackup(
    backupData: any,
    space: any
  ): Promise<{ identity: any; profile: UserProfile }> {
    // Validate backup
    if (!backupData.identity || !backupData.profile || !backupData.checksum) {
      throw new Error('Invalid backup data')
    }

    // Verify checksum
    const testData = {
      timestamp: backupData.timestamp,
      identity: backupData.identity,
      profile: backupData.profile
    }
    const expectedChecksum = btoa(JSON.stringify(testData)).slice(-16)

    if (expectedChecksum !== backupData.checksum) {
      throw new Error('Backup data corruption detected')
    }

    // Restore profile to space
    await dxosClient.addObject(space, backupData.profile)

    return {
      identity: backupData.identity,
      profile: backupData.profile
    }
  }
}

/**
 * Hook for identity utilities
 */
export function useIdentityUtils() {
  return {
    createEnhancedIdentity: IdentityService.createEnhancedIdentity,
    validateIdentity: IdentityService.validateIdentity,
    updateIdentityProfile: IdentityService.updateIdentityProfile,
    syncWithDiscord: IdentityService.syncWithDiscord,
    calculateReputationScore: IdentityService.calculateReputationScore,
    isTrustedIdentity: IdentityService.isTrustedIdentity,
    generateIdentityBackup: IdentityService.generateIdentityBackup,
    restoreIdentityFromBackup: IdentityService.restoreIdentityFromBackup
  }
}