export interface AIAnalysis {
  title: string
  tags: string[]
  sentiment: {
    sentiment: 'positive' | 'negative' | 'neutral'
    score: number
    confidence: number
  }
  memoryNote: string
  categories: string
  confidence: number
  aiGenerated: boolean
  timestamp: number
  fileInfo?: {
    name: string
    type: string
    mimeType: string
    size: number
  } | null
}

export interface AIAnalysisResponse {
  success: boolean
  analysis: AIAnalysis
  original: {
    title: string
    memoryNote: string
    content: string
  }
  error?: string
}

export interface AIAnalysisRequest {
  content?: string
  title?: string
  memoryNote?: string
  fileType?: 'text' | 'document' | 'audio' | 'image' | 'video'
  fileName?: string
  file?: File
}
