import { NextApiRequest, NextApiResponse } from 'next'
import { PinataService } from '../../../utils/pinata'

// Configure body parser for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { file, metadata, pinPolicy } = req.body

    if (!file) {
      return res.status(400).json({ error: 'File is required' })
    }

    // Convert base64 file to File object
    let fileObj: File
    if (typeof file === 'string') {
      // Handle base64 file
      const base64Data = file.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')
      const blob = new Blob([buffer], { type: metadata?.mimeType || 'application/octet-stream' })
      fileObj = new File([blob], metadata?.name || 'file', { type: metadata?.mimeType || 'application/octet-stream' })
    } else {
      fileObj = file
    }

    // Upload to Pinata
    const result = await PinataService.uploadFile(fileObj, metadata, pinPolicy)

    const response = {
      success: true,
      cid: result.IpfsHash,
      size: result.PinSize,
      timestamp: result.Timestamp,
      isDuplicate: result.isDuplicate,
      gatewayUrl: PinataService.getGatewayUrl(result.IpfsHash),
      publicUrl: PinataService.getPublicUrl(result.IpfsHash)
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    })
  }
}

