# IPFS Registry + Optional Sync System

## Overview

This implementation provides a decentralized memory sharing system using IPFS registries with optional synchronization capabilities. The system is designed to be local-first, working entirely offline while providing enhanced functionality when online.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local Storage │    │  IPFS Registry  │    │ Remote Registry │
│                 │    │                 │    │                 │
│ • User Memories │◄──►│ • Public Index  │◄──►│ • Other Users   │
│ • User Profile  │    │ • Metadata      │    │ • Discovery     │
│ • Subscriptions │    │ • Hash Integrity│    │ • Sync Data     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Offline Manager │    │ Registry Manager│    │Subscription Sync│
│                 │    │                 │    │                 │
│ • Queue Ops     │    │ • Publish       │    │ • Auto Sync     │
│ • Cache Data    │    │ • Validate      │    │ • Discovery     │
│ • Auto Retry    │    │ • Privacy Check │    │ • Background    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Features

### ✅ True Local-First
- Works completely offline without internet
- All data stored locally in browser storage
- No central server dependencies
- Graceful degradation when connectivity is poor

### ✅ Decentralized Discovery
- IPFS-based registry publishing
- Subscribe to other users via IPFS CIDs
- No central authority or server required
- Content addressing ensures integrity

### ✅ Optional Sharing
- Users control what memories are shared (public/private)
- Fine-grained privacy controls
- Content safety scanning
- Anonymization options

### ✅ Scalable Architecture
- IPFS handles content distribution
- Background sync for performance
- Configurable sync frequencies
- Efficient offline queue management

### ✅ Simple Implementation
- JSON-based registry format
- Standard IPFS operations
- Browser-native storage APIs
- TypeScript for type safety

## Components

### 1. Registry Types (`types/registry.ts`)
Comprehensive TypeScript definitions for:
- `UserRegistry` - Local registry structure
- `PublicMemoryEntry` - Shared memory format
- `RegistrySubscription` - Following other users
- `SyncOperation` - Background sync tracking
- `RegistryConfig` - User preferences
- Privacy and discovery types

### 2. Registry Manager (`utils/registry.ts`)
Core registry operations:
- **Local Registry Management**: Create, update, read user registries
- **IPFS Publishing**: Upload registries to IPFS with metadata
- **Subscription System**: Follow other users' registries
- **Background Sync**: Download new memories from subscriptions
- **Discovery**: Search and find new registries
- **Statistics**: Track usage and performance

### 3. Offline Manager (`utils/offline-registry.ts`)
Offline-first capabilities:
- **Queue Management**: Store operations when offline
- **Auto Retry**: Process queued operations when back online
- **Connectivity Monitoring**: Detect online/offline status
- **Graceful Degradation**: Provide feedback about offline state
- **Cache Management**: Pre-load critical data for offline use

### 4. Privacy Controls (`utils/privacy-controls.ts`)
Privacy and security features:
- **Content Safety**: Detect sensitive information (passwords, keys, SSNs)
- **Sharing Permissions**: Control what can be shared publicly
- **Data Anonymization**: Remove identifying information
- **Access Controls**: Subscription-based and invite-only sharing
- **Audit Tools**: Privacy reports and compliance features
- **Data Rights**: Export and deletion capabilities

### 5. Registry UI (`components/RegistryManager.tsx`)
User interface for:
- **Overview Dashboard**: Stats and network status
- **Publishing Controls**: Update and publish registry
- **Subscription Management**: Add/remove/sync subscriptions
- **Discovery Tools**: Find and subscribe to new registries
- **Settings**: Privacy and sync configuration

## Usage Examples

### Basic Registry Setup

```typescript
import { RegistryManager } from './utils/registry'
import { OfflineRegistryManager } from './utils/offline-registry'

// Create a registry for the current user
const userProfile = LocalStorage.getUserProfile()
const registry = RegistryManager.createRegistry(userProfile)

// Update registry with current public memories
const updatedRegistry = RegistryManager.updateRegistryFromMemories()

// Publish to IPFS (with offline support)
const result = await OfflineRegistryManager.publishRegistry()
if (result.cached) {
  console.log('Queued for when online')
} else {
  console.log(`Published: ${result.cid}`)
}
```

### Subscription Management

```typescript
// Subscribe to another user's registry
const subscription = await OfflineRegistryManager.addSubscription(
  'QmExampleRegistryCID123',
  true // auto-sync
)

// Sync all subscriptions
const syncResults = await RegistryManager.syncAllSubscriptions()

// Get discovered memories
const discoveries = RegistryManager.getDiscoveredMemories()
const searchResults = RegistryManager.searchDiscoveredMemories({
  query: 'machine learning',
  fileType: 'document'
})
```

### Privacy Controls

