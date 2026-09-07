/**
 * Server-side PostHog analytics. All calls are fire-and-forget and must not throw.
 * Env: POSTHOG_KEY, POSTHOG_HOST (default https://app.posthog.com)
 */

import { PostHog } from 'posthog-node'
import { getLogger } from '../lib/logger'

const log = getLogger('api')

const POSTHOG_KEY = process.env.POSTHOG_KEY
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com'

let client: PostHog | null = null

function getClient(): PostHog | null {
  if (client) return client
  if (!POSTHOG_KEY || !POSTHOG_KEY.trim()) return null
  try {
    client = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
    })
    return client
  } catch {
    return null
  }
}

/** Fire-and-forget; never throws. distinctId = userId or jobId. */
function identify(distinctId: string, properties?: Record<string, unknown>): void {
  try {
    const c = getClient()
    if (!c) return
    ;(c as unknown as { identify?: (payload: { distinctId: string; properties?: Record<string, unknown> }) => void }).identify?.({
      distinctId,
      properties,
    })
  } catch {
    // no-op
  }
}

function capture(event: string, distinctId: string, properties?: Record<string, unknown>): void {
  try {
    if (process.env.NODE_ENV !== 'production') {
      log.debug({ msg: 'analytics event', event, distinctId, ...properties })
    }
    const c = getClient()
    if (!c) return
    c.capture({
      distinctId,
      event,
      properties,
    })
  } catch {
    // no-op
  }
}

/** Call once on server shutdown to flush events. */
export function flushAnalytics(): void {
  try {
    if (client) {
      client.flush()
    }
  } catch {
    // no-op
  }
}

export function trackJobCreated(params: {
  job_id: string
  user_id?: string
  tool_type: string
  file_size_bytes?: number
  plan?: string
}): void {
  capture('job_created', params.user_id ?? 'anonymous', {
    job_id: params.job_id,
    tool_type: params.tool_type,
    ...(params.file_size_bytes != null && { file_size_bytes: params.file_size_bytes }),
    ...(params.plan && { plan: params.plan }),
  })
}

export function trackProcessingStarted(params: {
  job_id: string
  user_id: string
  tool_type: string
  file_size_bytes?: number
}): void {
  capture('processing_started', params.job_id, {
    job_id: params.job_id,
    user_id: params.user_id,
    tool_type: params.tool_type,
    ...(params.file_size_bytes != null && { file_size_bytes: params.file_size_bytes }),
  })
}

export function trackProcessingFinished(params: {
  job_id: string
  user_id: string
  tool_type: string
  processing_ms: number
  extraction_skipped?: boolean
}): void {
  capture('processing_finished', params.job_id, {
    job_id: params.job_id,
    user_id: params.user_id,
    tool_type: params.tool_type,
    processing_ms: params.processing_ms,
    success: true,
    ...(params.extraction_skipped != null && { extraction_skipped: params.extraction_skipped }),
  })
}

export function trackProcessingFailed(params: {
  job_id: string
  user_id?: string
  tool_type: string
  error_message?: string
}): void {
  capture('processing_failed', params.job_id, {
    job_id: params.job_id,
    user_id: params.user_id ?? 'anonymous',
    tool_type: params.tool_type,
    success: false,
    ...(params.error_message && { error_message: params.error_message }),
  })
}

export function trackJobTimedOut(params: {
  job_id: string
  user_id?: string
  tool_type: string
}): void {
  capture('job_timed_out', params.job_id, {
    job_id: params.job_id,
    user_id: params.user_id ?? 'anonymous',
    tool_type: params.tool_type,
  })
}

/**
 * Fired once per paid user when they complete their first job after upgrading.
 * Enables the PostHog funnel: plan_upgraded → first_paid_job_completed.
 * Used to identify users who paid but never activated (churn-risk nudge).
 */
export function trackFirstPaidJobCompleted(params: {
  user_id: string
  plan: string
  tool_type: string
  job_id: string
}): void {
  capture('first_paid_job_completed', params.user_id, {
    user_id: params.user_id,
    plan: params.plan,
    tool_type: params.tool_type,
    job_id: params.job_id,
  })
}

