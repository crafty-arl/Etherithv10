import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Memory, MemoryUpload } from '../types/memory'
import { LocalStorage } from '../utils/storage'
import { IPFSService } from '../utils/ipfs'
import { VisibilityStep } from './VisibilityStep'
import { VisibilityIndicator } from './VisibilityIndicator'

interface EnhancedMemoryUploadProps {
  onMemoryUploaded?: (memory: Memory) => void
  onClose?: () => void
}

type UploadStep = 'content' | 'visibility' | 'upload' | 'complete'

export const EnhancedMemoryUpload: React.FC<EnhancedMemoryUploadProps> = ({
  onMemoryUploaded,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState<UploadStep>('content')
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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const steps: { id: UploadStep; title: string; description: string }[] = [
    { id: 'content', title: 'Content', description: 'Add your memory content' },
    { id: 'visibility', title: 'Visibility', description: 'Choose who can see it' },
    { id: 'upload', title: 'Upload', description: 'Save to your archive' },
    { id: 'complete', title: 'Complete', description: 'Memory saved!' }
  ]

  const currentStepIndex = steps.findIndex(step => step.id === currentStep)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)

      // Auto-fill title if empty
      if (!memoryData.title) {
        setMemoryData(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, '') // Remove extension
        }))
      }
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
      const userProfile = LocalStorage.getUserProfile()
      if (!userProfile) {
        throw new Error('User profile not found')
      }

      // Create the memory object
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
        authorId: userProfile.id,
        authorName: userProfile.displayName,
        authorAvatar: userProfile.avatar,
        authorContact: userProfile.contactLink,
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
        try {
          let ipfsResult

          if (selectedFile) {
            ipfsResult = await IPFSService.uploadFileToIPFS(selectedFile, {
              title: memory.title,
              memoryNote: memory.memoryNote,
              authorName: memory.authorName,
              fileType: memory.fileType,
              tags: memory.tags
            })
          } else {
            ipfsResult = await IPFSService.uploadToIPFS(
              JSON.stringify({
                title: memory.title,
                content: memory.content,
                memoryNote: memory.memoryNote,
                timestamp: memory.timestamp,
                fileType: memory.fileType
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

          setUploadProgress(75)
        } catch (ipfsError) {
          console.warn('IPFS upload failed, saving locally:', ipfsError)
          // Continue with local save even if IPFS fails
        }
      }

      // Save locally
      LocalStorage.saveMemory(memory)

      setUploadProgress(100)
      setCompletedMemory(memory)
      setCurrentStep('complete')

      // Update user profile memory count
      LocalStorage.updateUserProfile({ memoriesCount: (userProfile.memoriesCount || 0) + 1 })

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
        <h2>Create New Memory</h2>
        <p>
          Add content to preserve in your personal archive
        </p>
      </div>

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

        {/* File Upload */}
        <div className="form-group">
          <label>
            Attach File (Optional)
          </label>
          <div className="file-upload-area">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="file-upload-btn"
            >
              Choose File
            </button>
            {selectedFile && (
              <span className="file-info">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="file-input"
            accept="*/*"
          />
        </div>

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