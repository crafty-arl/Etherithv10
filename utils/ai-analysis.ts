import { AIAnalysisRequest, AIAnalysisResponse } from '../types/ai-analysis'

export class AIAnalysisService {
  private static readonly WORKER_URL = process.env.NEXT_PUBLIC_AI_WORKER_URL || 'https://ai-memory-analyzer.carl-6e7.workers.dev'

  /**
   * Analyze memory content and generate metadata using AI
   */
  static async analyzeMemory(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      console.log('🤖 AI Analysis Service: Starting analysis...')
      console.log('🤖 Worker URL:', this.WORKER_URL)
      console.log('🤖 Request data:', {
        hasFile: !!request.file,
        fileName: request.fileName,
        fileType: request.fileType,
        title: request.title,
        content: request.content?.substring(0, 100) + '...',
        memoryNote: request.memoryNote?.substring(0, 100) + '...'
      })

      const formData = new FormData()
      
      // Add file if provided
      if (request.file) {
        formData.append('file', request.file)
        console.log('🤖 Added file to FormData:', request.file.name, request.file.size, 'bytes')
      }
      
      // Add other fields
      if (request.content) formData.append('content', request.content)
      if (request.title) formData.append('title', request.title)
      if (request.memoryNote) formData.append('memoryNote', request.memoryNote)
      if (request.fileType) formData.append('fileType', request.fileType)
      if (request.fileName) formData.append('fileName', request.fileName)

      console.log('🤖 Sending request to AI worker...')
      const response = await fetch(this.WORKER_URL, {
        method: 'POST',
        body: formData,
      })

      console.log('🤖 AI worker response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🤖 AI worker error response:', errorText)
        throw new Error(`AI analysis failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      console.log('🤖 AI worker success response:', result)
      return result
    } catch (error) {
      console.error('🤖 AI Analysis Service Error:', error)
      throw new Error(`Failed to analyze memory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyze memory content with fallback to basic metadata
   */
  static async analyzeMemoryWithFallback(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      return await this.analyzeMemory(request)
    } catch (error) {
      console.warn('AI analysis failed, using fallback:', error)
      
      // Fallback to basic analysis
      return {
        success: true,
        analysis: {
          title: request.title || this.generateBasicTitle(request.content || ''),
          tags: this.generateBasicTags(request.content || ''),
          sentiment: {
            sentiment: 'neutral' as const,
            score: 0.5,
            confidence: 0
          },
          memoryNote: request.memoryNote || 'This memory captures an important moment worth preserving.',
          categories: 'personal',
          confidence: 0,
          aiGenerated: false,
          timestamp: Date.now()
        },
        original: {
          title: request.title || '',
          memoryNote: request.memoryNote || '',
          content: (request.content || '').substring(0, 100) + '...'
        }
      }
    }
  }

  /**
   * Generate a basic title from content (fallback)
   */
  private static generateBasicTitle(content: string): string {
    const words = content.trim().split(/\s+/)
    if (words.length <= 5) {
      return words.join(' ')
    }
    return words.slice(0, 5).join(' ') + '...'
  }

  /**
   * Generate basic tags from content (fallback)
   */
  private static generateBasicTags(content: string): string[] {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ])

    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 5)

    return Array.from(new Set(words)) // Remove duplicates
  }

  /**
   * Check if AI analysis is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      console.log('🤖 Checking AI worker availability at:', this.WORKER_URL)
      const response = await fetch(this.WORKER_URL, {
        method: 'OPTIONS',
      })
      console.log('🤖 AI worker availability check:', response.status, response.statusText)
      return response.ok
    } catch (error) {
      console.error('🤖 AI worker availability check failed:', error)
      return false
    }
  }

  /**
   * Test the AI worker with a simple request
   */
  static async testWorker(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🤖 Testing AI worker...')
      const formData = new FormData()
      formData.append('content', 'This is a test memory for AI analysis')
      formData.append('title', 'Test Memory')
      
      const response = await fetch(this.WORKER_URL, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        console.log('🤖 AI worker test successful:', result)
        return { success: true }
      } else {
        const errorText = await response.text()
        console.error('🤖 AI worker test failed:', response.status, errorText)
        return { success: false, error: `${response.status}: ${errorText}` }
      }
    } catch (error) {
      console.error('🤖 AI worker test error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
