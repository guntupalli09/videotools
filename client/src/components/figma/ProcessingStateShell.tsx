import type { ReactNode } from 'react'

interface ProcessingStateShellProps {
  children: ReactNode
  className?: string
}

/** Shared processing wrapper with animated gradient background. */
export function ProcessingStateShell({ children, className = '' }: ProcessingStateShellProps) {
  return (
    <div
      className={`rounded-xl processing-gradient-bg border border-blue-100 p-component sm:p-section dark:border-blue-900/30 ${className}`}
    >
      {children}
    </div>
  )
}
