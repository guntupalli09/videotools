import { api, getAuthToken, invalidateUsageCache, completeSignup as completeSignupApi } from './api'
import { clearAllPersistedJobs } from './jobSession'

const AUTH_TOKEN_KEY = 'authToken'
const USER_ID_KEY = 'userId'
const PLAN_KEY = 'plan'
const USER_EMAIL_KEY = 'userEmail'
const WORKFLOW_STORAGE_KEY = 'videotext:workflow'

export function isLoggedIn(): boolean {
  return !!getAuthToken()
}

/** Clear session (logout). Clears auth, identity, and any persisted job/workflow data so results are not shown after reload. */
export function logout(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(PLAN_KEY)
  localStorage.removeItem(USER_EMAIL_KEY)
  invalidateUsageCache()
  clearAllPersistedJobs()
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(WORKFLOW_STORAGE_KEY)
  } catch {
    // ignore
  }
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('videotext:logout'))
  } catch {
    // ignore
  }
}

/** Complete signup after email OTP verification. Call after verifyOtp; returns same shape as login. */
export async function completeSignup(verificationToken: string, password: string): Promise<{ token: string; userId: string; plan: string; email: string }> {
  return completeSignupApi(verificationToken, password)
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

/** Request a password reset email. Does not reveal whether the email exists. */
export async function requestPasswordReset(email: string): Promise<void> {
  const response = await api('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to send reset link' }))
    throw new Error(err.message || 'Failed to send reset link')
  }
}

/** Reset password with token from email. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await api('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Failed to reset password' }))
    throw new Error(err.message || 'Failed to reset password')
  }
}
