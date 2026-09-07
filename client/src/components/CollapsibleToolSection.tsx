import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

type Props = {
  id?: string
  title: string
  ariaLabel?: string
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

/** Shared collapsed SEO / FAQ block — consistent spacing and tone above the site footer. */
export default function CollapsibleToolSection({
  id,
  title,
  ariaLabel,
  defaultOpen = false,
  className = '',
  children,
}: Props) {
  return (
    <details
      id={id}
      className={`group mx-auto w-full max-w-7xl scroll-mt-20 border-t border-gray-200/70 px-4 pt-10 pb-14 sm:px-6 lg:px-8 dark:border-gray-800/70 ${className}`}
      aria-label={ariaLabel ?? title}
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg border border-transparent px-1 py-2 marker:content-none transition-colors hover:border-gray-200/80 dark:hover:border-gray-800 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-open:text-base group-open:text-gray-900 dark:group-open:text-white">
          {title}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500">
          <span className="group-open:hidden">Show more</span>
          <span className="hidden group-open:inline">Show less</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-6">{children}</div>
    </details>
  )
}
