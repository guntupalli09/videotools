import { api } from './api'

export type BillingPlan = 'basic' | 'pro' | 'agency'

interface CheckoutParams {
  mode: 'subscription' | 'payment'
  plan?: BillingPlan
  annual?: boolean
  returnToPath?: string
  email?: string
  frontendOrigin?: string
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

