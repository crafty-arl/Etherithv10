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
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = withPWA(nextConfig)
