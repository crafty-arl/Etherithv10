import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RegistryManager } from '../utils/registry'
import { OfflineRegistryManager } from '../utils/offline-registry'
import { UserRegistry, RegistrySubscription, RegistryStats, RegistryConfig } from '../types/registry'

interface RegistryManagerProps {
  onClose: () => void
}

type TabType = 'overview' | 'publish' | 'subscriptions' | 'discover' | 'settings'

export const RegistryManagerComponent: React.FC<RegistryManagerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [registry, setRegistry] = useState<UserRegistry | null>(null)
  const [subscriptions, setSubscriptions] = useState<RegistrySubscription[]>([])
  const [stats, setStats] = useState<RegistryStats | null>(null)
  const [config, setConfig] = useState<RegistryConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    loadData()
    // Setup offline support
    OfflineRegistryManager.setupOfflineSupport()
  }, [])

  const loadData = async () => {
    try {
      const reg = RegistryManager.getRegistry()
      const subs = RegistryManager.getSubscriptions()
      const st = OfflineRegistryManager.getEnhancedStats()
      const conf = RegistryManager.getConfig()

      setRegistry(reg)
      setSubscriptions(subs)
      setStats(st)
      setConfig(conf)
    } catch (error) {
      showMessage('error', `Failed to load registry data: ${error}`)
    }
  }

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handlePublishRegistry = async () => {
    setLoading(true)
    try {
      const result = await OfflineRegistryManager.publishRegistry()

      if (result.cached) {
        showMessage('info', 'Registry update queued for when online')
      } else {
        showMessage('success', `Registry published to IPFS: ${result.cid}`)
      }

      await loadData()
    } catch (error) {
      showMessage('error', `Failed to publish registry: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncAll = async () => {
    setLoading(true)
    try {
      const operations = await RegistryManager.syncAllSubscriptions()
      const successful = operations.filter(op => op.status === 'completed').length
      showMessage('success', `Synced ${successful}/${operations.length} subscriptions`)
      await loadData()
    } catch (error) {
      showMessage('error', `Failed to sync subscriptions: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubscription = async (cid: string) => {
    setLoading(true)
    try {
      const result = await OfflineRegistryManager.addSubscription(cid, true)

      if (result.cached) {
        showMessage('info', 'Subscription queued for when online')
      } else {
        showMessage('success', `Subscribed to registry: ${result.subscription?.displayName}`)
      }

      await loadData()
    } catch (error) {
      showMessage('error', `Failed to add subscription: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-2">Local Registry</h3>
          <div className="text-slate-300 space-y-1">
            <p>Public Memories: {stats?.localRegistry.publicMemories || 0}</p>
            <p>Total Size: {formatFileSize(stats?.localRegistry.totalSize || 0)}</p>
            <p>Last Published: {stats?.localRegistry.lastPublished ? new Date(stats.localRegistry.lastPublished).toLocaleDateString() : 'Never'}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-2">Subscriptions</h3>
          <div className="text-slate-300 space-y-1">
            <p>Total: {stats?.subscriptions.total || 0}</p>
            <p>Active: {stats?.subscriptions.active || 0}</p>
            <p>Last Sync: {stats?.subscriptions.lastSyncAt ? new Date(stats.subscriptions.lastSyncAt).toLocaleDateString() : 'Never'}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-2">Network Status</h3>
          <div className="text-slate-300 space-y-1">
            <p>Online: {(stats as any)?.offline?.isOnline ? '✅' : '❌'}</p>
            <p>IPFS Gateway: {stats?.ipfs.gatewayReachable ? '✅' : '❌'}</p>
            <p>Queued Operations: {(stats as any)?.offline?.queuedOperations || 0}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handlePublishRegistry}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Publishing...' : 'Publish Registry'}
        </button>

        <button
          onClick={handleSyncAll}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Syncing...' : 'Sync All'}
        </button>
      </div>
    </div>
  )

  const renderPublish = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4">Publish Your Registry</h3>

        {registry ? (
          <div className="space-y-4">
            <div className="text-slate-300">
              <p><strong>Registry ID:</strong> {registry.registryId}</p>
              <p><strong>Public Memories:</strong> {registry.publicMemories.length}</p>
              <p><strong>Last Updated:</strong> {new Date(registry.metadata.updated).toLocaleString()}</p>
              {registry.ipfsMetadata.registryCid && (
                <p><strong>Current CID:</strong> {registry.ipfsMetadata.registryCid}</p>
              )}
            </div>

            <button
              onClick={handlePublishRegistry}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Update Registry on IPFS'}
            </button>

            <p className="text-sm text-slate-400">
              Publishing your registry makes your public memories discoverable by others who subscribe to your registry CID.
            </p>
          </div>
        ) : (
          <div className="text-slate-300">
            <p>No registry found. Create some public memories first, then publish your registry.</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderSubscriptions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">My Subscriptions</h3>
        <button
          onClick={handleSyncAll}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Syncing...' : 'Sync All'}
        </button>
      </div>

      <div className="space-y-4">
        {subscriptions.map(sub => (
          <div key={sub.id} className="bg-slate-800 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white">{sub.displayName}</h4>
                <p className="text-slate-400 text-sm">Registry: {sub.registryCid.substring(0, 20)}...</p>
                <p className="text-slate-400 text-sm">
                  Last Sync: {sub.lastSyncAt ? new Date(sub.lastSyncAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => OfflineRegistryManager.syncSubscription(sub.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                >
                  Sync
                </button>
                <button
                  onClick={() => RegistryManager.removeSubscription(sub.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {subscriptions.length === 0 && (
          <div className="text-slate-400 text-center py-8">
            No subscriptions yet. Add some registry CIDs to start discovering content!
          </div>
        )}
      </div>
    </div>
  )

  const [newCid, setNewCid] = useState('')

  const renderDiscover = () => {

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white">Discover Registries</h3>

        <div className="bg-slate-800 p-6 rounded-lg">
          <h4 className="font-bold text-white mb-4">Add Registry Subscription</h4>
          <div className="flex gap-4">
            <input
              type="text"
              value={newCid}
              onChange={(e) => setNewCid(e.target.value)}
              placeholder="Enter registry IPFS CID (e.g., Qm...)"
              className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg"
            />
            <button
              onClick={() => {
                if (newCid.trim()) {
                  handleAddSubscription(newCid.trim())
                  setNewCid('')
                }
              }}
              disabled={loading || !newCid.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              Subscribe
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Subscribe to someone's registry to automatically sync their public memories.
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg">
          <h4 className="font-bold text-white mb-4">How to Share Your Registry</h4>
          {registry?.ipfsMetadata.registryCid ? (
            <div className="space-y-2">
              <p className="text-slate-300">Share this CID with others:</p>
              <div className="bg-slate-700 p-3 rounded font-mono text-sm text-green-400">
                {registry.ipfsMetadata.registryCid}
              </div>
              <p className="text-sm text-slate-400">
                Others can use this CID to subscribe to your public memory updates.
              </p>
            </div>
          ) : (
            <p className="text-slate-400">
              Publish your registry first to get a shareable CID.
            </p>
          )}
        </div>
      </div>
    )
  }

  const renderSettings = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">Registry Settings</h3>

      {config && (
        <div className="space-y-4">
          <div className="bg-slate-800 p-6 rounded-lg">
            <h4 className="font-bold text-white mb-4">Publishing</h4>
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => {
                    const newConfig = { ...config, enabled: e.target.checked }
                    setConfig(newConfig)
                    RegistryManager.saveConfig(newConfig)
                  }}
                  className="rounded"
                />
                <span className="text-slate-300">Enable registry publishing</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.autoPublish}
                  onChange={(e) => {
                    const newConfig = { ...config, autoPublish: e.target.checked }
                    setConfig(newConfig)
                    RegistryManager.saveConfig(newConfig)
                  }}
                  className="rounded"
                />
                <span className="text-slate-300">Auto-publish when memories change</span>
              </label>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg">
            <h4 className="font-bold text-white mb-4">Sync Settings</h4>
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.syncConfig.enabled}
                  onChange={(e) => {
                    const newConfig = {
                      ...config,
                      syncConfig: { ...config.syncConfig, enabled: e.target.checked }
                    }
                    setConfig(newConfig)
                    RegistryManager.saveConfig(newConfig)
                  }}
                  className="rounded"
                />
                <span className="text-slate-300">Enable background sync</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.syncConfig.verifyIntegrity}
                  onChange={(e) => {
                    const newConfig = {
                      ...config,
                      syncConfig: { ...config.syncConfig, verifyIntegrity: e.target.checked }
                    }
                    setConfig(newConfig)
                    RegistryManager.saveConfig(newConfig)
                  }}
                  className="rounded"
                />
                <span className="text-slate-300">Verify content integrity</span>
              </label>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg">
            <h4 className="font-bold text-white mb-4">Privacy</h4>
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.privacy.shareProfile}
                  onChange={(e) => {
                    const newConfig = {
                      ...config,
                      privacy: { ...config.privacy, shareProfile: e.target.checked }
                    }
                    setConfig(newConfig)
                    RegistryManager.saveConfig(newConfig)
                  }}
                  className="rounded"
                />
                <span className="text-slate-300">Share profile information</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.privacy.shareContactInfo}
                  onChange={(e) => {
                    const newConfig = {
                      ...config,
                      privacy: { ...config.privacy, shareContactInfo: e.target.checked }
                    }
                    setConfig(newConfig)
                    RegistryManager.saveConfig(newConfig)
                  }}
                  className="rounded"
                />
                <span className="text-slate-300">Share contact information</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'publish', label: 'Publish', icon: '📤' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '📋' },
    { id: 'discover', label: 'Discover', icon: '🔍' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'publish': return renderPublish()
      case 'subscriptions': return renderSubscriptions()
      case 'discover': return renderDiscover()
      case 'settings': return renderSettings()
      default: return renderOverview()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Registry Manager</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`p-4 border-t ${
                message.type === 'success' ? 'bg-green-900 border-green-700 text-green-100' :
                message.type === 'error' ? 'bg-red-900 border-red-700 text-red-100' :
                'bg-blue-900 border-blue-700 text-blue-100'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}