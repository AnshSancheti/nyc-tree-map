import { useEffect, useRef, useState } from 'react'
import { clock } from '../animation/clock'
import type { ClockSnapshot } from '../animation/AnimationClock'

interface UseAnimationReturn extends ClockSnapshot {
  startDOY: number
  endDOY: number
  play: () => void
  pause: () => void
  toggle: () => void
  setSpeed: (speed: number) => void
  seekTo: (doy: number) => void
  reset: () => void
}

/** How often the React-rendered controls follow the clock while playing. */
const CONTROLS_UPDATE_MS = 100

/**
 * React view of the animation clock. The clock itself runs outside React and
 * drives the map directly; this hook only feeds the controls, throttled so the
 * date label and slider do not re-render every animation frame.
 */
export function useAnimation(): UseAnimationReturn {
  const [snapshot, setSnapshot] = useState<ClockSnapshot>(() => clock.getSnapshot())
  const lastRenderRef = useRef(0)
  const lastSnapshotRef = useRef(snapshot)

  useEffect(() => {
    return clock.subscribe((next) => {
      const prev = lastSnapshotRef.current
      const now = performance.now()
      const stateChanged = next.isPlaying !== prev.isPlaying || next.speed !== prev.speed
      const due = now - lastRenderRef.current >= CONTROLS_UPDATE_MS
      const wrapped = next.currentDOY < prev.currentDOY
      if (stateChanged || due || wrapped || !next.isPlaying) {
        lastRenderRef.current = now
        lastSnapshotRef.current = next
        setSnapshot(next)
      }
    })
  }, [])

  return {
    ...snapshot,
    startDOY: clock.startDOY,
    endDOY: clock.endDOY,
    play: () => clock.play(),
    pause: () => clock.pause(),
    toggle: () => clock.toggle(),
    setSpeed: (speed: number) => clock.setSpeed(speed),
    seekTo: (doy: number) => clock.seek(doy),
    reset: () => clock.reset(),
  }
}
