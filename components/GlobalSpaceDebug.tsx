import React, { useState, useEffect } from 'react'
import { useDXOS } from '../lib/dxos/context'

export const GlobalSpaceDebug: React.FC = () => {
  const {
    joinGlobalDiscordSpace,
    getOrCreateGlobalDiscordSpace,
    spaces,
    currentSpace,
    isConnected
  } = useDXOS()

  const [isTestingGlobal, setIsTestingGlobal] = useState(false)
  const [globalSpaceInfo, setGlobalSpaceInfo] = useState<any>(null)
  const [isSSR, setIsSSR] = useState(true)

  // Detect when we're on the client to prevent hydration mismatch
  useEffect(() => {
    setIsSSR(false)
  }, [])

  const testGlobalSpace = async () => {
    setIsTestingGlobal(true)
    try {
      console.log('🧪 [GLOBAL SPACE TEST] Starting global space test...')

      // Test getting/creating global space
      const globalSpace = await getOrCreateGlobalDiscordSpace()
      console.log('✅ [GLOBAL SPACE TEST] Global space obtained:', globalSpace.id)

      // Test joining global space
      const joinedSpace = await joinGlobalDiscordSpace()
      console.log('✅ [GLOBAL SPACE TEST] Joined global space:', joinedSpace.id)

      setGlobalSpaceInfo({
        globalSpaceId: globalSpace.id,
        joinedSpaceId: joinedSpace.id,
        allSpaces: spaces.map(s => ({ id: s.id, name: s.properties?.name || 'Unnamed' })),
        currentSpaceId: currentSpace?.id,
        success: true,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ [GLOBAL SPACE TEST] Test failed:', error)
      setGlobalSpaceInfo({
        error: error instanceof Error ? error.message : String(error),
        success: false,
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsTestingGlobal(false)
    }
  }

  const findGlobalSpace = () => {
    // Always return null during SSR to prevent hydration mismatch
    const globalSpaceId = typeof window !== 'undefined' && !isSSR
      ? localStorage.getItem('etherith_global_discord_space')
      : null

    const foundSpace = spaces.find(space =>
      space.id === globalSpaceId ||
      space.properties?.name === 'Etherith Global Discord Space' ||
      space.properties?.isGlobalDiscordSpace === true
    )
    return { globalSpaceId, foundSpace }
  }

  const { globalSpaceId, foundSpace } = findGlobalSpace()

  return (
    <div className="debug-section">
      <h3>🌍 Global Discord Space Test</h3>

      {/* Current Status */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Current Status:</h4>
        <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          <div><strong>DXOS Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}</div>
          <div><strong>Total Spaces:</strong> {spaces.length}</div>
          <div><strong>Current Space:</strong> {currentSpace?.id || 'None'}</div>
          <div><strong>Stored Global Space ID:</strong> {globalSpaceId || 'None'}</div>
          <div><strong>Global Space Found:</strong> {foundSpace ? `✅ ${foundSpace.id}` : '❌ No'}</div>
        </div>
      </div>

      {/* Spaces List */}
      <div style={{ marginBottom: '20px' }}>
        <h4>All Available Spaces:</h4>
        <div style={{ maxHeight: '150px', overflow: 'auto', background: '#f8f9fa', padding: '10px', borderRadius: '6px' }}>
          {spaces.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>No spaces available</div>
          ) : (
            spaces.map((space, index) => (
              <div key={space.id} style={{
                padding: '5px',
                marginBottom: '5px',
                background: space.id === currentSpace?.id ? '#e3f2fd' : 'white',
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}>
                <div><strong>Space {index + 1}:</strong> {space.id}</div>
                <div><strong>Name:</strong> {space.properties?.name || 'Unnamed'}</div>
                {space.properties?.isGlobalDiscordSpace && <div><strong>Type:</strong> 🌍 Global Discord Space</div>}
                {space.id === currentSpace?.id && <div><strong>Status:</strong> 🎯 Current Space</div>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Test Button */}
      <button
        onClick={testGlobalSpace}
        disabled={isTestingGlobal || !isConnected}
        className="debug-btn primary"
        style={{ marginBottom: '20px' }}
      >
        {isTestingGlobal ? '🔄 Testing Global Space...' : '🧪 Test Global Space Operations'}
      </button>

      {/* Test Results */}
      {globalSpaceInfo && (
        <div style={{ marginTop: '20px' }}>
          <h4>Latest Test Results:</h4>
          <div style={{
            background: globalSpaceInfo.success ? '#e8f5e8' : '#ffeaea',
            padding: '15px',
            borderRadius: '6px',
            border: globalSpaceInfo.success ? '1px solid #4caf50' : '1px solid #f44336'
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(globalSpaceInfo, null, 2)}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666' }}>
        <h4>Expected Behavior:</h4>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>First Discord user creates the global space</li>
          <li>Subsequent Discord users join the existing global space</li>
          <li>All Discord users should see each other in the global space</li>
          <li>The global space becomes the current space for new users</li>
        </ul>
      </div>
    </div>
  )
}