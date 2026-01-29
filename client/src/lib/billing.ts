const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export type BillingPlan = 'basic' | 'pro' | 'agency'

interface CheckoutParams {
  mode: 'subscription' | 'payment'
  plan?: BillingPlan
  returnToPath?: string
  email?: string
  frontendOrigin?: string
}

export async function createCheckoutSession(params: CheckoutParams): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE_URL}/billing/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to start checkout' }))
    throw new Error(error.message || 'Failed to start checkout')
  }

  return response.json()
}

