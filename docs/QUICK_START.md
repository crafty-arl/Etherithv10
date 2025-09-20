# Logux File Sync - Quick Start Guide

## Overview

This guide will help you integrate the Logux File Synchronization system into your Etherith Archival Ecosystem application in just a few steps.

## Prerequisites

- Node.js 16+ installed
- Existing Etherith project running
- Basic understanding of React and TypeScript

## Installation

### 1. Install Dependencies

```bash
npm install @logux/client @logux/core
# or
yarn add @logux/client @logux/core
```

### 2. Add CSS Import

Add the file sync styles to your main CSS file or import in your component:

```css
/* In styles/globals.css */
@import './logux-file-sync.css';
```

### 3. Update Package.json Scripts

Add build and development scripts for the file sync system:

```json
{
  "scripts": {
    "sync:build": "tsc --project tsconfig.sync.json",
    "sync:dev": "tsc --project tsconfig.sync.json --watch"
  }
}
```

## Basic Integration

### 1. Add to Your Main Page

Update your main page component to include the file sync demo:

```typescript
// pages/index.tsx or your main component
import { useState, useEffect } from 'react';
import LoguxFileSyncDemo from '../components/LoguxFileSyncDemo';
import { LocalStorage } from '../utils/storage';

export default function HomePage() {
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Get or create user profile
    const profile = LocalStorage.getUserProfile();
    if (profile) {
      setUserProfile(profile);
    } else {
      // Create default profile
      const defaultProfile = {
        id: `user_${Date.now()}`,
        email: 'demo@example.com',
        displayName: 'Demo User',
        createdAt: Date.now(),
        memoriesCount: 0
      };
      LocalStorage.saveUserProfile(defaultProfile);
      setUserProfile(defaultProfile);
    }
  }, []);

  if (!userProfile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app-container">
      {/* Your existing components */}

      {/* Add File Sync Demo */}
      <LoguxFileSyncDemo
        userId={userProfile.id}
        userName={userProfile.displayName}
        className="file-sync-section"
      />

      {/* Your existing components */}
    </div>
  );
}
```

### 2. Environment Configuration

Create or update your environment configuration:

```typescript
// utils/config.ts
export const config = {
  logux: {
    server: process.env.NEXT_PUBLIC_LOGUX_SERVER || 'ws://localhost:31337',
    subprotocol: '1.0.0',
    userId: process.env.NEXT_PUBLIC_USER_ID || 'anonymous',
    credentials: process.env.NEXT_PUBLIC_LOGUX_CREDENTIALS || ''
  },
  fileSync: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv'
    ],
    autoSyncInterval: 30000, // 30 seconds
    offlineSupport: true
  }
};
```

### 3. Add Environment Variables

Create or update your `.env.local` file:

```env
# Logux Configuration
NEXT_PUBLIC_LOGUX_SERVER=ws://localhost:31337
NEXT_PUBLIC_LOGUX_SUBPROTOCOL=1.0.0

# File Sync Settings
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_AUTO_SYNC_INTERVAL=30000
```

## Advanced Integration

### 1. Custom Logux Client Setup

For production use, set up a proper Logux client:

```typescript
// utils/logux-client.ts
import { Client } from '@logux/client';
import { config } from './config';

export function createLoguxClient(userId: string): Client {
  const client = new Client({
    subprotocol: config.logux.subprotocol,
    server: config.logux.server,
    userId: userId,
    credentials: config.logux.credentials
  });

  // Add error handling
  client.on('error', (error) => {
    console.error('Logux error:', error);
  });

  // Add connection status handling
  client.on('state', () => {
    if (client.state === 'connecting') {
      console.log('Connecting to Logux server...');
    } else if (client.state === 'synchronized') {
      console.log('Connected to Logux server');
    } else if (client.state === 'disconnected') {
      console.log('Disconnected from Logux server');
    }
  });

  return client;
}
```

### 2. Server Setup (Optional)

For full peer-to-peer functionality, set up a Logux server:

