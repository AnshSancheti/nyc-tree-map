// Day of Year utilities

// Convert Date to Day of Year (1-365/366)
export function dateToDOY(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

// Convert Day of Year to Date (using a reference year)
export function doyToDate(doy: number, year: number = 2023): Date {
  const date = new Date(year, 0) // January 1st
  date.setDate(doy)
  return date
}

// Format DOY as readable date string
export function formatDOY(doy: number, year: number = 2023): string {
  const date = doyToDate(doy, year)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

// Format DOY as short date string
export function formatDOYShort(doy: number, year: number = 2023): string {
  const date = doyToDate(doy, year)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

// Default phenology timing for NYC fall foliage
// Based on typical patterns - species without specific data use these
export const DEFAULT_TIMING = {
  // Early turners (birches, some maples)
  EARLY: {
    onset: 265,  // ~Sept 22
    peak: 285,   // ~Oct 12
    drop: 305,   // ~Nov 1
  },
  // Mid-season (most maples, oaks)
  MID: {
    onset: 275,  // ~Oct 2
    peak: 295,   // ~Oct 22
    drop: 315,   // ~Nov 11
  },
  // Late holders (oaks, beech)
  LATE: {
    onset: 285,  // ~Oct 12
    peak: 305,   // ~Nov 1
    drop: 325,   // ~Nov 21
  },
  // Default for unknown species
  DEFAULT: {
    onset: 280,  // ~Oct 7
    peak: 300,   // ~Oct 27
    drop: 320,   // ~Nov 16
  }
}

// Categorize species into timing groups
export function getDefaultTimingForSpecies(species: string): typeof DEFAULT_TIMING.DEFAULT {
  const lowerSpecies = species.toLowerCase()

  // Early turners
  if (
    lowerSpecies.includes('birch') ||
    lowerSpecies.includes('betula') ||
    lowerSpecies.includes('dogwood') ||
    lowerSpecies.includes('cornus') ||
    lowerSpecies.includes('sumac') ||
    lowerSpecies.includes('rhus') ||
    lowerSpecies.includes('sassafras')
  ) {
    return DEFAULT_TIMING.EARLY
  }

  // Late holders
  if (
    lowerSpecies.includes('oak') ||
    lowerSpecies.includes('quercus') ||
    lowerSpecies.includes('beech') ||
    lowerSpecies.includes('fagus') ||
    lowerSpecies.includes('willow') ||
    lowerSpecies.includes('salix')
  ) {
    return DEFAULT_TIMING.LATE
  }

  // Mid-season (maples, etc.)
  if (
    lowerSpecies.includes('maple') ||
    lowerSpecies.includes('acer') ||
    lowerSpecies.includes('ginkgo') ||
    lowerSpecies.includes('ash') ||
    lowerSpecies.includes('fraxinus')
  ) {
    return DEFAULT_TIMING.MID
  }

  return DEFAULT_TIMING.DEFAULT
}

// Animation timing constants
export const ANIMATION_BOUNDS = {
  START_DOY: 255,  // ~Sept 12 (before earliest color change)
  END_DOY: 330,    // ~Nov 26 (after latest leaf drop)

  // Duration in seconds at 1x speed
  DEFAULT_DURATION: 45,
}
