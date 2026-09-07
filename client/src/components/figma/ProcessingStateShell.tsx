import type { ReactNode } from 'react'

interface ProcessingStateShellProps {
  children: ReactNode
  className?: string
}

/** Shared processing wrapper with animated gradient background. */
export function ProcessingStateShell({ children, className = '' }: ProcessingStateShellProps) {
  return (
    <div
      className={`rounded-xl processing-gradient-bg border border-blue-100 p-6 sm:p-8 dark:border-blue-900/30 ${className}`}
    >
      {children}
    </div>
  )
}
