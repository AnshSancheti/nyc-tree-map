import { useState, useEffect, useRef } from 'react'
import Map from './components/Map'
import Controls from './components/Controls'
import { useAnimation } from './hooks/useAnimation'
import { clock } from './animation/clock'
import { loadTreeDataset, buildRenderAttributes } from './data/loadTrees'
import type { TreeDataset, RenderAttributes } from './data/loadTrees'
import type { PhenologyData } from './data/types'

interface LoadedData {
  dataset: TreeDataset
  attributes: RenderAttributes
}

const PROGRESS_UPDATE_MS = 100

function App() {
  const [loaded, setLoaded] = useState<LoadedData | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastProgressRef = useRef(0)

  const {
    currentDOY,
    isPlaying,
    speed,
    play,
    pause,
    setSpeed,
    seekTo,
    startDOY,
    endDOY,
  } = useAnimation()

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        // Use BASE_URL for GitHub Pages compatibility
        const baseUrl = import.meta.env.BASE_URL

        const phenologyPromise = fetch(`${baseUrl}data/phenology.json`).then((r) => {
          if (!r.ok) throw new Error('Failed to load phenology data')
          return r.json() as Promise<PhenologyData>
        })

        const dataset = await loadTreeDataset(baseUrl, (loadedBytes, totalBytes) => {
          const now = performance.now()
          if (now - lastProgressRef.current < PROGRESS_UPDATE_MS) return
          lastProgressRef.current = now
          setProgress(totalBytes ? loadedBytes / totalBytes : null)
        })
        const phenology = await phenologyPromise
        if (cancelled) return

        const attributes = buildRenderAttributes(dataset, phenology)
        setLoaded({ dataset, attributes })
        setError(null)

        // Autoplay animation after data loads
        setTimeout(() => {
          if (!cancelled) clock.play()
        }, 100)
      } catch (err) {
        console.error('Error loading data:', err)
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data')
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
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

  if (!loaded) {
    const percent = progress === null ? null : Math.round(progress * 100)
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>
          Loading 652,168 trees...
          {percent !== null && <span className="loading-percent"> {percent}%</span>}
        </p>
      </div>
    )
  }

  return (
    <>
      <Map dataset={loaded.dataset} attributes={loaded.attributes} />
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
