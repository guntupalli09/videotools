import { useEffect, useRef, useState } from 'react'
import { Loader2, Zap } from 'lucide-react'
import { getCurrentUsage, type UsageData } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { trackEvent } from '../lib/analytics'
import { trackAppEvent } from '../lib/feedbackEvents'
import { getFreePlanNudgeState } from '../lib/freePlanConversion'
import { startCheckout } from '../lib/startCheckout'
import { getResultUpgradeCopy } from '../lib/upgradeCopy'
import { useProPricing } from '../contexts/PricingContext'

export type FreePlanNudgeTool = 'transcript' | 'subtitles' | 'translation' | 'fix-srt' | 'burn-subtitles' | 'compress-video' | 'voice'

const TOOL_TO_RESULT: Record<FreePlanNudgeTool, 'transcript' | 'subtitles' | 'translation' | 'voice'> = {
  transcript: 'transcript',
  subtitles: 'subtitles',
  translation: 'translation',
  'fix-srt': 'subtitles',
  'burn-subtitles': 'subtitles',
  'compress-video': 'transcript',
  voice: 'voice',
}

export default function FreePlanNudge({ tool, resultKey, placement = 'result' }: {
  tool: FreePlanNudgeTool
  resultKey?: string | number | null
  placement?: string
}) {
  const { pricing } = useProPricing()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const impressionKey = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn() || resultKey == null) return
    let cancelled = false
    getCurrentUsage({ skipCache: true }).then(data => {
      if (!cancelled) setUsage(data)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [resultKey])

  const plan = (usage?.plan || '').toLowerCase()
  const limit = usage?.limit ?? 3
  const used = usage?.used ?? usage?.usage?.importCount ?? 0
  const remaining = Math.max(0, usage?.remaining ?? limit - used)
  const nudgeState = getFreePlanNudgeState(used, remaining)
  const visible = plan === 'free' && usage?.quotaType === 'imports' && nudgeState !== 'hidden'

  useEffect(() => {
    if (!visible) return
    const key = `${tool}:${placement}:${used}:${remaining}:${String(resultKey)}`
    if (impressionKey.current === key) return
    impressionKey.current = key
    try {
      trackEvent('free_plan_nudge_seen', { tool, remaining_imports: remaining, used_imports: used, placement, plan })
      if (isLoggedIn()) trackAppEvent('free_plan_nudge_seen', { tool, remaining_imports: remaining, used_imports: used, placement, plan })
    } catch { /* non-blocking */ }
  }, [placement, plan, remaining, resultKey, tool, used, visible])

  if (!visible) return null

  const resultCopy = getResultUpgradeCopy(TOOL_TO_RESULT[tool], { remaining, pricing })
  const title =
    remaining === 0
      ? "You're out of free imports this month"
      : remaining === 1
        ? '1 free import left — don\'t stop mid-workflow'
        : resultCopy.headline
  const quotaCopy = resultCopy.subhead
  const cta = remaining === 0 ? `Keep going — ${pricing.priceLabel}` : resultCopy.cta

  async function upgrade() {
    if (loading) return
    setLoading(true); setError(null)
    try {
      await startCheckout({
        returnToPath: window.location.pathname,
        attribution: {
          source: 'free_plan_nudge',
          tool,
          remaining_imports: remaining,
          placement,
          plan: 'free',
          billing_interval: 'monthly',
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <aside className={`rounded-xl border px-4 py-4 sm:px-5 ${remaining === 0 ? 'border-amber-300 bg-amber-50 dark:border-amber-700/70 dark:bg-amber-950/25' : 'border-blue-200 bg-blue-50/80 dark:border-blue-800/60 dark:bg-blue-950/25'}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{quotaCopy}</p>
          {resultCopy.quotaLine && remaining !== 0 && (
            <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-300">{resultCopy.quotaLine}</p>
          )}
          <ul className="mt-2 space-y-1">
            {resultCopy.bullets.slice(0, 3).map((item) => (
              <li key={item} className="text-xs text-gray-500 dark:text-gray-400">· {item}</li>
            ))}
          </ul>
          <button type="button" onClick={upgrade} disabled={loading} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-70">
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{loading ? 'Opening checkout…' : cta}
          </button>
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{pricing.annualNote}</p>
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>}
        </div>
      </div>
    </aside>
  )
}
