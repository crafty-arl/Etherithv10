import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      discordId?: string
      username?: string
      discriminator?: string
      avatar?: string
    }
  }

  interface JWT {
    accessToken?: string
    discordId?: string
    username?: string
    discriminator?: string
    avatar?: string
  }
}




