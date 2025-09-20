import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Memory, MemoryReaction, MemoryComment } from '../types/memory'
import { IPFSService } from '../utils/ipfs'
import { LocalStorage } from '../utils/storage'

interface MemoryCardProps {
  memory: Memory
  onView: (memory: Memory) => void
  onDelete?: (memory: Memory) => void
  showAuthor?: boolean
  canDelete?: boolean
  viewMode?: 'feed' | 'grid'
}

export default function MemoryCard({ memory, onView, onDelete, showAuthor = true, canDelete = false, viewMode = 'grid' }: MemoryCardProps) {
  const { data: session } = useSession()
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<{
    exists: boolean
    replicas: number
  } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Social media interaction state
  const [reactionCounts, setReactionCounts] = useState<Record<MemoryReaction['type'], number>>({
    heart: 0,
    'thumbs-up': 0,
    'thumbs-down': 0,
    laugh: 0,
    sad: 0
  })
  const [userReaction, setUserReaction] = useState<MemoryReaction | null>(null)
  const [commentCount, setCommentCount] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<MemoryComment[]>([])
  const [newComment, setNewComment] = useState('')

  // Load social media data on component mount
  useEffect(() => {
    loadSocialMediaData()
  }, [memory.id, session?.user?.discordId])

  const loadSocialMediaData = () => {
    // Load reaction counts
    const counts = LocalStorage.getReactionCounts(memory.id)
    setReactionCounts(counts)

    // Load user's reaction
    if (session?.user?.discordId) {
      const reaction = LocalStorage.getUserReactionForMemory(memory.id, session.user.discordId)
      setUserReaction(reaction)
    }

    // Load comments
    const memoryComments = LocalStorage.getCommentsForMemory(memory.id)
    setComments(memoryComments)
    setCommentCount(memoryComments.length)
  }

  const handleReaction = (type: MemoryReaction['type']) => {
    if (!session?.user?.discordId) return

    const userId = session.user.discordId
    const username = session.user.username || session.user.name || 'Anonymous'

    if (userReaction?.type === type) {
      // Remove existing reaction
      LocalStorage.removeReaction(memory.id, userId)
      setUserReaction(null)
    } else {
      // Add new reaction (will replace existing one)
      LocalStorage.addReaction(memory.id, userId, username, type)
      setUserReaction({ id: '', memoryId: memory.id, userId, username, type, timestamp: Date.now() })
    }

    // Refresh reaction counts
    const newCounts = LocalStorage.getReactionCounts(memory.id)
    setReactionCounts(newCounts)
  }

  const handleAddComment = () => {
    if (!session?.user?.discordId || !newComment.trim()) return

    const userId = session.user.discordId
    const username = session.user.username || session.user.name || 'Anonymous'
    const userAvatar = session.user.avatar ?
      `https://cdn.discordapp.com/avatars/${userId}/${session.user.avatar}.png?size=64` : undefined

    const comment = LocalStorage.addComment(memory.id, userId, username, userAvatar, newComment.trim())

    setComments(prev => [...prev, comment])
    setCommentCount(prev => prev + 1)
    setNewComment('')
  }

  const handleDeleteComment = (commentId: string) => {
    if (!session?.user?.discordId) return

    const success = LocalStorage.deleteComment(commentId, session.user.discordId)
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId))
      setCommentCount(prev => prev - 1)
    }
  }

  const getTotalReactions = () => {
    return Object.values(reactionCounts).reduce((sum, count) => sum + count, 0)
  }

  const getReactionEmoji = (type: MemoryReaction['type']) => {
    switch (type) {
      case 'heart': return '❤️'
      case 'thumbs-up': return '👍'
      case 'thumbs-down': return '👎'
      case 'laugh': return '😂'
      case 'sad': return '😢'
      default: return '❤️'
    }
  }

  const handleVerifyPreservation = async () => {
    if (!memory.ipfsCid) return
    
    setIsVerifying(true)
    try {
      const result = await IPFSService.verifyPreservation(memory.ipfsCid)
      setVerificationStatus(result)
    } catch (error) {
      console.error('Verification failed:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
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
      month: 'short',
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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const renderMediaPreview = () => {
    if (memory.fileType === 'image' && (memory.fileData || memory.ipfsGatewayUrl)) {
      return (
        <div className="media-preview image-preview">
          <img
            src={memory.fileData || memory.ipfsGatewayUrl}
            alt={memory.title}
            loading="lazy"
          />
        </div>
      )
    }

    if (memory.fileType === 'video' && (memory.fileData || memory.ipfsGatewayUrl)) {
      return (
        <div className="media-preview video-preview">
          <video
            src={memory.fileData || memory.ipfsGatewayUrl}
            poster={memory.thumbnailUrl}
            preload="metadata"
          />
          <div className="video-overlay">
            <div className="play-button">▶️</div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <article 
      className={`memory-card ${viewMode}-view`} 
      role="article" 
      aria-labelledby={`memory-title-${memory.id}`}
      data-public={showAuthor ? "true" : "false"}
    >
      {/* Social Media Style Header */}
      {showAuthor && (
        <header className="post-header">
          <div className="author-section">
            <div className="author-avatar-wrapper">
              {memory.authorAvatar ? (
                <img
                  src={memory.authorAvatar}
                  alt={`${memory.authorName} profile picture`}
                  className="author-avatar"
                />
              ) : (
                <div className="avatar-placeholder" role="img" aria-label={`${memory.authorName} avatar`}>
                  {memory.authorName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="author-info">
              <div className="author-name">{memory.authorName}</div>
              <div className="post-meta">
                <time className="timestamp" dateTime={new Date(memory.timestamp).toISOString()}>
                  {formatDate(memory.timestamp)}
                </time>
                <span className="separator" aria-hidden="true">•</span>
                <span className="file-type">
                  <span aria-hidden="true">{getFileIcon(memory.fileType)}</span>
                  <span className="sr-only">{memory.fileType} file</span>
                </span>
                <span className="separator" aria-hidden="true">•</span>
                <span className={`visibility ${memory.visibility}`} aria-label={`${memory.visibility} memory`}>
                  <span aria-hidden="true">{memory.visibility === 'public' ? '🌐' : '🔒'}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="post-actions">
            {canDelete && onDelete && (
              <button
                className="action-btn delete-btn"
                onClick={handleDeleteClick}
                aria-label="Delete this memory"
                title="Delete memory"
              >
                <span aria-hidden="true">⋯</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* Content Area */}
      <div className="post-content" onClick={() => onView(memory)} role="button" tabIndex={0} aria-label={`View memory: ${memory.title}`} onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onView(memory)
        }
      }}>
        <div className="content-header">
          <h2 className="memory-title" id={`memory-title-${memory.id}`}>{memory.title}</h2>
          {!showAuthor && (
            <div className="content-meta">
              <span className="file-type-badge">
                <span aria-hidden="true">{getFileIcon(memory.fileType)}</span>
                <span className="sr-only">{memory.fileType} file</span>
              </span>
              <time className="timestamp" dateTime={new Date(memory.timestamp).toISOString()}>
                {formatDate(memory.timestamp)}
              </time>
            </div>
          )}
        </div>

        {/* Media Preview */}
        {renderMediaPreview()}

        <div className="content-body">
          <p className="memory-preview">
            {truncateText(memory.content, viewMode === 'feed' ? 200 : 120)}
          </p>

          <div className="memory-note">
            <div className="note-label">
              <span aria-hidden="true">💭</span>
              <span className="sr-only">Note:</span>
              Why this matters:
            </div>
            <p className="note-text">
              {truncateText(memory.memoryNote, viewMode === 'feed' ? 150 : 80)}
            </p>
          </div>
        </div>

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <div className="tag-cloud" role="list" aria-label="Memory tags">
            {memory.tags.slice(0, viewMode === 'feed' ? 6 : 4).map((tag, index) => (
              <span key={index} className="tag" role="listitem">#{tag}</span>
            ))}
            {memory.tags.length > (viewMode === 'feed' ? 6 : 4) && (
              <span className="tag-more" aria-label={`${memory.tags.length - (viewMode === 'feed' ? 6 : 4)} more tags`}>
                +{memory.tags.length - (viewMode === 'feed' ? 6 : 4)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Engagement Bar */}
      <div className="engagement-bar" role="toolbar" aria-label="Memory engagement actions">
        <div className="engagement-stats">
          <button
            className={`engagement-btn ${userReaction?.type === 'heart' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              handleReaction('heart')
            }}
            aria-pressed={userReaction?.type === 'heart'}
            aria-label={`Like this memory (${reactionCounts.heart} likes)`}
            title="Like"
          >
            <span className="icon" aria-hidden="true">❤️</span>
            <span className="count">{reactionCounts.heart}</span>
          </button>
          <button
            className="engagement-btn"
            onClick={(e) => {
              e.stopPropagation()
              setShowComments(!showComments)
            }}
            aria-pressed={showComments}
            aria-label={`${showComments ? 'Hide' : 'Show'} comments (${commentCount} comments)`}
            title="Comments"
          >
            <span className="icon" aria-hidden="true">💬</span>
            <span className="count">{commentCount}</span>
          </button>
          <button
            className={`engagement-btn ${userReaction?.type === 'thumbs-up' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              handleReaction('thumbs-up')
            }}
            aria-pressed={userReaction?.type === 'thumbs-up'}
            aria-label={`Thumbs up this memory (${reactionCounts['thumbs-up']} thumbs up)`}
            title="Thumbs up"
          >
            <span className="icon" aria-hidden="true">👍</span>
            <span className="count">{reactionCounts['thumbs-up']}</span>
          </button>
          <button
            className="engagement-btn"
            onClick={(e) => e.stopPropagation()}
            aria-label="Share this memory"
            title="Share"
          >
            <span className="icon" aria-hidden="true">📋</span>
          </button>
        </div>

        <div className="memory-meta">
          <span className="file-size">
            {memory.fileSize ? IPFSService.formatFileSize(memory.fileSize) : 'Text'}
          </span>

          {memory.ipfsCid && (
            <div className="ipfs-indicator">
              <button
                className="ipfs-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleVerifyPreservation()
                }}
                disabled={isVerifying}
                aria-label={isVerifying ? 'Verifying IPFS preservation...' : verificationStatus ? `IPFS preservation ${verificationStatus.exists ? 'verified' : 'failed'}` : 'Verify IPFS preservation'}
                title="Verify IPFS preservation"
              >
                <span className="icon" aria-hidden="true">🌐</span>
                {isVerifying ? (
                  <span className="loading" aria-hidden="true">...</span>
                ) : verificationStatus ? (
                  <span className={`status ${verificationStatus.exists ? 'verified' : 'failed'}`} aria-hidden="true">
                    {verificationStatus.exists ? '✓' : '✗'}
                  </span>
                ) : (
                  <span className="verify-text">Verify</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <section className="comments-section" aria-labelledby={`comments-heading-${memory.id}`}>
          <div className="comments-header">
            <h4 id={`comments-heading-${memory.id}`}>Comments ({commentCount})</h4>
          </div>

          {/* Add Comment */}
          {session?.user && (
            <div className="add-comment">
              <div className="comment-input-wrapper">
                {session.user.avatar && (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png?size=32`}
                    alt={`${session.user.username || 'User'} profile picture`}
                    className="comment-avatar"
                  />
                )}
                <label htmlFor={`comment-input-${memory.id}`} className="sr-only">Add a comment</label>
                <input
                  id={`comment-input-${memory.id}`}
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newComment.trim()) {
                      handleAddComment()
                    }
                  }}
                  className="comment-input"
                  aria-describedby={`comment-help-${memory.id}`}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="comment-submit"
                  aria-label="Post comment"
                >
                  Post
                </button>
              </div>
              <div id={`comment-help-${memory.id}`} className="sr-only">Press Enter to post your comment</div>
            </div>
          )}

          {/* Comments List */}
          <div className="comments-list" role="list" aria-label="Comments">
            {comments.map((comment) => (
              <article key={comment.id} className="comment" role="listitem">
                <div className="comment-header">
                  {comment.userAvatar ? (
                    <img
                      src={comment.userAvatar}
                      alt={`${comment.username} profile picture`}
                      className="comment-avatar"
                    />
                  ) : (
                    <div className="comment-avatar-placeholder" role="img" aria-label={`${comment.username} avatar`}>
                      {comment.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="comment-meta">
                    <span className="comment-author">{comment.username}</span>
                    <time className="comment-time" dateTime={new Date(comment.timestamp).toISOString()}>
                      {new Date(comment.timestamp).toLocaleString()}
                    </time>
                  </div>
                  {comment.userId === session?.user?.discordId && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="comment-delete"
                      aria-label={`Delete comment by ${comment.username}`}
                      title="Delete comment"
                    >
                      <span aria-hidden="true">✕</span>
                    </button>
                  )}
                </div>
                <div className="comment-content">
                  {comment.content}
                </div>
              </article>
            ))}

            {comments.length === 0 && (
              <div className="no-comments" role="status" aria-live="polite">
                <p>No comments yet. Be the first to share your thoughts!</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Expanded IPFS Info (when in feed mode) */}
      {viewMode === 'feed' && memory.ipfsCid && verificationStatus && (
        <div className="ipfs-details">
          <div className="ipfs-status">
            {verificationStatus.exists ? (
              <div className="status-verified">
                <span className="icon">✅</span>
                <span>Preserved on IPFS ({verificationStatus.replicas} replicas)</span>
              </div>
            ) : (
              <div className="status-failed">
                <span className="icon">❌</span>
                <span>Content verification failed</span>
              </div>
            )}
          </div>

          <div className="ipfs-links">
            {memory.ipfsUrl && (
              <a
                href={memory.ipfsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ipfs-link"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="icon">🌐</span>
                <span>Public IPFS</span>
              </a>
            )}
            {memory.ipfsGatewayUrl && (
              <a
                href={memory.ipfsGatewayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ipfs-link"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="icon">⚡</span>
                <span>Gateway</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Memory</h3>
              <button className="close-btn" onClick={handleDeleteCancel}>✕</button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete this memory?</p>
              <div className="memory-preview-mini">
                <span className="preview-icon">{getFileIcon(memory.fileType)}</span>
                <span className="preview-title">"{memory.title}"</span>
              </div>
              <p className="warning">⚠️ This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleDeleteCancel}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