```javascript
// server/logux-server.js
const { Server } = require('@logux/server');
const { isFirstOlder } = require('@logux/core');

const server = new Server({
  subprotocol: '1.0.0',
  supports: '1.x',
  host: '127.0.0.1',
  port: 31337
});

// File sync actions
server.channel('file/:id', {
  access (ctx, action, meta) {
    // Check if user has access to this file
    return ctx.userId && action.type.startsWith('file/');
  }
});

server.type('file/create', {
  access (ctx, action, meta) {
    return ctx.userId === action.authorId;
  },
  process (ctx, action, meta) {
    // Process file creation
    console.log(`File created: ${action.fileName} by ${action.authorId}`);
  }
});

server.type('file/update', {
  access (ctx, action, meta) {
    return ctx.userId === action.authorId;
  },
  process (ctx, action, meta) {
    // Process file update
    console.log(`File updated: ${action.fileId} by ${action.authorId}`);
  }
});

server.listen();
```

### 3. Production Deployment

For production deployment, add these scripts to your package.json:

```json
{
  "scripts": {
    "logux:start": "node server/logux-server.js",
    "logux:pm2": "pm2 start server/logux-server.js --name logux-server",
    "build:production": "npm run build && npm run sync:build"
  }
}
```

## Testing the Integration

### 1. Basic Functionality Test

1. Start your development server
2. Open your application in the browser
3. Navigate to the file sync section
4. Click "Enable File Sync"
5. Create a test file
6. Verify the file appears in the file list

### 2. Multi-User Test

1. Open your application in multiple browser tabs
2. Enable file sync in both tabs
3. Create a file in one tab
4. Verify it appears in the other tab
5. Edit the file simultaneously in both tabs
6. Verify conflict resolution works

### 3. Offline Test

1. Enable file sync and create some files
2. Disconnect your internet connection
3. Create and edit files while offline
4. Reconnect to the internet
5. Verify files sync when connection is restored

## Troubleshooting

### Common Issues

#### 1. Files Not Syncing

**Problem**: Files created in one browser don't appear in another

**Solution**:
- Check browser console for errors
- Verify both browsers are connected to the same network
- Ensure file sync is enabled in both browsers
- Check if browsers support WebRTC

#### 2. Conflicts Not Resolving

**Problem**: File conflicts remain unresolved

**Solution**:
- Check the conflicts tab in the file sync interface
- Manually resolve conflicts using the resolution UI
- Verify vector clock implementation is working
- Check for JavaScript errors in browser console

#### 3. Poor Performance

**Problem**: File sync is slow or laggy

**Solution**:
- Reduce auto-sync frequency in configuration
- Limit file size and number of files
- Check network connection quality
- Enable compression in production

#### 4. Storage Quota Exceeded

**Problem**: Browser runs out of storage space

**Solution**:
- Use the storage cleanup utilities
- Reduce file sizes
- Implement automatic cleanup policies
- Consider using IPFS for large files

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// Add to your main component
if (process.env.NODE_ENV === 'development') {
  window.LOGUX_DEBUG = true;
  localStorage.setItem('logux:debug', 'true');
}
```

### Performance Monitoring

Add performance monitoring to track sync performance:

```typescript
// utils/performance-monitor.ts
class FileSyncMonitor {
  static logSyncTime(operation: string, startTime: number) {
    const duration = Date.now() - startTime;
    console.log(`File sync ${operation} took ${duration}ms`);

    // Send to analytics if configured
    if (window.gtag) {
      window.gtag('event', 'file_sync_performance', {
        operation,
        duration,
        custom_map: { metric1: 'duration' }
      });
    }
  }
}
```

## Next Steps

### 1. Customize the UI

Modify the file sync components to match your application's design:

- Update CSS variables for colors and fonts
- Customize the file card layout
- Add your own icons and branding
- Implement custom file type handling

### 2. Add Advanced Features

Extend the system with additional functionality:

- Rich text collaborative editing
- File versioning with branches
- Advanced permissions and sharing
- Mobile app integration
- File search and tagging

### 3. Production Optimization

Prepare for production deployment:

- Set up monitoring and logging
- Implement proper error handling
- Add security measures
- Optimize for performance
- Create backup and recovery procedures

### 4. Documentation

Create documentation for your team:

- User guide for file collaboration
- Developer documentation for extending the system
- Troubleshooting guide for common issues
- API documentation for custom integrations

## Support

For questions and support:

1. Check the [Architecture Documentation](./logux-file-sync-architecture.md)
2. Review the source code comments
3. Test with the demo components
4. Open an issue in the project repository

## Contributing

To contribute to the file sync system:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request
5. Update documentation as needed

---

Happy collaborating with Logux File Sync! 🚀