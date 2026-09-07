import {
  createCheckoutSession,
  rememberCheckoutAttribution,
  type BillingInterval,
  type BillingPlan,
} from './billing'
import { trackEvent } from './analytics'
import { trackAppEvent } from './feedbackEvents'
import { isLoggedIn } from './auth'

export type StartCheckoutParams = {
  plan?: BillingPlan
  billingInterval?: BillingInterval
  returnToPath?: string
  attribution: Record<string, unknown>
}

const PENDING_CHECKOUT_KEY = 'videotext:pending_checkout'

export function rememberPendingCheckout(sessionId: string, attribution: Record<string, unknown>): void {
  try {
    localStorage.setItem(
      PENDING_CHECKOUT_KEY,
      JSON.stringify({ sessionId, attribution, startedAt: Date.now() }),
    )
  } catch {
    /* non-blocking */
  }
}

export function clearPendingCheckout(): void {
  try {
    localStorage.removeItem(PENDING_CHECKOUT_KEY)
  } catch {
    /* non-blocking */
  }
}

export function readPendingCheckout(): {
  sessionId: string
  attribution: Record<string, unknown>
  startedAt: number
} | null {
  try {
    const raw = localStorage.getItem(PENDING_CHECKOUT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { sessionId: string; attribution: Record<string, unknown>; startedAt: number }
  } catch {
    return null
  }
}

/** Unified checkout funnel: same events on every entry point. */
export async function startCheckout(params: StartCheckoutParams): Promise<void> {
  const plan = params.plan ?? 'pro'
  const billingInterval = params.billingInterval ?? 'monthly'
  const returnToPath = params.returnToPath ?? window.location.pathname
  const attribution = { ...params.attribution, plan, billing_interval: billingInterval }

  try {
    trackEvent('upgrade_clicked', attribution)
  } catch {
    /* non-blocking */
  }
  try {
    trackEvent('checkout_started', attribution)
  } catch {
    /* non-blocking */
  }
  if (isLoggedIn()) {
    try {
      trackAppEvent('upgrade_clicked', attribution)
    } catch {
      /* non-blocking */
    }
    try {
      trackAppEvent('checkout_started', attribution)
    } catch {
      /* non-blocking */
    }
  }

  const { url, sessionId } = await createCheckoutSession({
    mode: 'subscription',
    plan,
    billingInterval,
    returnToPath,
    frontendOrigin: window.location.origin,
  })

  rememberCheckoutAttribution(attribution)
  if (sessionId) rememberPendingCheckout(sessionId, attribution)

  const withSession = sessionId ? { ...attribution, stripe_session_id: sessionId } : attribution
  try {
    trackEvent('checkout_session_created', withSession)
    trackEvent('stripe_redirect', withSession)
    if (isLoggedIn()) {
      trackAppEvent('checkout_session_created', withSession)
      trackAppEvent('stripe_redirect', withSession)
    }
  } catch {
    /* non-blocking */
  }

  window.location.assign(url)
}
