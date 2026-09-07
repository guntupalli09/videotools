import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, type LucideIcon } from 'lucide-react'

export function SeoAlternativeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white transition-colors duration-500 dark:bg-gray-950">
      {children}
    </div>
  )
}

export function SeoAlternativeHero({
  badge,
  title,
  titleAccent,
  description,
  ctaHref,
  ctaLabel,
  ctaNote,
}: {
  badge?: string
  title: React.ReactNode
  titleAccent?: string
  description: string
  ctaHref: string
  ctaLabel: string
  ctaNote?: string
}) {
  return (
    <section className="border-b border-gray-200 bg-gray-50 py-20 dark:border-white/[0.08] dark:bg-gray-900/50 sm:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        {badge && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1.5 dark:border-blue-500/20 dark:bg-blue-600/10">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              {badge}
            </span>
          </div>
        )}
        <h1 className="mb-5 text-4xl font-medium leading-tight text-gray-900 dark:text-white sm:text-5xl">
          {title}
          {titleAccent && (
            <>
              {' '}
              <span className="text-blue-600 dark:text-blue-400">{titleAccent}</span>
            </>
          )}
        </h1>
        <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-500 dark:text-white/45">{description}</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={ctaHref}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {ctaLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
          {ctaNote && <span className="text-sm text-gray-400">{ctaNote}</span>}
        </div>
      </div>
    </section>
  )
}

export function SeoCompareCell({ val, isUs = false }: { val: boolean | string; isUs?: boolean }) {
  if (typeof val === 'string') {
    return (
      <span
        className={`text-sm font-semibold ${isUs ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
      >
        {val}
      </span>
    )
  }
  return val ? (
    <CheckCircle2 className={`mx-auto h-5 w-5 ${isUs ? 'text-blue-500' : 'text-blue-400/80'}`} />
  ) : (
    <XCircle className="mx-auto h-5 w-5 text-gray-300 dark:text-gray-700" />
  )
}

export function SeoCompareTable({
  competitorLabel,
  rows,
}: {
  competitorLabel: string
  rows: { label: string; videotext: boolean | string; competitor: boolean | string }[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.06]">
      <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50 px-5 py-3 dark:border-white/[0.05] dark:bg-gray-900">
        <div />
        <div className="text-center text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          VideoText
        </div>
        <div className="text-center text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {competitorLabel}
        </div>
      </div>
      <div className="divide-y divide-gray-100 bg-white dark:divide-white/[0.03] dark:bg-gray-900/50">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-3 items-center px-5 py-3.5">
            <span className="text-sm text-gray-700 dark:text-white/60">{row.label}</span>
            <div className="text-center">
              <SeoCompareCell val={row.videotext} isUs />
            </div>
            <div className="text-center">
              <SeoCompareCell val={row.competitor} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SeoDecisionSection({
  title,
  chooseUsTitle,
  chooseUsPoints,
  chooseThemTitle,
  chooseThemPoints,
}: {
  title: string
  chooseUsTitle: string
  chooseUsPoints: string[]
  chooseThemTitle: string
  chooseThemPoints: string[]
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.06] dark:bg-gray-900/40">
      <h2 className="mb-4 text-2xl font-medium text-gray-900 dark:text-white">{title}</h2>
      <div className="grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <h3 className="mb-2 font-medium text-gray-900 dark:text-white">{chooseUsTitle}</h3>
          <ul className="space-y-2 text-gray-600 dark:text-gray-300">
            {chooseUsPoints.map((pt) => (
              <li key={pt}>• {pt}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-medium text-gray-900 dark:text-white">{chooseThemTitle}</h3>
          <ul className="space-y-2 text-gray-600 dark:text-gray-300">
            {chooseThemPoints.map((pt) => (
              <li key={pt}>• {pt}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function SeoTwoColumnCards({
  title,
  leftTitle,
  leftBody,
  rightTitle,
  rightBody,
}: {
  title: string
  leftTitle: string
  leftBody: string
  rightTitle: string
  rightBody: string
}) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-medium text-gray-900 dark:text-white">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-white/[0.06] dark:bg-gray-900">
          <h3 className="mb-2 font-medium text-gray-900 dark:text-white">{leftTitle}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">{leftBody}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-white/[0.06] dark:bg-gray-900">
          <h3 className="mb-2 font-medium text-gray-900 dark:text-white">{rightTitle}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">{rightBody}</p>
        </div>
      </div>
    </section>
  )
}

export function SeoAdvantageGrid({
  items,
}: {
  items: { icon: LucideIcon; title: string; body: string }[]
}) {
  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {items.map(({ icon: Icon, title, body }) => (
        <div
          key={title}
          className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-white/[0.06] dark:bg-gray-900"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-600/15">
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mb-1 font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{body}</p>
        </div>
      ))}
    </section>
  )
}

export function SeoRelatedLinks({
  title,
  links,
}: {
  title: string
  links: { label: string; to: string; external?: boolean }[]
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.06] dark:bg-gray-900/40">
      <h2 className="mb-3 text-2xl font-medium text-gray-900 dark:text-white">{title}</h2>
      <div className="flex flex-wrap gap-3 text-sm">
        {links.map(({ label, to, external }) =>
          external ? (
            <a key={to} href={to} className="text-blue-600 hover:underline dark:text-blue-400">
              {label}
            </a>
          ) : (
            <Link key={to} to={to} className="text-blue-600 hover:underline dark:text-blue-400">
              {label}
            </Link>
          )
        )}
      </div>
    </section>
  )
}

export function SeoFaqSection({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <section>
      <h2 className="mb-6 text-2xl font-medium text-gray-900 dark:text-white">Frequently asked questions</h2>
      <div className="space-y-4">
        {faqs.map(({ q, a }) => (
          <div
            key={q}
            className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-white/[0.06] dark:bg-gray-900"
          >
            <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">{q}</h3>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SeoFinalCta({
  title,
  description,
  href,
  buttonLabel,
}: {
  title: string
  description: string
  href: string
  buttonLabel: string
}) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-gray-950 p-8 text-center sm:p-12">
      <h2 className="mb-3 text-2xl font-medium text-white sm:text-3xl">{title}</h2>
      <p className="mx-auto mb-8 max-w-xl text-white/55">{description}</p>
      <Link
        to={href}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-blue-700"
      >
        {buttonLabel}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  )
}

export function SeoBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-4xl space-y-16 px-6 pb-24">{children}</div>
}
