import { ChevronDown } from 'lucide-react'

type FaqItem = { q: string; a: string }

type Props = {
  items: FaqItem[]
  title?: string
  id?: string
  className?: string
}

export default function CollapsibleFaqSection({
  items,
  title = 'Frequently asked questions',
  id = 'tool-faq',
  className = '',
}: Props) {
  if (!items.length) return null

  return (
    <details
      id={id}
      className={`group mx-auto mt-12 max-w-4xl scroll-mt-20 border-t border-gray-100/70 px-4 pt-8 dark:border-gray-800 ${className}`}
      aria-label={title}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-medium text-gray-900 marker:content-none dark:text-white [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="inline-flex items-center gap-1 text-sm font-normal text-gray-500 dark:text-gray-400">
          <span className="group-open:hidden">Show more</span>
          <span className="hidden group-open:inline">Show less</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <dl className="mt-6 space-y-component-sm">
        {items.map((item, i) => (
          <div key={i}>
            <dt className="font-medium text-gray-900 dark:text-white">{item.q}</dt>
            <dd className="mt-1 text-gray-600 dark:text-gray-400">{item.a}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
