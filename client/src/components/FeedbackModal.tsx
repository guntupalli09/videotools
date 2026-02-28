import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { submitFeedback } from '../lib/api'
import { getCurrentUsage } from '../lib/api'
import { isLoggedIn } from '../lib/auth'

const FEEDBACK_OPEN_EVENT = 'videotext:open-feedback'

export function useOpenFeedbackModal() {
  return useCallback(() => {
    window.dispatchEvent(new CustomEvent(FEEDBACK_OPEN_EVENT))
  }, [])
}

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  /** Optional tool context when opened after a specific job */
  toolId?: string
}

export default function FeedbackModal({ isOpen, onClose, toolId }: FeedbackModalProps) {
  const [stars, setStars] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [plan, setPlan] = useState<string>('free')

  useEffect(() => {
    if (isOpen) {
      getCurrentUsage().then((d) => setPlan((d.plan || 'free').toLowerCase())).catch(() => {})
    }
  }, [isOpen])

  const reset = useCallback(() => {
    setStars(null)
    setComment('')
    setEmail('')
    setSent(false)
  }, [])

  useEffect(() => {
    if (!isOpen) reset()
  }, [isOpen, reset])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    try {
      await submitFeedback({
        toolId: toolId ?? undefined,
        stars: stars ?? undefined,
        comment: comment.trim() || undefined,
        userNameOrEmail: !isLoggedIn() && email.trim() ? email.trim() : undefined,
        planAtSubmit: plan,
      })
      setSent(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch {
      setSending(false)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
          role="dialog"
          aria-labelledby="feedback-title"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {sent ? (
            <div className="py-6 text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">Thank you!</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your feedback helps us improve.
              </p>
            </div>
          ) : (
            <>
              <h2 id="feedback-title" className="text-lg font-semibold text-gray-900 dark:text-white pr-8">
                Quick feedback
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                How was your experience? Optional but really helpful.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rating
                  </p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setStars(n)}
                        className="p-2 rounded-lg text-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      >
                        {stars != null && n <= stars ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="feedback-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Comment (optional)
                  </label>
                  <textarea
                    id="feedback-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 500))}
                    placeholder="What worked? What could be better?"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>

                {!isLoggedIn() && (
                  <div>
                    <label htmlFor="feedback-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email (optional, for follow-up)
                    </label>
                    <input
                      id="feedback-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.slice(0, 200))}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-60 transition-colors"
                  >
                    {sending ? 'Sending…' : 'Send feedback'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