```typescript
import { PrivacyManager } from './utils/privacy-controls'

// Check if memory can be shared
const shareCheck = PrivacyManager.canShareMemory(memory)
if (!shareCheck.canShare) {
  console.log('Cannot share:', shareCheck.reason)
  console.log('Required actions:', shareCheck.requiredActions)
}

// Anonymize memory for sharing
const anonymized = PrivacyManager.anonymizeMemoryEntry(
  memoryEntry,
  'moderate' // minimal, moderate, full
)

// Generate privacy report
const report = PrivacyManager.generatePrivacyReport()
```

### Offline Support

```typescript
// Setup offline monitoring
OfflineRegistryManager.setupOfflineSupport()

// Check enhanced stats including offline status
const stats = OfflineRegistryManager.getEnhancedStats()
console.log('Online:', stats.offline.isOnline)
console.log('Queued operations:', stats.offline.queuedOperations)

// Manually process offline queue
const processResult = await OfflineRegistryManager.processOfflineQueue()
console.log(`Processed: ${processResult.processed}, Failed: ${processResult.failed}`)
```

## Registry Format

The registry JSON structure:

```json
{
  "version": "1.0.0",
  "format": "etherith-registry-v1",
  "registryId": "reg_user123_1234567890",
  "userId": "user123",
  "userProfile": {
    "id": "user123",
    "displayName": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "contactLink": "mailto:john@example.com",
    "bio": "AI researcher and memory archivist"
  },
  "metadata": {
    "created": 1640995200000,
    "updated": 1640995800000,
    "totalEntries": 42,
    "totalSize": 104857600,
    "description": "John's Public Memory Archive",
    "tags": ["AI", "research", "memories"],
    "language": "en"
  },
  "publicMemories": [
    {
      "id": "memory123",
      "title": "Introduction to Machine Learning",
      "content": "A comprehensive guide to ML basics...",
      "memoryNote": "Great resource for beginners",
      "fileType": "document",
      "ipfsCid": "QmMemoryCID123",
      "ipfsUrl": "https://ipfs.io/ipfs/QmMemoryCID123",
      "timestamp": 1640995200000,
      "authorId": "user123",
      "authorName": "John Doe",
      "tags": ["machine-learning", "guide"],
      "sharingPermissions": "public",
      "contentHash": "sha256abc123"
    }
  ],
  "ipfsMetadata": {
    "registryCid": "QmRegistryCID456",
    "lastPublished": 1640995800000,
    "publishedSize": 2048,
    "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmRegistryCID456"
  }
}
```

## Configuration

The system provides extensive configuration options:

```typescript
const config: RegistryConfig = {
  enabled: true,
  autoPublish: false,
  publishFrequency: 'manual', // 'manual' | 'on-change' | 'daily' | 'weekly'
  maxRegistrySize: 100, // MB
  maxMemorySize: 25,    // MB per memory
  allowedFileTypes: ['text', 'document', 'image', 'audio', 'video'],
  defaultSharingPermission: 'public',
  syncConfig: {
    enabled: true,
    maxConcurrentSyncs: 3,
    retryAttempts: 3,
    retryDelay: 30, // seconds
    verifyIntegrity: true
  },
  privacy: {
    shareProfile: true,
    shareContactInfo: false,
    shareLocation: false,
    requireApproval: false
  }
}
```

## Testing

Comprehensive test suite with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Test coverage includes:
- Registry creation and management
- IPFS publishing and fetching
- Subscription handling
- Offline queue management
- Privacy controls
- Content safety checking
- Integration scenarios

## Security Considerations

### Content Safety
- Automated detection of sensitive patterns (passwords, API keys, SSNs)
- Content hash verification for integrity
- Privacy-preserving anonymization options

### Access Control
- Public, subscribers-only, and invite-only sharing permissions
- User consent management for data sharing
- Configurable privacy settings

### Data Protection
- Local-first architecture minimizes data exposure
- Users control what data is shared and with whom
- No central server to compromise

## Performance

### Optimization Strategies
- Background sync prevents UI blocking
- Configurable sync frequencies
- Efficient offline queue management
- Content caching for offline access

### Scalability
- IPFS provides distributed content delivery
- Registry size limits prevent bloat
- Incremental sync reduces bandwidth usage

## Future Enhancements

### Planned Features
1. **Encryption**: End-to-end encryption for private registries
2. **Digital Signatures**: Verify registry authenticity
3. **Discovery Networks**: Automated registry discovery
4. **Analytics**: Advanced usage and sharing analytics
5. **Mobile Apps**: Native mobile implementations

### Integration Opportunities
1. **IPFS Clusters**: Enhanced availability and performance
2. **Blockchain**: Decentralized registry verification
3. **AI/ML**: Content recommendation and discovery
4. **Collaboration**: Multi-user memory editing

## Benefits Summary

✅ **True local-first**: Works without internet
✅ **Decentralized**: No central server required
✅ **Optional sharing**: Users control what they share/discover
✅ **Scalable**: IPFS handles the heavy lifting
✅ **Simple**: Just JSON files + IPFS
✅ **Privacy-focused**: Comprehensive privacy controls
✅ **Offline-ready**: Graceful degradation and queue management
✅ **Extensible**: Clean architecture for future enhancements