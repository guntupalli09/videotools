import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import FeedbackModal from './FeedbackModal'

const JOB_COMPLETED_EVENT = 'videotext:job-completed'
const FEEDBACK_OPEN_EVENT = 'videotext:open-feedback'
const SESSION_KEY_OFFERED = 'videotext:feedback-prompt-offered'
const SESSION_KEY_DISMISSED = 'videotext:feedback-prompt-dismissed'

export function dispatchJobCompletedForFeedback() {
  window.dispatchEvent(new CustomEvent(JOB_COMPLETED_EVENT))
}

export default function FeedbackPrompt() {
  const [showBanner, setShowBanner] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const onJobCompleted = () => {
      if (typeof sessionStorage === 'undefined') return
      if (sessionStorage.getItem(SESSION_KEY_OFFERED) || sessionStorage.getItem(SESSION_KEY_DISMISSED)) return
      sessionStorage.setItem(SESSION_KEY_OFFERED, '1')
      setShowBanner(true)
    }
    const onOpenFeedback = () => {
      setShowModal(true)
      setShowBanner(false)
    }
    window.addEventListener(JOB_COMPLETED_EVENT, onJobCompleted)
    window.addEventListener(FEEDBACK_OPEN_EVENT, onOpenFeedback)
    return () => {
      window.removeEventListener(JOB_COMPLETED_EVENT, onJobCompleted)
      window.removeEventListener(FEEDBACK_OPEN_EVENT, onOpenFeedback)
    }
  }, [])

  const handleShareFeedback = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY_DISMISSED, '1')
    setShowBanner(false)
    setShowModal(true)
  }, [])

  const handleMaybeLater = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY_DISMISSED, '1')
    setShowBanner(false)
  }, [])

  const handleCloseModal = useCallback(() => setShowModal(false), [])

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 max-w-[calc(100vw-2rem)]"
          >
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-2 sm:flex-1">
                <MessageCircle className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    How was it?
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Your feedback helps us improve.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleShareFeedback}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                >
                  Share feedback
                </button>
                <button
                  type="button"
                  onClick={handleMaybeLater}
                  className="px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackModal
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </>
  )
}
