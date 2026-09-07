import type { ReactNode } from 'react'
import { FileDown } from 'lucide-react'

interface ExportsPanelProps {
  children: ReactNode
  freeExportsUsed?: number
  freeLimit?: number
  footer?: ReactNode
  badge?: ReactNode
}

/** Sticky right-rail exports card — matches VideoToSubtitles / VideoToTranscript pattern. */
export function ExportsPanel({
  children,
  freeExportsUsed,
  freeLimit = 2,
  footer,
  badge,
}: ExportsPanelProps) {
  return (
    <aside className="lg:sticky lg:top-20 space-y-component-sm">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-component-sm py-3 dark:border-gray-800 dark:bg-gray-800/40">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
            <FileDown className="h-4 w-4 text-blue-600" strokeWidth={1.7} aria-hidden />
            Exports
          </h3>
          <div className="flex items-center gap-2">
            {badge}
            {freeExportsUsed != null && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {freeExportsUsed}/{freeLimit} free
              </span>
            )}
          </div>
        </div>
        <div className="space-y-component-sm p-3">{children}</div>
        {footer && (
          <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">{footer}</div>
        )}
      </div>
    </aside>
  )
}

export function ExportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="tool-label mb-2">
        {title}
      </p>
      {children}
    </div>
  )
}
