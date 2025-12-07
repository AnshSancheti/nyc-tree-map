import { useMemo } from 'react'
import { Map as MapLibre } from 'react-map-gl/maplibre'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer } from '@deck.gl/layers'
import type { PickingInfo } from '@deck.gl/core'
import 'maplibre-gl/dist/maplibre-gl.css'

import { SquareLayer } from './DiamondLayer'

// Detect actual mobile devices (not just emulation)
// Mobile shader compilers are stricter, so we fall back to circles
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  const isMobileUA = /iphone|ipad|ipod|android|webos|blackberry|windows phone/i.test(ua)
  const isSmallScreen = window.innerWidth <= 768
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  // Only consider it mobile if it has a mobile user agent AND small screen
  // This helps distinguish actual mobile from desktop emulation
  return isMobileUA && isSmallScreen && hasTouch
}

const IS_MOBILE = isMobileDevice()
import type { TreeData, PhenologyData } from '../data/types'
import { getTreeColor } from '../utils/colors'
import { getSpeciesPeakColor } from '../data/speciesColors'
import { getDefaultTimingForSpecies } from '../utils/phenology'

// Diameter scaling constants
// NYC street trees range from 3" (serviceberry) to 40"+ (mature London planetree)
// Using aggressive scaling so size differences are visible at city scale
const MIN_DBH = 3       // smallest trees (serviceberry, young plantings)
const MAX_DBH = 45      // largest trees (mature London planetrees, oaks)
const DEFAULT_DBH = 10  // median diameter for trees with missing data
const MIN_RADIUS = 1.5  // tiny ornamentals - barely visible specks
const MAX_RADIUS = 22   // massive canopy trees - dominate the view

interface MapProps {
  treeData: TreeData
  phenologyData: PhenologyData
  currentDOY: number
}

// NYC initial view - zoomed out to see all boroughs
const NYC_BOUNDS = {
  longitude: -73.98,
  latitude: 40.70,
  zoom: 9.9,
  pitch: 0,
  bearing: 0,
}

// Dark basemap style - using Carto Dark Matter (no labels)
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json'

export default function Map({ treeData, phenologyData, currentDOY }: MapProps) {
  // Build phenology lookup with peak colors
  const phenologyLookup = useMemo(() => {
    const lookup: Record<number, {
      onset: number
      peak: number
      drop: number
      peakColor: [number, number, number]
    } | null> = {}

    treeData.species.forEach((speciesName, index) => {
      const phenology = phenologyData[speciesName] || phenologyData[speciesName.toLowerCase()]

      if (phenology) {
        lookup[index] = {
          onset: phenology.onset,
          peak: phenology.peak,
          drop: phenology.drop,
          peakColor: phenology.peakColor || getSpeciesPeakColor(speciesName),
        }
      } else {
        // Use default timing based on species type
        const defaultTiming = getDefaultTimingForSpecies(speciesName)
        lookup[index] = {
          onset: defaultTiming.onset,
          peak: defaultTiming.peak,
          drop: defaultTiming.drop,
          peakColor: getSpeciesPeakColor(speciesName),
        }
      }
    })

    return lookup
  }, [treeData.species, phenologyData])

  // Convert positions to array format for deck.gl
  const data = useMemo(() => {
    const positions = treeData.positions
    const result: Array<{
      position: [number, number]
      speciesIndex: number
      offset: number
      diameter: number
    }> = []

    // Handle both typed array and regular array
    if (positions instanceof Float32Array) {
      // Format: [lng, lat, speciesIndex, offset, diameter, lng, lat, ...]
      for (let i = 0; i < positions.length; i += 5) {
        result.push({
          position: [positions[i], positions[i + 1]],
          speciesIndex: positions[i + 2],
          offset: positions[i + 3],
          diameter: positions[i + 4] || 0,
        })
      }
    } else {
      // Format: [[lng, lat, speciesIndex, offset, diameter], ...]
      for (const item of positions) {
        result.push({
          position: [item[0], item[1]],
          speciesIndex: item[2],
          offset: item[3] || 0,
          diameter: item[4] || 0,
        })
      }
    }

    return result
  }, [treeData.positions])

  // Calculate radius from DBH (diameter at breast height)
  // Uses power scaling: radius ∝ DBH^0.85
  // More aggressive than sqrt (0.5) to make size differences pop at city scale
  // Result: a 40" London planetree is ~7x larger than a 3" serviceberry
  const getRadiusFromDiameter = (dbh: number): number => {
    // Use median diameter for missing data
    const effectiveDBH = dbh > 0 ? dbh : DEFAULT_DBH

    // Clamp to reasonable range
    const clampedDBH = Math.max(MIN_DBH, Math.min(MAX_DBH, effectiveDBH))

    // Power scaling with exponent 0.85 - aggressive enough to see the difference
    const normalized = Math.pow(clampedDBH / MIN_DBH, 0.85)
    const maxNormalized = Math.pow(MAX_DBH / MIN_DBH, 0.85)

    // Map to radius range
    return MIN_RADIUS + (normalized / maxNormalized) * (MAX_RADIUS - MIN_RADIUS)
  }

  // Create the tree layer
  // Use squares on desktop, circles on mobile (mobile shader compilers don't support our custom shader)
  const layers = useMemo(() => {
    const LayerClass = IS_MOBILE ? ScatterplotLayer : SquareLayer
    return [
      new LayerClass({
        id: 'trees',
        data,
        getPosition: (d) => d.position,
        getFillColor: (d) => {
          const timing = phenologyLookup[d.speciesIndex]
          return getTreeColor(timing, currentDOY, d.offset)
        },
        getRadius: (d) => getRadiusFromDiameter(d.diameter),
        radiusMinPixels: 1.5,
        radiusMaxPixels: 30,
        updateTriggers: {
          getFillColor: [currentDOY],
        },
        pickable: true,
      }),
    ]
  }, [data, phenologyLookup, currentDOY])

  // Tooltip on hover
  const getTooltip = ({ object }: PickingInfo) => {
    if (!object) return null
    const species = treeData.species[object.speciesIndex] || 'Unknown'
    return {
      text: species,
      style: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        fontSize: '12px',
        padding: '4px 8px',
        borderRadius: '4px',
      },
    }
  }

  return (
    <DeckGL
      initialViewState={NYC_BOUNDS}
      // @ts-expect-error minZoom works at runtime but isn't in types
      controller={{ minZoom: 9.8 }}
      layers={layers}
      getTooltip={getTooltip}
    >
      <MapLibre
        mapStyle={MAP_STYLE}
        attributionControl={false}
      />
    </DeckGL>
  )
}
