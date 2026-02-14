/**
 * Structured JSON logger for API and worker. Single format: level, timestamp, service, env, release, requestId/jobId.
 * Redacts known sensitive keys. Use LOG_LEVEL=debug only when needed (off by default).
 */
import pino from 'pino'

const release = process.env.RELEASE || 'dev'
const env = process.env.NODE_ENV || 'development'
const level = process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'info')

/** Keys (and nested paths) to redact from log output. */
const REDACT_PATHS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'Cookie',
  'email',
  '*.email',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'REDIS_URL',
  'DATABASE_URL',
]

export type ServiceName = 'api' | 'worker'

function createBaseLogger(service: ServiceName): pino.Logger {
  return pino({
    level,
    base: { service, env, release },
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  })
}

let apiLogger: pino.Logger
let workerLogger: pino.Logger

export function getLogger(service: ServiceName): pino.Logger {
  if (service === 'api') {
    if (!apiLogger) apiLogger = createBaseLogger('api')
    return apiLogger
  }
  if (!workerLogger) workerLogger = createBaseLogger('worker')
  return workerLogger
}

/** Create a child logger with requestId (for API request context). */
export function withRequestId(requestId: string | undefined): pino.Logger {
  return getLogger('api').child({ requestId: requestId || undefined })
}

/** Create a child logger with jobId and requestId (for worker job context). */
export function withJobContext(jobId: string | number, requestId?: string): pino.Logger {
  return getLogger('worker').child({ jobId: String(jobId), requestId: requestId || undefined })
}

/** Redact a string for safe logging (e.g. file paths: keep basename only). */
export function redactFilePath(path: string): string {
  if (!path || typeof path !== 'string') return '[REDACTED]'
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || '[REDACTED]'
}
