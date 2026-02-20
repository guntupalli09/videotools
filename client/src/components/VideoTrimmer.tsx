import { useRef, useState, useEffect, useCallback } from 'react'

interface VideoTrimmerProps {
  file: File
  onChange: (startSeconds: number, endSeconds: number) => void
}

const MIN_SEGMENT_SECONDS = 1

export default function VideoTrimmer({ file, onChange }: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null)

  useEffect(() => {
    setStart(0)
    setEnd(0)
  }, [file])

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return
    const d = videoRef.current.duration || 0
    setDuration(d)
    setStart(0)
    setEnd(d)
    onChange(0, d)
  }

  const handleStartChange = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(value, end - MIN_SEGMENT_SECONDS))
      setStart(clamped)
      onChange(clamped, end)
    },
    [end, onChange]
  )

  const handleEndChange = useCallback(
    (value: number) => {
      const clamped = Math.min(duration, Math.max(value, start + MIN_SEGMENT_SECONDS))
      setEnd(clamped)
      onChange(start, clamped)
    },
    [duration, start, onChange]
  )

  const trackRect = useRef({ left: 0, width: 1 })
  const updateTrackRect = useCallback(() => {
    if (trackRef.current) {
      const r = trackRef.current.getBoundingClientRect()
      trackRect.current = { left: r.left, width: r.width }
    }
  }, [])

  const positionToSeconds = useCallback((clientX: number): number => {
    const { left, width } = trackRect.current
    const p = (clientX - left) / width
    return Math.max(0, Math.min(1, p)) * duration
  }, [duration])

  useEffect(() => {
    if (dragging === null) return
    updateTrackRect()

    const handleMove = (e: MouseEvent | TouchEvent) => {
      updateTrackRect()
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
      if (clientX == null) return
      const sec = positionToSeconds(clientX)
      if (dragging === 'start') handleStartChange(sec)
      else handleEndChange(sec)
    }

    const handleUp = () => setDragging(null)

    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [dragging, handleStartChange, handleEndChange, positionToSeconds, updateTrackRect])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const selectedDuration = Math.max(0, end - start)
  const startPercent = duration > 0 ? (start / duration) * 100 : 0
  const endPercent = duration > 0 ? (end / duration) * 100 : 100

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">
        Trim video before processing
      </h3>
      <video
        ref={videoRef}
        controls
        onLoadedMetadata={handleLoadedMetadata}
        className="mb-3 h-48 w-full rounded-lg bg-black object-contain"
        src={URL.createObjectURL(file)}
      />
      {duration > 0 && (
        <>
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Start: <strong>{formatTime(start)}</strong>
              </span>
              <span>
                End: <strong>{formatTime(end)}</strong>
              </span>
              <span>
                Selected:{' '}
                <strong>
                  {formatTime(selectedDuration)} ({selectedDuration.toFixed(0)}s)
                </strong>
              </span>
            </div>
            {/* Single track with two draggable thumbs and filled segment */}
            <div
              ref={trackRef}
              className="relative h-8 w-full select-none"
              onMouseLeave={() => {
                if (dragging) return
                updateTrackRect()
              }}
            >
              {/* Track background */}
              <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gray-200" />
              {/* Filled segment between start and end */}
              <div
                className="absolute inset-y-0 rounded-full bg-violet-600"
                style={{
                  left: `${startPercent}%`,
                  width: `${endPercent - startPercent}%`,
                }}
              />
              {/* Start handle */}
              <div
                role="slider"
                aria-label="Trim start"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={start}
                tabIndex={0}
                className="absolute top-1/2 z-10 h-5 w-5 -translate-y-1/2 cursor-grab rounded-full border-2 border-violet-600 bg-white shadow-card transition-transform active:cursor-grabbing active:scale-105"
                style={{ left: `calc(${startPercent}% - 10px)` }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  updateTrackRect()
                  setDragging('start')
                }}
                onTouchStart={(e) => {
                  e.preventDefault()
                  updateTrackRect()
                  setDragging('start')
                }}
                onKeyDown={(e) => {
                  const step = 5
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    handleStartChange(start - step)
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    handleStartChange(start + step)
                  }
                }}
              />
              {/* End handle */}
              <div
                role="slider"
                aria-label="Trim end"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={end}
                tabIndex={0}
                className="absolute top-1/2 z-10 h-5 w-5 -translate-y-1/2 cursor-grab rounded-full border-2 border-violet-600 bg-white shadow-card transition-transform active:cursor-grabbing active:scale-105"
                style={{ left: `calc(${endPercent}% - 10px)` }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  updateTrackRect()
                  setDragging('end')
                }}
                onTouchStart={(e) => {
                  e.preventDefault()
                  updateTrackRect()
                  setDragging('end')
                }}
                onKeyDown={(e) => {
                  const step = 5
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    handleEndChange(end - step)
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    handleEndChange(end + step)
                  }
                }}
              />
            </div>
            <p className="text-xs text-gray-400">
              Drag the left or right handle to set the segment. Minimum 1 second.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
