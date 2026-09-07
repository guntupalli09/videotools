import { useEffect, useRef, useState } from 'react'
import { Loader2, Zap } from 'lucide-react'
import { getCurrentUsage, type UsageData } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { trackEvent } from '../lib/analytics'
import { trackAppEvent } from '../lib/feedbackEvents'
import { getFreePlanNudgeState } from '../lib/freePlanConversion'
import { startCheckout } from '../lib/startCheckout'

export type FreePlanNudgeTool = 'transcript' | 'subtitles' | 'translation' | 'fix-srt' | 'burn-subtitles' | 'compress-video' | 'voice'

const TOOL_COPY: Record<FreePlanNudgeTool, string> = {
  transcript: 'Take your transcript further with formatting, QA, translation, batch processing and professional exports.',
  subtitles: 'Translate, edit, batch process and export professional subtitle formats with Pro.',
  translation: 'Keep translating and unlock editing, additional workflows and professional exports.',
  'fix-srt': 'Keep fixing subtitles and unlock professional exports, editing and the complete VideoText workflow.',
  'burn-subtitles': 'Keep processing videos without monthly stops and unlock the complete VideoText workflow.',
  'compress-video': 'Keep processing videos without monthly stops and unlock the complete VideoText workflow.',
  voice: 'Remove workflow interruptions and unlock the complete Voice/Text workflow.',
}

export default function FreePlanNudge({ tool, resultKey, placement = 'result' }: {
  tool: FreePlanNudgeTool
  resultKey?: string | number | null
  placement?: string
}) {
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

  const title = remaining === 0 ? "This month's free imports are used" : remaining === 1 ? '1 free import left this month' : 'Keep going with Pro'
  const quotaCopy = remaining === 0
    ? 'Your free imports reset on the 1st of each month, or keep processing now with Pro.'
    : remaining === 1
      ? 'Upgrade now to keep your workflow moving without monthly limits.'
      : `You have ${remaining} free imports left this month. Unlock longer files, advanced workflows, and uninterrupted processing.`
  const cta = remaining === 0 ? 'Continue with Pro — $7.99/mo →' : 'Unlock Pro — $7.99/mo →'

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
          displayed_price: 7.99,
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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{TOOL_COPY[tool]}</p>
          <button type="button" onClick={upgrade} disabled={loading} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-70">
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{loading ? 'Opening checkout…' : cta}
          </button>
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>}
        </div>
      </div>
    </aside>
  )
}
