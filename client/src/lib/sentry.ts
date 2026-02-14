/**
 * Sentry: errors + performance. Enabled only when VITE_SENTRY_DSN is set.
 * Env: VITE_SENTRY_DSN, VITE_SENTRY_ENV (default development), VITE_SENTRY_TRACES_SAMPLE_RATE (default 0.05).
 */
import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
const ENV = (import.meta.env.VITE_SENTRY_ENV as string) || (import.meta.env.MODE === 'production' ? 'production' : 'development')
const RELEASE = import.meta.env.VITE_RELEASE as string | undefined
const TRACES_SAMPLE_RATE = Math.min(1, Math.max(0, parseFloat((import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string) || '0.05') || 0.05))

export function initSentry(): void {
  if (!DSN || !DSN.trim()) return
  try {
    Sentry.init({
      dsn: DSN,
      environment: ENV,
      release: RELEASE || undefined,
      tracesSampleRate: TRACES_SAMPLE_RATE,
      integrations: [Sentry.browserTracingIntegration()],
    })
  } catch {
    // no-op
  }
}
