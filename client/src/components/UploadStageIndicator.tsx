/**
 * Multi-stage progress visualization: Preparing → Uploading → Processing → Completed | Error.
 * Maps existing uploadPhase + status into UI stages. No backend changes.
 */

export type UploadStage = 'preparing' | 'uploading' | 'processing' | 'completed' | 'error'

export interface UploadStageIndicatorProps {
  /** Current phase from upload flow (preparing only when audio preprocessing runs). */
  uploadPhase: 'preparing' | 'uploading' | 'processing'
  /** Page status: idle | processing | completed | failed */
  status: 'idle' | 'processing' | 'completed' | 'failed'
  /** When true, show "Resuming…" instead of stage labels. */
  isRehydrating?: boolean
}

const STAGES: { key: UploadStage; label: string }[] = [
  { key: 'preparing', label: 'Preparing' },
  { key: 'uploading', label: 'Uploading' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'error', label: 'Error' },
]

function getActiveStage(props: UploadStageIndicatorProps): UploadStage {
  const { uploadPhase, status } = props
  if (status === 'completed') return 'completed'
  if (status === 'failed') return 'error'
  if (status !== 'processing') return 'preparing'
  if (uploadPhase === 'preparing') return 'preparing'
  if (uploadPhase === 'uploading') return 'uploading'
  return 'processing'
}

export default function UploadStageIndicator({
  uploadPhase,
  status,
  isRehydrating = false,
}: UploadStageIndicatorProps) {
  const active = getActiveStage({ uploadPhase, status, isRehydrating })

  if (isRehydrating) {
    return (
      <p className="text-sm font-medium text-gray-600 mb-2" aria-live="polite">
        Resuming…
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 mb-4" role="progressbar" aria-valuenow={STAGES.findIndex((s) => s.key === active) + 1} aria-valuemin={1} aria-valuemax={5} aria-label="Upload and processing stage">
      {STAGES.map(({ key, label }, i) => {
        const idx = STAGES.findIndex((s) => s.key === active)
        const isActive = key === active
        const isPast = i < idx
        const isFuture = i > idx
        return (
          <span key={key} className="flex items-center gap-1">
            <span
              className={`
                inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-medium
                ${isActive ? 'bg-violet-600 text-white ring-2 ring-violet-200' : ''}
                ${isPast ? 'bg-violet-100 text-violet-700' : ''}
                ${isFuture ? 'bg-gray-100 text-gray-400' : ''}
              `}
            >
              {isPast ? '✓' : i + 1}
            </span>
            <span className={`text-xs font-medium ${isActive ? 'text-violet-700' : isPast ? 'text-gray-600' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < STAGES.length - 1 && (
              <span className="hidden sm:inline w-4 h-0.5 bg-gray-200 mx-0.5" aria-hidden />
            )}
          </span>
        )
      })}
    </div>
  )
}
