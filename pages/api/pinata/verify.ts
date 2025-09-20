import { NextApiRequest, NextApiResponse } from 'next'
import { PinataService } from '../../../utils/pinata'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { cid } = req.query

    if (!cid || typeof cid !== 'string') {
      return res.status(400).json({ error: 'CID is required' })
    }

    // Check if file is pinned on Pinata
    const isPinned = await PinataService.isPinned(cid)
    
    if (isPinned) {
      // Get file info
      const fileInfo = await PinataService.getFileInfo(cid)
      
      res.status(200).json({
        success: true,
        exists: true,
        cid: cid,
        size: fileInfo?.size || 0,
        pinnedAt: fileInfo?.date_pinned || null,
        replicas: fileInfo?.replication_count || 1,
        gatewayUrl: PinataService.getGatewayUrl(cid),
        publicUrl: PinataService.getPublicUrl(cid)
      })
    } else {
      res.status(200).json({
        success: true,
        exists: false,
        cid: cid,
        message: 'File not found on Pinata'
      })
    }
  } catch (error) {
    console.error('Pinata verify API error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    })
  }
}



