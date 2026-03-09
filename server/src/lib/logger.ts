/**
 * Structured JSON logger for API and worker. Single format: level, timestamp, service, env, release, requestId/jobId.
 * Redacts known sensitive keys. Use LOG_LEVEL=debug only when needed (off by default).
 *
 * All error and warn lines are also pushed to the Redis log ring so they appear
 * in the founder dashboard at /api/admin/logs — no need to open Docker logs.
 */
import pino from 'pino'
import { Writable } from 'stream'
import { pushLogEntry, type LogLevel } from './logRing'

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

/**
 * Custom writable stream that intercepts pino JSON lines and pushes
 * error/warn/fatal entries into the Redis log ring buffer.
 * This is what makes every log.error/warn appear in the founder dashboard.
 */
function createRingStream(service: ServiceName): Writable {
  return new Writable({
    write(chunk: Buffer, _encoding, callback) {
      try {
        const line = chunk.toString().trim()
        if (!line) { callback(); return }
        const obj = JSON.parse(line) as Record<string, unknown>
        // formatters.level converts the pino level number to a label string
        const levelStr = String(obj.level || '')
        if (levelStr === 'error' || levelStr === 'warn' || levelStr === 'fatal') {
          const ringLevel: LogLevel = levelStr === 'warn' ? 'warn' : 'error'
          // Collect any extra diagnostic fields into a short string
          const extraParts = [obj.error, obj.stack, obj.reason, obj.vars]
            .filter(Boolean)
            .map((v) => String(v).slice(0, 150))
          pushLogEntry({
            ts: String(obj.time || new Date().toISOString()),
            level: ringLevel,
            service,
            msg: String(obj.msg || ''),
            jobId: obj.jobId ? String(obj.jobId) : undefined,
            requestId: obj.requestId ? String(obj.requestId) : undefined,
            extra: extraParts.length ? extraParts.join(' | ').slice(0, 300) : undefined,
          })
        }
      } catch { /* best-effort — never let the ring stream crash the logger */ }
      callback()
    },
  })
}

function createBaseLogger(service: ServiceName): pino.Logger {
  const streams = pino.multistream([
    { stream: process.stdout },
    { level: 'warn', stream: createRingStream(service) },
  ])
  return pino(
    {
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
    },
    streams
  )
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
