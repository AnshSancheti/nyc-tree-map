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

interface MapProps {
  treeData: TreeData
  phenologyData: PhenologyData
  currentDOY: number
}

// NYC initial view - zoomed out to see all boroughs
const NYC_BOUNDS = {
  longitude: -73.98,
  latitude: 40.70,
  zoom: 9.8,
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
    }> = []

    // Handle both typed array and regular array
    if (positions instanceof Float32Array) {
      // Format: [lng, lat, speciesIndex, offset, lng, lat, ...]
      for (let i = 0; i < positions.length; i += 4) {
        result.push({
          position: [positions[i], positions[i + 1]],
          speciesIndex: positions[i + 2],
          offset: positions[i + 3],
        })
      }
    } else {
      // Format: [[lng, lat, speciesIndex, offset], ...]
      for (const item of positions) {
        result.push({
          position: [item[0], item[1]],
          speciesIndex: item[2],
          offset: item[3] || 0,
        })
      }
    }

    return result
  }, [treeData.positions])

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
        getRadius: 5,
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
