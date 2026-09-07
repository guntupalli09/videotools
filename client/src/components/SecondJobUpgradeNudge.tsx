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

const DISMISS_KEY = 'vt:second-job-nudge-shown'

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
}

export default function SecondJobUpgradeNudge({ tool, resultKey }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn() || resultKey == null) return
    let cancelled = false

    getCurrentUsage({ skipCache: true })
      .then((data) => {
        if (cancelled || isPaidPlan(data.plan)) return
        const jobCount = getJobCompletedCount()
        if (jobCount !== 2) return
        if (sessionStorage.getItem(DISMISS_KEY) === '1') return

        sessionStorage.setItem(DISMISS_KEY, '1')
        setOpen(true)
        const payload = { trigger: 'second_job', tool, job_count: jobCount, plan: 'free' }
        try {
          trackEvent('upgrade_prompt_seen', payload)
          trackEvent('second_job_upgrade_nudge_seen', payload)
          trackAppEvent('upgrade_prompt_seen', payload)
          trackAppEvent('second_job_upgrade_nudge_seen', payload)
        } catch {
          /* non-blocking */
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [resultKey, tool])

  async function handleUpgrade() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await startCheckout({
        returnToPath: window.location.pathname,
        attribution: {
          source: 'second_job_nudge',
          tool,
          job_count: getJobCompletedCount(),
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
            aria-labelledby="second-job-nudge-title"
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
            <h2 id="second-job-nudge-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              You're on a roll — unlock unlimited processing
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              You've completed two jobs on the free plan. Pro removes the monthly import cap, supports
              longer videos, and unlocks batch processing and professional exports.
            </p>

            <button
              type="button"
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-75"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {loading ? 'Opening checkout…' : 'Unlock Pro — $7.99/mo'}
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
