import { api } from './api'

export type BillingPlan = 'basic' | 'pro' | 'agency'

interface CheckoutParams {
  mode: 'subscription' | 'payment'
  plan?: BillingPlan
  annual?: boolean
  returnToPath?: string
  email?: string
  frontendOrigin?: string
  /** Promo code for early testers (e.g. EARLY30, EARLY50, EARLY70, EARLY100). Applied for Basic and Pro. */
  promotionCode?: string
}

function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError && (e.message === 'Failed to fetch' || e.message === 'Load failed')) return true
  if (e instanceof Error && e.name === 'AbortError') return true
  return false
}

export async function createCheckoutSession(params: CheckoutParams): Promise<{ url: string }> {
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

/** After checkout success: exchange session_id for userId and plan so the client can set identity. */
export async function getSessionDetails(sessionId: string): Promise<{ userId: string; plan: string }> {
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
