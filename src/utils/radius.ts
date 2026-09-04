// Diameter scaling constants
// NYC street trees range from 3" (serviceberry) to 40"+ (mature London planetree)
// Using aggressive scaling so size differences are visible at city scale
export const MIN_DBH = 3       // smallest trees (serviceberry, young plantings)
export const MAX_DBH = 45      // largest trees (mature London planetrees, oaks)
export const DEFAULT_DBH = 10  // median diameter for trees with missing data
export const MIN_RADIUS = 1.5  // tiny ornamentals - barely visible specks
export const MAX_RADIUS = 22   // massive canopy trees - dominate the view

const MAX_NORMALIZED = Math.pow(MAX_DBH / MIN_DBH, 0.85)

/**
 * Radius (meters) from DBH (diameter at breast height, inches).
 * Power scaling with exponent 0.85: more aggressive than sqrt so size
 * differences pop at city scale. A 40" London planetree is ~7x a 3" serviceberry.
 */
export function radiusFromDiameter(dbh: number): number {
  const effectiveDBH = dbh > 0 ? dbh : DEFAULT_DBH
  const clampedDBH = Math.max(MIN_DBH, Math.min(MAX_DBH, effectiveDBH))
  const normalized = Math.pow(clampedDBH / MIN_DBH, 0.85)
  return MIN_RADIUS + (normalized / MAX_NORMALIZED) * (MAX_RADIUS - MIN_RADIUS)
}
