import { api, getAuthToken, invalidateUsageCache } from './api'

const AUTH_TOKEN_KEY = 'authToken'
const USER_ID_KEY = 'userId'
const PLAN_KEY = 'plan'
const USER_EMAIL_KEY = 'userEmail'

export function isLoggedIn(): boolean {
  return !!getAuthToken()
}

/** Clear session (logout). Clears auth token and identity so user appears as free guest until they log in again. */
export function logout(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(PLAN_KEY)
  localStorage.removeItem(USER_EMAIL_KEY)
  invalidateUsageCache()
}

/** Log in with email and password. Returns { token, userId, plan, email } on success. Caller should store these and then refresh/navigate. */
export async function login(email: string, password: string): Promise<{ token: string; userId: string; plan: string; email: string }> {
  const response = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Login failed' }))
    throw new Error(err.message || 'Login failed')
  }
  const data = await response.json()
  if (!data.token || !data.userId || data.plan == null) {
    throw new Error('Invalid login response')
  }
  return {
    token: data.token,
    userId: data.userId,
    plan: data.plan,
    email: data.email || `${data.userId}@example.com`,
  }
}

/** Store login result in localStorage so the app shows the user's plan and API requests use the token. */
export function storeLoginResult(result: { token: string; userId: string; plan: string; email: string }): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, result.token)
  localStorage.setItem(USER_ID_KEY, result.userId)
  localStorage.setItem(PLAN_KEY, result.plan.toLowerCase())
  localStorage.setItem(USER_EMAIL_KEY, result.email)
  invalidateUsageCache()
}
