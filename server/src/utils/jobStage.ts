/**
 * YouTube pipeline stage tracking in Redis.
 * Key: job:stage:{jobId}
 * TTL: 1 hour. All operations are try/catch; Redis failure must never fail the job.
 */

import type { Redis } from 'ioredis'
import { getLogger } from '../lib/logger'

const stageLog = getLogger('worker')

/** The current processing stage for a YouTube job. */
export type YoutubeJobStage = 'fetching_captions' | 'downloading_audio' | 'transcribing'

const KEY_PREFIX = 'job:stage:'
const TTL_SEC = 60 * 60 // 1 hour

function key(jobId: string | number): string {
  return `${KEY_PREFIX}${jobId}`
}

/**
 * Set the current stage for a YouTube job.
 * Redis failure is logged and ignored; never throws.
 */
export async function setJobStage(
  redis: Redis,
  jobId: string | number,
  stage: YoutubeJobStage
): Promise<void> {
  try {
    await redis.set(key(jobId), stage, 'EX', TTL_SEC)
  } catch (err: any) {
    stageLog.error({ msg: '[jobStage] set failed', jobId, error: err?.message })
  }
}

/**
 * Get the current stage for a job. Returns null if not set or on error.
 */
export async function getJobStage(
  redis: Redis,
  jobId: string | number
): Promise<YoutubeJobStage | null> {
  try {
    const val = await redis.get(key(jobId))
    if (!val) return null
    return val as YoutubeJobStage
  } catch (err: any) {
    stageLog.error({ msg: '[jobStage] get failed', jobId, error: err?.message })
    return null
  }
}

/**
 * Delete the stage key for a job (on completion or failure). Never throws.
 */
export async function deleteJobStage(
  redis: Redis,
  jobId: string | number
): Promise<void> {
  try {
    await redis.del(key(jobId))
  } catch (err: any) {
    stageLog.error({ msg: '[jobStage] delete failed', jobId, error: err?.message })
  }
}
