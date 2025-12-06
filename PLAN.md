# NYC Autumn Foliage Visualization

A time-lapse animation of New York City's 680,000 street trees changing color through fall, rendered as glowing pixels on a dark map.

## Vision

The city as a living organism. Each tree is a single data point—a tiny square of light. As autumn progresses, the map ignites like embers spreading across a circuit board, peaks in a dense mosaic of warm color, then fades to darkness. The feeling is quiet, hypnotic, almost meditative—watching a massive dataset breathe.

## Aesthetic

**Tron-minimal.** Pure black void background. Borough boundaries, coastlines, and streets rendered as thin white neon vector lines (no fill, just strokes). Trees are the *only* source of color—small self-luminous squares with subtle bloom. The overall look is a dark control room display, data made beautiful.

No textures, no gradients on the map itself. Clean, stark, geometric.

## Data Sources

1. **NYC Street Tree Census** — [NYC Open Data](https://data.cityofnewyork.us/Environment/2015-Street-Tree-Census-Tree-Data/uvpi-gqnh)
   - Provides: species (`spc_common`, `spc_latin`), lat/long coordinates, borough for ~680k trees
   - This is the spatial foundation—where every pixel lives
   
2. **USA National Phenology Network** — [Data Portal](https://www.usanpn.org/data/observational)
   - Provides: historical phenophase observations (leaf color onset, peak, drop) by species
   - API and bulk CSV access, filter by NYC region bounding box
   - **Join key**: species name → phenology timing curve
   
3. **NYC borough/street geometry** — OpenStreetMap or NYC Open Data shapefiles

## Color Palette by Species

| Species | Peak Color | Hex |
|---------|-----------|-----|
| Ginkgo | Electric yellow | `#FFE135` |
| Red Maple | Deep crimson | `#DC143C` |
| Pin Oak | Warm amber | `#FF8C00` |
| Honey Locust | Soft gold → brown | `#DAA520` |
| London Plane | Muted bronze | `#CD853F` |
| Default/other | Rust orange | `#CC5500` |

Trees start as dim sage-green (`#4A5A4A`) and fade to dark gray (`#2A2A2A`) before disappearing.

## Phenology-Driven Timeline

The animation is **entirely data-driven**—no hardcoded dates. Each tree's color arc is determined by joining its species from the NYC Tree Census to phenology records from USA-NPN.

### Data Pipeline

1. **Join datasets**: Match `spc_common` or `spc_latin` field in NYC Tree Census → species records in USA-NPN
2. **Extract phenology events**: For each species, pull historical observation data for:
   - `Leaves changing color` (onset)
   - `Colored leaves` (peak intensity)
   - `Falling leaves` (decline)
3. **Compute species timing curves**: Use median or mean day-of-year (DOY) for each phenophase across multiple years. Each species gets:
   - `color_onset_doy`: when leaves start turning
   - `color_peak_doy`: when color is most intense
   - `leaf_drop_doy`: when leaves fall / tree goes bare
4. **Add variance**: Apply small per-tree random offset (±3–7 days) so trees of the same species don't all turn simultaneously—nature isn't uniform

### USA-NPN Data Access

- **API**: https://data.usanpn.org/observations — filter by species, phenophase, and bounding box (NYC region)
- **Bulk download**: https://www.usanpn.org/data/download — CSV of historical observations
- **Key fields**: `species_id`, `phenophase_id`, `mean_first_yes_doy`, `mean_last_yes_doy`

If a species has no USA-NPN data, fall back to genus-level averages or assign to a default "mid-October peak" curve.

### Animation Logic

For each frame (representing a single day):
```
for each tree:
  current_doy = frame_to_day_of_year(frame)
  species_timing = phenology_lookup[tree.species]
  
  if current_doy < species_timing.color_onset_doy:
    color = DIM_GREEN
  else if current_doy < species_timing.color_peak_doy:
    color = lerp(DIM_GREEN → PEAK_COLOR, progress)
  else if current_doy < species_timing.leaf_drop_doy:
    color = lerp(PEAK_COLOR → BROWN → GRAY, progress)
  else:
    color = INVISIBLE (or very dim gray)
```

The animation naturally emerges from the data: early-turning species (birches, some maples) spark first, late-holders (oaks) anchor the end. No manual choreography needed.

### Temporal Range

Start the animation ~2 weeks before the earliest `color_onset_doy` in the dataset. End ~1 week after the latest `leaf_drop_doy`. This window will likely span **late September through mid-November** but is determined entirely by the phenology data.

Target duration: **45–90 seconds** at 30fps.

## Visual Details

- **Tree pixels**: 3–5px squares depending on zoom, emissive (no external lighting)
- **Bloom/glow**: Subtle, 1–2px halo around bright pixels
- **Camera**: Locked top-down orthographic, no movement—stillness is the point
- **Timestamp**: Small white monospace text in corner, shows current date
- **Pacing**: Slow start, accelerate through cascade, hold at peak, gentle fade out

## Technical Approach

Build as a web visualization using canvas (for performance with 680k points) or WebGL. Mapbox GL JS or Deck.gl can handle the basemap geometry. Alternatively, pre-render frames and export as video.

Key steps:
1. **Parse tree census CSV** — extract species + coordinates for all trees
2. **Fetch phenology data** — query USA-NPN API or bulk download for species in the census, filtered to NYC region
3. **Build species → timing lookup** — for each species, compute median DOY for color onset, peak, and leaf drop from phenology observations
4. **Handle missing species** — fall back to genus-level timing or default mid-October curve
5. **Build or load NYC geometry** — white stroke paths for boroughs/streets
6. **Render loop**: for each frame (each simulated day), iterate all trees, compute color from species timing curve + small per-tree random offset, draw as glowing square

## Inspiration References

- [Freeman Jiang's Citi Bike animation](https://twitter.com/freemanjiangg) — same "one dot per event, accelerated time" energy
- [Riley Waltz](https://walzr.com/) — organic, flowing, hypnotic data art
- [NYC Street Tree Map](https://tree-map.nycgovparks.org/) — the underlying data, reimagined

## Success Criteria

When someone watches this, they should feel like they're seeing the city's metabolism—a slow deep breath in, a long exhale out. Warmth spreading, then receding. Data made alive.