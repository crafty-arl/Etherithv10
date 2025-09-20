import { useState, useRef } from 'react'
import { MemoryUpload } from '../types/memory'
import { IPFSService, IPFSSimulator } from '../utils/ipfs'
import { LocalStorage } from '../utils/storage'
import { AIAnalysisService } from '../utils/ai-analysis'
import { AIAnalysis } from '../types/ai-analysis'

interface MemoryUploadProps {
  onUploadComplete: (memoryId: string) => void
  onClose: () => void
}

export default function MemoryUploadComponent({ onUploadComplete, onClose }: MemoryUploadProps) {
  const [upload, setUpload] = useState<MemoryUpload>({
    title: '',
    content: '',
    memoryNote: '',
    visibility: 'public',
    tags: []
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [uploadStage, setUploadStage] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [useAI, setUseAI] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalSteps = 4

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (file.size > maxSize) {
        setError(`File size too large. Maximum size is 10MB. Your file is ${IPFSSimulator.formatFileSize(file.size)}`)
        return
      }
      
      setUpload(prev => ({ ...prev, file }))
      setError('') // Clear any previous errors
      
      // Create file preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => setFilePreview(e.target?.result as string)
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
      
      // Auto-advance to next step
      setCurrentStep(2)
    }
  }

  const getFileType = (file: File): 'text' | 'document' | 'audio' | 'image' | 'video' => {
    const mimeType = file.type
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.includes('text/') || mimeType.includes('application/pdf')) return 'document'
    return 'document'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!upload.title.trim()) {
      setError('Title is required')
      return
    }
    if (!upload.content.trim()) {
      setError('Content is required')
      return
    }
    if (!upload.memoryNote.trim()) {
      setError('Memory Note is required - explain why this matters')
      return
    }

    // Start memory upload process

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStage('Preparing upload...')

    try {
      let userProfile = LocalStorage.getUserProfile()
      if (!userProfile) {
        setUploadStage('Creating user profile...')
        // Create a basic user profile if none exists
        userProfile = {
          id: 'anonymous',
          email: 'anonymous@etherith.com',
          displayName: 'Anonymous User',
          createdAt: Date.now(),
          memoriesCount: 0
        }
        LocalStorage.saveUserProfile(userProfile)
      }

      // Simulate upload progress with stages
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = Math.min(prev + 5, 90)
          if (newProgress < 30) {
            setUploadStage('Preparing content...')
          } else if (newProgress < 60) {
            setUploadStage('Uploading to IPFS...')
          } else if (newProgress < 90) {
            setUploadStage('Processing metadata...')
          }
          return newProgress
        })
      }, 300)

      let ipfsResult
      let fileData: string | undefined = ''
      let fileName = ''
      let fileSize = 0
      let mimeType = ''

      // Prepare metadata for IPFS upload
      const metadata = {
        title: upload.title.trim(),
        memoryNote: upload.memoryNote.trim(),
        authorName: userProfile.displayName,
        fileType: upload.file ? getFileType(upload.file) : 'text',
        tags: upload.tags || []
      }

      if (upload.file) {
        setUploadStage('Uploading file to IPFS...')
        // Upload file to IPFS via Pinata
        ipfsResult = await IPFSService.uploadFileToIPFS(upload.file, metadata)
        
        setUploadStage('Processing file data...')
        // Only store base64 for small files (< 1MB) to avoid localStorage quota issues
        const maxLocalStorageSize = 1024 * 1024 // 1MB
        if (upload.file.size <= maxLocalStorageSize) {
          fileData = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(upload.file!)
          })
        } else {
          // Large files won't be stored in localStorage
          fileData = undefined
        }
        
        fileName = upload.file.name
        fileSize = upload.file.size
        mimeType = upload.file.type
      } else {
        setUploadStage('Uploading text to IPFS...')
        // Upload text content to IPFS via Pinata
        ipfsResult = await IPFSService.uploadToIPFS(upload.content, metadata)
      }

      clearInterval(progressInterval)
      setUploadStage('Saving memory...')
      setUploadProgress(100)

      // Create memory object
      const memory = {
        id: LocalStorage.generateId(),
        title: upload.title.trim(),
        content: upload.content.trim(),
        memoryNote: upload.memoryNote.trim(),
        visibility: upload.visibility,
        fileType: upload.file ? getFileType(upload.file) : 'text',
        fileData: upload.file ? fileData : undefined,
        fileName: upload.file ? fileName : undefined,
        fileSize: upload.file ? fileSize : upload.content.length,
        mimeType: upload.file ? mimeType : 'text/plain',
        ipfsCid: ipfsResult.cid,
        ipfsUrl: IPFSService.getIPFSUrl(ipfsResult.cid),
        ipfsGatewayUrl: IPFSService.getIPFSGatewayUrl(ipfsResult.cid),
        timestamp: Date.now(),
        authorId: userProfile.id,
        authorName: userProfile.displayName,
        authorAvatar: userProfile.avatar,
        authorContact: userProfile.contactLink,
        tags: upload.tags || []
      }

      // Save to local storage
      try {
        LocalStorage.saveMemory(memory)
      } catch (error) {
        if (error instanceof Error && error.message.includes('quota')) {
          LocalStorage.clearLargeFileData()
          // Try saving again
          LocalStorage.saveMemory(memory)
        } else {
          throw error
        }
      }

      // Update user profile memory count
      LocalStorage.updateUserProfile({
        memoriesCount: userProfile.memoriesCount + 1
      })

      setUploadStage('Complete!')
      setTimeout(() => {
        onUploadComplete(memory.id)
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setUploadStage('')
    }
  }

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = e.currentTarget.value.trim()
      if (value && !upload.tags?.includes(value)) {
        setUpload(prev => ({
          ...prev,
          tags: [...(prev.tags || []), value]
        }))
        e.currentTarget.value = ''
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    setUpload(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  const handleAIAnalysis = async () => {
    if (!upload.content.trim()) {
      setError('Please enter content before analyzing with AI')
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      const analysis = await AIAnalysisService.analyzeMemoryWithFallback({
        content: upload.content,
        title: upload.title,
        memoryNote: upload.memoryNote,
        fileType: upload.file ? getFileType(upload.file) : 'text',
        fileName: upload.file?.name,
        file: upload.file
      })

      if (analysis.success) {
        setAiAnalysis(analysis.analysis)
        
        // Auto-fill the form with AI suggestions
        setUpload(prev => ({
          ...prev,
          title: analysis.analysis.title || prev.title,
          memoryNote: analysis.analysis.memoryNote || prev.memoryNote,
          tags: analysis.analysis.tags || prev.tags
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applyAIAnalysis = () => {
    if (aiAnalysis) {
      setUpload(prev => ({
        ...prev,
        title: aiAnalysis.title || prev.title,
        memoryNote: aiAnalysis.memoryNote || prev.memoryNote,
        tags: aiAnalysis.tags || prev.tags
      }))
    }
  }

  const clearAIAnalysis = () => {
    setAiAnalysis(null)
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step)
    }
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return !!upload.file
      case 2:
        return upload.content.trim().length > 0
      case 3:
        return upload.title.trim().length > 0 && upload.memoryNote.trim().length > 0
      case 4:
        return upload.visibility === 'public' || upload.visibility === 'private'
      default:
        return false
    }
  }

  return (
    <div className="memory-upload-overlay" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <div className="memory-upload-modal">
        <header className="upload-header">
          <h2 id="upload-title">Preserve a Memory</h2>
          <button className="close-button" onClick={onClose} aria-label="Close upload modal">×</button>
        </header>

        {/* Step Progress Indicator */}
        <nav className="step-progress" role="progressbar" aria-label="Upload progress" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className={`step ${currentStep >= step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}>
              <div className="step-number" aria-hidden="true">{step}</div>
              <div className="step-label">
                {step === 1 && 'Upload File'}
                {step === 2 && 'Add Context'}
                {step === 3 && 'AI Analysis'}
                {step === 4 && 'Review & Save'}
              </div>
            </div>
          ))}
        </nav>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <div className="step-content">
              <div className="step-header">
                <h3>
                  <span aria-hidden="true">📁</span>
                  Upload Your Memory File
                </h3>
                <p>Start by uploading the file you want to preserve. This could be a photo, document, video, or any other file that holds your memory.</p>
              </div>
              
              <div className="form-group">
                <label htmlFor="file">Choose File *</label>
                <div className="file-upload-area">
                  <input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept="text/*,image/*,video/*,audio/*,.pdf,.doc,.docx"
                    className="file-input"
                    aria-describedby="file-help"
                  />
                  <div className="file-upload-prompt">
                    <div className="upload-icon" aria-hidden="true">📁</div>
                    <p>Click to select a file or drag and drop</p>
                    <small id="file-help">Supports: Images, Videos, Audio, PDFs, Documents (Max 10MB)</small>
                  </div>
                </div>
                
                {upload.file && (
                  <div className="file-preview" role="region" aria-label="Selected file preview">
                    {filePreview && (
                      <img src={filePreview} alt={`Preview of ${upload.file.name}`} className="file-image-preview" />
                    )}
                    <div className="file-info">
                      <span className="file-name">
                        <span aria-hidden="true">📎</span>
                        {upload.file.name}
                      </span>
                      <span className="file-size">({IPFSSimulator.formatFileSize(upload.file.size)})</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setUpload(prev => ({ ...prev, file: undefined }))
                          setFilePreview(null)
                          setCurrentStep(1)
                        }}
                        className="remove-file-btn"
                        aria-label={`Remove ${upload.file.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Add Context */}
          {currentStep === 2 && (
            <div className="step-content">
              <div className="step-header">
                <h3>✍️ Add Context</h3>
                <p>Tell us about this memory. What's the story behind this file? What makes it special?</p>
              </div>
              
              <div className="form-group">
                <label htmlFor="content">Memory Description *</label>
                <textarea
                  id="content"
                  value={upload.content}
                  onChange={(e) => setUpload(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Describe this memory... What happened? Who was there? Why is it important to you?"
                  rows={6}
                  required
                />
                <small>This helps AI understand and categorize your memory better</small>
              </div>
            </div>
          )}

          {/* Step 3: AI Analysis */}
          {currentStep === 3 && (
            <div className="step-content">
              <div className="step-header">
                <h3>
                  <span aria-hidden="true">🤖</span>
                  AI Analysis
                </h3>
                <p>Let AI help you create a perfect title, tags, and preservation note for your memory.</p>
              </div>
              
              <div className="ai-analysis-section">
                <button
                  type="button"
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing}
                  className="ai-analyze-btn-large"
                  aria-describedby="ai-analysis-help"
                >
                  <span aria-hidden="true">🤖</span>
                  {isAnalyzing ? 'Analyzing Your Memory...' : 'Analyze with AI'}
                </button>
                <div id="ai-analysis-help" className="sr-only">
                  Click to analyze your memory content and generate suggestions for title, tags, and preservation note
                </div>
                
                {aiAnalysis && (
                  <div className="ai-analysis-results" role="region" aria-labelledby="ai-suggestions-heading">
                    <div className="ai-analysis-header">
                      <h4 id="ai-suggestions-heading">
                        <span aria-hidden="true">✨</span>
                        AI Suggestions
                      </h4>
                      <div className="ai-analysis-actions">
                        <button type="button" onClick={applyAIAnalysis} className="apply-ai-btn" aria-label="Apply all AI suggestions">
                          Apply All
                        </button>
                        <button type="button" onClick={clearAIAnalysis} className="clear-ai-btn" aria-label="Clear AI suggestions">
                          Clear
                        </button>
                      </div>
                    </div>
                    
                    <div className="ai-suggestions-grid">
                      <div className="ai-suggestion">
                        <label>Suggested Title:</label>
                        <div className="suggestion-value">{aiAnalysis.title}</div>
                      </div>
                      
                      <div className="ai-suggestion">
                        <label>Suggested Tags:</label>
                        <div className="suggestion-tags" role="list" aria-label="Suggested tags">
                          {aiAnalysis.tags.map((tag, index) => (
                            <span key={index} className="ai-tag" role="listitem">{tag}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="ai-suggestion">
                        <label>Suggested Memory Note:</label>
                        <div className="suggestion-value">{aiAnalysis.memoryNote}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  id="title"
                  type="text"
                  value={upload.title}
                  onChange={(e) => setUpload(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What is this memory about?"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="memoryNote">Preservation Note *</label>
                <textarea
                  id="memoryNote"
                  value={upload.memoryNote}
                  onChange={(e) => setUpload(prev => ({ ...prev, memoryNote: e.target.value }))}
                  placeholder="What makes this memory significant? Why should it be preserved?"
                  rows={3}
                  required
                />
                <small>Explain why this memory is important to preserve</small>
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tags (Optional)</label>
                <input
                  id="tags"
                  type="text"
                  onKeyDown={handleTagInput}
                  placeholder="Type tags and press Enter or comma"
                  aria-describedby="tags-help"
                />
                <div id="tags-help" className="sr-only">Press Enter or comma to add a tag</div>
                {upload.tags && upload.tags.length > 0 && (
                  <div className="tags-list" role="list" aria-label="Added tags">
                    {upload.tags.map((tag, index) => (
                      <span key={index} className="tag" role="listitem">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Review & Save */}
          {currentStep === 4 && (
            <div className="step-content">
              <div className="step-header">
                <h3>📋 Review & Save</h3>
                <p>Review your memory details and choose visibility settings before preserving it.</p>
                {!upload.visibility && (
                  <div className="step-requirement">
                    <span className="requirement-icon">⚠️</span>
                    <span>Please select visibility (Public or Private) to continue</span>
                  </div>
                )}
              </div>
              
              <div className="memory-preview">
                <div className="preview-file">
                  {filePreview && (
                    <img src={filePreview} alt="Memory preview" className="preview-image" />
                  )}
                  <div className="preview-info">
                    <h4>{upload.title || 'Untitled Memory'}</h4>
                    <p className="preview-content">{upload.content}</p>
                    <p className="preview-note">{upload.memoryNote}</p>
                    {upload.tags && upload.tags.length > 0 && (
                      <div className="preview-tags">
                        {upload.tags.map((tag, index) => (
                          <span key={index} className="preview-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Visibility *</label>
                <div className="visibility-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={upload.visibility === 'public'}
                      onChange={(e) => setUpload(prev => ({ ...prev, visibility: e.target.value as 'public' | 'private' }))}
                    />
                    <span>Public - Visible to everyone</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={upload.visibility === 'private'}
                      onChange={(e) => setUpload(prev => ({ ...prev, visibility: e.target.value as 'public' | 'private' }))}
                    />
                    <span>Private - Only you can see</span>
                  </label>
                </div>
                <small>Choose who can see this memory before preserving it</small>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {isUploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="loading-text">
                {uploadStage} {uploadProgress}%
              </span>
            </div>
          )}

          {/* Step Navigation */}
          <div className="step-navigation">
            <div className="step-buttons">
              {currentStep > 1 && (
                <button 
                  type="button" 
                  onClick={prevStep}
                  className="step-btn prev-btn"
                  disabled={isUploading}
                >
                  ← Previous
                </button>
              )}
              
              {currentStep < totalSteps ? (
                <button 
                  type="button" 
                  onClick={nextStep}
                  className="step-btn next-btn"
                  disabled={!canProceedToNext() || isUploading}
                >
                  Next →
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="step-btn submit-btn"
                  disabled={!canProceedToNext() || isUploading}
                >
                  {isUploading ? 'Preserving...' : 'Preserve Memory'}
                </button>
              )}
            </div>
            
            <div className="step-indicators">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => goToStep(step)}
                  className={`step-indicator ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
                  disabled={isUploading}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
