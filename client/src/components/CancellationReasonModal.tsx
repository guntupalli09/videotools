import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  markCancellationReasonSubmitted,
  submitCancellationReason,
  type CancellationReason,
  type CancellationTiming,
} from '../lib/cancellationFeedback'
import { trackEvent } from '../lib/analytics'
import { trackAppEvent } from '../lib/feedbackEvents'
import { isLoggedIn } from '../lib/auth'

const REASONS: { id: CancellationReason; label: string; hint: string }[] = [
  { id: 'price', label: 'Too expensive', hint: 'Price didn’t feel worth it for my usage' },
  { id: 'one_time_need', label: 'One-time project', hint: 'I only needed a single transcript or export' },
  { id: 'missing_feature', label: 'Missing a feature', hint: 'VideoText didn’t cover something I needed' },
]

interface Props {
  open: boolean
  timing: CancellationTiming
  plan?: string
  onClose: () => void
  /** Called after submit or skip — use to continue (e.g. open billing portal). */
  onComplete: () => void
}

export default function CancellationReasonModal({
  open,
  timing,
  plan,
  onClose,
  onComplete,
}: Props) {
  const [loading, setLoading] = useState<CancellationReason | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handlePick(reason: CancellationReason) {
    if (loading) return
    setLoading(reason)
    setError(null)
    const payload = { reason, timing, plan: plan ?? 'pro' }
    try {
      await submitCancellationReason(payload)
      markCancellationReasonSubmitted(timing)
      trackEvent('cancellation_reason_submitted', payload)
      if (isLoggedIn()) trackAppEvent('cancellation_reason_submitted', payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your response')
      setLoading(null)
      return
    }
    setLoading(null)
    onComplete()
  }

  function handleSkip() {
    markCancellationReasonSubmitted(timing)
    try {
      trackEvent('cancellation_reason_skipped', { timing, plan: plan ?? 'pro' })
    } catch {
      /* non-blocking */
    }
    onComplete()
  }

  const title =
    timing === 'pre_portal'
      ? 'Before you manage billing…'
      : 'Sorry to see you go'
  const subtitle =
    timing === 'pre_portal'
      ? 'One tap helps us improve — then we’ll open Stripe to manage your subscription.'
      : 'What was the main reason you canceled? Your answer helps us build a better product.'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative w-full max-w-md rounded-xl bg-white p-7 shadow-xl dark:bg-gray-800"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-reason-title"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <h2 id="cancel-reason-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{subtitle}</p>

            <div className="mt-5 space-y-2">
              {REASONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={loading !== null}
                  onClick={() => handlePick(item.id)}
                  className="flex w-full flex-col rounded-xl border border-gray-200 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50 disabled:cursor-wait disabled:opacity-70 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {loading === item.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {item.label}
                  </span>
                  <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.hint}</span>
                </button>
              ))}
            </div>

            {error && (
              <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSkip}
              disabled={loading !== null}
              className="mt-4 w-full py-2 text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
