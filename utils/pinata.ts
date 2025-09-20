import { PinataSDK } from 'pinata'

// Pinata configuration - server-side only
const PINATA_JWT = process.env.PINATA_JWT || ''
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud'

// Initialize Pinata SDK (server-side only)
let pinata: PinataSDK | null = null

function getPinataInstance(): PinataSDK {
  if (!pinata) {
    if (!PINATA_JWT) {
      throw new Error('PINATA_JWT environment variable is required')
    }
    pinata = new PinataSDK({
      pinataJwt: PINATA_JWT,
      pinataGateway: PINATA_GATEWAY,
    })
  }
  return pinata
}

export interface PinataUploadResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
  isDuplicate?: boolean
}

export interface PinataMetadata {
  name: string
  description?: string
  keyvalues?: Record<string, string>
}

export interface PinataPinPolicy {
  regions: Array<{
    id: string
    desiredReplicationCount: number
  }>
}

export class PinataService {
  /**
   * Upload a file to IPFS via Pinata
   */
  static async uploadFile(
    file: File,
    metadata?: PinataMetadata,
    pinPolicy?: PinataPinPolicy
  ): Promise<PinataUploadResponse> {
    try {
      const uploadOptions: any = {
        pinataMetadata: metadata ? {
          name: metadata.name,
          keyvalues: metadata.keyvalues || {}
        } : undefined,
        pinataOptions: {
          cidVersion: 1,
          wrapWithDirectory: false
        }
      }

      if (pinPolicy) {
        uploadOptions.pinataOptions.pinPolicy = pinPolicy
      }

      const response = await getPinataInstance().upload.public.file(file, uploadOptions) as any
      
      return {
        IpfsHash: response.cid || response.IpfsHash,
        PinSize: response.size || response.PinSize,
        Timestamp: response.created_at || response.Timestamp,
        isDuplicate: response.isDuplicate || false
      }
    } catch (error) {
      throw new Error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload JSON data to IPFS via Pinata
   */
  static async uploadJSON(
    data: any,
    metadata?: PinataMetadata,
    pinPolicy?: PinataPinPolicy
  ): Promise<PinataUploadResponse> {
    try {
      const uploadOptions: any = {
        pinataMetadata: metadata ? {
          name: metadata.name,
          keyvalues: metadata.keyvalues || {}
        } : undefined,
        pinataOptions: {
          cidVersion: 1,
          wrapWithDirectory: false
        }
      }

      if (pinPolicy) {
        uploadOptions.pinataOptions.pinPolicy = pinPolicy
      }

      const response = await getPinataInstance().upload.public.json(data, uploadOptions) as any
      
      return {
        IpfsHash: response.cid || response.IpfsHash,
        PinSize: response.size || response.PinSize,
        Timestamp: response.created_at || response.Timestamp,
        isDuplicate: response.isDuplicate || false
      }
    } catch (error) {
      throw new Error(`Failed to upload JSON to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload text content to IPFS via Pinata
   */
  static async uploadText(
    content: string,
    filename: string,
    metadata?: PinataMetadata,
    pinPolicy?: PinataPinPolicy
  ): Promise<PinataUploadResponse> {
    try {
      const file = new File([content], filename, { type: 'text/plain' })
      return await this.uploadFile(file, metadata, pinPolicy)
    } catch (error) {
      console.error('Pinata text upload error:', error)
      throw new Error(`Failed to upload text to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get file from IPFS via Pinata gateway
   */
  static async getFile(cid: string): Promise<Response> {
    try {
      const url = `${PINATA_GATEWAY}/ipfs/${cid}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      console.error('Pinata get file error:', error)
      throw new Error(`Failed to retrieve file from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get JSON data from IPFS via Pinata gateway
   */
  static async getJSON(cid: string): Promise<any> {
    try {
      const response = await this.getFile(cid)
      return await response.json()
    } catch (error) {
      console.error('Pinata get JSON error:', error)
      throw new Error(`Failed to retrieve JSON from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get text content from IPFS via Pinata gateway
   */
  static async getText(cid: string): Promise<string> {
    try {
      const response = await this.getFile(cid)
      return await response.text()
    } catch (error) {
      console.error('Pinata get text error:', error)
      throw new Error(`Failed to retrieve text from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Pin an existing IPFS hash to Pinata
   * Note: This function is temporarily disabled due to SDK compatibility issues
   */
  /*
  static async pinHash(
    hash: string,
    metadata?: PinataMetadata,
    pinPolicy?: PinataPinPolicy
  ): Promise<PinataUploadResponse> {
    try {
      const pinOptions: any = {
        pinataMetadata: metadata ? {
          name: metadata.name,
          keyvalues: metadata.keyvalues || {}
        } : undefined,
        pinataOptions: {
          cidVersion: 1
        }
      }

      if (pinPolicy) {
        pinOptions.pinataOptions.pinPolicy = pinPolicy
      }

      const response = await getPinataInstance().upload.pinHash(hash, pinOptions)
      
      return {
        IpfsHash: response.IpfsHash,
        PinSize: response.PinSize,
        Timestamp: response.Timestamp,
        isDuplicate: response.isDuplicate
      }
    } catch (error) {
      console.error('Pinata pin hash error:', error)
      throw new Error(`Failed to pin hash to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  */

  /**
   * Get file info from Pinata
   */
  static async getFileInfo(cid: string): Promise<any> {
    try {
      const pinataInstance = getPinataInstance()
      const files = await pinataInstance.files.public.list().cid(cid).all()

      return files.length > 0 ? files[0] : null
    } catch (error) {
      console.error('Pinata get file info error:', error)
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if a file is pinned on Pinata
   */
  static async isPinned(cid: string): Promise<boolean> {
    try {
      const info = await this.getFileInfo(cid)
      return info !== null
    } catch (error) {
      console.error('Pinata is pinned check error:', error)
      return false
    }
  }

  /**
   * Get Pinata gateway URL for a CID
   */
  static getGatewayUrl(cid: string): string {
    return `${PINATA_GATEWAY}/ipfs/${cid}`
  }

  /**
   * Get public IPFS URL for a CID
   */
  static getPublicUrl(cid: string): string {
    return `https://ipfs.io/ipfs/${cid}`
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Create metadata for Etherith memory
   */
  static createMemoryMetadata(
    title: string,
    memoryNote: string,
    authorName: string,
    fileType: string,
    tags?: string[]
  ): PinataMetadata {
    return {
      name: title,
      description: memoryNote,
      keyvalues: {
        author: authorName,
        fileType: fileType,
        platform: 'Etherith',
        timestamp: new Date().toISOString(),
        ...(tags && tags.length > 0 && { tags: tags.join(',') })
      }
    }
  }

  /**
   * Create pin policy for Etherith (global replication)
   */
  static createEtherithPinPolicy(): PinataPinPolicy {
    return {
      regions: [
        {
          id: 'FRA1',
          desiredReplicationCount: 2
        },
        {
          id: 'NYC1',
          desiredReplicationCount: 2
        },
        {
          id: 'SFO1',
          desiredReplicationCount: 1
        }
      ]
    }
  }
}
