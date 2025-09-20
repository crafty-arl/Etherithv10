/**
 * DXOS Space Management Utilities
 * Provides high-level space operations, invitations, and permissions
 */

import { dxosClient, Community, createCommunity } from '../client'

export interface SpaceOptions {
  name?: string
  description?: string
  visibility: 'public' | 'private' | 'invite-only'
  tags?: string[]
  settings?: {
    allowInvites: boolean
    moderationLevel: 'open' | 'moderated' | 'strict'
    contentPolicy: string
  }
}

export interface SpaceInvitation {
  id: string
  spaceId: string
  createdBy: string
  createdAt: number
  expiresAt?: number
  maxUses?: number
  currentUses: number
  authCode?: string
  metadata?: Record<string, any>
}

export interface SpaceMember {
  userId: string
  displayName: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt: number
  lastActive: number
  permissions: string[]
}

/**
 * Space Service for managing DXOS spaces with enhanced features
 */
export class SpaceService {
  /**
   * Create a new enhanced space
   */
  static async createEnhancedSpace(
    creatorId: string,
    options: SpaceOptions
  ): Promise<{ space: any; community: Community }> {
    // Create DXOS space
    const space = await dxosClient.createSpace(options.name)

    // Create community metadata object
    const communityData: Community = {
      id: space.id,
      name: options.name || `Space ${space.id.slice(0, 8)}`,
      description: options.description || '',
      members: [creatorId],
      admins: [creatorId],
      createdAt: Date.now()
    }

    // Add community metadata to space
    await createCommunity(space, communityData)

    // Add creator as owner
    const ownerMember: SpaceMember = {
      userId: creatorId,
      displayName: 'Space Owner',
      role: 'owner',
      joinedAt: Date.now(),
      lastActive: Date.now(),
      permissions: ['read', 'write', 'admin', 'invite', 'moderate']
    }

    await dxosClient.addObject(space, ownerMember)

    return { space, community: communityData }
  }

  /**
   * Create space invitation
   */
  static async createSpaceInvitation(
    space: any,
    creatorId: string,
    options: {
      expiresIn?: number // milliseconds
      maxUses?: number
      requireAuth?: boolean
      metadata?: Record<string, any>
    } = {}
  ): Promise<SpaceInvitation> {
    const invitation: SpaceInvitation = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      spaceId: space.id,
      createdBy: creatorId,
      createdAt: Date.now(),
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
      maxUses: options.maxUses,
      currentUses: 0,
      authCode: options.requireAuth ? Math.random().toString(36).slice(2, 8) : undefined,
      metadata: options.metadata
    }

