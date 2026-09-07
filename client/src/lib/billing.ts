import { api } from './api'

export type BillingPlan = 'basic' | 'pro' | 'agency' | 'founding_workflow' | 'business'
export type BillingInterval = 'monthly' | 'annual'

export interface CheckoutParams {
  mode: 'subscription' | 'payment'
  plan?: BillingPlan
  annual?: boolean
  billingInterval?: BillingInterval
  returnToPath?: string
  email?: string
  frontendOrigin?: string
  /** Optional promotion code for eligible plans. */
  promotionCode?: string
  /** From POST /api/auth/verify-otp; required for subscription checkout. */
  emailVerificationToken?: string
}

export function rememberCheckoutAttribution(attribution: Record<string, unknown>): void {
  try { localStorage.setItem('videotext:checkout_attribution', JSON.stringify(attribution)) } catch { /* non-blocking */ }
}

function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError && (e.message === 'Failed to fetch' || e.message === 'Load failed')) return true
  if (e instanceof Error && e.name === 'AbortError') return true
  return false
}

export async function createCheckoutSession(params: CheckoutParams): Promise<{ url: string; sessionId?: string }> {
  let response: Response
  try {
    response = await api('/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
  } catch (e) {
    if (isNetworkError(e)) {
      throw new Error(
        'Cannot reach the server. If you\'re on the live site, the API may not be configured (set VITE_API_URL and redeploy) or the backend may be down.'
      )
    }
    throw e
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to start checkout' }))
    throw new Error(error.message || 'Failed to start checkout')
  }

  return response.json()
}

/** Create a Stripe Customer Billing Portal session. User can upgrade, downgrade, cancel, update payment. */
export async function createBillingPortalSession(returnUrl: string): Promise<{ url: string }> {
  const response = await api('/api/billing/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': localStorage.getItem('userId') || '',
      'x-plan': localStorage.getItem('plan') || 'free',
    },
    body: JSON.stringify({ returnUrl }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to open billing' }))
    throw new Error(err.message || 'Failed to open billing')
  }

  return response.json()
}

/** After checkout success: exchange session_id for userId, plan, email, JWT token, and optional password-setup token. */
export async function getSessionDetails(
  sessionId: string
): Promise<{
  userId: string
  plan: string
  email?: string
  token: string
  passwordSetupToken?: string
  passwordSetupExpiresAt?: string
}> {
  const response = await api(
    `/api/billing/session-details?session_id=${encodeURIComponent(sessionId)}`,
    { timeout: 25_000 }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to get session' }))
    throw new Error(err.message || 'Failed to get session')
  }

  return response.json()
}

/**
 * Secondary check after session-details: confirms the Stripe subscription activated.
 * Polls this after getSessionDetails succeeds to prevent showing Pro before it's real.
 */
export async function getSessionStatus(
  sessionId: string
): Promise<{ subscriptionActive: boolean; plan: string }> {
  const response = await api(
    `/api/billing/session-status?session_id=${encodeURIComponent(sessionId)}`,
    { timeout: 15_000 }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to check status' }))
    throw new Error(err.message || 'Failed to check session status')
  }
  return response.json()
}

/** One-time setup password after checkout (token from session-details). */
export async function setupPassword(token: string, password: string): Promise<void> {
  const response = await api('/api/auth/setup-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to set password' }))
    throw new Error(err.message || 'Failed to set password')
  }
}
