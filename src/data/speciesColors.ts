// Species to peak color mapping
// Based on typical fall foliage colors for NYC street trees

export const SPECIES_COLORS: Record<string, [number, number, number]> = {
  // Electric yellow species
  'ginkgo': [255, 225, 53],
  'Ginkgo biloba': [255, 225, 53],

  // Deep crimson/red species
  'red maple': [220, 20, 60],
  'Acer rubrum': [220, 20, 60],
  'Japanese maple': [220, 20, 60],
  'Acer palmatum': [220, 20, 60],
  'sweetgum': [200, 30, 70],
  'Liquidambar styraciflua': [200, 30, 70],

  // Warm amber/orange species
  'pin oak': [255, 140, 0],
  'Quercus palustris': [255, 140, 0],
  'red oak': [205, 92, 0],
  'Quercus rubra': [205, 92, 0],
  'scarlet oak': [255, 100, 0],
  'Quercus coccinea': [255, 100, 0],
  'white oak': [180, 120, 60],
  'Quercus alba': [180, 120, 60],

  // Soft gold species
  'honeylocust': [218, 165, 32],
  'honey locust': [218, 165, 32],
  'Gleditsia triacanthos': [218, 165, 32],
  'American elm': [218, 180, 50],
  'Ulmus americana': [218, 180, 50],
  'littleleaf linden': [200, 170, 50],
  'Tilia cordata': [200, 170, 50],
  'silver linden': [200, 170, 50],
  'Tilia tomentosa': [200, 170, 50],

  // Muted bronze/brown species
  'London planetree': [205, 133, 63],
  'London plane': [205, 133, 63],
  'Platanus x acerifolia': [205, 133, 63],
  'sycamore': [205, 133, 63],
  'Platanus occidentalis': [205, 133, 63],

  // Norway maple - late golden yellow
  'Norway maple': [240, 200, 40],
  'Acer platanoides': [240, 200, 40],

  // Silver maple - pale yellow
  'silver maple': [230, 210, 80],
  'Acer saccharinum': [230, 210, 80],

  // Sugar maple - orange-red
  'sugar maple': [255, 120, 50],
  'Acer saccharum': [255, 120, 50],

  // Callery/Bradford pear - burgundy to purple
  'Callery pear': [180, 50, 80],
  'Pyrus calleryana': [180, 50, 80],

  // Cherry species - orange red
  'Yoshino cherry': [240, 100, 70],
  'Prunus x yedoensis': [240, 100, 70],
  'Kwanzan cherry': [230, 90, 80],
  'Prunus serrulata': [230, 90, 80],

  // Ash - purple/burgundy
  'green ash': [160, 80, 100],
  'Fraxinus pennsylvanica': [160, 80, 100],
  'white ash': [170, 70, 110],
  'Fraxinus americana': [170, 70, 110],

  // Zelkova - orange-red
  'Japanese zelkova': [230, 110, 50],
  'Zelkova serrata': [230, 110, 50],

  // Tulip tree - bright yellow
  'tulip': [250, 220, 50],
  'tuliptree': [250, 220, 50],
  'Liriodendron tulipifera': [250, 220, 50],

  // Dogwood - red-purple
  'flowering dogwood': [200, 60, 90],
  'Cornus florida': [200, 60, 90],

  // Eastern redbud - yellow
  'eastern redbud': [220, 190, 60],
  'Cercis canadensis': [220, 190, 60],

  // Black locust - pale yellow
  'black locust': [210, 195, 70],
  'Robinia pseudoacacia': [210, 195, 70],

  // Birch - bright yellow
  'paper birch': [250, 230, 70],
  'Betula papyrifera': [250, 230, 70],
  'river birch': [240, 220, 60],
  'Betula nigra': [240, 220, 60],
}

// Default color for unknown species
export const DEFAULT_PEAK_COLOR: [number, number, number] = [204, 85, 0] // Rust orange

// Get the peak color for a species
export function getSpeciesPeakColor(species: string): [number, number, number] {
  // Try exact match first
  if (SPECIES_COLORS[species]) {
    return SPECIES_COLORS[species]
  }

  // Try case-insensitive match
  const lowerSpecies = species.toLowerCase()
  for (const [key, color] of Object.entries(SPECIES_COLORS)) {
    if (key.toLowerCase() === lowerSpecies) {
      return color
    }
  }

  // Try partial match (for species like "honeylocust 'Shademaster'")
  for (const [key, color] of Object.entries(SPECIES_COLORS)) {
    if (lowerSpecies.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerSpecies)) {
      return color
    }
  }

  return DEFAULT_PEAK_COLOR
}
