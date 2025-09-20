# Next.js Hello World PWA

A simple Hello World Progressive Web App built with Next.js and TypeScript.

## Features

- 🚀 Next.js 14 with TypeScript
- 📱 PWA capabilities with offline support
- 🎨 Beautiful gradient design
- 📦 Installable on mobile and desktop
- ⚡ Fast loading with service worker
- 📱 Responsive design

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up Discord OAuth:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to OAuth2 → General
   - Copy your Client ID and Client Secret
   - Add redirect URI: `http://localhost:3000/api/auth/callback/discord`
   - Copy `.env.local.example` to `.env.local` and fill in your Discord credentials

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### PWA Features
- **Offline Support**: The app works even when you're offline
- **Installable**: Add to home screen on mobile devices or install as desktop app
- **Fast Loading**: Service worker caches resources for quick loading
- **Responsive**: Works great on all device sizes

### Discord Integration
- **OAuth Authentication**: Secure login with Discord
- **User Profile**: Display Discord username, avatar, and ID
- **Server List**: View Discord servers you have admin access to
- **Real-time Status**: Online/offline status indicators

## Building for Production

```bash
npm run build
npm start
```

## PWA Installation

- **Mobile**: Look for the "Add to Home Screen" option in your browser
- **Desktop**: Look for the install button in the address bar or app menu

The app will work offline and can be launched like a native app once installed.
