import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Memory, MemoryUpload } from '../types/memory'
import { LocalStorage } from '../utils/storage'
import { IPFSService } from '../utils/ipfs'
import { AIAnalysisService } from '../utils/ai-analysis'
import { RegistryManager } from '../utils/registry'
import { SyncStatusIndicator } from './SyncStatusIndicator'

interface MobileFileUploadProps {
  onMemoryUploaded?: (memory: Memory) => void
  onClose?: () => void
  isVisible: boolean
}

type UploadState = 'capture' | 'preview' | 'uploading' | 'complete'

export const MobileFileUpload: React.FC<MobileFileUploadProps> = ({
  onMemoryUploaded,
  onClose,
  isVisible
}) => {
  const [state, setState] = useState<UploadState>('capture')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [uploadData, setUploadData] = useState<Partial<MemoryUpload>>({
    title: '',
    content: '',
    memoryNote: '',
    visibility: 'private',
    tags: []
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  // Camera and file handling
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      setError('Camera access is required for photo capture')
    }
  }

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context?.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        handleFileSelected(file)
      }
    }, 'image/jpeg', 0.8)

    stopCamera()
  }, [])

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
  }

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file)
    setError(null)

    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setFilePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }

    // Auto-generate suggestions
    try {
      const analysis = await AIAnalysisService.analyzeMemoryWithFallback({
        content: '',
        title: '',
        memoryNote: '',
        fileType: getFileType(file),
        fileName: file.name,
        file
      })

      if (analysis.success) {
        setAiSuggestions(analysis.analysis)
        setUploadData(prev => ({
          ...prev,
          title: analysis.analysis.title || file.name.replace(/\.[^/.]+$/, ''),
          content: analysis.analysis.memoryNote || '',
          tags: analysis.analysis.tags || []
        }))
      }
    } catch (error) {
      console.warn('AI analysis failed:', error)
      // Fallback to basic file name
      setUploadData(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, '')
      }))
    }

    setState('preview')
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelected(file)
    }
  }

  const getFileType = (file: File): 'text' | 'document' | 'audio' | 'image' | 'video' => {
    const type = file.type.toLowerCase()
    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('video/')) return 'video'
    if (type.startsWith('audio/')) return 'audio'
    if (type.includes('pdf') || type.includes('document')) return 'document'
    return 'text'
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.title) {
      setError('Title is required')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setState('uploading')

    try {
      const userProfile = LocalStorage.getUserProfile()
      if (!userProfile) {
        throw new Error('User profile not found')
      }

      // Create memory object
      const memory: Memory = {
        id: LocalStorage.generateId(),
        title: uploadData.title,
        content: uploadData.content || '',
        memoryNote: uploadData.memoryNote || '',
        visibility: uploadData.visibility || 'private',
        fileType: getFileType(selectedFile),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        timestamp: Date.now(),
        authorId: userProfile.id,
        authorName: userProfile.displayName,
        authorAvatar: userProfile.avatar,
        authorContact: userProfile.contactLink,
        tags: uploadData.tags || []
      }

      setUploadProgress(25)

      // Convert file to base64 for local storage
      const base64Data = await fileToBase64(selectedFile)
      memory.fileData = base64Data

      setUploadProgress(50)

      // Upload to IPFS if public
      if (uploadData.visibility === 'public') {
        try {
          const ipfsResult = await IPFSService.uploadFileToIPFS(selectedFile, {
            title: memory.title,
            memoryNote: memory.memoryNote,
            authorName: memory.authorName,
            fileType: memory.fileType,
            tags: memory.tags
          })

          memory.ipfsCid = ipfsResult.cid
          memory.ipfsUrl = IPFSService.getIPFSUrl(ipfsResult.cid)
          memory.ipfsGatewayUrl = IPFSService.getIPFSGatewayUrl(ipfsResult.cid)
        } catch (ipfsError) {
          console.warn('IPFS upload failed, saving locally:', ipfsError)
        }
      }

      setUploadProgress(75)

      // Save locally
      LocalStorage.saveMemory(memory)

      // Update registry if memory is public
      if (memory.visibility === 'public') {
        try {
          await RegistryManager.updateRegistryFromMemories()
        } catch (registryError) {
          console.warn('Registry update failed, continuing:', registryError)
          // Don't fail the upload if registry update fails
        }
      }

      // Update user profile
      LocalStorage.updateUserProfile({
        memoriesCount: (userProfile.memoriesCount || 0) + 1
      })

      setUploadProgress(100)
      setState('complete')

      onMemoryUploaded?.(memory)

    } catch (error) {
      console.error('Upload failed:', error)
      setError(`Upload failed: ${error}`)
      setState('preview')
    } finally {
      setUploading(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setUploadData({
      title: '',
      content: '',
      memoryNote: '',
      visibility: 'private',
      tags: []
    })
    setAiSuggestions(null)
    setError(null)
    setUploadProgress(0)
    setState('capture')
    stopCamera()
  }

  // Gesture handlers
  const handleSwipeDown = () => {
    if (state === 'capture') {
      onClose?.()
    } else {
      resetUpload()
    }
  }

  const renderCaptureInterface = () => (
    <div className="mobile-capture-interface">
      {/* Camera Preview (if active) */}
      {cameraStream && (
        <div className="camera-preview">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="camera-controls">
            <button
              onClick={() => stopCamera()}
              className="camera-control secondary"
              aria-label="Cancel camera"
            >
              ✕
            </button>
            <button
              onClick={capturePhoto}
              className="camera-control primary"
              aria-label="Take photo"
            >
              📸
            </button>
          </div>
        </div>
      )}

      {/* Quick Capture Options */}
      {!cameraStream && (
        <div className="quick-capture-grid">
          <h2>Capture Memory</h2>

          <div className="capture-options">
            <button
              onClick={startCamera}
              className="capture-option primary"
              aria-label="Take photo with camera"
            >
              <span className="capture-icon">📸</span>
              <span className="capture-label">Take Photo</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="capture-option"
              aria-label="Choose existing file"
            >
              <span className="capture-icon">📁</span>
              <span className="capture-label">Choose File</span>
            </button>

            <button
              onClick={() => {
                setSelectedFile(null)
                setState('preview')
              }}
              className="capture-option"
              aria-label="Create text memory"
            >
              <span className="capture-icon">✍️</span>
              <span className="capture-label">Text Memory</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInput}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  )

  const renderPreviewInterface = () => (
    <div className="mobile-preview-interface">
      {/* File Preview */}
      {filePreview && (
        <div className="file-preview-section">
          <img src={filePreview} alt="Memory preview" className="preview-image" />
          <div className="file-info">
            <span className="file-name">{selectedFile?.name}</span>
            <span className="file-size">
              {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
        </div>
      )}

      {/* Quick Edit Form */}
      <div className="memory-form">
        <div className="form-group">
          <label htmlFor="memory-title">Title</label>
          <input
            id="memory-title"
            type="text"
            value={uploadData.title || ''}
            onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="What's this memory about?"
            className="form-input large"
          />
        </div>

        <div className="form-group">
          <label htmlFor="memory-content">Description (optional)</label>
          <textarea
            id="memory-content"
            value={uploadData.content || ''}
            onChange={(e) => setUploadData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Add context about this memory..."
            rows={3}
            className="form-textarea"
          />
        </div>

        {/* AI Suggestions */}
        {aiSuggestions && (
          <div className="ai-suggestions">
            <h4>AI Suggestions</h4>
            {aiSuggestions.tags && aiSuggestions.tags.length > 0 && (
              <div className="suggested-tags">
                {aiSuggestions.tags.map((tag: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => {
                      const currentTags = uploadData.tags || []
                      if (!currentTags.includes(tag)) {
                        setUploadData(prev => ({
                          ...prev,
                          tags: [...currentTags, tag]
                        }))
                      }
                    }}
                    className="tag-suggestion"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Current Tags */}
        {uploadData.tags && uploadData.tags.length > 0 && (
          <div className="current-tags">
            {uploadData.tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
                <button
                  onClick={() => {
                    setUploadData(prev => ({
                      ...prev,
                      tags: prev.tags?.filter(t => t !== tag)
                    }))
                  }}
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Visibility Toggle */}
        <div className="visibility-section">
          <label>Who can see this?</label>
          <div className="visibility-toggle">
            <button
              onClick={() => setUploadData(prev => ({ ...prev, visibility: 'private' }))}
              className={`visibility-option ${uploadData.visibility === 'private' ? 'active' : ''}`}
            >
              <span className="visibility-icon">🔒</span>
              <span className="visibility-label">Private</span>
            </button>
            <button
              onClick={() => setUploadData(prev => ({ ...prev, visibility: 'public' }))}
              className={`visibility-option ${uploadData.visibility === 'public' ? 'active' : ''}`}
            >
              <span className="visibility-icon">🌍</span>
              <span className="visibility-label">Public</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  )

  const renderUploadingInterface = () => (
    <div className="mobile-uploading-interface">
      <div className="upload-status">
        <div className="upload-icon">💾</div>
        <h3>Saving Memory...</h3>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <p>{uploadProgress}% complete</p>
      </div>
    </div>
  )

  const renderCompleteInterface = () => (
    <div className="mobile-complete-interface">
      <div className="success-status">
        <div className="success-icon">✅</div>
        <h3>Memory Saved!</h3>
        <p>Your memory has been preserved</p>

        <div className="completion-actions">
          <button onClick={onClose} className="action-button primary">
            View in Vault
          </button>
          <button onClick={resetUpload} className="action-button secondary">
            Create Another
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="mobile-upload-bottomsheet"
          onPanEnd={(_, info) => {
            if (info.offset.y > 150) {
              handleSwipeDown()
            }
          }}
        >
          <div className="bottomsheet-header">
            <div className="drag-handle" />
            <SyncStatusIndicator compact className="sync-indicator" />
            <button onClick={handleSwipeDown} className="close-button">
              ×
            </button>
          </div>

          <div className="bottomsheet-content">
            {state === 'capture' && renderCaptureInterface()}
            {state === 'preview' && renderPreviewInterface()}
            {state === 'uploading' && renderUploadingInterface()}
            {state === 'complete' && renderCompleteInterface()}
          </div>

          {state === 'preview' && (
            <div className="bottomsheet-actions">
              <button onClick={handleUpload} className="primary-action">
                Save Memory
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}