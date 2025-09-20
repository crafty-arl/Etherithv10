# AI Memory Analyzer Worker Setup Guide

This guide will help you deploy the AI Memory Analyzer Worker to Cloudflare and integrate it with your Etherith memory preservation system.

## Overview

The AI Memory Analyzer Worker uses Cloudflare Workers AI to automatically generate metadata for memory uploads, including:
- **Smart Titles** - Generated from content using Llama 3.1
- **Relevant Tags** - Extracted using AI text analysis
- **Sentiment Analysis** - Positive/negative/neutral classification
- **Memory Notes** - AI-generated explanations of significance
- **Content Categories** - Automatic categorization for organization

## Prerequisites

1. **Cloudflare Account** with Workers AI enabled
2. **Wrangler CLI** installed (`npm install -g wrangler`)
3. **API Token** with Workers AI permissions

## Deployment Steps

### 1. Configure Wrangler

```bash
# Login to Cloudflare
wrangler login

# Update the worker configuration
cd workers
```

Edit `wrangler.toml` and update:
- Replace `your-subdomain` with your actual subdomain
- Replace `your-domain.com` with your domain (or remove routes section for custom domain)

### 2. Deploy the Worker

```bash
# Deploy the worker
wrangler deploy

# Note the deployed URL (e.g., https://ai-memory-analyzer.your-subdomain.workers.dev)
```

### 3. Update the Frontend Configuration

Update `utils/ai-analysis.ts` and replace the `WORKER_URL`:

```typescript
private static readonly WORKER_URL = 'https://ai-memory-analyzer.your-subdomain.workers.dev'
```

### 4. Test the Integration

1. Start your Next.js development server
2. Navigate to the memory upload page
3. Enter some content and click "🤖 Analyze with AI"
4. Verify that AI suggestions appear

## Features

### AI-Powered Metadata Generation

- **Title Generation**: Creates meaningful titles from content
- **Tag Extraction**: Identifies relevant keywords and topics
- **Sentiment Analysis**: Determines emotional tone (positive/negative/neutral)
- **Memory Notes**: Explains why content is significant
- **Content Categorization**: Organizes memories by type

### Fallback System

If the AI worker is unavailable, the system falls back to basic metadata generation to ensure the upload process continues smoothly.

### User Control

Users can:
- Choose to use AI suggestions or manual input
- Apply all AI suggestions at once
- Clear AI analysis and start over
- See confidence scores for AI analysis

## API Endpoints

### POST /analyze
Analyzes memory content and returns AI-generated metadata.

**Request Body:**
```json
{
  "content": "Your memory content here...",
  "title": "Optional existing title",
  "memoryNote": "Optional existing memory note",
  "fileType": "text|document|audio|image|video",
  "fileName": "optional-file-name"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "title": "AI Generated Title",
    "tags": ["tag1", "tag2", "tag3"],
    "sentiment": {
      "sentiment": "positive",
      "score": 0.85,
      "confidence": 0.7
    },
    "memoryNote": "AI generated explanation...",
    "categories": "personal",
    "confidence": 75,
    "aiGenerated": true,
    "timestamp": 1640995200000
  },
  "original": {
    "title": "Original title",
    "memoryNote": "Original note",
    "content": "Content preview..."
  }
}
```

## Models Used

- **@cf/meta/llama-3.1-8b-instruct** - Text generation for titles, tags, and memory notes
- **@cf/huggingface/distilbert-sst-2-int8** - Sentiment analysis

## Rate Limits

- Text Generation: 300 requests/minute
- Text Classification: 2000 requests/minute

## Troubleshooting

### Common Issues

1. **Worker not responding**: Check that the worker is deployed and the URL is correct
2. **AI analysis failing**: Verify Workers AI is enabled in your Cloudflare account
3. **CORS errors**: Ensure the worker includes proper CORS headers

### Debug Mode

Enable debug logging by adding console.log statements in the worker code and checking the Cloudflare dashboard logs.

## Cost Considerations

- Workers AI usage is charged per request
- Text generation models are more expensive than classification models
- Consider implementing caching for repeated analyses

## Security

- The worker includes CORS headers for cross-origin requests
- No sensitive data is stored in the worker
- All analysis is performed server-side

## Next Steps

1. Deploy the worker to Cloudflare
2. Update the frontend configuration
3. Test the integration
4. Monitor usage and costs
5. Consider adding more AI models for enhanced analysis

## Support

For issues with:
- **Cloudflare Workers AI**: Check the [Cloudflare documentation](https://developers.cloudflare.com/workers-ai/)
- **Worker deployment**: See [Wrangler documentation](https://developers.cloudflare.com/workers/wrangler/)
- **Integration issues**: Check browser console and network tabs


