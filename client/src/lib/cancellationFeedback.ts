import { API_ORIGIN } from './apiBase'
import { getAuthToken } from './api'
import { getSessionId } from './sessionTracking'

export type CancellationReason = 'price' | 'one_time_need' | 'missing_feature'
export type CancellationTiming = 'pre_portal' | 'post_cancel'

export async function submitCancellationReason(params: {
  reason: CancellationReason
  timing: CancellationTiming
  plan?: string
}): Promise<void> {
  const res = await fetch(`${API_ORIGIN}/api/feedback/cancellation-reason`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
    },
    body: JSON.stringify({
      reason: params.reason,
      timing: params.timing,
      sessionId: getSessionId(),
      plan: params.plan,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { message?: string }).message || 'Failed to submit feedback')
  }
}

export function hasSubmittedCancellationReason(timing: CancellationTiming): boolean {
  try {
    return sessionStorage.getItem(`vt:cancel-reason:${timing}`) === '1'
  } catch {
    return false
  }
}

export function markCancellationReasonSubmitted(timing: CancellationTiming): void {
  try {
    sessionStorage.setItem(`vt:cancel-reason:${timing}`, '1')
  } catch {
    /* non-blocking */
  }
}
