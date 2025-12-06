/**
 * Fetch and process NYC Street Tree Census data
 *
 * Downloads ~680k tree records from NYC Open Data API
 * Outputs optimized JSON for the visualization
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

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
}

interface ProcessedTree {
  lng: number
  lat: number
  speciesIndex: number
  offset: number
}

async function fetchPage(offset: number): Promise<RawTreeRecord[]> {
  const params = new URLSearchParams({
    $limit: PAGE_SIZE.toString(),
    $offset: offset.toString(),
    $select: 'spc_common,spc_latin,latitude,longitude,status',
    $where: "status = 'Alive'", // Only living trees
  })

  const url = `${API_URL}?${params}`
  console.log(`Fetching offset ${offset}...`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
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

function processTreeData(rawTrees: RawTreeRecord[]) {
  // Build species lookup
  const speciesSet = new Set<string>()
  const validTrees: ProcessedTree[] = []

  for (const tree of rawTrees) {
    // Skip trees without coordinates or species
    if (!tree.latitude || !tree.longitude || !tree.spc_common) {
      continue
    }

    const lat = parseFloat(tree.latitude)
    const lng = parseFloat(tree.longitude)

    // Validate coordinates are in NYC area
    if (isNaN(lat) || isNaN(lng) || lat < 40.4 || lat > 41.0 || lng < -74.3 || lng > -73.6) {
      continue
    }

    speciesSet.add(tree.spc_common)

    validTrees.push({
      lng,
      lat,
      speciesIndex: -1, // Will be set after we build the species array
      offset: Math.round((Math.random() * 10 - 5)), // Random offset -5 to +5 days
    })
  }

  // Build species array and update indices
  const speciesArray = Array.from(speciesSet).sort()
  const speciesIndexMap = new Map(speciesArray.map((s, i) => [s, i]))

  // Re-process to assign correct species indices
  let i = 0
  for (const tree of rawTrees) {
    if (!tree.latitude || !tree.longitude || !tree.spc_common) continue

    const lat = parseFloat(tree.latitude)
    const lng = parseFloat(tree.longitude)
    if (isNaN(lat) || isNaN(lng) || lat < 40.4 || lat > 41.0 || lng < -74.3 || lng > -73.6) continue

    validTrees[i].speciesIndex = speciesIndexMap.get(tree.spc_common)!
    i++
  }

  // Convert to flat array format: [lng, lat, speciesIndex, offset, ...]
  const positions: number[][] = validTrees.map(t => [t.lng, t.lat, t.speciesIndex, t.offset])

  return {
    positions,
    species: speciesArray,
    count: validTrees.length,
  }
}

async function main() {
  console.log('=== NYC Street Tree Data Fetcher ===\n')

  console.log('Fetching tree data from NYC Open Data API...')
  const rawTrees = await fetchAllTrees()
  console.log(`\nFetched ${rawTrees.length} raw records`)

  console.log('\nProcessing tree data...')
  const processedData = processTreeData(rawTrees)
  console.log(`Processed ${processedData.count} valid trees`)
  console.log(`Found ${processedData.species.length} unique species`)

  // Ensure output directory exists
  const outputDir = join(__dirname, '..', 'public', 'data')
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Write output
  const outputPath = join(outputDir, 'trees.json')
  writeFileSync(outputPath, JSON.stringify(processedData))

  const fileSizeMB = (Buffer.byteLength(JSON.stringify(processedData)) / 1024 / 1024).toFixed(2)
  console.log(`\nOutput written to: ${outputPath}`)
  console.log(`File size: ${fileSizeMB} MB`)

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

  for (const [species, count] of topSpecies) {
    console.log(`  ${species}: ${count.toLocaleString()}`)
  }
}

main().catch(console.error)
