/**
 * Server-side PostHog analytics. All calls are fire-and-forget and must not throw.
 * Env: POSTHOG_KEY, POSTHOG_HOST (default https://app.posthog.com)
 */

import { PostHog } from 'posthog-node'

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
function capture(event: string, distinctId: string, properties?: Record<string, unknown>): void {
  try {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[analytics]', event, { distinctId, ...properties })
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
  user_id: string
  tool_type: string
  file_size_bytes?: number
  plan?: string
}): void {
  capture('job_created', params.user_id, {
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
  user_id: string
  tool_type: string
  error_message?: string
}): void {
  capture('processing_failed', params.job_id, {
    job_id: params.job_id,
    user_id: params.user_id,
    tool_type: params.tool_type,
    success: false,
    ...(params.error_message && { error_message: params.error_message }),
  })
}
