import { formatDOY } from '../utils/phenology'

interface ControlsProps {
  currentDOY: number
  isPlaying: boolean
  speed: number
  startDOY: number
  endDOY: number
  onPlay: () => void
  onPause: () => void
  onSpeedChange: (speed: number) => void
  onSeek: (doy: number) => void
}

export default function Controls({
  currentDOY,
  isPlaying,
  speed,
  startDOY,
  endDOY,
  onPlay,
  onPause,
  onSpeedChange,
  onSeek,
}: ControlsProps) {
  const handlePlayPause = () => {
    if (isPlaying) {
      onPause()
    } else {
      onPlay()
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value))
  }

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSpeedChange(parseFloat(e.target.value))
  }

  // Calculate progress percentage for potential styling
  const progress = ((currentDOY - startDOY) / (endDOY - startDOY)) * 100

  return (
    <div className="controls">
      {/* Date Display */}
      <div className="date-display">
        {formatDOY(Math.round(currentDOY))}
      </div>

      {/* Playback Controls */}
      <div className="playback-controls">
        {/* Play/Pause Button */}
        <button
          className="play-button"
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            // Pause icon
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="4" height="12" rx="1" />
              <rect x="8" y="1" width="4" height="12" rx="1" />
            </svg>
          ) : (
            // Play icon
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5v11l9-5.5z" />
            </svg>
          )}
        </button>

        {/* Timeline Slider */}
        <input
          type="range"
          className="timeline-slider"
          min={startDOY}
          max={endDOY}
          step={0.5}
          value={currentDOY}
          onChange={handleSliderChange}
          style={{
            background: `linear-gradient(to right, rgba(255,255,255,0.5) ${progress}%, rgba(255,255,255,0.15) ${progress}%)`
          }}
        />

        {/* Speed Selector */}
        <select
          className="speed-select"
          value={speed}
          onChange={handleSpeedChange}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
    </div>
  )
}
