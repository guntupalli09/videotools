import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/analytics'
import { trackAppEvent } from '../lib/feedbackEvents'
import { startCheckout } from '../lib/startCheckout'
import { isLoggedIn } from '../lib/auth'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { PRO_BENEFIT_BULLETS, PRO_ANNUAL_NOTE } from '../lib/upgradeCopy'

export type PaywallReason =
  | 'FREE_DAILY_LIMIT_REACHED'
  | 'FREE_MONTHLY_LIMIT_REACHED'
  | 'VIDEO_TOO_LONG'
  | 'BATCH_NOT_AVAILABLE'
  | 'MULTI_LANGUAGE_NOT_AVAILABLE'
  | 'COPY_LIMIT_REACHED'
  | 'AI_FEATURES'
  | 'PDF_EXPORT'
  | 'WORD_EXPORT'
  | 'INLINE_EDIT'
  | 'VTT_EXPORT'
  | 'TRANSLATED_EXPORT'
  | 'SHARING'
  | 'DOCUMENT_TRANSLATION_LIMIT'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: PaywallReason
  tool?: string
  remainingImports?: number
  /** ISO string for monthly reset (free plan) */
  resetDate?: string
}

function getContent(reason?: PaywallReason) {
  switch (reason) {
    case 'VIDEO_TOO_LONG':
      return {
        title: 'This video is over the Free 30-minute limit',
        body: 'Pro supports videos up to 2 hours.',
        cta: 'Process longer videos — $7.99/mo',
        secondaryLabel: 'Upload shorter video',
        secondary: null,
      }
    case 'BATCH_NOT_AVAILABLE':
      return {
        title: 'You selected multiple files',
        body: 'Free processes one file at a time. Pro runs up to 20 videos per batch and gives you one ZIP with every transcript/subtitle.',
        cta: 'Unlock batch processing — $7.99/mo',
        secondaryLabel: null,
        secondary: null,
      }
    case 'MULTI_LANGUAGE_NOT_AVAILABLE':
      return {
        title: 'You selected multiple languages',
        body: 'Free exports one language. Pro generates up to 5 language files in the same job, plus speaker labels and summaries.',
        cta: 'Create multi-language files — $7.99/mo',
        secondaryLabel: null,
        secondary: null,
      }
    case 'COPY_LIMIT_REACHED':
      return {
        title: 'You hit the free copy/export limit',
        body: 'Your result stays available. Pro unlocks uninterrupted professional exports.',
        cta: 'Unlock Pro — $7.99/mo',
        secondaryLabel: null,
        secondary: null,
      }
    case 'AI_FEATURES':
      return {
        title: 'You asked for AI summary and chapters',
        body: 'Free gives you the transcript. Pro adds summary, bullet points, and chapter markers automatically for each video.',
        cta: 'Unlock Pro — $7.99/mo',
        secondaryLabel: null,
        secondary: null,
      }
    case 'PDF_EXPORT':
      return { title: 'Export as PDF with Pro', body: 'Create a professional PDF from your result.', cta: 'Unlock Pro — $7.99/mo', secondaryLabel: null, secondary: null }
    case 'WORD_EXPORT':
      return { title: 'Export as Word with Pro', body: 'Create an editable Word document from your result.', cta: 'Unlock Pro — $7.99/mo', secondaryLabel: null, secondary: null }
    case 'INLINE_EDIT':
      return { title: 'Editing is a Pro feature', body: 'Edit your result directly before professional export.', cta: 'Unlock Pro — $7.99/mo', secondaryLabel: null, secondary: null }
    case 'VTT_EXPORT':
    case 'TRANSLATED_EXPORT':
    case 'SHARING':
      return { title: 'Unlock this professional workflow', body: 'Keep your result and unlock this Pro delivery option.', cta: 'Unlock Pro — $7.99/mo', secondaryLabel: null, secondary: null }
    case 'DOCUMENT_TRANSLATION_LIMIT':
      return { title: "Today's 3 free document translations are used", body: 'This separate translation allowance resets daily, or continue with Pro.', cta: 'Continue with Pro — $7.99/mo', secondaryLabel: null, secondary: null }
    case 'FREE_MONTHLY_LIMIT_REACHED':
    case 'FREE_DAILY_LIMIT_REACHED':
    default:
      return {
        title: "You've used all 3 free imports this month",
        body: 'They reset on the 1st — or upgrade now for unlimited imports, clean exports, and videos up to 2 hours.',
        cta: 'Continue without limits — $7.99/mo',
        bullets: PRO_BENEFIT_BULLETS,
        secondaryLabel: null,
        secondary: null,
      }
  }
}

export default function PaywallModal({ isOpen, onClose, reason, tool, remainingImports }: PaywallModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (isOpen) {
      try {
        trackEvent('paywall_shown', { reason, tool, remaining_imports: remainingImports, plan: 'free' })
        if (isLoggedIn()) trackAppEvent('paywall_shown', { reason, tool, remaining_imports: remainingImports, plan: 'free' })
      } catch { /* non-blocking */ }
    }
  }, [isOpen, reason, remainingImports, tool])

  if (!isOpen) return null

  const { title, body, cta, secondaryLabel, secondary, bullets } = getContent(reason) as ReturnType<typeof getContent> & { bullets?: readonly string[] }

  async function handleUpgrade() {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await startCheckout({
        returnToPath: window.location.pathname,
        attribution: {
          source: 'paywall_modal',
          tool,
          reason,
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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-title"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <h2 id="paywall-title" className="text-xl font-medium text-gray-900 dark:text-white mb-2">{title}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{body}</p>

          {bullets && bullets.length > 0 && (
            <ul className="mb-5 space-y-2">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm text-center transition-colors shadow-sm disabled:cursor-wait disabled:opacity-75"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {loading ? 'Opening checkout…' : cta}
          </button>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center" role="alert">{error}</p>}

          <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">{PRO_ANNUAL_NOTE}</p>

          <Link to="/pricing" onClick={onClose} className="mt-3 block text-center text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Compare plans
          </Link>

          {secondaryLabel && (
            <button
              type="button"
              onClick={onClose}
              className="mt-3 block w-full py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium text-sm text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {secondaryLabel}
            </button>
          )}

          {secondary && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">{secondary}</p>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
