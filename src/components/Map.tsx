import { useMemo } from 'react'
import { Map as MapLibre } from 'react-map-gl/maplibre'
import DeckGL from '@deck.gl/react'
import type { PickingInfo } from '@deck.gl/core'
import 'maplibre-gl/dist/maplibre-gl.css'

import { DiamondLayer } from './DiamondLayer'
import type { TreeData, PhenologyData } from '../data/types'
import { getTreeColor } from '../utils/colors'
import { getSpeciesPeakColor } from '../data/speciesColors'
import { getDefaultTimingForSpecies } from '../utils/phenology'

// Feature flag for diameter-based sizing
const DIAMETER_SIZING_ENABLED = import.meta.env.VITE_FEATURE_DIAMETER_SIZING === 'true'

// Diameter scaling constants
// NYC street trees typically range from 3" (young) to 40"+ (mature)
const MIN_DIAMETER = 3    // inches
const MAX_DIAMETER = 40   // inches
const BASE_RADIUS = 3     // base pixel radius
const MAX_RADIUS_MULTIPLIER = 4  // largest trees are 4x the base size

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

  // Calculate radius from diameter using sqrt scaling (so area scales linearly)
  const getRadiusFromDiameter = (diameter: number): number => {
    if (!DIAMETER_SIZING_ENABLED || diameter <= 0) {
      return 5 // default fixed radius
    }
    // Clamp diameter to reasonable range
    const clampedDiameter = Math.max(MIN_DIAMETER, Math.min(MAX_DIAMETER, diameter))
    // Use sqrt scaling so visual area is proportional to diameter
    const normalized = Math.sqrt(clampedDiameter / MIN_DIAMETER)
    const maxNormalized = Math.sqrt(MAX_DIAMETER / MIN_DIAMETER)
    // Scale to radius range
    return BASE_RADIUS + (normalized / maxNormalized) * (BASE_RADIUS * (MAX_RADIUS_MULTIPLIER - 1))
  }

  // Create the tree layer - diamond shapes, no glow
  const layers = useMemo(() => {
    return [
      new DiamondLayer({
        id: 'trees',
        data,
        getPosition: (d) => d.position,
        getFillColor: (d) => {
          const timing = phenologyLookup[d.speciesIndex]
          return getTreeColor(timing, currentDOY, d.offset)
        },
        getRadius: (d) => getRadiusFromDiameter(d.diameter),
        radiusMinPixels: 1,
        radiusMaxPixels: 12,
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
