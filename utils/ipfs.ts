// Real IPFS functionality using Pinata via API routes
export class IPFSService {
  static async uploadToIPFS(
    data: string, 
    metadata?: {
      title: string
      memoryNote: string
      authorName: string
      fileType: string
      tags?: string[]
    }
  ): Promise<{
    cid: string
    size: number
    timestamp: number
  }> {
    // Use API route to upload text content
    const requestBody = {
      data: data,
      metadata: metadata ? {
        name: metadata.title,
        description: metadata.memoryNote,
        keyvalues: {
          author: metadata.authorName,
          fileType: metadata.fileType,
          platform: 'Etherith',
          timestamp: new Date().toISOString(),
          ...(metadata.tags && metadata.tags.length > 0 && { tags: metadata.tags.join(',') })
        }
      } : undefined
    }

    const response = await fetch('/api/pinata/upload-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to upload to IPFS')
    }

    const result = await response.json()
    
    return {
      cid: result.cid,
      size: result.size,
      timestamp: new Date(result.timestamp).getTime()
    }
  }

  static async uploadFileToIPFS(
    file: File,
    metadata?: {
      title: string
      memoryNote: string
      authorName: string
      fileType: string
      tags?: string[]
    }
  ): Promise<{
    cid: string
    size: number
    timestamp: number
  }> {
    // Convert file to base64 for API upload
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })

    const requestBody = {
      file: base64Data,
      metadata: metadata ? {
        name: metadata.title,
        description: metadata.memoryNote,
        mimeType: file.type,
        keyvalues: {
          author: metadata.authorName,
          fileType: metadata.fileType,
          platform: 'Etherith',
          timestamp: new Date().toISOString(),
          ...(metadata.tags && metadata.tags.length > 0 && { tags: metadata.tags.join(',') })
        }
      } : undefined
    }

    const response = await fetch('/api/pinata/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to upload file to IPFS')
    }

    const result = await response.json()
    
    return {
      cid: result.cid,
      size: result.size,
      timestamp: new Date(result.timestamp).getTime()
    }
  }


  static getIPFSUrl(cid: string): string {
    return `https://ipfs.io/ipfs/${cid}`
  }

  static getIPFSGatewayUrl(cid: string): string {
    return `${process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud'}/ipfs/${cid}`
  }

  static async verifyPreservation(cid: string): Promise<{
    exists: boolean
    lastSeen: number
    replicas: number
  }> {
    // Use API route to verify preservation
    const response = await fetch(`/api/pinata/verify?cid=${cid}`)
    const data = await response.json()
    
    if (data.success && data.exists) {
      return {
        exists: true,
        lastSeen: new Date(data.pinnedAt || Date.now()).getTime(),
        replicas: data.replicas || 1
      }
    } else {
      return {
        exists: false,
        lastSeen: 0,
        replicas: 0
      }
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Export for backward compatibility
export const IPFSSimulator = IPFSService
