export interface Memory {
  id: string
  title: string
  content: string
  memoryNote: string
  visibility: 'public' | 'private'
  fileType: 'text' | 'document' | 'audio' | 'image' | 'video'
  fileData?: string // Base64 encoded file data
  fileName?: string
  fileSize?: number
  mimeType?: string
  ipfsCid?: string
  ipfsUrl?: string // Public IPFS URL
  ipfsGatewayUrl?: string // Pinata gateway URL
  thumbnailUrl?: string // Thumbnail URL for videos and images
  timestamp: number
  authorId: string
  authorName: string
  authorAvatar?: string
  authorContact?: string
  tags?: string[]
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  avatar?: string
  contactLink?: string
  createdAt: number
  memoriesCount: number
}

export interface MemoryUpload {
  title: string
  content: string
  memoryNote: string
  visibility: 'public' | 'private'
  file?: File
  tags?: string[]
}

export interface SearchFilters {
  query?: string
  fileType?: string
  visibility?: 'public' | 'private'
  dateFrom?: number
  dateTo?: number
  authorId?: string
  tags?: string[]
}

export interface MemoryReaction {
  id: string
  memoryId: string
  userId: string
  username: string
  type: 'heart' | 'thumbs-up' | 'thumbs-down' | 'laugh' | 'sad'
  timestamp: number
}

export interface MemoryComment {
  id: string
  memoryId: string
  userId: string
  username: string
  userAvatar?: string
  content: string
  timestamp: number
}

export interface MemoryEngagement {
  memoryId: string
  reactions: MemoryReaction[]
  comments: MemoryComment[]
  repostCount: number
  shareCount: number
}

