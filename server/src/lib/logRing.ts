/**
 * Redis-backed log ring buffer for the Command Centre log viewer.
 * Stores the last LOG_RING_MAX entries (error + warn + info with msg) in a Redis list.
 * Writes are fire-and-forget — never blocks the main flow.
 *
 * Usage: call pushLogEntry() from the places you want to surface in the dashboard.
 * The /api/admin/logs endpoint reads from this ring buffer.
 */
import Redis from 'ioredis'

const LOG_RING_KEY = 'videotext:logs:ring'
const LOG_RING_MAX = 500

export type LogLevel = 'error' | 'warn' | 'info'

export interface LogEntry {
  ts: string        // ISO timestamp
  level: LogLevel
  service: 'api' | 'worker'
  msg: string
  jobId?: string
  requestId?: string
  module?: string
  extra?: string    // short JSON of extra fields (trimmed for size)
}

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    _redis = new Redis(url, {
      ...(url.startsWith('rediss://') ? { tls: {} } : {}),
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
      commandTimeout: 3_000,
      lazyConnect: true,
    })
    _redis.on('error', () => { /* suppress — ring buffer is best-effort */ })
    return _redis
  } catch {
    return null
  }
}

/** Push a log entry into the ring buffer. Fire-and-forget — never throws. */
export function pushLogEntry(entry: LogEntry): void {
  const redis = getRedis()
  if (!redis) return
  const raw = JSON.stringify(entry)
  // LPUSH then LTRIM keeps only the newest LOG_RING_MAX entries
  redis.pipeline()
    .lpush(LOG_RING_KEY, raw)
    .ltrim(LOG_RING_KEY, 0, LOG_RING_MAX - 1)
    .exec()
    .catch(() => { /* best-effort */ })
}

/** Read up to `limit` entries from the ring buffer, newest first. */
export async function readLogRing(limit = 200, offset = 0): Promise<LogEntry[]> {
  const redis = getRedis()
  if (!redis) return []
  try {
    const raws = await redis.lrange(LOG_RING_KEY, offset, offset + limit - 1)
    return raws.map((r) => {
      try { return JSON.parse(r) as LogEntry } catch { return null }
    }).filter(Boolean) as LogEntry[]
  } catch {
    return []
  }
}
