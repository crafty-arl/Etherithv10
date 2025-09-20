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
    const { data, metadata } = req.body

    if (!data) {
      return res.status(400).json({ error: 'Data is required' })
    }

    // Upload JSON data to Pinata
    const result = await PinataService.uploadJSON(data, metadata)

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