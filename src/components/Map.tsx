import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Map as MapLibre, useControl } from 'react-map-gl/maplibre'
import type { ViewStateChangeEvent } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { PickingInfo } from '@deck.gl/core'
import 'maplibre-gl/dist/maplibre-gl.css'

import { TreeLayer } from './TreeLayer'
import { clock } from '../animation/clock'
import type { TreeDataset, RenderAttributes } from '../data/loadTrees'

// Detect actual mobile devices (not just emulation)
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  const isMobileUA = /iphone|ipad|ipod|android|webos|blackberry|windows phone/i.test(ua)
  const isSmallScreen = window.innerWidth <= 768
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  return isMobileUA && isSmallScreen && hasTouch
}

const IS_MOBILE = isMobileDevice()

// Hover picking is desktop-only and pointless when a tree is a 1.5px speck.
const PICKING_MIN_ZOOM = 12

// Note on level of detail: the dataset is stored in a seeded random order, so
// if a device ever needs thinning when zoomed out, passing
// `numInstances: Math.min(count, budget)` to the layer draws a uniform sample
// of the city with no re-upload. Emulated mobile surfaces hold 60 fps with the
// full set, so nothing is thinned today.

interface MapProps {
  dataset: TreeDataset
  attributes: RenderAttributes
}

// NYC initial view - zoomed out to see all boroughs
const NYC_VIEW = {
  longitude: -73.98,
  latitude: 40.70,
  zoom: 9.9,
  pitch: 0,
  bearing: 0,
}
const MIN_ZOOM = 9.8

// Dark basemap style - using Carto Dark Matter (no labels)
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json'

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: '#fff',
  fontSize: '12px',
  padding: '4px 8px',
  borderRadius: '4px',
}

interface OverlayHandle {
  overlay: MapboxOverlay | null
  attached: boolean
}

/**
 * Mounts deck.gl as a MapLibre control in interleaved mode: one canvas, deck
 * draws inside MapLibre's own render pass. The overlay instance is handed back
 * through a ref so the animation clock can update it without React.
 */
function DeckOverlay({ handle, onAttached }: { handle: React.MutableRefObject<OverlayHandle>; onAttached: () => void }) {
  useControl<MapboxOverlay>(
    () => {
      const overlay = new MapboxOverlay({ interleaved: true, layers: [] })
      handle.current.overlay = overlay
      return overlay
    },
    () => {
      handle.current.attached = true
      onAttached()
    },
    () => {
      handle.current.attached = false
      handle.current.overlay = null
    },
  )
  return null
}

export default function Map({ dataset, attributes }: MapProps) {
  const handleRef = useRef<OverlayHandle>({ overlay: null, attached: false })
  const zoomRef = useRef(NYC_VIEW.zoom)
  const doyRef = useRef(clock.getSnapshot().currentDOY)

  // Binary structure-of-arrays input: deck.gl uploads these typed arrays as-is.
  const data = useMemo(
    () => ({
      length: dataset.count,
      attributes: {
        getPosition: { value: dataset.positions, size: 2 },
        getRadius: { value: attributes.radius, size: 1 },
        getTiming: { value: attributes.timing, size: 3 },
        getPeakColor: { value: attributes.peakColor, size: 3, normalized: true },
      },
    }),
    [dataset, attributes],
  )

  const getTooltip = useCallback(
    ({ index }: PickingInfo) => {
      if (index < 0 || index >= dataset.count) return null
      const species = dataset.speciesNames[dataset.species[index]] || 'Unknown'
      return { text: species, style: TOOLTIP_STYLE }
    },
    [dataset],
  )

  const render = useCallback(() => {
    const { overlay, attached } = handleRef.current
    if (!overlay || !attached) return
    const zoom = zoomRef.current
    overlay.setProps({
      layers: [
        new TreeLayer({
          id: 'trees',
          data,
          currentDOY: doyRef.current,
          square: !IS_MOBILE,
          pickable: !IS_MOBILE && zoom >= PICKING_MIN_ZOOM,
          radiusMinPixels: 1.5,
          radiusMaxPixels: 30,
        }),
      ],
      getTooltip,
    })
  }, [data, dataset.count, getTooltip])

  // Animation frames go straight from the clock to deck.gl; React is not involved.
  useEffect(() => {
    return clock.subscribe((snapshot) => {
      doyRef.current = snapshot.currentDOY
      render()
    })
  }, [render])

  const handleMove = useCallback(
    (e: ViewStateChangeEvent) => {
      const prev = zoomRef.current
      const next = e.viewState.zoom
      zoomRef.current = next
      // Only a zoom crossing changes layer props; a pan needs nothing from us.
      const crossedPicking = (prev >= PICKING_MIN_ZOOM) !== (next >= PICKING_MIN_ZOOM)
      if (crossedPicking) render()
    },
    [render],
  )

  return (
    <MapLibre
      initialViewState={NYC_VIEW}
      minZoom={MIN_ZOOM}
      mapStyle={MAP_STYLE}
      attributionControl={false}
      onMove={handleMove}
      style={{ width: '100%', height: '100%' }}
    >
      <DeckOverlay handle={handleRef} onAttached={render} />
    </MapLibre>
  )
}
