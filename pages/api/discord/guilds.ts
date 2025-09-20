import { getServerSession } from 'next-auth/next'
import { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      console.error('No session found')
      return res.status(401).json({ message: 'Not authenticated - no session' })
    }
    
    if (!session.accessToken) {
      console.error('No access token found in session:', { 
        hasSession: !!session, 
        hasUser: !!session.user,
        hasAccessToken: !!session.accessToken,
        sessionKeys: Object.keys(session)
      })
      return res.status(401).json({ message: 'Not authenticated - no access token' })
    }

    console.log('Fetching Discord guilds with token:', session.accessToken?.substring(0, 10) + '...')

    // Fetch user's guilds from Discord API
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Etherith/1.0.0'
      },
    })

    console.log('Discord API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Discord API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      
      if (response.status === 401) {
        return res.status(401).json({ 
          message: 'Discord authentication failed - token may be expired',
          details: errorText
        })
      }
      
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`)
    }

    const guilds = await response.json()
    console.log('Successfully fetched guilds:', guilds.length)

    // Filter guilds where user has admin permissions
    const adminGuilds = guilds.filter((guild: any) => {
      const permissions = parseInt(guild.permissions)
      return (permissions & 0x8) === 0x8 // ADMINISTRATOR permission
    })

    res.status(200).json({ 
      guilds: adminGuilds,
      total: guilds.length 
    })
  } catch (error) {
    console.error('Error fetching Discord guilds:', error)
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}




