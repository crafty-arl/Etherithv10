const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'cdn.discordapp.com',
      'media.discordapp.net'
    ],
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase body size limit to 10MB
    },
  },
}

module.exports = withPWA(nextConfig)
