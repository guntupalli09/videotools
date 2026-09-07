import { useEffect, useState } from 'react'
import { Loader2, X, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getJobCompletedCount } from '../lib/jobCount'
import { startCheckout } from '../lib/startCheckout'
import { isLoggedIn } from '../lib/auth'
import { isPaidPlan } from '../lib/plans'
import { getCurrentUsage } from '../lib/api'
import { trackEvent } from '../lib/analytics'
import { trackAppEvent } from '../lib/feedbackEvents'
import { useProPricing } from '../contexts/PricingContext'

const DISMISS_KEYS: Record<2 | 3, string> = {
  2: 'vt:second-job-nudge-shown',
  3: 'vt:third-job-nudge-shown',
}

export type SecondJobNudgeTool =
  | 'transcript'
  | 'subtitles'
  | 'translation'
  | 'fix-srt'
  | 'burn-subtitles'
  | 'compress-video'
  | 'voice'

interface Props {
  tool: SecondJobNudgeTool
  resultKey?: string | number | null
  /** Job milestone that triggers this nudge (2 or 3 completed jobs). */
  milestone?: 2 | 3
}

const COPY: Record<2 | 3, { title: string; body: string }> = {
  2: {
    title: "You're on a roll — unlock unlimited processing",
    body: "You've completed two jobs on the free plan. Pro removes the monthly import cap, supports longer videos, and unlocks batch processing and professional exports.",
  },
  3: {
    title: 'Three jobs in — time to go Pro?',
    body: "You're clearly getting value from VideoText. Pro removes the monthly cap, unlocks watermark-free exports, and supports longer files plus batch workflows.",
  },
}

export default function SecondJobUpgradeNudge({ tool, resultKey, milestone = 2 }: Props) {
  const { pricing } = useProPricing()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = COPY[milestone]

  useEffect(() => {
    if (!isLoggedIn() || resultKey == null) return
    let cancelled = false

    getCurrentUsage({ skipCache: true })
      .then((data) => {
        if (cancelled || isPaidPlan(data.plan)) return
        const jobCount = getJobCompletedCount()
        if (jobCount !== milestone) return
        if (sessionStorage.getItem(DISMISS_KEYS[milestone]) === '1') return

        sessionStorage.setItem(DISMISS_KEYS[milestone], '1')
        setOpen(true)
        const payload = {
          trigger: milestone === 2 ? 'second_job' : 'third_job',
          tool,
          job_count: jobCount,
          plan: 'free',
        }
        try {
          trackEvent('upgrade_prompt_seen', payload)
          if (milestone === 2) {
            trackEvent('second_job_upgrade_nudge_seen', payload)
            trackAppEvent('upgrade_prompt_seen', payload)
            trackAppEvent('second_job_upgrade_nudge_seen', payload)
          } else {
            trackEvent('third_job_upgrade_nudge_seen', payload)
            trackAppEvent('upgrade_prompt_seen', payload)
            trackAppEvent('third_job_upgrade_nudge_seen', payload)
          }
        } catch {
          /* non-blocking */
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [milestone, resultKey, tool])

  async function handleUpgrade() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await startCheckout({
        returnToPath: window.location.pathname,
        attribution: {
          source: milestone === 2 ? 'second_job_nudge' : 'third_job_nudge',
          tool,
          job_count: getJobCompletedCount(),
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
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-md rounded-xl bg-white p-7 shadow-xl dark:bg-gray-800"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`job-nudge-title-${milestone}`}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden />
            </div>
            <h2 id={`job-nudge-title-${milestone}`} className="text-lg font-semibold text-gray-900 dark:text-white">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{copy.body}</p>

            <button
              type="button"
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-75"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {loading ? 'Opening checkout…' : `Unlock Pro — ${pricing.priceLabel}`}
            </button>
            {error && (
              <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full py-2 text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Keep using free plan
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
