/**
 * Analytics: PostHog + optional dev console. All calls are non-blocking and defensive.
 * When PostHog is blocked (e.g. ad blocker), we opt out to stop retries and console spam.
 * Env: VITE_POSTHOG_KEY, VITE_POSTHOG_HOST (default https://app.posthog.com)
 */

import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://app.posthog.com'

let initialized = false
let optedOut = false

/** If PostHog host is unreachable (e.g. blocked by ad blocker), opt out so the SDK stops retrying. */
function probeAndOptOutIfBlocked(): void {
  if (optedOut || !initialized) return
  const probeUrl = POSTHOG_HOST.replace(/\/$/, '') + '/e/?v=0'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  fetch(probeUrl, { method: 'GET', signal: controller.signal, keepalive: false })
    .then(() => clearTimeout(timeout))
    .catch(() => {
      clearTimeout(timeout)
      try {
        posthog.opt_out_capturing()
        optedOut = true
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[analytics] PostHog requests blocked (e.g. ad blocker); analytics disabled')
        }
      } catch {
        // no-op
      }
    })
}

export function initAnalytics(): void {
  if (initialized) return
  if (!POSTHOG_KEY || !POSTHOG_KEY.trim()) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[analytics] PostHog disabled (no VITE_POSTHOG_KEY in client env)')
    }
    return
  }
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: true, // initial load; we also send $pageview on route change for SPA
    })
    initialized = true
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[analytics] PostHog initialized')
    }
    // After a short delay, probe; if blocked (ad blocker), opt out to stop retry spam
    setTimeout(probeAndOptOutIfBlocked, 1500)
  } catch (e) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[analytics] PostHog init failed', e)
    }
  }
}

/** Send PostHog's standard $pageview so Web analytics dashboard gets SPA route changes. */
export function capturePageview(pathname: string): void {
  if (!initialized || optedOut) return
  try {
    const url = typeof window !== 'undefined' ? `${window.location.origin}${pathname}` : ''
    posthog.capture('$pageview', { $current_url: url })
  } catch {
    // no-op
  }
}

/** Identify user (e.g. after checkout). Safe to call with anonymous id or skip for anonymous. */
export function identifyUser(userId: string, traits?: { email?: string; plan?: string }): void {
  if (!initialized || optedOut) return
  try {
    posthog.identify(userId)
    if (traits?.plan) posthog.people.set({ plan: traits.plan })
    if (traits?.email) posthog.people.set({ email: traits.email })
  } catch {
    // no-op
  }
}

export type AnalyticsEvent =
  | 'page_viewed'
  | 'file_selected'
  | 'upload_started'
  | 'upload_completed'
  | 'job_started'
  | 'job_completed'
  | 'result_downloaded'
  | 'plan_clicked'
  | 'plan_upgraded'
  | 'tool_selected'
  | 'paywall_shown'
  | 'processing_started'
  | 'processing_completed'
  | 'payment_completed'

export function trackEvent(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, props ?? {})
  }
  if (!initialized || optedOut) return
  try {
    posthog.capture(event, props)
  } catch {
    // non-blocking; never throw
  }
}
