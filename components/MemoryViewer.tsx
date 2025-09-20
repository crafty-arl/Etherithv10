import { useState, useEffect } from 'react'
import { Memory } from '../types/memory'
import { IPFSService } from '../utils/ipfs'

interface MemoryViewerProps {
  memory: Memory
  onClose: () => void
  onEdit?: (memory: Memory) => void
  onDelete?: (memory: Memory) => void
  canEdit?: boolean
  canDelete?: boolean
}

export default function MemoryViewer({ memory, onClose, onEdit, onDelete, canEdit = false, canDelete = false }: MemoryViewerProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<{
    exists: boolean
    replicas: number
    lastSeen: number
  } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [hasVerified, setHasVerified] = useState(false)

  useEffect(() => {
    if (memory.ipfsCid && !memory.fileData) {
      // Only verify if we don't have local file data, with a small delay
      const timer = setTimeout(() => {
        handleVerifyPreservation()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [memory.ipfsCid, memory.fileData])

  const handleVerifyPreservation = async () => {
    if (!memory.ipfsCid) return
    
    setIsVerifying(true)
    setHasVerified(false)
    try {
      const result = await IPFSService.verifyPreservation(memory.ipfsCid)
      setVerificationStatus(result)
    } catch (error) {
      console.error('Verification failed:', error)
      setVerificationStatus({ exists: false, replicas: 0, lastSeen: 0 })
    } finally {
      setIsVerifying(false)
      setHasVerified(true)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(memory)
    }
    setShowDeleteConfirm(false)
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'audio': return '🎵'
      case 'document': return '📄'
      default: return '📝'
    }
  }

  const renderFileContent = () => {
    // If no file data and no IPFS link, show text content
    if (!memory.fileData && !memory.ipfsUrl) {
      return (
        <div className="text-content">
          <pre>{memory.content}</pre>
        </div>
      )
    }

    // Only show IPFS-related messages if we don't have local file data
    const needsIpfsLoading = !memory.fileData && memory.ipfsUrl
    const showLoadingState = needsIpfsLoading && isVerifying && !hasVerified
    const showErrorState = needsIpfsLoading && hasVerified && verificationStatus && !verificationStatus.exists

    // Determine the source URL - prefer local data, fallback to IPFS
    const mediaUrl = memory.fileData || memory.ipfsUrl

    if (memory.fileType === 'image') {
      return (
        <div className="image-content">
          <img 
            src={mediaUrl} 
            alt={memory.title}
            onError={(e) => {
              console.log('Image load failed, trying IPFS gateway...')
              if (memory.ipfsGatewayUrl && mediaUrl === memory.ipfsUrl) {
                e.currentTarget.src = memory.ipfsGatewayUrl
              }
            }}
          />
          {showLoadingState && (
            <div className="ipfs-notice">
              <small>📦 Loading from IPFS - {memory.ipfsUrl}</small>
            </div>
          )}
          {showErrorState && (
            <div className="ipfs-error">
              <small>❌ Content not available on IPFS</small>
            </div>
          )}
        </div>
      )
    }

    if (memory.fileType === 'video') {
      return (
        <div className="video-content">
          <video controls>
            <source src={mediaUrl} type={memory.mimeType} />
            Your browser does not support the video tag.
          </video>
          {showLoadingState && (
            <div className="ipfs-notice">
              <small>📦 Loading from IPFS - {memory.ipfsUrl}</small>
            </div>
          )}
          {showErrorState && (
            <div className="ipfs-error">
              <small>❌ Content not available on IPFS</small>
            </div>
          )}
        </div>
      )
    }

    if (memory.fileType === 'audio') {
      return (
        <div className="audio-content">
          <audio controls>
            <source src={mediaUrl} type={memory.mimeType} />
            Your browser does not support the audio tag.
          </audio>
          {showLoadingState && (
            <div className="ipfs-notice">
              <small>📦 Loading from IPFS - {memory.ipfsUrl}</small>
            </div>
          )}
          {showErrorState && (
            <div className="ipfs-error">
              <small>❌ Content not available on IPFS</small>
            </div>
          )}
        </div>
      )
    }

    if (memory.fileType === 'document') {
      return (
        <div className="document-content">
          {memory.mimeType === 'application/pdf' ? (
            <iframe 
              src={mediaUrl} 
              width="100%" 
              height="600px"
              title={memory.title}
            />
          ) : (
            <div className="text-content">
              <pre>{memory.content}</pre>
            </div>
          )}
          {showLoadingState && (
            <div className="ipfs-notice">
              <small>📦 Loading from IPFS - {memory.ipfsUrl}</small>
            </div>
          )}
          {showErrorState && (
            <div className="ipfs-error">
              <small>❌ Content not available on IPFS</small>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="text-content">
        <pre>{memory.content}</pre>
      </div>
    )
  }

  return (
    <div className="memory-viewer-overlay" role="dialog" aria-modal="true" aria-labelledby="memory-viewer-title">
      <div className="memory-viewer-modal">
        <header className="viewer-header">
          <div className="memory-meta">
            <h1 className="memory-title" id="memory-viewer-title">{memory.title}</h1>
            <div className="memory-type">
              <span className="file-icon" aria-hidden="true">{getFileIcon(memory.fileType)}</span>
              <span className="file-type">{memory.fileType}</span>
              {memory.fileName && (
                <span className="file-name">{memory.fileName}</span>
              )}
            </div>
          </div>
          <div className="viewer-actions">
            {canEdit && onEdit && (
              <button className="edit-button" onClick={() => onEdit(memory)} aria-label={`Edit memory: ${memory.title}`}>
                Edit
              </button>
            )}
            {canDelete && onDelete && (
              <button className="delete-button" onClick={handleDeleteClick} aria-label={`Delete memory: ${memory.title}`} title="Delete memory">
                <span aria-hidden="true">🗑️</span>
              </button>
            )}
            <button className="close-button" onClick={onClose} aria-label="Close memory viewer">×</button>
          </div>
        </header>

        <div className="viewer-content">
          <div className="memory-info">
            <div className="author-info">
              <div className="author-details">
                {memory.authorAvatar && (
                  <img 
                    src={memory.authorAvatar} 
                    alt={`${memory.authorName} profile picture`}
                    className="author-avatar"
                  />
                )}
                <div>
                  <div className="author-name">{memory.authorName}</div>
                  <time className="memory-date" dateTime={new Date(memory.timestamp).toISOString()}>
                    {formatDate(memory.timestamp)}
                  </time>
                </div>
              </div>
              <div className={`visibility ${memory.visibility}`} aria-label={`${memory.visibility} memory`}>
                <span aria-hidden="true">{memory.visibility === 'public' ? '🌐' : '🔒'}</span>
                <span className="sr-only">{memory.visibility}</span>
              </div>
            </div>

            {memory.tags && memory.tags.length > 0 && (
              <div className="memory-tags" role="list" aria-label="Memory tags">
                {memory.tags.map((tag, index) => (
                  <span key={index} className="tag" role="listitem">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="memory-note-section">
            <h3>Preservation Significance</h3>
            <p className="memory-note">{memory.memoryNote}</p>
          </div>

          <div className="memory-content-section">
            <h3>Content</h3>
            {renderFileContent()}
          </div>

          <div className="preservation-proof-section">
            <h3>Proof of Preservation</h3>
            {memory.ipfsCid ? (
              <div className="ipfs-proof">
                <div className="ipfs-details">
                  <div className="ipfs-field">
                    <label>IPFS CID:</label>
                    <code className="ipfs-cid">{memory.ipfsCid}</code>
                    <button 
                      className="copy-button"
                      onClick={() => navigator.clipboard.writeText(memory.ipfsCid!)}
                    >
                      Copy
                    </button>
                  </div>
                  
                  {memory.ipfsGatewayUrl && (
                    <div className="ipfs-field">
                      <label>IPFS Gateway:</label>
                      <a 
                        href={memory.ipfsGatewayUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ipfs-link"
                      >
                        {memory.ipfsGatewayUrl}
                      </a>
                    </div>
                  )}

                  {memory.ipfsUrl && (
                    <div className="ipfs-field">
                      <label>Public IPFS:</label>
                      <a 
                        href={memory.ipfsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ipfs-link"
                      >
                        {memory.ipfsUrl}
                      </a>
                    </div>
                  )}

                  <div className="ipfs-field">
                    <label>File Size:</label>
                    <span>{memory.fileSize ? IPFSService.formatFileSize(memory.fileSize) : 'Text'}</span>
                  </div>
                </div>

                <div className="verification-section">
                  <button 
                    className="verify-button"
                    onClick={handleVerifyPreservation}
                    disabled={isVerifying}
                    aria-describedby="verification-help"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Preservation'}
                  </button>
                  <div id="verification-help" className="sr-only">
                    Click to verify that this memory is preserved on the IPFS network
                  </div>
                  
                  {verificationStatus && (
                    <div className={`verification-status ${verificationStatus.exists ? 'verified' : 'failed'}`} role="status" aria-live="polite">
                      {verificationStatus.exists ? (
                        <div>
                          <span className="status-icon" aria-hidden="true">✅</span>
                          <div>
                            <div className="status-text">Preserved on IPFS</div>
                            <div className="status-details">
                              {verificationStatus.replicas} replicas • 
                              Last seen: {formatDate(verificationStatus.lastSeen)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="status-icon" aria-hidden="true">❌</span>
                          <div>
                            <div className="status-text">Content not found on IPFS</div>
                            <div className="status-details">
                              The content may have been removed or the IPFS network is experiencing issues. 
                              Try refreshing or check the gateway links above.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="no-proof">No IPFS proof available</p>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={handleDeleteCancel} role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-dialog-title">Delete Memory</h3>
            <p>Are you sure you want to delete "{memory.title}"? This action cannot be undone.</p>
            <div className="confirm-buttons">
              <button className="cancel-button" onClick={handleDeleteCancel} aria-label="Cancel deletion">
                Cancel
              </button>
              <button className="delete-confirm-button" onClick={handleDeleteConfirm} aria-label={`Confirm deletion of ${memory.title}`}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
