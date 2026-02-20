/**
 * Shows elapsed time and smart estimated total during processing.
 * UI-layer only; no business logic. Uses video duration for estimate when available.
 */

const SPEED_RATIO = 0.04 // seconds processing per video second (example)

export interface ProcessingTimeBlockProps {
  elapsedMs: number
  /** Video duration in seconds (from file preview). When missing, estimate is omitted. */
  videoDurationSeconds?: number
  /** e.g. "Processing video..." */
  label?: string
  className?: string
}

export default function ProcessingTimeBlock({
  elapsedMs,
  videoDurationSeconds,
  label = 'Processing video…',
  className = '',
}: ProcessingTimeBlockProps) {
  const elapsedSec = elapsedMs / 1000
  let estimateLine: string

  if (videoDurationSeconds != null && videoDurationSeconds > 0) {
    const estimatedTotalMs = videoDurationSeconds * 1000 * SPEED_RATIO
    const lowerBound = estimatedTotalMs * 0.8
    const upperBound = estimatedTotalMs * 1.2
    if (elapsedMs >= estimatedTotalMs) {
      estimateLine = 'Finalizing…'
    } else {
      const lowSec = Math.round(lowerBound / 1000)
      const highSec = Math.round(upperBound / 1000)
      estimateLine = `Est. ~${lowSec}–${highSec}s total`
    }
  } else {
    estimateLine = 'Est. ~30–60s total'
  }

  return (
    <div className={`text-center ${className}`} role="status" aria-live="polite">
      <p className="text-sm font-medium text-gray-700 mb-0.5">{label}</p>
      <p className="text-sm text-gray-600">{elapsedSec.toFixed(1)}s elapsed</p>
      <p className="text-xs text-gray-500">{estimateLine}</p>
    </div>
  )
}
