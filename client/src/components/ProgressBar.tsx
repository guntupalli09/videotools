import { useState, useEffect } from 'react'

interface ProgressBarProps {
  progress: number
  status?: string
  /** When true, show "Checking your job…" (rehydration). */
  isRehydrating?: boolean
  /** When true, never override status with Queued/Starting (e.g. during upload). */
  isUploadPhase?: boolean
  /** When progress is 0 (and not upload), show queue position or "Starting…". */
  queuePosition?: number
  /** Timestamp (ms) when processing started; after ~50s show "Still working" reassurance. */
  processingStartedAt?: number | null
}

const STILL_WORKING_ELAPSED_MS = 50_000

export default function ProgressBar({
  progress,
  status = 'Processing...',
  isRehydrating = false,
  isUploadPhase = false,
  queuePosition,
  processingStartedAt,
}: ProgressBarProps) {
  const [showStillWorking, setShowStillWorking] = useState(false)

  useEffect(() => {
    if (progress >= 100 || !processingStartedAt) return
    const elapsed = Date.now() - processingStartedAt
    if (elapsed >= STILL_WORKING_ELAPSED_MS) {
      setShowStillWorking(true)
      return
    }
    const t = setTimeout(
      () => setShowStillWorking(true),
      STILL_WORKING_ELAPSED_MS - elapsed
    )
    return () => clearTimeout(t)
  }, [progress, processingStartedAt])

  let displayStatus = status
  if (isRehydrating) {
    displayStatus = 'Checking your job…'
  } else if (!isUploadPhase && progress === 0) {
    if (queuePosition !== undefined && queuePosition > 0) {
      displayStatus = `In queue — ${queuePosition} job${queuePosition === 1 ? '' : 's'} ahead of you`
    } else {
      displayStatus = 'Starting…'
    }
  }

  return (
    <div className="w-full">
      {displayStatus && (
        <p className="text-sm font-medium text-gray-700 mb-2">{displayStatus}</p>
      )}
      <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-violet-600 to-purple-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showStillWorking && progress < 100 && (
        <p className="text-sm text-gray-500 mt-2">Still working — this may take a minute for longer files.</p>
      )}
      <p className="text-sm text-gray-500 mt-2 text-right">{Math.round(progress)}%</p>
    </div>
  )
}
