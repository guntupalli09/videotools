import { CheckCircle2, Upload, type LucideIcon } from 'lucide-react'

export interface ResultHeaderProps {
  title: string
  processingTime?: string | null
  fileName?: string | null
  /** Secondary line shown on sm+ screens, e.g. word count or duration */
  meta?: string | null
  actionLabel?: string
  actionIcon?: LucideIcon
  onAction?: () => void
  /** When true, flattens corners for use inside guest teaser cards */
  embedded?: boolean
  className?: string
}

/** Compact emerald success bar — shared across all core tool result states. */
export default function ResultHeader({
  title,
  processingTime,
  fileName,
  meta,
  actionLabel = 'Upload new file',
  actionIcon: ActionIcon = Upload,
  onAction,
  embedded = false,
  className = '',
}: ResultHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
        embedded
          ? 'border-b border-gray-100 dark:border-gray-800 bg-transparent'
          : 'rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20'
      } ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" aria-hidden />
        <span className="text-sm font-medium text-gray-900 dark:text-white">{title}</span>
        {processingTime && (
          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">· {processingTime} ⚡</span>
        )}
        {meta && (
          <span className="hidden truncate text-xs text-gray-400 dark:text-gray-500 sm:inline">· {meta}</span>
        )}
        {fileName && (
          <span className="hidden truncate text-xs text-gray-400 dark:text-gray-500 sm:inline">— {fileName}</span>
        )}
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-blue-300 bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <ActionIcon className="h-4 w-4" aria-hidden />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
