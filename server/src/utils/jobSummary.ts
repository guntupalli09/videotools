/**
 * Deferred summary/chapters storage (DEFER_SUMMARY).
 * Key: job:summary:${jobId}
 * TTL: 1 hour. Redis failure is logged and ignored; never throws.
 */

import type { Redis } from 'ioredis'

export interface JobSummaryPayload {
  summary?: { summary: string; bullets: string[]; actionItems?: string[] }
  chapters?: { title: string; startTime: number; endTime?: number }[]
}

const KEY_PREFIX = 'job:summary:'
const TTL_SEC = 60 * 60 // 1 hour

function key(jobId: string | number): string {
  return `${KEY_PREFIX}${jobId}`
}

export async function setJobSummary(
  redis: Redis,
  jobId: string | number,
  payload: JobSummaryPayload
): Promise<void> {
  try {
    const k = key(jobId)
    const val = JSON.stringify(payload)
    await redis.set(k, val, 'EX', TTL_SEC)
  } catch (err: any) {
    console.error('[jobSummary] set failed', { jobId, err: err?.message })
  }
}

export async function getJobSummary(
  redis: Redis,
  jobId: string | number
): Promise<JobSummaryPayload | null> {
  try {
    const val = await redis.get(key(jobId))
    if (!val) return null
    const payload = JSON.parse(val) as JobSummaryPayload
    return payload
  } catch (err: any) {
    console.error('[jobSummary] get failed', { jobId, err: err?.message })
    return null
  }
}
