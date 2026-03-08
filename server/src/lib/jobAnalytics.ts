/**
 * Phase 2 analytics: persistent Job records for dashboard/usage.
 * All writes are fire-and-forget; failures are logged and do not block main flow.
 */

import { prisma } from '../db'
import { getLogger } from './logger'

const log = getLogger('api').child({ module: 'job-analytics' })

export interface InsertJobParams {
  id: string
  userId: string
  toolType: string
  planAtRun?: string
  fileSizeBytes?: number
}

export async function insertJobRecord(params: InsertJobParams): Promise<void> {
  // userId is NOT NULL in the Job table — skip anonymous jobs rather than failing silently
  if (!params.userId) return
  try {
    await prisma.job.create({
      data: {
        id: params.id,
        userId: params.userId,
        toolType: params.toolType,
        status: 'queued',
        fileSizeBytes: params.fileSizeBytes != null ? BigInt(params.fileSizeBytes) : null,
        planAtRun: params.planAtRun ?? null,
      },
    })
  } catch (err) {
    log.warn({ err, jobId: params.id, msg: 'job_analytics_insert_failed' })
  }
}

export async function updateJobStarted(jobId: string): Promise<void> {
  try {
    await prisma.job.updateMany({
      where: { id: jobId },
      data: { status: 'processing', startedAt: new Date() },
    })
  } catch (err) {
    log.warn({ err, jobId, msg: 'job_analytics_update_started_failed' })
  }
}

export async function updateJobCompleted(
  jobId: string,
  processingMs: number
): Promise<void> {
  try {
    await prisma.job.updateMany({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        processingMs,
      },
    })
  } catch (err) {
    log.warn({ err, jobId, msg: 'job_analytics_update_completed_failed' })
  }
}

export async function updateJobFailed(
  jobId: string,
  failureReason: string | undefined
): Promise<void> {
  try {
    await prisma.job.updateMany({
      where: { id: jobId },
      data: {
        status: 'failed',
        failureReason: failureReason ?? null,
      },
    })
  } catch (err) {
    log.warn({ err, jobId, msg: 'job_analytics_update_failed_failed' })
  }
}
