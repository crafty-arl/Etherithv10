# Pinata IPFS Integration for Etherith

This document explains how to set up and use Pinata IPFS integration in the Etherith memory vault system.

## What is Pinata?

Pinata is a leading IPFS pinning service that provides:
- **Reliable IPFS Storage**: Ensures your content stays accessible
- **Global CDN**: Fast content delivery worldwide
- **Metadata Management**: Rich metadata for your files
- **Pin Policies**: Control replication across regions
- **Easy API**: Simple integration with existing applications

## Setup Instructions

### 1. Create a Pinata Account

1. Visit [Pinata.cloud](https://pinata.cloud/)
2. Sign up for a free account
3. Verify your email address

### 2. Generate API Keys

1. Log into your Pinata dashboard
2. Navigate to **API Keys** in the sidebar
3. Click **New Key**
4. Choose **Admin** permissions for full access
5. Copy the **JWT Token** (you won't see it again!)

### 3. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Pinata IPFS Configuration
PINATA_JWT=your_jwt_token_here
PINATA_GATEWAY=https://gateway.pinata.cloud
```

### 4. Test the Integration

1. Start your development server: `npm run dev`
2. Log in with Discord
3. Go to the Memory Vault
4. Upload a memory with a file
5. Check the IPFS CID and verification status

## Features

### Real IPFS Storage
- Files are actually stored on IPFS via Pinata
- Global replication across multiple regions
- Permanent, decentralized storage

### Rich Metadata
- Memory titles and descriptions
- Author information
- File types and tags
- Timestamps and platform info

### Verification System
- Real-time verification of IPFS storage
- Replica count tracking
- Last seen timestamps

### Multiple Gateways
- Pinata Gateway (fast, reliable)
- Public IPFS Gateway (decentralized)
- Fallback to simulation if Pinata fails

## API Endpoints

### Upload File
```bash
POST /api/pinata/upload
Content-Type: application/json

{
  "file": "base64_encoded_file",
  "metadata": {
    "name": "memory_title",
    "description": "memory_note",
    "keyvalues": {
      "author": "author_name",
      "fileType": "image",
      "platform": "Etherith"
    }
  }
}
```

### Upload JSON
```bash
POST /api/pinata/upload-json
Content-Type: application/json

{
  "data": { "content": "memory_data" },
  "metadata": {
    "name": "memory_title",
    "description": "memory_note"
  }
}
```

### Verify Preservation
```bash
GET /api/pinata/verify?cid=QmYourCIDHere
```

## Pinata Service Methods

### Upload Methods
- `uploadFile(file, metadata, pinPolicy)` - Upload files
- `uploadJSON(data, metadata, pinPolicy)` - Upload JSON data
- `uploadText(content, filename, metadata, pinPolicy)` - Upload text

### Retrieval Methods
- `getFile(cid)` - Get file from IPFS
- `getJSON(cid)` - Get JSON data
- `getText(cid)` - Get text content

### Verification Methods
- `isPinned(cid)` - Check if content is pinned
- `getFileInfo(cid)` - Get detailed file information
- `verifyPreservation(cid)` - Verify with replica count

### Utility Methods
- `getGatewayUrl(cid)` - Get Pinata gateway URL
- `getPublicUrl(cid)` - Get public IPFS URL
- `formatFileSize(bytes)` - Format file sizes

## Pin Policies

Etherith uses a global pin policy for maximum reliability:

```javascript
{
  regions: [
    { id: 'FRA1', desiredReplicationCount: 2 },  // Europe
    { id: 'NYC1', desiredReplicationCount: 2 },  // North America
    { id: 'SFO1', desiredReplicationCount: 1 }   // West Coast
  ]
}
```

## Error Handling

The system includes comprehensive error handling:

1. **Primary**: Real Pinata IPFS upload
2. **Fallback**: Simulation mode if Pinata fails
3. **Graceful Degradation**: System continues working

## Cost Considerations

### Pinata Pricing
- **Free Tier**: 1GB storage, 1,000 pins
- **Pro Tier**: $20/month for 100GB, 10,000 pins
- **Enterprise**: Custom pricing for large volumes

### Optimization Tips
- Compress images before upload
- Use appropriate file formats
- Monitor storage usage in Pinata dashboard

## Security

### API Key Security
- Store JWT in environment variables only
- Never commit API keys to version control
- Rotate keys regularly

### Content Security
- All uploads are public on IPFS
- Use private memories for sensitive content
- Consider encryption for sensitive data

## Monitoring

### Pinata Dashboard
- Monitor storage usage
- Track pin counts
- View upload statistics

### Application Logs
- Check console for upload errors
- Monitor verification failures
- Track fallback usage

## Troubleshooting

### Common Issues

1. **"Pinata upload error"**
   - Check JWT token validity
   - Verify environment variables
   - Check Pinata account limits

2. **"Verification failed"**
   - Network connectivity issues
   - Pinata service status
   - CID format validation

3. **"File not found"**
   - Content may not be pinned yet
   - Check CID accuracy
   - Verify Pinata dashboard

### Debug Steps

1. Check environment variables
2. Test API endpoints directly
3. Verify Pinata dashboard
4. Check browser console logs
5. Test with small files first

## Support

- **Pinata Documentation**: [docs.pinata.cloud](https://docs.pinata.cloud/)
- **Pinata Support**: [support.pinata.cloud](https://support.pinata.cloud/)
- **Etherith Issues**: Check project repository

## Migration from Simulation

If you were using the simulation mode:

1. Set up Pinata account and API keys
2. Add environment variables
3. Restart the application
4. Existing memories will continue working
5. New uploads will use real IPFS

The system automatically falls back to simulation if Pinata is not configured, ensuring backward compatibility.




