import { useEffect, useState } from 'react'
import { Loader2, Zap } from 'lucide-react'
import { getCurrentUsage } from '../lib/api'
import { isPaidPlan } from '../lib/plans'
import { startCheckout } from '../lib/startCheckout'

export type UpgradeBannerVariant =
  | 'video-length'
  | 'watermark'
  | 'queue'
  | 'ai-features'
  | 'batch'
  | 'voice'

const MESSAGES: Record<UpgradeBannerVariant, { text: string; cta: string }> = {
  'video-length': {
    text: 'Free plan: 30 min max.',
    cta: 'Process videos up to 2 hours with Pro — $7.99/mo',
  },
  watermark: {
    text: 'Your exports include a watermark.',
    cta: 'Remove watermark — $7.99/mo',
  },
  queue: {
    text: 'Free plan uses the standard queue.',
    cta: 'Unlock Pro — $7.99/mo',
  },
  'ai-features': {
    text: 'AI features are Pro-only.',
    cta: 'Unlock AI outputs — $7.99/mo',
  },
  batch: {
    text: 'Batch processing is Pro-only.',
    cta: 'Process up to 20 videos — $7.99/mo',
  },
  voice: {
    text: 'Voice recordings export with a watermark.',
    cta: 'Unlock Pro — $7.99/mo',
  },
}

interface UpgradeBannerProps {
  variant?: UpgradeBannerVariant
  tool?: string
}

export default function UpgradeBanner({ variant = 'video-length', tool }: UpgradeBannerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getCurrentUsage().then(data => { if (!cancelled) setPlan(data.plan) }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  if (!plan || isPaidPlan(plan)) return null

  const { text, cta } = MESSAGES[variant]

  async function handleUpgrade() {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await startCheckout({
        returnToPath: '/pricing',
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
    <div className="mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <Zap className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{text}</span>
      </div>
      <div className="shrink-0 flex flex-col gap-1">
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={loading}
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white underline underline-offset-2 transition-colors disabled:cursor-wait disabled:opacity-70"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
          {loading ? 'Opening checkout…' : `${cta} →`}
        </button>
        {error && <span className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</span>}
      </div>
    </div>
  )
}
