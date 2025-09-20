import { useSession, signIn, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { LocalStorage } from '../utils/storage'
import { UserProfile } from '../types/memory'

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

export default function DiscordConnect() {
  const { data: session, status } = useSession()
  const [guilds, setGuilds] = useState<DiscordGuild[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session?.user) {
      // Create or update user profile
      createUserProfile()
      if (session?.accessToken) {
        fetchUserGuilds()
      }
    }
  }, [session])

  const createUserProfile = () => {
    if (!session?.user) return

    const existingProfile = LocalStorage.getUserProfile()
    
    if (!existingProfile || existingProfile.id !== session.user.discordId) {
      const newProfile: UserProfile = {
        id: session.user.discordId || '',
        email: session.user.email || '',
        displayName: session.user.username || session.user.name || 'Anonymous',
        avatar: session.user.avatar ? `https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png?size=64` : undefined,
        contactLink: session.user.email || undefined,
        createdAt: Date.now(),
        memoriesCount: 0
      }
      
      LocalStorage.saveUserProfile(newProfile)
    }
  }

  const fetchUserGuilds = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/discord/guilds')
      if (response.ok) {
        const data = await response.json()
        setGuilds(data.guilds || [])
      }
    } catch (error) {
      console.error('Failed to fetch guilds:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAvatarUrl = (userId: string, avatar: string) => {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=64`
  }

  const getGuildIconUrl = (guildId: string, icon: string) => {
    return `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=64`
  }

  if (status === 'loading') {
    return (
      <div className="discord-connect">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="etherith-login">
        <div className="login-header">
          <h3>Access Your Vault</h3>
          <p>Connect your Discord account to enter Etherith's permanent storage</p>
        </div>
        <button 
          className="etherith-login-button"
          onClick={() => signIn('discord')}
        >
          <div className="login-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
          <div className="login-text">
            <span className="login-title">Connect with Discord</span>
            <span className="login-subtitle">Enter the Vault</span>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="etherith-connected">
      <div className="connected-header">
        <h3>🔒 Vault Access Granted</h3>
        <p>Hello, {session.user.username}! You now have access to permanent, decentralized storage.</p>
      </div>

      <div className="user-profile">
        <div className="user-avatar">
          {session.user.avatar ? (
            <Image
              src={getAvatarUrl(session.user.discordId!, session.user.avatar)}
              alt="Discord Avatar"
              width={64}
              height={64}
              className="avatar-image"
            />
          ) : (
            <div className="avatar-placeholder">
              {session.user.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="user-info">
          <h4>{session.user.username}#{session.user.discriminator}</h4>
          <p>Discord ID: {session.user.discordId}</p>
        </div>
      </div>

      <div className="guilds-section">
        <h4>Your Servers ({guilds.length})</h4>
        {loading ? (
          <div className="loading">Loading servers...</div>
        ) : (
          <div className="guilds-grid">
            {guilds.map((guild) => (
              <div key={guild.id} className="guild-card">
                <div className="guild-icon">
                  {guild.icon ? (
                    <Image
                      src={getGuildIconUrl(guild.id, guild.icon)}
                      alt={`${guild.name} Icon`}
                      width={48}
                      height={48}
                      className="guild-image"
                    />
                  ) : (
                    <div className="guild-placeholder">
                      {guild.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="guild-info">
                  <h5>{guild.name}</h5>
                  {guild.owner && <span className="owner-badge">Owner</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button 
        className="etherith-logout-button"
        onClick={() => signOut()}
      >
        <span className="logout-icon">🚪</span>
        Exit Etherith
      </button>
    </div>
  )
}
