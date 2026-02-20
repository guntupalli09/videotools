/**
 * Pseudo-streaming partial transcript/subtitle storage in Redis.
 * Key: job:partial:${jobId}
 * TTL: 1 hour. All operations are try/catch; Redis failure must never fail the job.
 */

import type { Redis } from 'ioredis'

export interface PartialSegment {
  start: number
  end: number
  text: string
  speaker?: string
}

export interface JobPartialPayload {
  version: number
  segments: PartialSegment[]
  createdAt: number
  updatedAt: number
}

const KEY_PREFIX = 'job:partial:'
const TTL_SEC = 60 * 60 // 1 hour
const MAX_RESPONSE_BYTES = 150 * 1024 // 150 KB for GET response trim

function key(jobId: string | number): string {
  return `${KEY_PREFIX}${jobId}`
}

/**
 * Set partial payload. Caller must ensure segments are sorted and capped (e.g. 2000).
 * Redis failure is logged and ignored; never throws.
 */
export async function setJobPartial(
  redis: Redis,
  jobId: string | number,
  payload: JobPartialPayload
): Promise<void> {
  try {
    const k = key(jobId)
    const val = JSON.stringify(payload)
    await redis.set(k, val, 'EX', TTL_SEC)
  } catch (err: any) {
    console.error('[jobPartial] set failed', { jobId, err: err?.message })
  }
}

/**
 * Get partial payload. Returns null if missing or on error.
 */
export async function getJobPartial(
  redis: Redis,
  jobId: string | number
): Promise<JobPartialPayload | null> {
  try {
    const val = await redis.get(key(jobId))
    if (!val) return null
    const payload = JSON.parse(val) as JobPartialPayload
    if (!payload || typeof payload.version !== 'number' || !Array.isArray(payload.segments)) {
      return null
    }
    return payload
  } catch (err: any) {
    console.error('[jobPartial] get failed', { jobId, err: err?.message })
    return null
  }
}

/**
 * Delete partial key. Call on job success and in catch before rethrow.
 * Redis failure is logged and ignored.
 */
export function deleteJobPartial(redis: Redis, jobId: string | number): void {
  try {
    redis.del(key(jobId)).catch((err) => {
      console.error('[jobPartial] del failed', { jobId, err: err?.message })
    })
  } catch (err: any) {
    console.error('[jobPartial] del failed', { jobId, err: err?.message })
  }
}

/**
 * Trim payload for GET response: ensure size <= MAX_RESPONSE_BYTES by trimming segments from the END only.
 * Returns a copy; does not mutate input.
 */
export function trimPartialPayloadForResponse(payload: JobPartialPayload): JobPartialPayload {
  const raw = JSON.stringify(payload)
  if (Buffer.byteLength(raw, 'utf8') <= MAX_RESPONSE_BYTES) {
    return payload
  }
  const segments = [...payload.segments]
  while (segments.length > 0) {
    const trimmed: JobPartialPayload = {
      ...payload,
      segments,
    }
    if (Buffer.byteLength(JSON.stringify(trimmed), 'utf8') <= MAX_RESPONSE_BYTES) {
      return trimmed
    }
    segments.pop()
  }
  return { ...payload, segments: [] }
}

/**
 * Derive plain text from segments for partialTranscript.
 */
export function segmentsToPartialTranscript(segments: PartialSegment[]): string {
  return segments.map((s) => s.text).filter(Boolean).join(' ')
}

/**
 * Single-writer queue per job: onPartial pushes snapshots, drain loop writes to Redis one at a time.
 * closeAndFlush() stops the loop and resolves when all pending writes are done.
 * Version is strictly monotonic per job (in-memory increment only); never derived from Redis.
 * Rehydration cannot reset version; stale poll protection relies on version never decreasing.
 */
export function createPartialWriter(
  redis: Redis,
  jobId: string | number
): {
  onPartial: (segments: PartialSegment[]) => void
  startDrain: () => void
  closeAndFlush: () => Promise<void>
} {
  const pendingWrites: JobPartialPayload[] = []
  let resolveWait: (() => void) | null = null
  let closed = false
  let version = 0
  let drainDoneResolve: () => void
  const drainDonePromise = new Promise<void>((r) => {
    drainDoneResolve = r
  })

  function onPartial(segments: PartialSegment[]) {
    version += 1
    const now = Date.now()
    pendingWrites.push({
      version,
      segments,
      createdAt: now,
      updatedAt: now,
    })
    if (resolveWait) {
      resolveWait()
      resolveWait = null
    }
  }

  function startDrain() {
    void (async () => {
      while (!closed || pendingWrites.length > 0) {
        if (pendingWrites.length === 0) {
          await new Promise<void>((r) => {
            resolveWait = r
          })
        }
        if (pendingWrites.length > 0) {
          const p = pendingWrites.shift()!
          await setJobPartial(redis, jobId, p)
        }
      }
      drainDoneResolve()
    })()
  }

  async function closeAndFlush(): Promise<void> {
    closed = true
    if (resolveWait) {
      resolveWait()
      resolveWait = null
    }
    await drainDonePromise
  }

  return { onPartial, startDrain, closeAndFlush }
}
