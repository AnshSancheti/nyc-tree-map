/**
 * Checks that the GPU color math in TreeLayer matches the CPU reference
 * `getTreeColor`. The GLSL is mirrored here line for line in JavaScript
 * (float math, no rounding) and compared across every species timing on a
 * fine grid of days. Run with `npm test`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getTreeColor } from '../src/utils/colors'
import { buildSpeciesTable } from '../src/data/loadTrees'
import { ANIMATION_BOUNDS } from '../src/utils/phenology'
import type { PhenologyData } from '../src/data/types'

const here = dirname(fileURLToPath(import.meta.url))
const phenology = JSON.parse(readFileSync(join(here, '..', 'public', 'data', 'phenology.json'), 'utf8')) as PhenologyData
const meta = JSON.parse(readFileSync(join(here, '..', 'public', 'data', 'trees.meta.json'), 'utf8')) as { species: string[] }

type Vec4 = [number, number, number, number]
const mix = (a: Vec4, b: Vec4, t: number): Vec4 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  a[3] + (b[3] - a[3]) * t,
]

/** JavaScript mirror of the vs:DECKGL_FILTER_COLOR injection in TreeLayer.ts (0..1 floats). */
function shaderColor(timing: [number, number, number], peak: [number, number, number], d: number): Vec4 {
  const [onset, peakDay, drop] = timing
  const dimGreen: Vec4 = [74 / 255, 90 / 255, 74 / 255, 200 / 255]
  const brownGray: Vec4 = [42 / 255, 42 / 255, 42 / 255, 150 / 255]
  const peakColor: Vec4 = [peak[0] / 255, peak[1] / 255, peak[2] / 255, 1]
  if (d < onset) return dimGreen
  if (d < peakDay) {
    const t = (d - onset) / Math.max(peakDay - onset, 0.001)
    return mix(dimGreen, peakColor, t * t)
  }
  if (d < drop) {
    const t = (d - peakDay) / Math.max(drop - peakDay, 0.001)
    return mix(peakColor, brownGray, 1 - (1 - t) * (1 - t))
  }
  const t = Math.min(Math.max((d - drop) / 7, 0), 1)
  return mix(brownGray, [0, 0, 0, 0], t)
}

test('GPU phenology color matches the CPU reference for every species', () => {
  const table = buildSpeciesTable(meta.species, phenology)
  const { START_DOY, END_DOY } = ANIMATION_BOUNDS
  let comparisons = 0
  let maxError = 0

  for (const entry of table) {
    for (const offset of [-5, 0, 5]) {
      // The shader gets thresholds shifted by +offset; the CPU path subtracts offset from the day.
      const shifted: [number, number, number] = [entry.onset + offset, entry.peak + offset, entry.drop + offset]
      for (let d = START_DOY - 10; d <= END_DOY + 45; d += 0.25) {
        const cpu = getTreeColor(entry, d, offset)
        const gpu = shaderColor(shifted, entry.peakColor, d)
        for (let c = 0; c < 4; c++) {
          const err = Math.abs(cpu[c] - gpu[c] * 255)
          if (err > maxError) maxError = err
          // CPU rounds each channel to an integer; allow one unit of rounding.
          assert.ok(err <= 1.0001, `channel ${c} differs by ${err} at day ${d} for ${JSON.stringify(entry)} offset ${offset}: cpu=${cpu} gpu=${gpu.map(v => v * 255)}`)
        }
        comparisons++
      }
    }
  }
  assert.ok(comparisons > 100_000, `expected a large grid, got ${comparisons}`)
  console.log(`compared ${comparisons} samples, max channel error ${maxError.toFixed(3)} / 255`)
})

test('every species in the dataset resolves to a timing', () => {
  const table = buildSpeciesTable(meta.species, phenology)
  assert.equal(table.length, meta.species.length)
  for (const t of table) {
    assert.ok(t.onset < t.peak && t.peak < t.drop, `bad ordering ${JSON.stringify(t)}`)
    assert.equal(t.peakColor.length, 3)
  }
})
