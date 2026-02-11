/**
 * Analytics: PostHog + optional dev console. All calls are non-blocking and defensive.
 * Env: VITE_POSTHOG_KEY, VITE_POSTHOG_HOST (default https://app.posthog.com)
 */

import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://app.posthog.com'

let initialized = false

export function initAnalytics(): void {
  if (initialized) return
  if (!POSTHOG_KEY || !POSTHOG_KEY.trim()) return
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
  } catch (e) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[analytics] PostHog init failed', e)
    }
  }
}

/** Send PostHog's standard $pageview so Web analytics dashboard gets SPA route changes. */
export function capturePageview(pathname: string): void {
  if (!initialized) return
  try {
    const url = typeof window !== 'undefined' ? `${window.location.origin}${pathname}` : ''
    posthog.capture('$pageview', { $current_url: url })
  } catch {
    // no-op
  }
}

/** Identify user (e.g. after checkout). Safe to call with anonymous id or skip for anonymous. */
export function identifyUser(userId: string, traits?: { email?: string; plan?: string }): void {
  if (!initialized) return
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
  if (!initialized) return
  try {
    posthog.capture(event, props)
  } catch {
    // non-blocking; never throw
  }
}
