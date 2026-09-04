// Phenology timing for a species
export interface SpeciesTiming {
  onset: number    // Day of year when color change starts
  peak: number     // Day of year when color is most intense
  drop: number     // Day of year when leaves fall
  peakColor: [number, number, number]  // RGB peak color
}

// Map from species name to timing data
export interface PhenologyData {
  [speciesName: string]: SpeciesTiming
}

// Animation state
export interface AnimationState {
  currentDOY: number
  isPlaying: boolean
  speed: number
  startDOY: number
  endDOY: number
}
