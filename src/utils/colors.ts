import { interpolateRgb } from 'd3-interpolate'
import type { SpeciesTiming } from '../data/types'

// Base colors
export const COLORS = {
  DIM_GREEN: [74, 90, 74, 200] as [number, number, number, number],
  BROWN_GRAY: [42, 42, 42, 150] as [number, number, number, number],
  INVISIBLE: [0, 0, 0, 0] as [number, number, number, number],
  MISSING_DATA: [80, 80, 80, 100] as [number, number, number, number],
}

// Linear interpolation between two colors
export function lerpColor(
  from: [number, number, number] | [number, number, number, number],
  to: [number, number, number] | [number, number, number, number],
  t: number
): [number, number, number, number] {
  // Clamp t between 0 and 1
  t = Math.max(0, Math.min(1, t))

  const r = Math.round(from[0] + (to[0] - from[0]) * t)
  const g = Math.round(from[1] + (to[1] - from[1]) * t)
  const b = Math.round(from[2] + (to[2] - from[2]) * t)
  const a = Math.round((from[3] ?? 255) + ((to[3] ?? 255) - (from[3] ?? 255)) * t)

  return [r, g, b, a]
}

// More sophisticated color interpolation using d3
export function interpolateColors(
  from: [number, number, number],
  to: [number, number, number],
  t: number
): [number, number, number] {
  const interpolator = interpolateRgb(
    `rgb(${from[0]}, ${from[1]}, ${from[2]})`,
    `rgb(${to[0]}, ${to[1]}, ${to[2]})`
  )

  const result = interpolator(t)
  // Parse the rgb string back to numbers
  const match = result.match(/rgb\((\d+), (\d+), (\d+)\)/)
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
  }
  return to
}

// Get tree color based on current day of year and phenology timing
export function getTreeColor(
  timing: SpeciesTiming | null,
  currentDOY: number,
  treeOffset: number = 0
): [number, number, number, number] {
  // No phenology data for this species
  if (!timing) {
    return COLORS.MISSING_DATA
  }

  // Apply per-tree random offset
  const adjustedDOY = currentDOY - treeOffset

  // Before color change starts - dim green
  if (adjustedDOY < timing.onset) {
    return COLORS.DIM_GREEN
  }

  // During color change onset to peak
  if (adjustedDOY < timing.peak) {
    const progress = (adjustedDOY - timing.onset) / (timing.peak - timing.onset)
    // Ease-in for more natural progression
    const easedProgress = progress * progress

    const peakWithAlpha: [number, number, number, number] = [
      ...timing.peakColor,
      255
    ]
    return lerpColor(COLORS.DIM_GREEN, peakWithAlpha, easedProgress)
  }

  // At or past peak, transitioning to brown/gray
  if (adjustedDOY < timing.drop) {
    const progress = (adjustedDOY - timing.peak) / (timing.drop - timing.peak)
    // Ease-out for gradual fading
    const easedProgress = 1 - Math.pow(1 - progress, 2)

    const peakWithAlpha: [number, number, number, number] = [
      ...timing.peakColor,
      255
    ]
    return lerpColor(peakWithAlpha, COLORS.BROWN_GRAY, easedProgress)
  }

  // After leaf drop - invisible/very dim
  const daysPastDrop = adjustedDOY - timing.drop
  if (daysPastDrop < 7) {
    // Fade out over a week
    const fadeProgress = daysPastDrop / 7
    return lerpColor(COLORS.BROWN_GRAY, COLORS.INVISIBLE, fadeProgress)
  }

  return COLORS.INVISIBLE
}

// Calculate brightness/intensity for bloom effect
export function getColorIntensity(color: [number, number, number, number]): number {
  // Luminance calculation
  return (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) / 255
}
