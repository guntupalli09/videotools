/**
 * Sentry for API: errors + performance. Enabled only when SENTRY_DSN is set.
 * Env: SENTRY_DSN, SENTRY_ENV (default development), SENTRY_TRACES_SAMPLE_RATE (default 0.05), RELEASE.
 * Uses @sentry/node v8: setupExpressErrorHandler(app) after routes; no request handler (auto-instrumentation).
 */
import * as Sentry from '@sentry/node'
import type { Request, Response, NextFunction } from 'express'
import type { RequestWithId } from '../middleware/requestId'

const DSN = process.env.SENTRY_DSN
const ENV = process.env.SENTRY_ENV || process.env.NODE_ENV || 'development'
const RELEASE = process.env.RELEASE || undefined
const TRACES_SAMPLE_RATE = Math.min(
  1,
  Math.max(0, parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.05') || 0.05)
)

export function initSentry(): void {
  if (!DSN || !DSN.trim()) return
  try {
    Sentry.init({
      dsn: DSN,
      environment: ENV,
      release: RELEASE,
      tracesSampleRate: TRACES_SAMPLE_RATE,
      integrations: [Sentry.expressIntegration()],
    })
  } catch {
    // no-op
  }
}

/** Call after all routes; captures errors and sends response. No-op if SENTRY_DSN not set. */
export function setupSentryErrorHandler(app: import('express').Express): void {
  if (!DSN?.trim()) return
  try {
    Sentry.setupExpressErrorHandler(app)
  } catch {
    // no-op
  }
}

/** Set requestId on Sentry scope for correlation. Run after requestIdMiddleware. */
export function sentryRequestIdScope(req: Request, _res: Response, next: NextFunction): void {
  const id = (req as RequestWithId).requestId
  if (id) Sentry.getCurrentScope().setTag('request_id', id)
  next()
}

/** Capture worker job exception with jobId/requestId/jobName tags. Call from worker process. */
export function captureJobError(jobId: string | number, requestId: string | undefined, jobName: string, err: unknown): void {
  if (!DSN?.trim()) return
  try {
    Sentry.withScope((scope) => {
      scope.setTag('service', 'worker')
      scope.setTag('job_id', String(jobId))
      scope.setTag('job_name', jobName)
      if (requestId) scope.setTag('request_id', requestId)
      Sentry.captureException(err)
    })
  } catch {
    // no-op
  }
}
