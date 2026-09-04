/**
 * Fetch and process NYC Street Tree Census data
 *
 * Downloads ~680k tree records from NYC Open Data API and writes the binary
 * structure-of-arrays dataset the visualization loads:
 *   public/data/trees.bin        11 bytes per tree, see src/data/treeEncoding.ts
 *   public/data/trees.meta.json  count, species names, bounds
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { encodeTrees, type TreeRecord } from '../src/data/treeEncoding'

const __dirname = dirname(fileURLToPath(import.meta.url))

// NYC Open Data API endpoint
const API_URL = 'https://data.cityofnewyork.us/resource/uvpi-gqnh.json'

// We need to paginate since the API has limits
const PAGE_SIZE = 50000
const MAX_RECORDS = 700000 // Safety limit

interface RawTreeRecord {
  spc_common?: string
  spc_latin?: string
  latitude?: string
  longitude?: string
  status?: string
  tree_dbh?: string  // Diameter at breast height in inches
}

async function fetchPage(offset: number): Promise<RawTreeRecord[]> {
  const params = new URLSearchParams({
    $limit: PAGE_SIZE.toString(),
    $offset: offset.toString(),
    $select: 'spc_common,spc_latin,latitude,longitude,status,tree_dbh',
    $where: "status = 'Alive'", // Only living trees
  })

  const url = `${API_URL}?${params}`
  console.log(`Fetching offset ${offset}...`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as RawTreeRecord[]
}

async function fetchAllTrees(): Promise<RawTreeRecord[]> {
  const allTrees: RawTreeRecord[] = []
  let offset = 0

  while (offset < MAX_RECORDS) {
    const page = await fetchPage(offset)

    if (page.length === 0) {
      break
    }

    allTrees.push(...page)
    console.log(`Total fetched: ${allTrees.length}`)

    if (page.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE

    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return allTrees
}

function isInNYC(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= 40.4 && lat <= 41.0 && lng >= -74.3 && lng <= -73.6
}

function processTreeData(rawTrees: RawTreeRecord[]): { records: TreeRecord[]; species: string[] } {
  const speciesSet = new Set<string>()
  const kept: Array<{ lng: number; lat: number; species: string; diameter: number }> = []

  for (const tree of rawTrees) {
    // Skip trees without coordinates or species
    if (!tree.latitude || !tree.longitude || !tree.spc_common) continue

    const lat = parseFloat(tree.latitude)
    const lng = parseFloat(tree.longitude)
    if (!isInNYC(lat, lng)) continue

    speciesSet.add(tree.spc_common)

    // Parse diameter (DBH in inches), default to 0 if missing
    const parsed = tree.tree_dbh ? parseInt(tree.tree_dbh, 10) : 0
    kept.push({ lng, lat, species: tree.spc_common, diameter: isNaN(parsed) ? 0 : parsed })
  }

  const species = Array.from(speciesSet).sort()
  const speciesIndex = new Map(species.map((s, i) => [s, i]))

  const records: TreeRecord[] = kept.map(t => ({
    lng: t.lng,
    lat: t.lat,
    speciesIndex: speciesIndex.get(t.species)!,
    offset: Math.round(Math.random() * 10 - 5), // Random offset -5 to +5 days
    diameter: t.diameter,
  }))

  return { records, species }
}

async function main() {
  console.log('=== NYC Street Tree Data Fetcher ===\n')

  console.log('Fetching tree data from NYC Open Data API...')
  const rawTrees = await fetchAllTrees()
  console.log(`\nFetched ${rawTrees.length} raw records`)

  console.log('\nProcessing tree data...')
  const { records, species } = processTreeData(rawTrees)
  console.log(`Processed ${records.length} valid trees`)
  console.log(`Found ${species.length} unique species`)

  const { buffer, meta } = encodeTrees(records, species)

  // Ensure output directory exists
  const outputDir = join(__dirname, '..', 'public', 'data')
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const binPath = join(outputDir, 'trees.bin')
  const metaPath = join(outputDir, 'trees.meta.json')
  writeFileSync(binPath, Buffer.from(buffer))
  writeFileSync(metaPath, JSON.stringify(meta))

  console.log(`\nOutput written to: ${binPath}`)
  console.log(`File size: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Metadata written to: ${metaPath}`)

  // Print top 10 species
  console.log('\nTop species in dataset:')
  const speciesCounts = new Map<string, number>()
  for (const tree of rawTrees) {
    if (tree.spc_common) {
      speciesCounts.set(tree.spc_common, (speciesCounts.get(tree.spc_common) || 0) + 1)
    }
  }
  const topSpecies = Array.from(speciesCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  for (const [name, count] of topSpecies) {
    console.log(`  ${name}: ${count.toLocaleString()}`)
  }
}

main().catch(console.error)
