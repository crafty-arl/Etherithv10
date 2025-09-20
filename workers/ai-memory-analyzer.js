/**
 * AI Memory Analyzer Worker
 * Auto-fills metadata for memory uploads using Cloudflare Workers AI
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const formData = await request.formData()
      const file = formData.get('file')
      const content = formData.get('content')
      const title = formData.get('title')
      const memoryNote = formData.get('memoryNote')
      const fileType = formData.get('fileType')
      const fileName = formData.get('fileName')

      if (!file && !content) {
        return new Response(JSON.stringify({ error: 'File or content is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Process file if provided
      let fileContent = content
      let detectedFileType = fileType
      let detectedFileName = fileName

      if (file) {
        detectedFileName = file.name || 'unknown'
        detectedFileType = getFileTypeFromMime(file.type) || 'document'
        
        // Convert file to text for analysis
        if (file.type.startsWith('text/') || file.type === 'application/json') {
          fileContent = await file.text()
        } else if (file.type === 'application/pdf') {
          // For PDFs, we'll use the markdown conversion feature
          try {
            const markdownResult = await env.AI.toMarkdown([{
              name: detectedFileName,
              blob: file
            }])
            fileContent = markdownResult[0]?.data || content
          } catch (error) {
            console.warn('PDF conversion failed, using filename for analysis:', error)
            fileContent = `File: ${detectedFileName} (${file.type})`
          }
        } else {
          // For other file types, create a description
          fileContent = `File: ${detectedFileName} (${file.type}) - ${content || 'No additional description provided'}`
        }
      }

      // Analyze content with multiple AI models in parallel
      const [
        generatedTitle,
        extractedTags,
        sentimentAnalysis,
        generatedMemoryNote,
        contentCategories
      ] = await Promise.all([
        generateTitle(fileContent, title, env),
        extractTags(fileContent, env),
        analyzeSentiment(fileContent, env),
        generateMemoryNote(fileContent, memoryNote, env),
        categorizeContent(fileContent, detectedFileType, env)
      ])

      const analysis = {
        title: generatedTitle || title,
        tags: extractedTags || [],
        sentiment: sentimentAnalysis,
        memoryNote: generatedMemoryNote || memoryNote,
        categories: contentCategories,
        confidence: calculateConfidence(sentimentAnalysis, extractedTags),
        aiGenerated: true,
        timestamp: Date.now(),
        fileInfo: file ? {
          name: detectedFileName,
          type: detectedFileType,
          mimeType: file.type,
          size: file.size
        } : null
      }

      return new Response(JSON.stringify({
        success: true,
        analysis,
        original: { 
          title, 
          memoryNote, 
          content: fileContent.substring(0, 100) + '...',
          fileName: detectedFileName,
          fileType: detectedFileType
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })

    } catch (error) {
      console.error('AI Memory Analyzer Error:', error)
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Analysis failed'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
  }
}

/**
 * Generate a meaningful title from content
 */
async function generateTitle(content, existingTitle, env) {
  if (existingTitle && existingTitle.trim()) {
    return existingTitle.trim()
  }

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, meaningful titles for memory content. Generate a title that captures the essence of the content in 3-8 words. Return only the title, no quotes or extra text.'
        },
        {
          role: 'user',
          content: `Create a title for this memory content:\n\n${content.substring(0, 1000)}`
        }
      ]
    })

    return response.response?.trim() || 'Untitled Memory'
  } catch (error) {
    console.error('Title generation error:', error)
    return 'Untitled Memory'
  }
}

/**
 * Extract relevant tags from content
 */
async function extractTags(content, env) {
  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts relevant tags from content. Return 3-5 single-word tags separated by commas. Use lowercase, no spaces, and make them descriptive. Examples: technology, personal, work, family, travel, learning, creative, important, milestone, achievement'
        },
        {
          role: 'user',
          content: `Extract 3-5 relevant tags from this content:\n\n${content.substring(0, 1000)}`
        }
      ]
    })

    const tags = response.response
      ?.split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .slice(0, 5) || []

    return tags
  } catch (error) {
    console.error('Tag extraction error:', error)
    return []
  }
}

/**
 * Analyze sentiment of the content
 */
async function analyzeSentiment(content, env) {
  try {
    const response = await env.AI.run('@cf/huggingface/distilbert-sst-2-int8', {
      text: content.substring(0, 1000)
    })

    // Convert to 0-1 scale
    const positiveScore = response[0]?.score || 0.5
    const sentiment = positiveScore > 0.5 ? 'positive' : 'negative'
    
    return {
      sentiment,
      score: positiveScore,
      confidence: Math.abs(positiveScore - 0.5) * 2
    }
  } catch (error) {
    console.error('Sentiment analysis error:', error)
    return {
      sentiment: 'neutral',
      score: 0.5,
      confidence: 0
    }
  }
}

/**
 * Generate a meaningful memory note explaining significance
 */
async function generateMemoryNote(content, existingNote, env) {
  if (existingNote && existingNote.trim()) {
    return existingNote.trim()
  }

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that explains why memories are significant and worth preserving. Write 1-2 sentences explaining the importance, emotional value, or significance of this memory. Be thoughtful and personal.'
        },
        {
          role: 'user',
          content: `Explain why this memory is significant and worth preserving:\n\n${content.substring(0, 1000)}`
        }
      ]
    })

    return response.response?.trim() || 'This memory captures an important moment worth preserving.'
  } catch (error) {
    console.error('Memory note generation error:', error)
    return 'This memory captures an important moment worth preserving.'
  }
}

/**
 * Categorize content for better organization
 */
async function categorizeContent(content, fileType, env) {
  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that categorizes content. Choose the most appropriate category from: personal, work, family, travel, learning, creative, milestone, achievement, reflection, idea, experience, memory, story, thought, goal, dream, relationship, hobby, health, finance, education, career, adventure, celebration, challenge, growth, inspiration, wisdom, lesson, advice, memory, moment, event, experience. Return only the category name.'
        },
        {
          role: 'user',
          content: `Categorize this content (file type: ${fileType}):\n\n${content.substring(0, 1000)}`
        }
      ]
    })

    return response.response?.trim().toLowerCase() || 'personal'
  } catch (error) {
    console.error('Content categorization error:', error)
    return 'personal'
  }
}

/**
 * Calculate overall confidence in the analysis
 */
function calculateConfidence(sentimentAnalysis, tags) {
  const sentimentConfidence = sentimentAnalysis?.confidence || 0
  const tagConfidence = tags?.length > 0 ? Math.min(tags.length / 5, 1) : 0
  
  return Math.round(((sentimentConfidence + tagConfidence) / 2) * 100)
}

/**
 * Get file type from MIME type
 */
function getFileTypeFromMime(mimeType) {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('text/') || mimeType.includes('application/pdf')) return 'document'
  return 'document'
}
