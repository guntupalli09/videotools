import { useEffect, useState } from 'react'
import { Loader2, Zap } from 'lucide-react'
import { getCurrentUsage } from '../lib/api'
import { isPaidPlan } from '../lib/plans'
import { startCheckout } from '../lib/startCheckout'
import { UPGRADE_BANNER_COPY } from '../lib/upgradeCopy'

export type UpgradeBannerVariant =
  | 'video-length'
  | 'watermark'
  | 'queue'
  | 'ai-features'
  | 'batch'
  | 'voice'

interface UpgradeBannerProps {
  variant?: UpgradeBannerVariant
  tool?: string
}

export default function UpgradeBanner({ variant = 'video-length', tool }: UpgradeBannerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null)
  const [quotaHint, setQuotaHint] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUsage()
      .then((data) => {
        if (cancelled) return
        setPlan(data.plan)
        if (data.quotaType === 'imports') {
          const used = data.used ?? data.usage?.importCount ?? 0
          const limit = data.limit ?? 3
          setQuotaHint(`${used} of ${limit} free imports used this month`)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!plan || isPaidPlan(plan)) return null

  const { text, highlight, cta } = UPGRADE_BANNER_COPY[variant]

  async function handleUpgrade() {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await startCheckout({
        returnToPath: window.location.pathname,
        attribution: {
          source: 'upgrade_banner',
          tool,
          variant,
          plan: 'free',
          billing_interval: 'monthly',
          displayed_price: 7.99,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout. Please try again.'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-blue-300/60 bg-gradient-to-r from-blue-50 to-indigo-50/80 px-4 py-4 dark:border-blue-700/50 dark:from-blue-950/40 dark:to-indigo-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{text}</p>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{highlight}</p>
          {quotaHint && (
            <p className="mt-1.5 text-xs font-medium text-blue-700/90 dark:text-blue-300/90">{quotaHint}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {loading ? 'Opening checkout…' : cta}
          </button>
          {error && (
            <span className="text-xs text-red-600 dark:text-red-400" role="alert">
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
