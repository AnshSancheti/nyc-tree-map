import { useState, useEffect } from 'react'
import Map from './components/Map'
import Controls from './components/Controls'
import { useAnimation } from './hooks/useAnimation'
import type { TreeData, PhenologyData } from './data/types'

function App() {
  const [treeData, setTreeData] = useState<TreeData | null>(null)
  const [phenologyData, setPhenologyData] = useState<PhenologyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    currentDOY,
    isPlaying,
    speed,
    play,
    pause,
    setSpeed,
    seekTo,
    startDOY,
    endDOY
  } = useAnimation()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        // Load tree data
        const treesResponse = await fetch('/data/trees.json')
        if (!treesResponse.ok) throw new Error('Failed to load tree data')
        const trees = await treesResponse.json()

        // Load phenology data
        const phenologyResponse = await fetch('/data/phenology.json')
        if (!phenologyResponse.ok) throw new Error('Failed to load phenology data')
        const phenology = await phenologyResponse.json()

        setTreeData(trees)
        setPhenologyData(phenology)
        setError(null)

        // Autoplay animation after data loads
        setTimeout(() => play(), 100)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (error) {
    return (
      <div className="loading">
        <p style={{ color: '#ff6b6b' }}>Error: {error}</p>
        <p style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
          Run the data fetch scripts first:
          <br />
          <code>npm run fetch-data</code>
        </p>
      </div>
    )
  }

  if (loading || !treeData || !phenologyData) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Loading 680,000 trees...</p>
      </div>
    )
  }

  return (
    <>
      <Map
        treeData={treeData}
        phenologyData={phenologyData}
        currentDOY={currentDOY}
      />
      <Controls
        currentDOY={currentDOY}
        isPlaying={isPlaying}
        speed={speed}
        onPlay={play}
        onPause={pause}
        onSpeedChange={setSpeed}
        onSeek={seekTo}
        startDOY={startDOY}
        endDOY={endDOY}
      />
    </>
  )
}

export default App
