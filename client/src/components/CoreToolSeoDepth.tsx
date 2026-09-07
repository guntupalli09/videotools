import { Link } from 'react-router-dom'
import { getCoreToolSeoDepth } from '../lib/coreToolSeoDepth'
import CollapsibleToolSection from './CollapsibleToolSection'

type Props = {
  path: string
  /** Skip FAQ when the page already has a unique FAQ block (e.g. guideline-format). */
  hideFaq?: boolean
  /** @deprecated Lead content now lives in the bottom `full` section only. */
  variant?: 'full' | 'lead'
  /** When true, SEO depth starts expanded. Defaults to collapsed on all core tools. */
  defaultCollapsed?: boolean
}

export default function CoreToolSeoDepth({
  path,
  hideFaq = false,
  variant = 'full',
  defaultCollapsed = true,
}: Props) {
  const data = getCoreToolSeoDepth(path)
  if (!data) return null

  if (variant === 'lead') return null

  return (
    <CollapsibleToolSection
      id="how-this-tool-works"
      title="How this tool works"
      defaultOpen={!defaultCollapsed}
    >
      <div className="max-w-4xl space-y-section">
        <section className="space-y-component-sm">
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 sm:text-base">
            {data.answerFirst}
          </p>
          <div className="space-y-component-sm">
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{data.howItWorks.heading}</h2>
            <ol className="list-decimal space-y-micro pl-5 text-sm text-gray-700 dark:text-gray-300 sm:text-base">
              {data.howItWorks.steps.map((step) => (
                <li key={step.title}>
                  <span className="font-medium text-gray-900 dark:text-white">{step.title}.</span>{' '}
                  {step.detail}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="space-y-component-sm">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{data.whoItsFor.heading}</h2>
          <ul className="space-y-micro text-gray-700 dark:text-gray-300">
            {data.whoItsFor.items.map((item) => (
              <li key={item.who}>
                <span className="font-medium text-gray-900 dark:text-white">{item.who}.</span> {item.why}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-component-sm">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{data.outputs.heading}</h2>
          <ul className="list-disc space-y-micro pl-5 text-gray-700 dark:text-gray-300">
            {data.outputs.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-component-sm">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{data.proof.heading}</h2>
          <ul className="space-y-micro text-gray-700 dark:text-gray-300">
            {data.proof.items.map((item) => (
              <li key={item.label}>
                <span className="font-medium text-gray-900 dark:text-white">{item.label}.</span> {item.detail}
              </li>
            ))}
          </ul>
        </section>

        {data.extraSections?.map((section) => (
          <section key={section.heading} className="space-y-component-sm">
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{section.heading}</h2>
            <p className="text-gray-700 dark:text-gray-300">{section.body}</p>
          </section>
        ))}

        <section className="space-y-component-sm">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{data.related.heading}</h2>
          <ul className="space-y-micro">
            {data.related.links.map((link) => (
              <li key={link.href} className="text-gray-700 dark:text-gray-300">
                <Link to={link.href} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                  {link.label}
                </Link>
                {' — '}
                {link.note}
              </li>
            ))}
          </ul>
        </section>

        {!hideFaq && (
          <section aria-label="FAQ">
            <h2 className="mb-4 text-2xl font-medium text-gray-900 dark:text-white">Frequently asked questions</h2>
            <dl className="space-y-component-sm">
              {data.faq.map((item) => (
                <div key={item.q}>
                  <dt className="font-medium text-gray-900 dark:text-white">{item.q}</dt>
                  <dd className="mt-1 text-gray-600 dark:text-gray-400">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </CollapsibleToolSection>
  )
}