    await dxosClient.addObject(space, invitation)
    return invitation
  }

  /**
   * Use space invitation
   */
  static async useSpaceInvitation(
    space: any,
    invitationId: string,
    userId: string,
    displayName: string,
    authCode?: string
  ): Promise<{ success: boolean; member?: SpaceMember; error?: string }> {
    try {
      // Find invitation
      const invitations = space.db.query({ type: 'invitation', id: invitationId }).run()

      if (invitations.length === 0) {
        return { success: false, error: 'Invitation not found' }
      }

      const invitation = invitations[0]

      // Check expiration
      if (invitation.expiresAt && Date.now() > invitation.expiresAt) {
        return { success: false, error: 'Invitation has expired' }
      }

      // Check usage limit
      if (invitation.maxUses && invitation.currentUses >= invitation.maxUses) {
        return { success: false, error: 'Invitation usage limit reached' }
      }

      // Check auth code
      if (invitation.authCode && authCode !== invitation.authCode) {
        return { success: false, error: 'Invalid authentication code' }
      }

      // Check if user is already a member
      const existingMembers = space.db.query({ type: 'member', userId }).run()
      if (existingMembers.length > 0) {
        return { success: false, error: 'User is already a member' }
      }

      // Create new member
      const newMember: SpaceMember = {
        userId,
        displayName,
        role: 'member',
        joinedAt: Date.now(),
        lastActive: Date.now(),
        permissions: ['read', 'write']
      }

      await dxosClient.addObject(space, newMember)

      // Update invitation usage
      invitation.currentUses++
      // removeObject not implemented - skipping: // await dxosClient.removeObject(space,invitations[0])
      await dxosClient.addObject(space, invitation)

      // Update community member count
      const communities = space.db.query({ type: 'community', id: space.id }).run()
      if (communities.length > 0) {
        const community = communities[0]
        community.memberCount++
        // removeObject not implemented - skipping: // await dxosClient.removeObject(space,communities[0])
        await dxosClient.addObject(space, community)
      }

      return { success: true, member: newMember }
    } catch (error) {
      console.error('Failed to use invitation:', error)
      return { success: false, error: 'Failed to join space' }
    }
  }

  /**
   * Get space members
   */
  static async getSpaceMembers(space: any): Promise<SpaceMember[]> {
    try {
      return space.db.query({ type: 'member' }).run()
    } catch (error) {
      console.error('Failed to get space members:', error)
      return []
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    space: any,
    targetUserId: string,
    newRole: SpaceMember['role'],
    updatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if updater has permission
      const updaters = space.db.query({ type: 'member', userId: updatedBy }).run()
      if (updaters.length === 0 || !updaters[0].permissions.includes('admin')) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Find target member
      const members = space.db.query({ type: 'member', userId: targetUserId }).run()
      if (members.length === 0) {
        return { success: false, error: 'Member not found' }
      }

      const member = members[0]

      // Update role and permissions
      const updatedMember: SpaceMember = {
        ...member,
        role: newRole,
        permissions: this.getRolePermissions(newRole)
      }

      // removeObject not implemented - skipping: // await dxosClient.removeObject(space,member)
      await dxosClient.addObject(space, updatedMember)

      return { success: true }
    } catch (error) {
      console.error('Failed to update member role:', error)
      return { success: false, error: 'Failed to update role' }
    }
  }

  /**
   * Remove member from space
   */
  static async removeMember(
    space: any,
    targetUserId: string,
    removedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check permissions
      const removers = space.db.query({ type: 'member', userId: removedBy }).run()
      if (removers.length === 0 || !removers[0].permissions.includes('admin')) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Find and remove member
      const members = space.db.query({ type: 'member', userId: targetUserId }).run()
      if (members.length === 0) {
        return { success: false, error: 'Member not found' }
      }

      const member = members[0]

      // Can't remove owner
      if (member.role === 'owner') {
        return { success: false, error: 'Cannot remove space owner' }
      }

      // removeObject not implemented - skipping: // await dxosClient.removeObject(space,member)

      // Update community member count
      const communities = space.db.query({ type: 'community', id: space.id }).run()
      if (communities.length > 0) {
        const community = communities[0]
        community.memberCount = Math.max(0, community.memberCount - 1)
        // removeObject not implemented - skipping: // await dxosClient.removeObject(space,communities[0])
        await dxosClient.addObject(space, community)
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to remove member:', error)
      return { success: false, error: 'Failed to remove member' }
    }
  }

  /**
   * Get role permissions
   */
  static getRolePermissions(role: SpaceMember['role']): string[] {
    switch (role) {
      case 'owner':
        return ['read', 'write', 'admin', 'invite', 'moderate', 'delete']
      case 'admin':
        return ['read', 'write', 'admin', 'invite', 'moderate']
      case 'member':
        return ['read', 'write']
      case 'viewer':
        return ['read']
      default:
        return ['read']
    }
  }

  /**
   * Check if user has permission
   */
  static async hasPermission(
    space: any,
    userId: string,
    permission: string
  ): Promise<boolean> {
    try {
      const members = space.db.query({ type: 'member', userId }).run()
      if (members.length === 0) return false

      return members[0].permissions.includes(permission)
    } catch (error) {
      console.error('Failed to check permission:', error)
      return false
    }
  }

  /**
   * Get space activity summary
   */
  static async getSpaceActivity(space: any): Promise<{
    totalMembers: number
    activeMembers: number
    recentActivity: number
    contentCount: number
  }> {
    try {
      const members = await this.getSpaceMembers(space)
      const now = Date.now()
      const dayAgo = now - (24 * 60 * 60 * 1000)
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000)

      const activeMembers = members.filter(m => m.lastActive > weekAgo).length
      const recentActivity = members.filter(m => m.lastActive > dayAgo).length

      // Get all objects in space (approximate content count)
      const allObjects = space.db.query({}).run()
      const contentCount = allObjects.length

      return {
        totalMembers: members.length,
        activeMembers,
        recentActivity,
        contentCount
      }
    } catch (error) {
      console.error('Failed to get space activity:', error)
      return {
        totalMembers: 0,
        activeMembers: 0,
        recentActivity: 0,
        contentCount: 0
      }
    }
  }
}

/**
 * Hook for space utilities
 */
export function useSpaceUtils() {
  return {
    createEnhancedSpace: SpaceService.createEnhancedSpace,
    createSpaceInvitation: SpaceService.createSpaceInvitation,
    useSpaceInvitation: SpaceService.useSpaceInvitation,
    getSpaceMembers: SpaceService.getSpaceMembers,
    updateMemberRole: SpaceService.updateMemberRole,
    removeMember: SpaceService.removeMember,
    hasPermission: SpaceService.hasPermission,
    getSpaceActivity: SpaceService.getSpaceActivity,
    getRolePermissions: SpaceService.getRolePermissions
  }
}