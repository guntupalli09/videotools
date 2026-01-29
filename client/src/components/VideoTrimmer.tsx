import { useRef, useState, useEffect } from 'react'

interface VideoTrimmerProps {
  file: File
  onChange: (startSeconds: number, endSeconds: number) => void
}

export default function VideoTrimmer({ file, onChange }: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)

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

  const handleStartChange = (value: number) => {
    const clamped = Math.max(0, Math.min(value, end - 1))
    setStart(clamped)
    onChange(clamped, end)
  }

  const handleEndChange = (value: number) => {
    const clamped = Math.min(duration, Math.max(value, start + 1))
    setEnd(clamped)
    onChange(start, clamped)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const selectedDuration = Math.max(0, end - start)

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
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={duration}
                step={1}
                value={start}
                onChange={(e) => handleStartChange(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              <input
                type="range"
                min={0}
                max={duration}
                step={1}
                value={end}
                onChange={(e) => handleEndChange(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

