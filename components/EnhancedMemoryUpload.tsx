import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Memory, MemoryUpload } from '../types/memory'
import { LocalStorage } from '../utils/storage'
import { IPFSService } from '../utils/ipfs'
import { AIAnalysisService } from '../utils/ai-analysis'
import { VisibilityStep } from './VisibilityStep'
import { VisibilityIndicator } from './VisibilityIndicator'
import { getNetworkDiscovery } from '../utils/network-discovery'
import { useDXOS } from '../lib/dxos/context'

interface EnhancedMemoryUploadProps {
  onMemoryUploaded?: (memory: Memory) => void
  onClose?: () => void
}

type UploadStep = 'file' | 'description' | 'ai-analysis' | 'content' | 'visibility' | 'upload' | 'complete'

export const EnhancedMemoryUpload: React.FC<EnhancedMemoryUploadProps> = ({
  onMemoryUploaded,
  onClose
}) => {
  const { client, currentSpace, identity, userProfile } = useDXOS()
  const [currentStep, setCurrentStep] = useState<UploadStep>('file')
  const [memoryData, setMemoryData] = useState<Partial<MemoryUpload>>({
    title: '',
    content: '',
    memoryNote: '',
    visibility: 'private',
    tags: []
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [visibilityConfirmed, setVisibilityConfirmed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [completedMemory, setCompletedMemory] = useState<Memory | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [workerStatus, setWorkerStatus] = useState<string>('unknown')
  const [storageStatus, setStorageStatus] = useState<string>('unknown')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const steps: { id: UploadStep; title: string; description: string }[] = [
    { id: 'file', title: 'File', description: 'Upload your memory file' },
    { id: 'description', title: 'Description', description: 'Add title and description' },
    { id: 'ai-analysis', title: 'AI Analysis', description: 'AI analyzes your content' },
    { id: 'content', title: 'Content', description: 'Review and edit details' },
    { id: 'visibility', title: 'Visibility', description: 'Choose who can see it' },
    { id: 'upload', title: 'Upload', description: 'Save to your archive' },
    { id: 'complete', title: 'Complete', description: 'Memory saved!' }
  ]

  const currentStepIndex = steps.findIndex(step => step.id === currentStep)

  // Check storage status on component mount
  useEffect(() => {
    checkStorageStatus()
  }, [])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File select triggered', event.target.files)
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, file.size, file.type)
      setSelectedFile(file)
      setError(null)

      // Auto-fill basic title from filename
      setMemoryData(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, '') // Remove extension
      }))

      // Go to description step
      setCurrentStep('description')
    } else {
      console.log('No file selected')
    }
  }

  const testAIWorker = async () => {
    console.log('🧪 Testing AI Worker...')
    setWorkerStatus('testing')
    
    try {
      const result = await AIAnalysisService.testWorker()
      if (result.success) {
        setWorkerStatus('working')
        console.log('✅ AI Worker is working!')
      } else {
        setWorkerStatus('error')
        console.error('❌ AI Worker test failed:', result.error)
        setError(`AI Worker test failed: ${result.error}`)
      }
    } catch (error) {
      setWorkerStatus('error')
      console.error('❌ AI Worker test error:', error)
      setError(`AI Worker test error: ${error}`)
    }
  }

  const checkStorageStatus = () => {
    const currentSize = LocalStorage.getStorageSize()
    const quota = LocalStorage.getStorageQuota()
    const usagePercent = (currentSize / quota) * 100
    
    console.log(`💾 Storage status: ${(currentSize / 1024 / 1024).toFixed(2)}MB / ${(quota / 1024 / 1024).toFixed(2)}MB (${usagePercent.toFixed(1)}%)`)
    
    if (usagePercent > 90) {
      setStorageStatus('critical')
    } else if (usagePercent > 80) {
      setStorageStatus('warning')
    } else {
      setStorageStatus('ok')
    }
  }

  const clearStorage = () => {
    if (confirm('Are you sure you want to clear all stored memories? This cannot be undone.')) {
      LocalStorage.clearAllData()
      setStorageStatus('ok')
      console.log('🧹 Storage cleared')
    }
  }

  const analyzeFileWithAI = async (file: File, userDescription: string, userNote: string) => {
    setAnalyzing(true)
    setError(null)

    try {
      const analysis = await AIAnalysisService.analyzeMemory({
        file,
        fileType: getFileType(file),
        fileName: file.name,
        content: userDescription,
        title: memoryData.title,
        memoryNote: userNote
      })

      if (analysis.success) {
        setAiAnalysis(analysis.analysis)

        // Update form with AI suggestions, enhancing user input
        setMemoryData(prev => ({
          ...prev,
          title: analysis.analysis.title || prev.title,
          content: userDescription, // Keep user's original description
          memoryNote: analysis.analysis.memoryNote || userNote, // Use AI enhanced memory note or fallback to user input
          tags: analysis.analysis.tags || prev.tags || []
        }))

        console.log('🤖 [DEBUG] AI analysis completed:', {
          originalUserDescription: userDescription,
          originalUserNote: userNote,
          aiTitle: analysis.analysis.title,
          aiMemoryNote: analysis.analysis.memoryNote,
          aiTags: analysis.analysis.tags,
          confidence: analysis.analysis.confidence,
          sentiment: analysis.analysis.sentiment
        })
      } else {
        throw new Error('AI analysis failed')
      }
    } catch (error) {
      console.error('AI analysis failed:', error)
      setError('AI analysis failed, but you can still proceed with manual entry')
      
      // Keep user input as fallback
      setMemoryData(prev => ({
        ...prev,
        content: userDescription,
        memoryNote: userNote
      }))
    } finally {
      setAnalyzing(false)
      setCurrentStep('content')
    }
  }

  const handleDescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!memoryData.title || !memoryData.content) {
      setError('Please provide both a title and description')
      return
    }

    setError(null)

    console.log('📝 [DEBUG] Description step completed:', {
      title: memoryData.title,
      description: memoryData.content,
      memoryNote: memoryData.memoryNote,
      hasFile: !!selectedFile
    })

    // Start AI analysis with user-provided description and note
    if (selectedFile) {
      setCurrentStep('ai-analysis')
      await analyzeFileWithAI(selectedFile, memoryData.content, memoryData.memoryNote || '')
    } else {
      // If no file, skip AI analysis and go directly to content review
      setCurrentStep('content')
    }
  }

  const handleContentSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!memoryData.title || !memoryData.content) {
      setError('Please provide both a title and content')
      return
    }

    setError(null)
    setCurrentStep('visibility')
  }

  const handleVisibilitySelect = (visibility: 'public' | 'private', confirmed: boolean) => {
    setMemoryData(prev => ({ ...prev, visibility }))
    setVisibilityConfirmed(confirmed)

    if (confirmed) {
      setCurrentStep('upload')
      handleUpload(visibility)
    }
  }

  const handleUpload = async (visibility: 'public' | 'private') => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Get user profile from LocalStorage (primary source)
      const localUserProfile = LocalStorage.getUserProfile()
      if (!localUserProfile) {
        throw new Error('User profile not found in LocalStorage')
      }

      console.log('🚀 [DEBUG] Starting hybrid memory upload (LocalStorage + DXOS):', {
        hasLocalProfile: !!localUserProfile,
        hasDXOSClient: !!client,
        hasDXOSSpace: !!currentSpace,
        hasDXOSIdentity: !!identity,
        visibility,
        hasFile: !!selectedFile
      })

      // Create the memory object using LocalStorage as primary source
      const memoryId = LocalStorage.generateId()
      const timestamp = Date.now()

      const memory: Memory = {
        id: memoryId,
        title: memoryData.title!,
        content: memoryData.content!,
        memoryNote: memoryData.memoryNote || '',
        visibility,
        fileType: selectedFile ? getFileType(selectedFile) : 'text',
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        mimeType: selectedFile?.type,
        timestamp,
        authorId: localUserProfile.id,
        authorName: localUserProfile.displayName,
        authorAvatar: localUserProfile.avatar,
        authorContact: localUserProfile.contactLink,
        tags: memoryData.tags
      }

      setUploadProgress(25)

      // Handle file upload if present
      if (selectedFile) {
        // Convert file to base64 for local storage
        const base64Data = await fileToBase64(selectedFile)
        memory.fileData = base64Data
      }

      setUploadProgress(50)

      // Upload to IPFS if public
      if (visibility === 'public') {
        console.log('🌐 [DEBUG] Uploading public memory to IPFS:', {
          memoryId: memory.id,
          hasFile: !!selectedFile,
          fileType: memory.fileType
        })

        try {
          let ipfsResult

          if (selectedFile) {
            console.log('📁 [DEBUG] Uploading file to IPFS:', selectedFile.name)
            ipfsResult = await IPFSService.uploadFileToIPFS(selectedFile, {
              title: memory.title,
              memoryNote: memory.memoryNote,
              authorName: memory.authorName,
              fileType: memory.fileType,
              tags: memory.tags
            })
          } else {
            console.log('📝 [DEBUG] Uploading text content to IPFS')
            ipfsResult = await IPFSService.uploadToIPFS(
              JSON.stringify({
                title: memory.title,
                content: memory.content,
                memoryNote: memory.memoryNote,
                timestamp: memory.timestamp,
                fileType: memory.fileType,
                tags: memory.tags
              }, null, 2),
              {
                title: memory.title,
                memoryNote: memory.memoryNote,
                authorName: memory.authorName,
                fileType: memory.fileType,
                tags: memory.tags
              }
            )
          }

          memory.ipfsCid = ipfsResult.cid
          memory.ipfsUrl = IPFSService.getIPFSUrl(ipfsResult.cid)
          memory.ipfsGatewayUrl = IPFSService.getIPFSGatewayUrl(ipfsResult.cid)

          console.log('✅ [DEBUG] IPFS upload successful:', {
            cid: ipfsResult.cid,
            ipfsUrl: memory.ipfsUrl,
            gatewayUrl: memory.ipfsGatewayUrl
          })

          setUploadProgress(75)
        } catch (ipfsError) {
          console.warn('❌ [DEBUG] IPFS upload failed, continuing with local save:', ipfsError)
          // Continue with local save even if IPFS fails
        }
      } else {
        console.log('🔒 [DEBUG] Private memory - skipping IPFS upload')
      }

      // Save to LocalStorage (primary storage)
      LocalStorage.saveMemory(memory)
      console.log('💾 [DEBUG] Memory saved to LocalStorage (primary)')

      // Try to sync to DXOS if available (secondary/sync storage)
      if (client && currentSpace && identity) {
        try {
          console.log('🔄 [DEBUG] Syncing memory to DXOS space:', memory.id)
          await client.addObject(currentSpace, memory)
          console.log('✅ [DEBUG] Memory synced to DXOS space successfully')
        } catch (dxosError) {
          console.warn('⚠️ [DEBUG] Failed to sync to DXOS, but saved locally:', dxosError)
          // Don't fail the upload if DXOS sync fails
        }
      } else {
        console.log('ℹ️ [DEBUG] DXOS not available, saved to LocalStorage only')
      }

      // Share with network if public
      if (visibility === 'public') {
        console.log('📡 [DEBUG] Sharing public memory with network discovery')
        try {
          const networkDiscovery = getNetworkDiscovery()
          await networkDiscovery.sharePublicMemory(memoryId, {
            title: memory.title,
            content: memory.content,
            timestamp: memory.timestamp,
            fileType: memory.fileType,
            tags: memory.tags,
            ipfsCid: memory.ipfsCid
          })
          console.log('✅ [DEBUG] Memory shared with network discovery successfully')
        } catch (networkError) {
          console.warn('⚠️ [DEBUG] Failed to share with network discovery:', networkError)
          // Continue even if network sharing fails
        }
      } else {
        console.log('🔒 [DEBUG] Private memory - skipping network sharing')
      }

      setUploadProgress(100)
      setCompletedMemory(memory)
      setCurrentStep('complete')

      // Update user profile memory count in LocalStorage (primary)
      LocalStorage.updateUserProfile({ memoriesCount: (localUserProfile.memoriesCount || 0) + 1 })
      console.log('📊 [DEBUG] Updated user profile memory count in LocalStorage')

      // Try to sync updated profile to DXOS if available
      if (client && currentSpace && identity && userProfile) {
        try {
          // Create updated profile for DXOS (which may not have memoriesCount)
          const updatedProfile = {
            ...userProfile,
            lastActive: Date.now() // Update last active instead of memoriesCount
          }
          await client.addObject(currentSpace, updatedProfile)
          console.log('📊 [DEBUG] Synced updated user profile to DXOS')
        } catch (profileError) {
          console.warn('⚠️ [DEBUG] Failed to sync user profile to DXOS:', profileError)
          // Don't fail if DXOS sync fails
        }
      }

      console.log('🎉 [DEBUG] Hybrid memory upload completed successfully:', {
        memoryId: memory.id,
        visibility: memory.visibility,
        savedToLocalStorage: true,
        syncedToDXOS: !!(client && currentSpace && identity),
        hasIPFS: !!memory.ipfsCid,
        spaceId: currentSpace?.id || 'N/A'
      })

      onMemoryUploaded?.(memory)

    } catch (error) {
      console.error('Upload failed:', error)
      setError(`Upload failed: ${error}`)
      setCurrentStep('visibility') // Go back to allow retry
    } finally {
      setUploading(false)
    }
  }

  const getFileType = (file: File): 'text' | 'document' | 'audio' | 'image' | 'video' => {
    const type = file.type.toLowerCase()

    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('video/')) return 'video'
    if (type.startsWith('audio/')) return 'audio'
    if (type.includes('pdf') || type.includes('document') || type.includes('word')) return 'document'

    return 'text'
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const renderFileStep = () => (
    <div className="step-content">
      <div className="step-header">
        <h2>Upload Your Memory</h2>
        <p>
          Choose a file to preserve in your memory vault. Our AI will analyze it and suggest details.
        </p>
      </div>

      <div className="file-upload-section">
        {/* AI Worker Status */}
        <div className="worker-status-section">
          <h3>AI Worker Status</h3>
          <div className="worker-status">
            <span className={`status-indicator ${workerStatus}`}>
              {workerStatus === 'unknown' && '❓ Unknown'}
              {workerStatus === 'testing' && '🔄 Testing...'}
              {workerStatus === 'working' && '✅ Working'}
              {workerStatus === 'error' && '❌ Error'}
            </span>
            <button
              type="button"
              onClick={testAIWorker}
              className="test-worker-btn"
              disabled={workerStatus === 'testing'}
            >
              {workerStatus === 'testing' ? 'Testing...' : 'Test AI Worker'}
            </button>
          </div>
        </div>

        {/* Storage Status */}
        <div className="storage-status-section">
          <h3>Storage Status</h3>
          <div className="storage-status">
            <span className={`status-indicator ${storageStatus}`}>
              {storageStatus === 'unknown' && '❓ Unknown'}
              {storageStatus === 'ok' && '✅ OK'}
              {storageStatus === 'warning' && '⚠️ Warning'}
              {storageStatus === 'critical' && '🚨 Critical'}
            </span>
            <button
              type="button"
              onClick={checkStorageStatus}
              className="test-worker-btn"
            >
              Check Storage
            </button>
            {storageStatus === 'critical' && (
              <button
                type="button"
                onClick={clearStorage}
                className="clear-storage-btn"
              >
                Clear All Data
              </button>
            )}
          </div>
        </div>

        <div className="file-upload-area">
          <button
            type="button"
            onClick={() => {
              console.log('File upload button clicked', fileInputRef.current)
              fileInputRef.current?.click()
            }}
            className="file-upload-btn"
          >
            📁 Choose File
          </button>
          <p className="file-upload-hint">
            Drag and drop a file here, or click to browse
          </p>
          <p className="file-upload-types">
            Supports images, videos, audio, documents, and text files
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="file-input"
          accept="*/*"
          style={{ display: 'none' }}
        />

        {selectedFile && (
          <div className="file-preview">
            <div className="file-info">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  )

  const renderDescriptionStep = () => (
    <div className="step-content">
      <div className="step-header">
        <h2>Describe Your Memory</h2>
        <p>
          Add a title and description for your memory. Our AI will use this information to enhance your memory with additional insights.
        </p>
      </div>

      {selectedFile && (
        <div className="file-preview-section">
          <div className="file-info">
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleDescriptionSubmit} className="upload-form">
        {/* Title */}
        <div className="form-group">
          <label>
            Memory Title *
          </label>
          <input
            type="text"
            value={memoryData.title || ''}
            onChange={(e) => setMemoryData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Give your memory a descriptive title..."
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label>
            Description *
          </label>
          <textarea
            value={memoryData.content || ''}
            onChange={(e) => setMemoryData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Describe what this memory is about, what happened, or why it's important to you..."
            rows={6}
            required
          />
        </div>

        {/* Personal Note */}
        <div className="form-group">
          <label>
            Personal Note (Optional)
          </label>
          <textarea
            value={memoryData.memoryNote || ''}
            onChange={(e) => setMemoryData(prev => ({ ...prev, memoryNote: e.target.value }))}
            placeholder="Add any personal thoughts, feelings, or context about this memory..."
            rows={3}
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="step-navigation">
          <button
            type="button"
            onClick={() => setCurrentStep('file')}
            className="step-btn prev-btn"
          >
            Back to File
          </button>
          <button
            type="submit"
            className="step-btn next-btn"
          >
            Next: AI Analysis
          </button>
        </div>
      </form>
    </div>
  )

  const renderAIAnalysisStep = () => (
    <div className="step-content">
      <div className="step-header">
        <h2>AI Analysis in Progress</h2>
        <p>
          Our AI is analyzing your file to suggest a title, tags, and description...
        </p>
      </div>

      <div className="ai-analysis-progress">
        <div className="analysis-spinner">
          <div className="spinner"></div>
        </div>
        <div className="analysis-steps">
          <div className="analysis-step active">
            <span className="step-icon">🔍</span>
            <span>Analyzing content...</span>
          </div>
          <div className="analysis-step">
            <span className="step-icon">🏷️</span>
            <span>Generating tags...</span>
          </div>
          <div className="analysis-step">
            <span className="step-icon">📝</span>
            <span>Creating description...</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  )

  const renderStepIndicator = () => (
    <div className="step-progress">
      {steps.map((step, index) => (
        <div key={step.id} className={`step ${currentStepIndex >= index ? 'active' : ''} ${currentStepIndex > index ? 'completed' : ''}`}>
          <div className="step-number">{index < currentStepIndex ? '✓' : index + 1}</div>
          <div className="step-label">
            <div className="step-title">{step.title}</div>
            <div className="step-description">{step.description}</div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderContentStep = () => (
    <div className="step-content">
      <div className="step-header">
        <h2>Review {aiAnalysis ? 'AI Suggestions' : 'Your Content'}</h2>
        <p>
          {aiAnalysis
            ? 'Our AI has analyzed your file and enhanced your description. You can edit these before saving.'
            : 'Review and finalize your memory details before saving.'
          }
        </p>
      </div>

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <div className="ai-suggestions-panel">
          <h3>🤖 AI Analysis Results</h3>
          <div className="ai-suggestions-grid">
            <div className="suggestion-item">
              <label>Confidence Score</label>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{ width: `${aiAnalysis.confidence || 0}%` }}
                ></div>
                <span>{aiAnalysis.confidence || 0}%</span>
              </div>
            </div>
            {aiAnalysis.sentiment && (
              <div className="suggestion-item">
                <label>Sentiment</label>
                <span className={`sentiment-badge ${aiAnalysis.sentiment.sentiment}`}>
                  {aiAnalysis.sentiment.sentiment} ({Math.round(aiAnalysis.sentiment.score * 100)}%)
                </span>
              </div>
            )}
            {aiAnalysis.categories && (
              <div className="suggestion-item">
                <label>Category</label>
                <span className="category-badge">{aiAnalysis.categories}</span>
              </div>
            )}
            {aiAnalysis.memoryNote && (
              <div className="suggestion-item">
                <label>AI Enhanced Personal Note</label>
                <div className="ai-suggestion-text">
                  {aiAnalysis.memoryNote}
                </div>
              </div>
            )}
            {aiAnalysis.tags && aiAnalysis.tags.length > 0 && (
              <div className="suggestion-item">
                <label>AI Suggested Tags</label>
                <div className="ai-suggestion-text">
                  {aiAnalysis.tags.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleContentSubmit} className="upload-form">
        {/* Title */}
        <div className="form-group">
          <label>
            Memory Title *
          </label>
          <input
            type="text"
            value={memoryData.title || ''}
            onChange={(e) => setMemoryData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Give your memory a descriptive title..."
            required
          />
        </div>

        {/* Content */}
        <div className="form-group">
          <label>
            Content *
          </label>
          <textarea
            value={memoryData.content || ''}
            onChange={(e) => setMemoryData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="What would you like to remember?..."
            rows={6}
            required
          />
        </div>

        {/* Memory Note */}
        <div className="form-group">
          <label>
            Personal Note
          </label>
          <textarea
            value={memoryData.memoryNote || ''}
            onChange={(e) => setMemoryData(prev => ({ ...prev, memoryNote: e.target.value }))}
            placeholder="Why is this important to you? (optional)"
            rows={3}
          />
        </div>

        {/* File Info Display */}
        {selectedFile && (
          <div className="form-group">
            <label>Selected File</label>
            <div className="file-info-display">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  setAiAnalysis(null)
                  setCurrentStep('file')
                }}
                className="change-file-btn"
              >
                Change File
              </button>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="form-group">
          <label>
            Tags (Optional)
          </label>
          <input
            type="text"
            value={memoryData.tags?.join(', ') || ''}
            onChange={(e) => setMemoryData(prev => ({
              ...prev,
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
            }))}
            placeholder="Add tags separated by commas..."
          />
          <small>
            Tags help organize and find your memories later
          </small>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="step-navigation">
          <button
            type="submit"
            className="step-btn next-btn"
          >
            Next: Choose Visibility
          </button>
        </div>
      </form>
    </div>
  )

  const renderUploadStep = () => (
    <div className="step-content">
      <div className="step-header">
        <h2>Saving Memory</h2>
        <p>
          {memoryData.visibility === 'public'
            ? 'Uploading to IPFS and saving locally...'
            : 'Saving to your local archive...'
          }
        </p>
      </div>

      <div className="upload-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <span className="loading-text">{uploadProgress}% complete</span>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button
            onClick={() => setCurrentStep('visibility')}
            className="retry-btn"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )

  const renderCompleteStep = () => (
    <div className="step-content">
      <div className="step-header">
        <div className="success-icon">✓</div>
        <h2>Memory Saved!</h2>
        <p>
          Your memory has been successfully added to your archive
        </p>
      </div>

      {completedMemory && (
        <div className="memory-preview">
          <div className="preview-header">
            <div>
              <h3>{completedMemory.title}</h3>
              <p className="file-type">{completedMemory.fileType}</p>
            </div>
            <VisibilityIndicator memory={completedMemory} size="sm" />
          </div>

          <div className="preview-status">
            {completedMemory.ipfsCid && (
              <p>✅ Uploaded to IPFS: {completedMemory.ipfsCid.substring(0, 20)}...</p>
            )}
            <p>✅ Saved locally</p>
            {completedMemory.visibility === 'public' && (
              <p>✅ Added to public registry</p>
            )}
          </div>
        </div>
      )}

      <div className="step-navigation">
        <button
          onClick={() => {
            // Reset form
            setCurrentStep('content')
            setMemoryData({
              title: '',
              content: '',
              memoryNote: '',
              visibility: 'private',
              tags: []
            })
            setSelectedFile(null)
            setCompletedMemory(null)
            setError(null)
          }}
          className="step-btn prev-btn"
        >
          Create Another
        </button>
        <button
          onClick={onClose}
          className="step-btn submit-btn"
        >
          Done
        </button>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="memory-upload-overlay"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="memory-upload-modal"
      >
        {/* Header */}
        <div className="upload-header">
          <h1>New Memory</h1>
          <button
            onClick={onClose}
            className="close-button"
            aria-label="Close upload modal"
          >
            ×
          </button>
        </div>

        <div className="upload-content">
          {renderStepIndicator()}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 'file' && renderFileStep()}
              {currentStep === 'description' && renderDescriptionStep()}
              {currentStep === 'ai-analysis' && renderAIAnalysisStep()}
              {currentStep === 'content' && renderContentStep()}
              {currentStep === 'visibility' && (
                <VisibilityStep
                  title={memoryData.title || ''}
                  content={memoryData.content || ''}
                  memoryNote={memoryData.memoryNote || ''}
                  fileType={selectedFile ? getFileType(selectedFile) : 'text'}
                  fileSize={selectedFile?.size}
                  onVisibilitySelect={handleVisibilitySelect}
                  initialVisibility={memoryData.visibility}
                />
              )}
              {currentStep === 'upload' && renderUploadStep()}
              {currentStep === 'complete' && renderCompleteStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}