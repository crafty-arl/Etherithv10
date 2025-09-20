import { getServerSession } from 'next-auth/next'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, {})
    
    if (!session?.accessToken) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    // Fetch user's guilds from Discord API
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch guilds from Discord API')
    }

    const guilds = await response.json()

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
    res.status(500).json({ message: 'Internal server error' })
  }
}



