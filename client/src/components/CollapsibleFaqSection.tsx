import CollapsibleToolSection from './CollapsibleToolSection'

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
    <CollapsibleToolSection id={id} title={title} className={className}>
      <dl className="max-w-4xl space-y-component-sm">
        {items.map((item, i) => (
          <div key={i}>
            <dt className="font-medium text-gray-900 dark:text-white">{item.q}</dt>
            <dd className="mt-1 text-gray-600 dark:text-gray-400">{item.a}</dd>
          </div>
        ))}
      </dl>
    </CollapsibleToolSection>
  )
}
