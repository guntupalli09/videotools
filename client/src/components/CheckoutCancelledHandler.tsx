import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { trackEvent } from '../lib/analytics'
import { trackAppEvent } from '../lib/feedbackEvents'
import { isLoggedIn } from '../lib/auth'
import {
  clearPendingCheckout,
  readPendingCheckout,
  startCheckout,
} from '../lib/startCheckout'

/** Handles Stripe cancel returns and surfaces a one-click retry. */
export default function CheckoutCancelledHandler() {
  const { search, pathname } = useLocation()
  const navigate = useNavigate()
  const handled = useRef(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [retryLoading, setRetryLoading] = useState(false)
  const recoveryAttributionRef = useRef<Record<string, unknown>>({ source: 'checkout_cancel_recovery' })

  useEffect(() => {
    const params = new URLSearchParams(search)
    if (params.get('payment') !== 'cancelled' || handled.current) return
    handled.current = true

    const pending = readPendingCheckout()
    const attribution = {
      ...(pending?.attribution ?? {}),
      source: pending?.attribution?.source ?? 'stripe_cancel_return',
      return_path: pathname,
      ...(pending?.sessionId ? { stripe_session_id: pending.sessionId } : {}),
    }
    recoveryAttributionRef.current = attribution

    try {
      trackEvent('checkout_abandoned', attribution)
      if (isLoggedIn()) trackAppEvent('checkout_abandoned', attribution)
    } catch {
      /* non-blocking */
    }

    clearPendingCheckout()
    navigate(pathname, { replace: true })
    setRecoveryOpen(true)
    toast('Checkout not completed — no charge was made. You can try again when ready.')
  }, [search, pathname, navigate])

  async function retryCheckout() {
    if (retryLoading) return
    setRetryLoading(true)
    const base = recoveryAttributionRef.current
    const attribution: Record<string, unknown> = {
      ...base,
      recovery_attempt: true,
      return_path: pathname,
    }
    const billingInterval =
      attribution.billing_interval === 'annual' ? 'annual' : 'monthly'
    try {
      await startCheckout({
        plan: 'pro',
        billingInterval,
        returnToPath: pathname,
        attribution,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to restart checkout')
      setRetryLoading(false)
    }
  }

  if (!recoveryOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setRecoveryOpen(false)}
      />
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-7 shadow-xl dark:bg-gray-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-cancel-title"
      >
        <button
          type="button"
          onClick={() => setRecoveryOpen(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <h2 id="checkout-cancel-title" className="text-lg font-semibold text-gray-900 dark:text-white">
          Did something go wrong at checkout?
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Your card was not charged. If price, currency, or payment details blocked you, try again —
          we'll send you straight back to Stripe.
        </p>
        <button
          type="button"
          onClick={retryCheckout}
          disabled={retryLoading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-75"
        >
          {retryLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {retryLoading ? 'Opening checkout…' : 'Try checkout again'}
        </button>
        <button
          type="button"
          onClick={() => setRecoveryOpen(false)}
          className="mt-3 w-full py-2 text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
