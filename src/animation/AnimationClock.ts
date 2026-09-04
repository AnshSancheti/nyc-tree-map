/**
 * Animation clock that lives outside React.
 *
 * The requestAnimationFrame loop advances the day-of-year and notifies
 * subscribers synchronously. The map subscribes and pushes the new day straight
 * into deck.gl; the controls subscribe with a throttle so the date label and
 * slider re-render at a modest rate instead of 60 times a second.
 */

import { ANIMATION_BOUNDS } from '../utils/phenology'

export interface ClockSnapshot {
  currentDOY: number
  isPlaying: boolean
  speed: number
}

type Listener = (snapshot: ClockSnapshot) => void

const { START_DOY, END_DOY, SECONDS_PER_LOOP_AT_1X } = ANIMATION_BOUNDS

export class AnimationClock {
  private currentDOY = START_DOY
  private playing = false
  private speed = 1
  private rafId: number | null = null
  private lastTimestamp = 0
  private listeners = new Set<Listener>()

  readonly startDOY = START_DOY
  readonly endDOY = END_DOY

  getSnapshot(): ClockSnapshot {
    return { currentDOY: this.currentDOY, isPlaying: this.playing, speed: this.speed }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  play(): void {
    if (this.playing) return
    this.playing = true
    this.lastTimestamp = 0
    this.rafId = requestAnimationFrame(this.tick)
    this.notify()
  }

  pause(): void {
    if (!this.playing) return
    this.playing = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.notify()
  }

  toggle(): void {
    if (this.playing) this.pause()
    else this.play()
  }

  setSpeed(speed: number): void {
    this.speed = speed
    this.notify()
  }

  seek(doy: number): void {
    this.currentDOY = Math.max(START_DOY, Math.min(END_DOY, doy))
    this.notify()
  }

  reset(): void {
    this.pause()
    this.seek(START_DOY)
  }

  dispose(): void {
    this.pause()
    this.listeners.clear()
  }

  /** Days advanced per millisecond at the current speed. */
  private daysPerMs(): number {
    const totalDays = END_DOY - START_DOY
    return (totalDays / (SECONDS_PER_LOOP_AT_1X * 1000)) * this.speed
  }

  private tick = (timestamp: number): void => {
    if (!this.playing) return
    if (this.lastTimestamp === 0) this.lastTimestamp = timestamp
    // Clamp the step so a background tab does not jump a whole season on resume
    const deltaMs = Math.min(timestamp - this.lastTimestamp, 250)
    this.lastTimestamp = timestamp

    let next = this.currentDOY + this.daysPerMs() * deltaMs
    if (next >= END_DOY) next = START_DOY
    this.currentDOY = next

    this.notify()
    this.rafId = requestAnimationFrame(this.tick)
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) listener(snapshot)
  }
}
