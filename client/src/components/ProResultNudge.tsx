import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { getCurrentUsage } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { startCheckout } from '../lib/startCheckout'
import { useProPricing } from '../contexts/PricingContext'

/** Result-stage Pro CTA for tools whose quota is not the shared monthly import allowance. */
export default function ProResultNudge({ tool, resultKey, title, body }: { tool: string; resultKey?: string | number | null; title: string; body: string }) {
  const { pricing } = useProPricing()
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!isLoggedIn() || resultKey == null) return
    let cancelled = false
    getCurrentUsage({ skipCache: true }).then(data => { if (!cancelled) setPlan(data.plan.toLowerCase()) }).catch(() => {})
    return () => { cancelled = true }
  }, [resultKey])
  if (plan !== 'free') return null

  async function upgrade() {
    if (loading) return
    setLoading(true)
    try {
      await startCheckout({
        returnToPath: window.location.pathname,
        attribution: {
          source: 'pro_result_nudge',
          tool,
          placement: 'result',
          plan: 'free',
          billing_interval: 'monthly',
        },
      })
    } catch {
      setLoading(false)
    }
  }
  return (
    <aside className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-800/60 dark:bg-blue-950/25">
      <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden /><div><p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{body}</p><button type="button" disabled={loading} onClick={upgrade} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-70">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? 'Opening checkout…' : `Unlock Pro — ${pricing.priceLabel} →`}</button></div></div>
    </aside>
  )
}
