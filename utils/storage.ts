import { Memory, UserProfile, MemoryReaction, MemoryComment, MemoryEngagement } from '../types/memory'

const STORAGE_KEYS = {
  MEMORIES: 'etherith_memories',
  USER_PROFILE: 'etherith_user_profile',
  SETTINGS: 'etherith_settings',
  REACTIONS: 'etherith_reactions',
  COMMENTS: 'etherith_comments',
  ENGAGEMENTS: 'etherith_engagements'
}

export class LocalStorage {
  // Memory operations
  static saveMemory(memory: Memory): void {
    const memories = this.getAllMemories()
    const existingIndex = memories.findIndex(m => m.id === memory.id)
    
    if (existingIndex >= 0) {
      memories[existingIndex] = memory
    } else {
      memories.push(memory)
    }
    
    localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories))
  }

  static getAllMemories(): Memory[] {
    const data = localStorage.getItem(STORAGE_KEYS.MEMORIES)
    return data ? JSON.parse(data) : []
  }

  static getPublicMemories(): Memory[] {
    return this.getAllMemories().filter(memory => memory.visibility === 'public')
  }

  static getMemoriesByUser(userId: string): Memory[] {
    return this.getAllMemories().filter(memory => memory.authorId === userId)
  }

  static getMemoryById(id: string): Memory | null {
    const memories = this.getAllMemories()
    return memories.find(memory => memory.id === id) || null
  }

  static deleteMemory(id: string): boolean {
    const memories = this.getAllMemories()
    const filteredMemories = memories.filter(memory => memory.id !== id)
    
    if (filteredMemories.length < memories.length) {
      localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(filteredMemories))
      return true
    }
    return false
  }

  // User profile operations
  static saveUserProfile(profile: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile))
  }

  static getUserProfile(): UserProfile | null {
    const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE)
    return data ? JSON.parse(data) : null
  }

  static updateUserProfile(updates: Partial<UserProfile>): void {
    const profile = this.getUserProfile()
    if (profile) {
      const updatedProfile = { ...profile, ...updates }
      this.saveUserProfile(updatedProfile)
    }
  }

  // Search functionality
  static searchMemories(query: string, filters?: {
    fileType?: string
    visibility?: 'public' | 'private'
    authorId?: string
    tags?: string[]
  }): Memory[] {
    let memories = this.getAllMemories()

    // Apply visibility filter
    if (filters?.visibility) {
      memories = memories.filter(memory => memory.visibility === filters.visibility)
    } else if (!filters?.authorId) {
      // If no specific user, only show public memories
      memories = memories.filter(memory => memory.visibility === 'public')
    }

    // Apply file type filter
    if (filters?.fileType) {
      memories = memories.filter(memory => memory.fileType === filters.fileType)
    }

    // Apply author filter
    if (filters?.authorId) {
      memories = memories.filter(memory => memory.authorId === filters.authorId)
    }

    // Apply tags filter
    if (filters?.tags && filters.tags.length > 0) {
      memories = memories.filter(memory => 
        memory.tags && memory.tags.some(tag => filters.tags!.includes(tag))
      )
    }

    // Apply text search
    if (query) {
      const searchQuery = query.toLowerCase()
      memories = memories.filter(memory => 
        memory.title.toLowerCase().includes(searchQuery) ||
        memory.content.toLowerCase().includes(searchQuery) ||
        memory.memoryNote.toLowerCase().includes(searchQuery) ||
        (memory.tags && memory.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
      )
    }

    // Sort by timestamp (newest first)
    return memories.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Utility functions
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  static getStorageStats(): {
    totalMemories: number
    publicMemories: number
    privateMemories: number
    totalSize: number
  } {
    const memories = this.getAllMemories()
    const publicMemories = memories.filter(m => m.visibility === 'public').length
    const privateMemories = memories.filter(m => m.visibility === 'private').length
    const totalSize = memories.reduce((sum, memory) => sum + (memory.fileSize || 0), 0)

    return {
      totalMemories: memories.length,
      publicMemories,
      privateMemories,
      totalSize
    }
  }

  // Social Media Interaction Methods

  // Reaction operations
  static addReaction(memoryId: string, userId: string, username: string, type: MemoryReaction['type']): void {
    const reactions = this.getAllReactions()

    // Remove existing reaction from this user on this memory
    const filteredReactions = reactions.filter(r => !(r.memoryId === memoryId && r.userId === userId))

    // Add new reaction
    const newReaction: MemoryReaction = {
      id: this.generateId(),
      memoryId,
      userId,
      username,
      type,
      timestamp: Date.now()
    }

    filteredReactions.push(newReaction)
    localStorage.setItem(STORAGE_KEYS.REACTIONS, JSON.stringify(filteredReactions))
  }

  static removeReaction(memoryId: string, userId: string): void {
    const reactions = this.getAllReactions()
    const filteredReactions = reactions.filter(r => !(r.memoryId === memoryId && r.userId === userId))
    localStorage.setItem(STORAGE_KEYS.REACTIONS, JSON.stringify(filteredReactions))
  }

  static getAllReactions(): MemoryReaction[] {
    const data = localStorage.getItem(STORAGE_KEYS.REACTIONS)
    return data ? JSON.parse(data) : []
  }

  static getReactionsForMemory(memoryId: string): MemoryReaction[] {
    return this.getAllReactions().filter(r => r.memoryId === memoryId)
  }

  static getUserReactionForMemory(memoryId: string, userId: string): MemoryReaction | null {
    const reactions = this.getAllReactions()
    return reactions.find(r => r.memoryId === memoryId && r.userId === userId) || null
  }

  // Comment operations
  static addComment(memoryId: string, userId: string, username: string, userAvatar: string | undefined, content: string): MemoryComment {
    const comments = this.getAllComments()

    const newComment: MemoryComment = {
      id: this.generateId(),
      memoryId,
      userId,
      username,
      userAvatar,
      content,
      timestamp: Date.now()
    }

    comments.push(newComment)
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments))
    return newComment
  }

  static deleteComment(commentId: string, userId: string): boolean {
    const comments = this.getAllComments()
    const comment = comments.find(c => c.id === commentId)

    // Only allow user to delete their own comments
    if (!comment || comment.userId !== userId) {
      return false
    }

    const filteredComments = comments.filter(c => c.id !== commentId)
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(filteredComments))
    return true
  }

  static getAllComments(): MemoryComment[] {
    const data = localStorage.getItem(STORAGE_KEYS.COMMENTS)
    return data ? JSON.parse(data) : []
  }

  static getCommentsForMemory(memoryId: string): MemoryComment[] {
    return this.getAllComments()
      .filter(c => c.memoryId === memoryId)
      .sort((a, b) => a.timestamp - b.timestamp) // Oldest first for comments
  }

  // Engagement aggregation
  static getMemoryEngagement(memoryId: string): MemoryEngagement {
    const reactions = this.getReactionsForMemory(memoryId)
    const comments = this.getCommentsForMemory(memoryId)

    return {
      memoryId,
      reactions,
      comments,
      repostCount: 0, // Not implemented yet
      shareCount: 0   // Not implemented yet
    }
  }

  static getReactionCounts(memoryId: string): Record<MemoryReaction['type'], number> {
    const reactions = this.getReactionsForMemory(memoryId)
    const counts: Record<MemoryReaction['type'], number> = {
      heart: 0,
      'thumbs-up': 0,
      'thumbs-down': 0,
      laugh: 0,
      sad: 0
    }

    reactions.forEach(reaction => {
      counts[reaction.type]++
    })

    return counts
  }

  // Clear all data (for testing/reset)
  static clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.MEMORIES)
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE)
    localStorage.removeItem(STORAGE_KEYS.SETTINGS)
    localStorage.removeItem(STORAGE_KEYS.REACTIONS)
    localStorage.removeItem(STORAGE_KEYS.COMMENTS)
    localStorage.removeItem(STORAGE_KEYS.ENGAGEMENTS)
  }

  // Clear large file data to free up localStorage space
  static clearLargeFileData(): void {
    const memories = this.getAllMemories()
    const updatedMemories = memories.map(memory => {
      // Remove fileData for files larger than 1MB
      if (memory.fileData && memory.fileSize && memory.fileSize > 1024 * 1024) {
        console.log(`Clearing large file data for memory: ${memory.title}`)
        return { ...memory, fileData: undefined }
      }
      return memory
    })
    
    localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(updatedMemories))
    console.log('Cleared large file data from localStorage')
  }

  // Get storage usage statistics
  static getStorageUsage(): {
    totalSize: number
    memoriesCount: number
    largeFilesCount: number
    localStorageUsed: number
  } {
    const memories = this.getAllMemories()
    const largeFiles = memories.filter(m => m.fileSize && m.fileSize > 1024 * 1024)
    
    // Estimate localStorage usage
    const memoriesData = localStorage.getItem(STORAGE_KEYS.MEMORIES) || ''
    const profileData = localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || ''
    const settingsData = localStorage.getItem(STORAGE_KEYS.SETTINGS) || ''
    
    return {
      totalSize: memories.reduce((sum, m) => sum + (m.fileSize || 0), 0),
      memoriesCount: memories.length,
      largeFilesCount: largeFiles.length,
      localStorageUsed: memoriesData.length + profileData.length + settingsData.length
    }
  }
}

