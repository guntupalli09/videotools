type AnalyticsEvent =
  | 'tool_selected'
  | 'processing_started'
  | 'processing_completed'
  | 'paywall_shown'
  | 'payment_completed'

export function trackEvent(event: AnalyticsEvent, props?: Record<string, any>) {
  // Phase 2: light analytics only – log to console for now.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, props || {})
  }
}

