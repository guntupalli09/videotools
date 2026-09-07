import { useRef, useState } from 'react'
import { formatDuration } from '../../lib/filePreview'
import { VideoFrameStrip } from './VideoFrameStrip'

interface VideoResultPreviewProps {
  videoSrc: string
  durationSeconds?: number
  fileName?: string
  label?: string
  showFrameStrip?: boolean
}

/** Read-only video preview with optional frame strip — used on tool result views. */
export function VideoResultPreview({
  videoSrc,
  durationSeconds,
  fileName,
  label = 'Video preview',
  showFrameStrip = true,
}: VideoResultPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-component shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="tool-label mb-component-sm">{label}</h3>
      <div className="mx-auto mb-component-sm flex aspect-video max-h-[240px] w-full max-w-xl items-center justify-center overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          controls
          src={videoSrc}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        />
      </div>
      {(durationSeconds != null || fileName) && (
        <p className="mb-component-sm text-xs text-gray-600 dark:text-gray-400">
          {durationSeconds != null && <>Duration: {formatDuration(durationSeconds)}</>}
          {durationSeconds != null && fileName && <> · </>}
          {fileName}
        </p>
      )}
      {showFrameStrip && durationSeconds != null && durationSeconds > 0 && (
        <VideoFrameStrip
          videoSrc={videoSrc}
          durationSeconds={durationSeconds}
          currentTime={currentTime}
          onSeek={(t) => {
            const el = videoRef.current
            if (!el) return
            el.currentTime = t
            void el.play().catch(() => {})
          }}
        />
      )}
    </div>
  )
}
