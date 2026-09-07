/**
 * Analytics: PostHog + optional dev console. All calls are non-blocking and defensive.
 * When PostHog is blocked (e.g. ad blocker), we opt out to stop retries and console spam.
 * PostHog is initialized via PostHogProvider in main.tsx.
 * Env: VITE_POSTHOG_KEY, VITE_POSTHOG_HOST (default https://us.i.posthog.com)
 */

import posthog from 'posthog-js'

const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com'

let optedOut = false


let lifecycleHooksAttached = false

function attachLifecycleFlushHooks(): void {
  if (lifecycleHooksAttached) return
  lifecycleHooksAttached = true
  if (typeof window === 'undefined') return

  const flush = () => {
    try {
      posthog.capture('$pageleave', undefined, { transport: 'sendBeacon' })
    } catch {
      // no-op
    }
  }

  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

/** If PostHog host is unreachable (e.g. blocked by ad blocker), opt out so the SDK stops retrying. */
function probeAndOptOutIfBlocked(): void {
  if (optedOut) return
  // Match posthog-js ingest path (e.g. us.i.posthog.com/i/v0/e/...) so ad-block blocks the same URL we probe.
  const base = POSTHOG_HOST.replace(/\/$/, '')
  const probeUrl = `${base}/i/v0/e/?ip=0&_=0&ver=1&compression=gzip-js`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  fetch(probeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: '',
    signal: controller.signal,
    keepalive: false,
  })
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

/** Probe for ad blockers after PostHog initializes. Call once from a root component. */
export function startAdBlockProbe(): void {
  attachLifecycleFlushHooks()
  setTimeout(probeAndOptOutIfBlocked, 1500)
}

/** Send PostHog's standard $pageview so Web analytics dashboard gets SPA route changes. */
export function capturePageview(pathname: string): void {
  attachLifecycleFlushHooks()
  if (optedOut) return
  try {
    const url = typeof window !== 'undefined' ? `${window.location.origin}${pathname}` : ''
    posthog.capture('$pageview', { $current_url: url })
  } catch {
    // no-op
  }
}

/** Identify user (e.g. after checkout). Safe to call with anonymous id or skip for anonymous. */
export function identifyUser(userId: string, traits?: { email?: string; plan?: string }): void {
  attachLifecycleFlushHooks()
  if (optedOut) return
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
  | 'transcription_autostarted'
  | 'transcription_manual_started'
  | 'job_started'
  | 'job_completed'
  | 'result_downloaded'
  | 'plan_clicked'
  | 'plan_upgraded'
  | 'pricing_page_view'
  | 'pro_cta_clicked'
  | 'checkout_completed'
  | 'pricing_billing_interval_changed'
  | 'free_plan_nudge_seen'
  | 'tool_selected'
  | 'paywall_shown'
  | 'processing_started'
  | 'processing_completed'
  | 'payment_completed'
  | 'soft_cap_shown'
  | 'daily_cap_hit'
  | 'monthly_cap_hit'
  // Monetization tracking
  | 'transcript_copied'            // copy succeeded; props: { plan }
  | 'copy_gate_auth'               // copy blocked — user not logged in; shown auth modal
  | 'copy_gate_limit'              // copy blocked — free copies exhausted; shown paywall
  | 'ai_summary_teaser_shown'      // blurred AI summary teaser rendered for free user
  | 'upgrade_clicked'              // user clicked upgrade CTA; props: { source, plan }
  | 'billing_period_toggled'       // monthly/annual toggle; props: { annual: boolean }
  // Auth funnel
  | 'login_started'
  | 'login_completed'
  | 'login_failed'                 // props: { error }
  | 'signup_started'
  | 'signup_completed'             // account created
  | 'activation_wizard_shown'
  | 'forgot_password_requested'
  | 'magic_login_completed'
  | 'magic_login_failed'           // props: { error }
  // Nav & discovery
  | 'nav_cta_clicked'              // props: { label, destination }
  | 'tool_nav_clicked'             // user clicked a tool from nav dropdown; props: { tool, path }
  | 'samples_module_clicked'       // user clicked "See real output samples"; props: { source_path, target_path }
  // Tool configuration
  | 'format_changed'               // props: { tool, format }
  | 'language_selected'            // props: { tool, language, additional?: boolean }
  | 'tool_option_changed'          // generic; props: { tool, option, value }
  // Tool result actions
  | 'process_another_clicked'      // props: { tool }
  | 'recording_started'
  | 'recording_stopped'            // props: { duration_seconds }
  | 'realtime_transcript_shown'    // Deepgram live transcript displayed client-side; NOT a confirmed quota-consuming completion; props: { tool, words }
  // Churn & billing lifecycle (server-fired; typed here for reference & client use)
  | 'subscription_cancelled'       // cancelled via portal; props: { plan, cancel_at }
  | 'subscription_deleted'         // subscription fully ended; props: { plan }
  | 'subscription_renewed'         // billing cycle renewed; props: { plan, mrr_cents }
  | 'payment_failed'               // Stripe payment declined; props: { plan, error_code }
  // OTP & deep-funnel auth
  | 'otp_requested'                // email OTP sent; props: { method: 'email' }
  | 'otp_verified'                 // OTP entered correctly
  | 'otp_failed'                   // OTP wrong or expired; props: { reason }
  | 'google_login_completed'       // existing user logged in via Google; props: { plan }
  | 'google_signup_completed'      // new account created via Google; props: { plan }
  | 'user_logged_out'              // user explicitly logged out
  | 'password_reset_completed'     // password reset via link
  | 'password_setup_completed'     // new paid user set their password; props: { plan }
  | 'demo_login_completed'         // demo session started
  // Error & validation funnel
  | 'file_validation_failed'       // file rejected before upload; props: { tool, reason, file_type }
  | 'processing_error_shown'       // error state shown to user; props: { tool, error_type }
  | 'job_timed_out'                // client detected hung job; props: { tool, job_id }
  // Feature adoption
  | 'subtitle_editor_opened'       // subtitle editor panel opened; props: { tool }
  | 'batch_job_created'            // batch upload submitted; props: { tool, file_count }
  | 'activation_wizard_shown'     // first-session activation card shown
  | 'activation_wizard_cta_clicked' // first-session activation card CTA clicked
  // Engagement
  | 'result_page_time_spent'       // time before first action; props: { tool, seconds, action }
  | 'first_output_seen'
  | 'upgrade_prompt_seen'
  | 'checkout_started'
  | 'checkout_session_created'
  | 'stripe_redirect'
  | 'checkout_abandoned'
  | 'second_job_upgrade_nudge_seen'
  | 'cancellation_reason_submitted'
  | 'cancellation_reason_skipped'
  | 'pro_onboarding_nudge_seen'



const FIRST_OUTPUT_SEEN_KEY_PREFIX = 'videotext:first_output_seen'

/** Track once per browser+user id (fallback anon) to avoid duplicate first-output events. */
export function trackFirstOutputSeen(props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    const userId = localStorage.getItem('userId') || 'anon'
    const key = `${FIRST_OUTPUT_SEEN_KEY_PREFIX}:${userId}`
    if (localStorage.getItem(key) === '1') return
    trackEvent('first_output_seen', props)
    localStorage.setItem(key, '1')
  } catch {
    // non-blocking
  }
}
export function trackEvent(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  attachLifecycleFlushHooks()
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, props ?? {})
  }
  if (optedOut) return
  try {
    posthog.capture(event, props)
  } catch {
    // non-blocking; never throw
  }
}
