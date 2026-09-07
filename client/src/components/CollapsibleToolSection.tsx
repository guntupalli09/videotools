import { useEffect, useState, type ReactNode } from 'react'
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
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (!id || typeof window === 'undefined') return
    const syncFromHash = () => {
      if (window.location.hash === `#${id}`) setOpen(true)
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [id])

  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-7xl scroll-mt-20 border-t border-gray-200/70 px-4 pt-10 pb-14 sm:px-6 lg:px-8 dark:border-gray-800/70 ${className}`}
      aria-label={ariaLabel ?? title}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-transparent px-1 py-2 text-left transition-colors hover:border-gray-200/80 dark:hover:border-gray-800"
      >
        <span
          className={`font-medium ${open ? 'text-base text-gray-900 dark:text-white' : 'text-sm text-gray-600 dark:text-gray-400'}`}
        >
          {title}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500">
          {open ? 'Show less' : 'Show more'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open ? <div className="mt-6">{children}</div> : null}
    </section>
  )
}