export function trackPlanUpgraded(params: {
  user_id: string
  plan: string
  stripe_customer_id?: string
  email?: string
}): void {
  identify(params.user_id, {
    plan: params.plan,
    ...(params.stripe_customer_id && { stripe_customer_id: params.stripe_customer_id }),
    ...(params.email && { email: params.email }),
  })
  capture('plan_upgraded', params.user_id, {
    user_id: params.user_id,
    plan: params.plan,
    ...(params.stripe_customer_id && { stripe_customer_id: params.stripe_customer_id }),
    ...(params.email && { email: params.email }),
  })
}

// ─── Billing & Churn ────────────────────────────────────────────────────────

export function trackSubscriptionCancelled(params: {
  user_id: string
  plan: string
  cancel_at: Date
}): void {
  capture('subscription_cancelled', params.user_id, {
    user_id: params.user_id,
    plan: params.plan,
    cancel_at: params.cancel_at.toISOString(),
    cancel_at_ts: Math.floor(params.cancel_at.getTime() / 1000),
  })
}

export function trackSubscriptionCancellationReversed(params: {
  user_id: string
  plan: string
}): void {
  capture('subscription_cancellation_reversed', params.user_id, {
    user_id: params.user_id,
    plan: params.plan,
  })
}

export function trackSubscriptionDeleted(params: {
  user_id: string
  plan: string
  period_end: Date
}): void {
  capture('subscription_deleted', params.user_id, {
    user_id: params.user_id,
    plan: params.plan,
    period_end: params.period_end.toISOString(),
  })
}

export function trackCancellationReasonSubmitted(params: {
  user_id: string
  reason: string
  timing: string
  plan: string
}): void {
  capture('cancellation_reason_submitted', params.user_id, {
    user_id: params.user_id,
    reason: params.reason,
    timing: params.timing,
    plan: params.plan,
  })
}

export function trackSubscriptionRenewed(params: {
  user_id: string
  plan: string
  mrr_cents: number
  billing_interval?: string
}): void {
  capture('subscription_renewed', params.user_id, {
    user_id: params.user_id,
    plan: params.plan,
    mrr_cents: params.mrr_cents,
    ...(params.billing_interval && { billing_interval: params.billing_interval }),
  })
}

export function trackPaymentFailed(params: {
  user_id: string
  plan: string
  error_code?: string
  error_message?: string
}): void {
  capture('payment_failed', params.user_id, {
    user_id: params.user_id,
    plan: params.plan,
    ...(params.error_code && { error_code: params.error_code }),
    ...(params.error_message && { error_message: params.error_message }),
  })
}

// ─── Auth deep-funnel ───────────────────────────────────────────────────────

/** Use email as distinctId pre-auth; PostHog merges the profile when identify() fires later. */
export function trackOtpRequested(params: {
  email: string
  is_new_user: boolean
}): void {
  capture('otp_requested', params.email, {
    method: 'email',
    is_new_user: params.is_new_user,
  })
}

export function trackOtpVerified(params: { email: string }): void {
  capture('otp_verified', params.email, { method: 'email' })
}

export function trackOtpFailed(params: {
  email: string
  reason: 'invalid_code' | 'expired'
}): void {
  capture('otp_failed', params.email, { reason: params.reason })
}

export function trackPasswordResetCompleted(params: { user_id: string }): void {
  capture('password_reset_completed', params.user_id, { user_id: params.user_id })
}

export function trackPasswordSetupCompleted(params: {
  user_id: string
  plan: string
}): void {
  capture('password_setup_completed', params.user_id, {
    user_id: params.user_id,
    plan: params.plan,
  })
}

export function trackGoogleAuthCompleted(params: {
  user_id: string
  plan: string
  is_new_user: boolean
}): void {
  const event = params.is_new_user ? 'google_signup_completed' : 'google_login_completed'
  capture(event, params.user_id, {
    user_id: params.user_id,
    plan: params.plan,
    method: 'google',
  })
}

export function trackDemoLoginStarted(params: { demo_user_id: string }): void {
  capture('demo_login_completed', params.demo_user_id, {
    user_id: params.demo_user_id,
    plan: 'pro',
  })
}
