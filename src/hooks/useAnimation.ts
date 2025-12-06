import { useState, useRef, useCallback, useEffect } from 'react'
import { ANIMATION_BOUNDS } from '../utils/phenology'

interface UseAnimationReturn {
  currentDOY: number
  isPlaying: boolean
  speed: number
  startDOY: number
  endDOY: number
  play: () => void
  pause: () => void
  toggle: () => void
  setSpeed: (speed: number) => void
  seekTo: (doy: number) => void
  reset: () => void
}

export function useAnimation(): UseAnimationReturn {
  const { START_DOY, END_DOY, DEFAULT_DURATION } = ANIMATION_BOUNDS

  const [currentDOY, setCurrentDOY] = useState(START_DOY)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeedState] = useState(1)

  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  // Calculate how many DOY units to advance per millisecond
  // At speed=1, we want to cover (END_DOY - START_DOY) in DEFAULT_DURATION seconds
  const getDOYPerMs = useCallback((currentSpeed: number) => {
    const totalDays = END_DOY - START_DOY
    const durationMs = DEFAULT_DURATION * 1000
    return (totalDays / durationMs) * currentSpeed
  }, [END_DOY, START_DOY, DEFAULT_DURATION])

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp
    }

    const deltaMs = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp

    setCurrentDOY(prev => {
      const newDOY = prev + getDOYPerMs(speed) * deltaMs
      if (newDOY >= END_DOY) {
        // Loop back to start
        return START_DOY
      }
      return newDOY
    })

    animationRef.current = requestAnimationFrame(animate)
  }, [speed, getDOYPerMs, END_DOY, START_DOY])

  // Start animation
  const play = useCallback(() => {
    if (isPlaying) return

    setIsPlaying(true)
    lastTimeRef.current = 0
    animationRef.current = requestAnimationFrame(animate)
  }, [isPlaying, animate])

  // Stop animation
  const pause = useCallback(() => {
    setIsPlaying(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  // Toggle play/pause
  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  // Set playback speed
  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed)
  }, [])

  // Seek to specific DOY
  const seekTo = useCallback((doy: number) => {
    setCurrentDOY(Math.max(START_DOY, Math.min(END_DOY, doy)))
  }, [START_DOY, END_DOY])

  // Reset to start
  const reset = useCallback(() => {
    pause()
    setCurrentDOY(START_DOY)
  }, [pause, START_DOY])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return {
    currentDOY,
    isPlaying,
    speed,
    startDOY: START_DOY,
    endDOY: END_DOY,
    play,
    pause,
    toggle,
    setSpeed,
    seekTo,
    reset,
  }
}
