import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { getCurrentUsage } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { isPaidPlan } from '../lib/plans'
import { startCheckout } from '../lib/startCheckout'
import { trackEvent } from '../lib/analytics'
import { trackAppEvent } from '../lib/feedbackEvents'
import { getResultUpgradeCopy, PRO_ANNUAL_NOTE, type ResultUpgradeTool } from '../lib/upgradeCopy'

interface Props {
  tool: ResultUpgradeTool
  resultKey?: string | number | null
  wordCount?: number
}

/** High-intent upgrade card shown on the result panel (peak moment after job success). */
export default function ResultUpgradeCard({ tool, resultKey, wordCount }: Props) {
  const [visible, setVisible] = useState(false)
  const [remaining, setRemaining] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const impressionKey = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn() || resultKey == null) return
    let cancelled = false
    getCurrentUsage({ skipCache: true })
      .then((data) => {
        if (cancelled || isPaidPlan(data.plan) || data.quotaType !== 'imports') return
        const rem = data.remaining ?? Math.max(0, (data.limit ?? 3) - (data.used ?? 0))
        setRemaining(rem)
        setVisible(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [resultKey])

  useEffect(() => {
    if (!visible) return
    const key = `${tool}:${String(resultKey)}:${wordCount ?? 0}`
    if (impressionKey.current === key) return
    impressionKey.current = key
    try {
      const payload = { tool, placement: 'result_upgrade_card', plan: 'free', word_count: wordCount, remaining_imports: remaining }
      trackEvent('upgrade_prompt_seen', payload)
      trackEvent('result_upgrade_card_seen', payload)
      trackAppEvent('upgrade_prompt_seen', payload)
    } catch {
      /* non-blocking */
    }
  }, [remaining, resultKey, tool, visible, wordCount])

  if (!visible) return null

  const copy = getResultUpgradeCopy(tool, { wordCount, remaining })

  async function handleUpgrade() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await startCheckout({
        returnToPath: window.location.pathname,
        attribution: {
          source: 'result_upgrade_card',
          tool,
          plan: 'free',
          billing_interval: 'monthly',
          displayed_price: 7.99,
          remaining_imports: remaining,
          ...(wordCount != null ? { word_count: wordCount } : {}),
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open checkout.')
      setLoading(false)
    }
  }

  return (
    <section
      className="mb-4 overflow-hidden rounded-xl border-2 border-blue-500/40 bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-violet-600/10 dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-violet-950/20 shadow-sm"
      aria-label="Upgrade to Pro"
    >
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600/15 dark:bg-blue-500/20">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">{copy.headline}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{copy.subhead}</p>
            {copy.quotaLine && (
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{copy.quotaLine}</p>
            )}
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {copy.bullets.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-75"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {loading ? 'Opening checkout…' : copy.cta}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">{PRO_ANNUAL_NOTE}</span>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
