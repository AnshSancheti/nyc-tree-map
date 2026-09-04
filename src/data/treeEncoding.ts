/**
 * Binary structure-of-arrays encoding for the tree dataset.
 *
 * Layout of trees.bin (little-endian, no header; the sidecar trees.meta.json
 * carries count, species names, and the field list):
 *
 *   positions  Float32 x 2 x N   interleaved [lng, lat]        offset 0
 *   species    Uint8   x N       index into meta.species       offset 8N
 *   offset     Int8    x N       per-tree phenology jitter     offset 9N
 *   diameter   Uint8   x N       DBH in inches, clamped 0..255 offset 10N
 *
 * Total: 11 bytes per tree. Float32 coordinates give ~1 m precision in NYC.
 *
 * Trees are stored in a seeded random order so that any prefix of the file is
 * a uniform sample of the whole city. The renderer uses that for zoomed-out
 * level of detail without a second dataset.
 *
 * This module is shared by the fetch script and by the browser loader; keep it
 * free of Node-only imports.
 */

export const TREE_BIN_VERSION = 1
export const BYTES_PER_TREE = 11
export const SHUFFLE_SEED = 20260904

export interface TreeRecord {
  lng: number
  lat: number
  speciesIndex: number
  offset: number
  diameter: number
}

export interface TreeMeta {
  version: number
  count: number
  bytesPerTree: number
  species: string[]
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number }
  order: 'seeded-shuffle'
  seed: number
}

export interface TreeColumns {
  count: number
  /** Interleaved [lng, lat] pairs, length 2N */
  positions: Float32Array
  /** Species index per tree, length N */
  species: Uint8Array
  /** Phenology day offset per tree, length N */
  offset: Int8Array
  /** DBH in inches per tree (0 = unknown), length N */
  diameter: Uint8Array
}

/** Small deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic Fisher-Yates permutation of 0..n-1. */
export function seededPermutation(n: number, seed: number = SHUFFLE_SEED): Uint32Array {
  const order = new Uint32Array(n)
  for (let i = 0; i < n; i++) order[i] = i
  const rand = mulberry32(seed)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = order[i]
    order[i] = order[j]
    order[j] = tmp
  }
  return order
}

/** Byte offsets of each column for a dataset of N trees. */
export function columnOffsets(count: number) {
  return {
    positions: 0,
    species: count * 8,
    offset: count * 9,
    diameter: count * 10,
    total: count * BYTES_PER_TREE,
  }
}

/**
 * Encode records into the binary layout. Records are written in a seeded
 * random order (see file header) so prefix sampling is uniform.
 */
export function encodeTrees(
  records: TreeRecord[],
  species: string[],
): { buffer: ArrayBuffer; meta: TreeMeta } {
  const count = records.length
  if (species.length > 256) {
    throw new Error(`Species index must fit in a byte; got ${species.length} species`)
  }
  const offsets = columnOffsets(count)
  const buffer = new ArrayBuffer(offsets.total)
  const positions = new Float32Array(buffer, offsets.positions, count * 2)
  const speciesCol = new Uint8Array(buffer, offsets.species, count)
  const offsetCol = new Int8Array(buffer, offsets.offset, count)
  const diameterCol = new Uint8Array(buffer, offsets.diameter, count)

  const order = seededPermutation(count)
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity

  for (let i = 0; i < count; i++) {
    const r = records[order[i]]
    positions[i * 2] = r.lng
    positions[i * 2 + 1] = r.lat
    speciesCol[i] = r.speciesIndex
    offsetCol[i] = Math.max(-128, Math.min(127, Math.round(r.offset)))
    diameterCol[i] = Math.max(0, Math.min(255, Math.round(r.diameter)))
    if (r.lng < minLng) minLng = r.lng
    if (r.lng > maxLng) maxLng = r.lng
    if (r.lat < minLat) minLat = r.lat
    if (r.lat > maxLat) maxLat = r.lat
  }

  const meta: TreeMeta = {
    version: TREE_BIN_VERSION,
    count,
    bytesPerTree: BYTES_PER_TREE,
    species,
    bounds: { minLng, maxLng, minLat, maxLat },
    order: 'seeded-shuffle',
    seed: SHUFFLE_SEED,
  }
  return { buffer, meta }
}

/** Create typed-array views over an encoded buffer. Zero-copy. */
export function decodeTrees(buffer: ArrayBuffer, meta: TreeMeta): TreeColumns {
  if (meta.version !== TREE_BIN_VERSION) {
    throw new Error(`Unsupported trees.bin version ${meta.version}`)
  }
  const count = meta.count
  const offsets = columnOffsets(count)
  if (buffer.byteLength < offsets.total) {
    throw new Error(`trees.bin is ${buffer.byteLength} bytes; expected at least ${offsets.total}`)
  }
  return {
    count,
    positions: new Float32Array(buffer, offsets.positions, count * 2),
    species: new Uint8Array(buffer, offsets.species, count),
    offset: new Int8Array(buffer, offsets.offset, count),
    diameter: new Uint8Array(buffer, offsets.diameter, count),
  }
}
