/**
 * Loads the binary tree dataset and derives the per-tree render attributes.
 *
 * Nothing here allocates per-tree JavaScript objects. The file is read into one
 * ArrayBuffer, viewed as typed arrays, and the derived attributes are built in
 * a single linear pass into typed arrays that deck.gl uploads as-is.
 */

import { decodeTrees, type TreeColumns, type TreeMeta } from './treeEncoding'
import type { PhenologyData, SpeciesTiming } from './types'
import { getDefaultTimingForSpecies } from '../utils/phenology'
import { getSpeciesPeakColor } from './speciesColors'
import { radiusFromDiameter } from '../utils/radius'

export interface TreeDataset extends TreeColumns {
  species: Uint8Array
  speciesNames: string[]
  bounds: TreeMeta['bounds']
}

export interface RenderAttributes {
  /** [onset, peak, drop] per tree with the per-tree offset already applied, length 3N */
  timing: Float32Array
  /** Peak RGB per tree, length 3N */
  peakColor: Uint8Array
  /** Radius in meters per tree, length N */
  radius: Float32Array
}

export type ProgressCallback = (loadedBytes: number, totalBytes: number | null) => void

async function fetchWithProgress(url: string, onProgress?: ProgressCallback): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Failed to load ${url}: ${response.status}`)
  }
  const lengthHeader = response.headers.get('Content-Length')
  const total = lengthHeader ? parseInt(lengthHeader, 10) : null

  // Without a progress callback, or without streaming support, take the fast path
  if (!onProgress || typeof response.body.getReader !== 'function') {
    return response.arrayBuffer()
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.byteLength
    onProgress(received, total)
  }

  const out = new Uint8Array(received)
  let cursor = 0
  for (const chunk of chunks) {
    out.set(chunk, cursor)
    cursor += chunk.byteLength
  }
  return out.buffer
}

export async function loadTreeDataset(baseUrl: string, onProgress?: ProgressCallback): Promise<TreeDataset> {
  const metaResponse = await fetch(`${baseUrl}data/trees.meta.json`)
  if (!metaResponse.ok) throw new Error('Failed to load tree metadata')
  const meta = (await metaResponse.json()) as TreeMeta

  const buffer = await fetchWithProgress(`${baseUrl}data/trees.bin`, onProgress)
  const columns = decodeTrees(buffer, meta)
  return {
    ...columns,
    speciesNames: meta.species,
    bounds: meta.bounds,
  }
}

/** Resolve the timing and peak color for every species index once. */
export function buildSpeciesTable(speciesNames: string[], phenology: PhenologyData): SpeciesTiming[] {
  return speciesNames.map((name) => {
    const entry = phenology[name] || phenology[name.toLowerCase()]
    if (entry) {
      return {
        onset: entry.onset,
        peak: entry.peak,
        drop: entry.drop,
        peakColor: entry.peakColor || getSpeciesPeakColor(name),
      }
    }
    const fallback = getDefaultTimingForSpecies(name)
    return {
      onset: fallback.onset,
      peak: fallback.peak,
      drop: fallback.drop,
      peakColor: getSpeciesPeakColor(name),
    }
  })
}

/**
 * Build the static per-tree attributes the shader needs. The per-tree day
 * offset is folded into the timing here so the GPU only ever compares the
 * current day against three numbers.
 */
export function buildRenderAttributes(dataset: TreeDataset, phenology: PhenologyData): RenderAttributes {
  const { count } = dataset
  const table = buildSpeciesTable(dataset.speciesNames, phenology)

  const timing = new Float32Array(count * 3)
  const peakColor = new Uint8Array(count * 3)
  const radius = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const t = table[dataset.species[i]]
    const shift = dataset.offset[i]
    // CPU reference computes color at (currentDOY - offset); shifting the
    // thresholds by +offset is the same comparison.
    timing[i * 3] = t.onset + shift
    timing[i * 3 + 1] = t.peak + shift
    timing[i * 3 + 2] = t.drop + shift
    peakColor[i * 3] = t.peakColor[0]
    peakColor[i * 3 + 1] = t.peakColor[1]
    peakColor[i * 3 + 2] = t.peakColor[2]
    radius[i] = radiusFromDiameter(dataset.diameter[i])
  }

  return { timing, peakColor, radius }
}
