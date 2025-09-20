import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import MemoryCard from '../components/MemoryCard'
import MemoryUploadComponent from '../components/MemoryUpload'
import MemoryViewer from '../components/MemoryViewer'
import { Memory, SearchFilters, UserProfile } from '../types/memory'
import { LocalStorage } from '../utils/storage'

export default function VaultPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [memories, setMemories] = useState<Memory[]>([])
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showUpload, setShowUpload] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [activeTab, setActiveTab] = useState<'public' | 'my-memories'>('public')
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed')
  const [selectedFileType, setSelectedFileType] = useState<string>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState({
    totalMemories: 0,
    publicMemories: 0,
    privateMemories: 0,
    totalSize: 0
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/')
      return
    }

    // Create user profile if it doesn't exist
    createUserProfile()
    loadMemories()
    loadStats()
  }, [session, status, router])

  useEffect(() => {
    performSearch()
  }, [memories, searchQuery, filters, activeTab])

  const loadMemories = () => {
    const allMemories = LocalStorage.getAllMemories()
    setMemories(allMemories)
  }

  const createUserProfile = () => {
    if (!session?.user) return

    const existingProfile = LocalStorage.getUserProfile()
    
    if (!existingProfile || existingProfile.id !== session.user.discordId) {
      const newProfile: UserProfile = {
        id: session.user.discordId || '',
        email: session.user.email || '',
        displayName: session.user.username || session.user.name || 'Anonymous',
        avatar: session.user.avatar ? `https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png?size=64` : undefined,
        contactLink: session.user.email || undefined,
        createdAt: Date.now(),
        memoriesCount: 0
      }
      
      LocalStorage.saveUserProfile(newProfile)
    }
  }

  const loadStats = () => {
    const storageStats = LocalStorage.getStorageStats()
    setStats(storageStats)
  }

  const performSearch = () => {
    let searchMemories = memories

    if (activeTab === 'my-memories') {
      searchMemories = memories.filter(memory => memory.authorId === session?.user?.discordId)
    } else {
      searchMemories = memories.filter(memory => memory.visibility === 'public')
    }

    if (searchQuery || Object.keys(filters).length > 0) {
      searchMemories = LocalStorage.searchMemories(searchQuery, {
        ...filters,
        visibility: activeTab === 'my-memories' ? undefined : 'public'
      })
    }

    setFilteredMemories(searchMemories)
  }

  const handleUploadComplete = (memoryId: string) => {
    loadMemories()
    loadStats()
    setShowUpload(false)
    // Optionally show the uploaded memory
    const newMemory = LocalStorage.getMemoryById(memoryId)
    if (newMemory) {
      setSelectedMemory(newMemory)
    }
  }

  const handleMemoryView = (memory: Memory) => {
    setSelectedMemory(memory)
  }

  const handleMemoryDelete = (memory: Memory) => {
    const success = LocalStorage.deleteMemory(memory.id)
    if (success) {
      // Refresh the memories list
      loadMemories()
      // Close the memory viewer if it's open
      if (selectedMemory && selectedMemory.id === memory.id) {
        setSelectedMemory(null)
      }
    }
  }

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (status === 'loading') {
    return (
      <div className="vault-loading">
        <div className="loading-spinner"></div>
        <p>Loading your vault...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Head>
        <title>Memory Vault - Etherith</title>
        <meta name="description" content="Your local-first digital memory vessel. Preserve, empower, and remember." />
      </Head>

      <div className="memory-feed-container">
        {/* Mobile Sidebar Toggle */}
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={sidebarOpen}
        >
          <span aria-hidden="true">☰</span>
        </button>

        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay open"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar - Notion-style navigation */}
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation" aria-label="Main navigation">
          <div className="sidebar-header">
            <button 
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation menu"
            >
              <span aria-hidden="true">✕</span>
            </button>
            <div className="user-profile">
              {session.user?.avatar && (
                <img
                  src={`https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png?size=64`}
                  alt={`${session.user.username || 'User'} profile picture`}
                  className="user-avatar"
                />
              )}
              <div className="user-info">
                <span className="username">{session.user?.username || session.user?.name}</span>
                <span className="user-role">Memory Keeper</span>
              </div>
            </div>
          </div>

          <div className="sidebar-nav">
            <div className="nav-section">
              <h3>📚 Views</h3>
              <button
                className={`nav-item ${activeTab === 'public' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('public')
                  setSidebarOpen(false)
                }}
                aria-pressed={activeTab === 'public'}
                aria-label={`View public feed with ${stats.publicMemories} memories`}
              >
                <span>🌐 Public Feed</span>
                <span className="count" aria-label={`${stats.publicMemories} public memories`}>{stats.publicMemories}</span>
              </button>
              <button
                className={`nav-item ${activeTab === 'my-memories' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('my-memories')
                  setSidebarOpen(false)
                }}
                aria-pressed={activeTab === 'my-memories'}
                aria-label={`View my vault with ${memories.filter(m => m.authorId === session.user?.discordId).length} memories`}
              >
                <span>🔒 My Vault</span>
                <span className="count" aria-label={`${memories.filter(m => m.authorId === session.user?.discordId).length} personal memories`}>{memories.filter(m => m.authorId === session.user?.discordId).length}</span>
              </button>
            </div>

            <div className="nav-section">
              <h3>📁 By Type</h3>
              <button
                className={`nav-item ${selectedFileType === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFileType('all')
                  setSidebarOpen(false)
                }}
                aria-pressed={selectedFileType === 'all'}
                aria-label={`View all content with ${filteredMemories.length} memories`}
              >
                <span>📝 All Content</span>
                <span className="count" aria-label={`${filteredMemories.length} total memories`}>{filteredMemories.length}</span>
              </button>
              <button
                className={`nav-item ${selectedFileType === 'image' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFileType('image')
                  setSidebarOpen(false)
                }}
                aria-pressed={selectedFileType === 'image'}
                aria-label={`View images with ${filteredMemories.filter(m => m.fileType === 'image').length} memories`}
              >
                <span>🖼️ Images</span>
                <span className="count" aria-label={`${filteredMemories.filter(m => m.fileType === 'image').length} image memories`}>{filteredMemories.filter(m => m.fileType === 'image').length}</span>
              </button>
              <button
                className={`nav-item ${selectedFileType === 'video' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFileType('video')
                  setSidebarOpen(false)
                }}
                aria-pressed={selectedFileType === 'video'}
                aria-label={`View videos with ${filteredMemories.filter(m => m.fileType === 'video').length} memories`}
              >
                <span>🎥 Videos</span>
                <span className="count" aria-label={`${filteredMemories.filter(m => m.fileType === 'video').length} video memories`}>{filteredMemories.filter(m => m.fileType === 'video').length}</span>
              </button>
              <button
                className={`nav-item ${selectedFileType === 'audio' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFileType('audio')
                  setSidebarOpen(false)
                }}
                aria-pressed={selectedFileType === 'audio'}
                aria-label={`View audio with ${filteredMemories.filter(m => m.fileType === 'audio').length} memories`}
              >
                <span>🎵 Audio</span>
                <span className="count" aria-label={`${filteredMemories.filter(m => m.fileType === 'audio').length} audio memories`}>{filteredMemories.filter(m => m.fileType === 'audio').length}</span>
              </button>
              <button
                className={`nav-item ${selectedFileType === 'document' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFileType('document')
                  setSidebarOpen(false)
                }}
                aria-pressed={selectedFileType === 'document'}
                aria-label={`View documents with ${filteredMemories.filter(m => m.fileType === 'document').length} memories`}
              >
                <span>📄 Documents</span>
                <span className="count" aria-label={`${filteredMemories.filter(m => m.fileType === 'document').length} document memories`}>{filteredMemories.filter(m => m.fileType === 'document').length}</span>
              </button>
              <button
                className={`nav-item ${selectedFileType === 'text' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFileType('text')
                  setSidebarOpen(false)
                }}
                aria-pressed={selectedFileType === 'text'}
                aria-label={`View text with ${filteredMemories.filter(m => m.fileType === 'text').length} memories`}
              >
                <span>📝 Text</span>
                <span className="count" aria-label={`${filteredMemories.filter(m => m.fileType === 'text').length} text memories`}>{filteredMemories.filter(m => m.fileType === 'text').length}</span>
              </button>
            </div>

            <div className="nav-section">
              <h3>📊 Stats</h3>
              <div className="stats-mini">
                <div className="stat-item">
                  <span className="stat-value">{stats.totalMemories}</span>
                  <span className="stat-label">Total Memories</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{formatFileSize(stats.totalSize)}</span>
                  <span className="stat-label">Storage Used</span>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-actions">
            <button
              className="create-memory-btn"
              onClick={() => {
                setShowUpload(true)
                setSidebarOpen(false)
              }}
              aria-label="Create a new memory"
            >
              <span>✨ New Memory</span>
            </button>
          </div>
        </nav>

        {/* Main Feed Area */}
        <main className="main-feed" role="main" aria-label="Memory feed">
          <header className="feed-header">
            <div className="feed-title">
              <h1>
                {activeTab === 'public' ? '🌐 Public Memory Feed' : '🔒 My Memory Vault'}
              </h1>
              <p>
                {activeTab === 'public'
                  ? 'Discover memories shared by the community'
                  : 'Your personal digital memory collection'
                }
              </p>
            </div>

            <div className="header-actions">
              <button
                className="logout-button"
                onClick={() => signOut({ callbackUrl: '/' })}
                aria-label="Sign out of Etherith"
                title="Sign out"
              >
                <span className="logout-icon" aria-hidden="true">🚪</span>
                <span className="logout-text">Sign Out</span>
              </button>
            </div>

            <div className="feed-controls">
              <div className="search-container">
                <label htmlFor="memory-search" className="sr-only">Search memories</label>
                <div className="search-input-wrapper">
                  <span className="search-icon" aria-hidden="true">🔍</span>
                  <input
                    id="memory-search"
                    type="text"
                    placeholder="Search memories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    aria-label="Search memories"
                  />
                </div>
              </div>

              <div className="view-toggle" role="group" aria-label="View mode">
                <button
                  className={`view-btn ${viewMode === 'feed' ? 'active' : ''}`}
                  onClick={() => setViewMode('feed')}
                  aria-pressed={viewMode === 'feed'}
                  aria-label="Feed view"
                >
                  <span aria-hidden="true">📰</span>
                </button>
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Grid view"
                >
                  <span aria-hidden="true">▦</span>
                </button>
              </div>
            </div>
          </header>

          <div className={`feed-content ${viewMode}`} role="region" aria-label="Memory content">
            {filteredMemories.length === 0 ? (
              <div className="empty-feed-state" role="status" aria-live="polite">
                <div className="empty-illustration" role="img" aria-label="Empty state illustration">
                  {selectedFileType === 'all' ? '📚' :
                   selectedFileType === 'image' ? '🖼️' :
                   selectedFileType === 'video' ? '🎥' :
                   selectedFileType === 'audio' ? '🎵' :
                   selectedFileType === 'document' ? '📄' : '📝'}
                </div>
                <h3>No memories found</h3>
                <p>
                  {searchQuery || Object.keys(filters).length > 0
                    ? 'Try adjusting your search terms'
                    : selectedFileType !== 'all'
                    ? `No ${selectedFileType} memories yet`
                    : activeTab === 'public'
                    ? 'No public memories available yet'
                    : 'Start building your memory vault'
                  }
                </p>
                {activeTab === 'my-memories' && (
                  <button
                    className="cta-button"
                    onClick={() => setShowUpload(true)}
                    aria-label="Create your first memory"
                  >
                    ✨ Create Your First Memory
                  </button>
                )}
              </div>
            ) : (
              <div className={viewMode === 'feed' ? 'memory-feed' : 'memory-grid'} role="list" aria-label={`${filteredMemories.length} memories`}>
                {filteredMemories
                  .filter(memory => selectedFileType === 'all' || memory.fileType === selectedFileType)
                  .map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onView={handleMemoryView}
                    onDelete={handleMemoryDelete}
                    showAuthor={activeTab === 'public'}
                    canDelete={memory.authorId === session.user?.discordId}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Activity & Insights */}
        <div className="activity-sidebar">
          <div className="activity-section">
            <h3>⚡ Recent Activity</h3>
            <div className="activity-feed">
              {filteredMemories.slice(0, 5).map((memory) => (
                <div key={memory.id} className="activity-item" onClick={() => handleMemoryView(memory)}>
                  <div className="activity-icon">
                    {memory.fileType === 'image' ? '🖼️' :
                     memory.fileType === 'video' ? '🎥' :
                     memory.fileType === 'audio' ? '🎵' :
                     memory.fileType === 'document' ? '📄' : '📝'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">{memory.title}</div>
                    <div className="activity-meta">
                      {memory.authorName} • {formatDate(memory.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="insights-section">
            <h3>📈 Insights</h3>
            <div className="insight-cards">
              <div className="insight-card">
                <div className="insight-value">{stats.totalMemories}</div>
                <div className="insight-label">Total Memories</div>
              </div>
              <div className="insight-card">
                <div className="insight-value">{formatFileSize(stats.totalSize)}</div>
                <div className="insight-label">Data Preserved</div>
              </div>
              <div className="insight-card">
                <div className="insight-value">{stats.publicMemories}</div>
                <div className="insight-label">Shared Public</div>
              </div>
            </div>
          </div>

          <div className="ipfs-status-section">
            <h3>🌐 IPFS Network</h3>
            <div className="ipfs-status">
              <div className="status-indicator online"></div>
              <span>Connected & Preserving</span>
            </div>
            <div className="ipfs-stats">
              <div className="ipfs-stat">
                <span className="stat-number">{memories.filter(m => m.ipfsCid).length}</span>
                <span className="stat-text">preserved on IPFS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showUpload && (
        <MemoryUploadComponent
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUpload(false)}
        />
      )}

      {selectedMemory && (
        <MemoryViewer
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onDelete={handleMemoryDelete}
          canEdit={selectedMemory.authorId === session.user?.discordId}
          canDelete={selectedMemory.authorId === session.user?.discordId}
        />
      )}
    </>
  )
}
