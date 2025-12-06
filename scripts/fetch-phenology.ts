/**
 * Create phenology timing data for NYC tree species
 *
 * Since USA-NPN API access requires authentication and the data may be sparse
 * for urban tree species, we generate reasonable default timing based on
 * research literature and typical NYC fall foliage patterns.
 *
 * This can be enhanced later with real phenology data.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface SpeciesTiming {
  onset: number    // Day of year when color change starts
  peak: number     // Day of year when color is most intense
  drop: number     // Day of year when leaves fall
  peakColor: [number, number, number]  // RGB peak color
}

// Research-based phenology timing for common NYC species
// Based on typical patterns for New York City (USDA Zone 7a/7b)
// Sources: USA-NPN literature, Morton Arboretum, various forestry guides

const SPECIES_PHENOLOGY: Record<string, SpeciesTiming> = {
  // === EARLY TURNERS (Late Sept - Early Oct peak) ===

  // Birches - among the earliest
  'paper birch': { onset: 255, peak: 275, drop: 295, peakColor: [250, 230, 70] },
  'river birch': { onset: 258, peak: 278, drop: 298, peakColor: [240, 220, 60] },
  'gray birch': { onset: 255, peak: 275, drop: 295, peakColor: [245, 225, 65] },

  // Dogwoods - early and vibrant
  'flowering dogwood': { onset: 260, peak: 280, drop: 300, peakColor: [200, 60, 90] },
  'Kousa dogwood': { onset: 265, peak: 285, drop: 305, peakColor: [190, 70, 85] },

  // Red maple - classic early turner
  'red maple': { onset: 265, peak: 285, drop: 308, peakColor: [220, 20, 60] },

  // Sweetgum - early to mid, spectacular colors
  'sweetgum': { onset: 268, peak: 290, drop: 315, peakColor: [200, 30, 70] },

  // Sassafras - early, orange-red
  'sassafras': { onset: 260, peak: 280, drop: 300, peakColor: [255, 100, 50] },

  // Sourwood - early, deep red
  'sourwood': { onset: 258, peak: 278, drop: 298, peakColor: [180, 40, 60] },

  // === MID-SEASON (Mid Oct peak) ===

  // Sugar maple - quintessential fall color
  'sugar maple': { onset: 275, peak: 295, drop: 318, peakColor: [255, 120, 50] },

  // Ginkgo - dramatic late-turning yellow
  'ginkgo': { onset: 290, peak: 308, drop: 315, peakColor: [255, 225, 53] },

  // Norway maple - common street tree
  'Norway maple': { onset: 280, peak: 300, drop: 322, peakColor: [240, 200, 40] },

  // Silver maple - pale yellow
  'silver maple': { onset: 278, peak: 298, drop: 318, peakColor: [230, 210, 80] },

  // Japanese maple - long display
  'Japanese maple': { onset: 275, peak: 298, drop: 320, peakColor: [220, 20, 60] },

  // Tulip tree - bright yellow
  'tuliptree': { onset: 270, peak: 290, drop: 312, peakColor: [250, 220, 50] },
  'tulip': { onset: 270, peak: 290, drop: 312, peakColor: [250, 220, 50] },

  // Honey locust - soft gold, early drop
  'honeylocust': { onset: 275, peak: 292, drop: 308, peakColor: [218, 165, 32] },
  'honey locust': { onset: 275, peak: 292, drop: 308, peakColor: [218, 165, 32] },

  // Lindens - yellow-green to gold
  'littleleaf linden': { onset: 280, peak: 298, drop: 318, peakColor: [200, 170, 50] },
  'silver linden': { onset: 282, peak: 300, drop: 320, peakColor: [200, 170, 50] },
  'American linden': { onset: 278, peak: 296, drop: 316, peakColor: [195, 175, 55] },

  // Elms - subtle yellow
  'American elm': { onset: 280, peak: 300, drop: 320, peakColor: [218, 180, 50] },
  'Chinese elm': { onset: 285, peak: 305, drop: 325, peakColor: [210, 175, 55] },

  // Zelkova - orange to bronze
  'Japanese zelkova': { onset: 282, peak: 302, drop: 322, peakColor: [230, 110, 50] },

  // Ash - early to mid, purple tones
  'green ash': { onset: 270, peak: 288, drop: 308, peakColor: [160, 80, 100] },
  'white ash': { onset: 268, peak: 286, drop: 306, peakColor: [170, 70, 110] },

  // Redbud - yellow
  'eastern redbud': { onset: 278, peak: 296, drop: 316, peakColor: [220, 190, 60] },

  // Cherries - orange-red
  'Yoshino cherry': { onset: 275, peak: 295, drop: 315, peakColor: [240, 100, 70] },
  'Kwanzan cherry': { onset: 278, peak: 298, drop: 318, peakColor: [230, 90, 80] },
  'black cherry': { onset: 272, peak: 292, drop: 312, peakColor: [235, 95, 75] },

  // Callery pear - burgundy, holds late
  'Callery pear': { onset: 285, peak: 308, drop: 328, peakColor: [180, 50, 80] },

  // Black locust - subtle yellow, early drop
  'black locust': { onset: 275, peak: 290, drop: 305, peakColor: [210, 195, 70] },

  // === LATE HOLDERS (Late Oct - Nov peak) ===

  // London plane - muted bronze, holds very late
  'London planetree': { onset: 295, peak: 315, drop: 340, peakColor: [205, 133, 63] },
  'London plane': { onset: 295, peak: 315, drop: 340, peakColor: [205, 133, 63] },

  // Sycamore - similar to London plane
  'sycamore maple': { onset: 290, peak: 310, drop: 330, peakColor: [200, 140, 70] },
  'American sycamore': { onset: 292, peak: 312, drop: 335, peakColor: [195, 145, 75] },

  // Oaks - late, russet to brown
  'pin oak': { onset: 290, peak: 312, drop: 340, peakColor: [255, 140, 0] },
  'red oak': { onset: 288, peak: 310, drop: 338, peakColor: [205, 92, 0] },
  'scarlet oak': { onset: 285, peak: 308, drop: 335, peakColor: [255, 100, 0] },
  'white oak': { onset: 295, peak: 318, drop: 345, peakColor: [180, 120, 60] },
  'willow oak': { onset: 298, peak: 320, drop: 345, peakColor: [190, 130, 55] },
  'swamp white oak': { onset: 292, peak: 315, drop: 342, peakColor: [185, 125, 58] },
  'English oak': { onset: 295, peak: 318, drop: 345, peakColor: [175, 115, 65] },
  'sawtooth oak': { onset: 290, peak: 312, drop: 338, peakColor: [195, 120, 50] },

  // Beech - golden bronze, holds leaves all winter
  'American beech': { onset: 295, peak: 320, drop: 355, peakColor: [210, 170, 80] },
  'European beech': { onset: 298, peak: 322, drop: 358, peakColor: [205, 165, 75] },

  // === EVERGREENS / MINIMAL COLOR (shown as persistent green → gray) ===
  // These will use default timing that keeps them green longer

  'white pine': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'Eastern white pine': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'Austrian pine': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'spruce': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'Colorado blue spruce': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'Norway spruce': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'hemlock': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'Eastern hemlock': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'cedar': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'Eastern red cedar': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'arborvitae': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'holly': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
  'American holly': { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] },
}

// Default timing for unknown species (mid-October peak)
const DEFAULT_TIMING: SpeciesTiming = {
  onset: 280,
  peak: 300,
  drop: 320,
  peakColor: [204, 85, 0], // Rust orange
}

// Additional species color mappings for species without specific phenology
const ADDITIONAL_COLORS: Record<string, [number, number, number]> = {
  'crabapple': [220, 90, 70],
  'apple': [200, 150, 50],
  'pear': [200, 160, 55],
  'hawthorn': [200, 90, 60],
  'serviceberry': [230, 100, 50],
  'magnolia': [180, 140, 60],
  'catalpa': [190, 170, 70],
  'Kentucky coffeetree': [200, 175, 65],
  'horsechestnut': [195, 155, 55],
  'buckeye': [210, 140, 45],
  'tree of heaven': [180, 160, 60],
  'mulberry': [200, 170, 55],
  'hackberry': [195, 165, 60],
  'yellowwood': [240, 210, 60],
  'Japanese pagodatree': [205, 175, 55],
  'goldenraintree': [220, 190, 50],
  'Persian ironwood': [220, 80, 50],
  'Amur corktree': [200, 180, 60],
  'katsura': [245, 180, 70],
}

async function main() {
  console.log('=== NYC Tree Phenology Data Generator ===\n')

  // Try to load tree data to get the species list
  const treeDataPath = join(__dirname, '..', 'public', 'data', 'trees.json')
  let speciesList: string[] = []

  if (existsSync(treeDataPath)) {
    console.log('Loading species list from tree data...')
    const treeData = JSON.parse(readFileSync(treeDataPath, 'utf-8'))
    speciesList = treeData.species
    console.log(`Found ${speciesList.length} species in tree data`)
  } else {
    console.log('Warning: Tree data not found. Run fetch-tree-data first.')
    console.log('Generating phenology data with built-in species list...')
    speciesList = Object.keys(SPECIES_PHENOLOGY)
  }

  // Build phenology lookup
  const phenologyData: Record<string, SpeciesTiming> = {}
  let matched = 0
  let defaulted = 0

  for (const species of speciesList) {
    const lowerSpecies = species.toLowerCase()

    // Try exact match first
    if (SPECIES_PHENOLOGY[species]) {
      phenologyData[species] = SPECIES_PHENOLOGY[species]
      matched++
      continue
    }

    // Try lowercase match
    if (SPECIES_PHENOLOGY[lowerSpecies]) {
      phenologyData[species] = SPECIES_PHENOLOGY[lowerSpecies]
      matched++
      continue
    }

    // Try partial match
    let found = false
    for (const [key, timing] of Object.entries(SPECIES_PHENOLOGY)) {
      if (lowerSpecies.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerSpecies)) {
        phenologyData[species] = timing
        matched++
        found = true
        break
      }
    }

    if (!found) {
      // Use default timing with potentially custom color
      let peakColor = DEFAULT_TIMING.peakColor

      // Check additional colors
      for (const [key, color] of Object.entries(ADDITIONAL_COLORS)) {
        if (lowerSpecies.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerSpecies)) {
          peakColor = color
          break
        }
      }

      // Determine timing category based on species type
      let timing = { ...DEFAULT_TIMING, peakColor }

      // Adjust timing based on common patterns
      if (lowerSpecies.includes('oak') || lowerSpecies.includes('quercus')) {
        timing = { onset: 290, peak: 312, drop: 340, peakColor: [200, 120, 50] }
      } else if (lowerSpecies.includes('maple') || lowerSpecies.includes('acer')) {
        timing = { onset: 275, peak: 295, drop: 318, peakColor: [230, 100, 60] }
      } else if (lowerSpecies.includes('ash') || lowerSpecies.includes('fraxinus')) {
        timing = { onset: 270, peak: 288, drop: 308, peakColor: [165, 75, 105] }
      } else if (lowerSpecies.includes('birch') || lowerSpecies.includes('betula')) {
        timing = { onset: 255, peak: 275, drop: 295, peakColor: [245, 225, 65] }
      } else if (lowerSpecies.includes('cherry') || lowerSpecies.includes('prunus')) {
        timing = { onset: 275, peak: 295, drop: 315, peakColor: [235, 95, 75] }
      } else if (lowerSpecies.includes('linden') || lowerSpecies.includes('tilia')) {
        timing = { onset: 280, peak: 298, drop: 318, peakColor: [200, 170, 50] }
      } else if (lowerSpecies.includes('pine') || lowerSpecies.includes('spruce') ||
                 lowerSpecies.includes('fir') || lowerSpecies.includes('cedar') ||
                 lowerSpecies.includes('juniper') || lowerSpecies.includes('hemlock')) {
        // Evergreen
        timing = { onset: 320, peak: 340, drop: 365, peakColor: [74, 90, 74] }
      }

      phenologyData[species] = timing
      defaulted++
    }
  }

  console.log(`\nPhenology data generated:`)
  console.log(`  Matched: ${matched} species`)
  console.log(`  Defaulted: ${defaulted} species`)

  // Ensure output directory exists
  const outputDir = join(__dirname, '..', 'public', 'data')
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Write output
  const outputPath = join(outputDir, 'phenology.json')
  writeFileSync(outputPath, JSON.stringify(phenologyData, null, 2))

  console.log(`\nOutput written to: ${outputPath}`)

  // Show some examples
  console.log('\nSample phenology data:')
  const samples = ['red maple', 'ginkgo', 'pin oak', 'London planetree', 'honeylocust']
  for (const sample of samples) {
    const timing = phenologyData[sample]
    if (timing) {
      console.log(`  ${sample}: onset=${timing.onset}, peak=${timing.peak}, drop=${timing.drop}`)
    }
  }
}

main().catch(console.error)
