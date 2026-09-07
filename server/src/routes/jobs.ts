import express, { Request, Response } from 'express'
import { getJobById, type JobData } from '../workers/videoProcessor'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { getUser, incrementUserUsage, saveUser } from '../models/User'
import { recordFreePlanImport } from '../utils/importQuota'
import { getJobPartial, trimPartialPayloadForResponse, segmentsToPartialTranscript } from '../utils/jobPartial'
import { getJobSummary } from '../utils/jobSummary'
import { getJobStage, type YoutubeJobStage } from '../utils/jobStage'
import { getLogger } from '../lib/logger'
import { prisma } from '../db'

const log = getLogger('api')
const router = express.Router()

/** SSE interval (ms). Lower than polling for perceived latency. */
const STREAM_POLL_INTERVAL_MS = 400

/** Phase 2.5: Return queue position (jobs ahead) for transparency: "Processing… {N} jobs ahead of you." */
async function getQueuePosition(job: import('bull').Job): Promise<number> {
  const queue = job.queue
  const waiting = await queue.getWaiting()
  const idx = waiting.findIndex((j) => j.id === job.id)
  return idx >= 0 ? idx : 0
}

/** Build the same payload shape as GET /:jobId for SSE or JSON. */
async function buildJobStatusPayload(
  job: import('bull').Job,
  options?: { revealResults?: boolean }
): Promise<{
  status: string
  progress: number
  result?: unknown
  requiresAuth?: boolean
  queuePosition?: number
  jobToken?: string
  youtubeStage?: YoutubeJobStage
  partialVersion?: number
  partialSegments?: { start: number; end: number; text: string; speaker?: string }[]
  partialTranscript?: string
}> {
  const revealResults = options?.revealResults !== false
  const state = await job.getState()
  const progress = job.progress() || 0
  let status: 'queued' | 'processing' | 'completed' | 'failed' = 'queued'
  if (state === 'completed') status = 'completed'
  else if (state === 'failed') status = 'failed'
  else if (state === 'active') status = 'processing'

  let result = job.returnvalue || undefined
  const queuePosition = state === 'waiting' ? await getQueuePosition(job) : undefined
  const jobToken = (job.data as JobData)?.jobToken

  if (state === 'completed' && result != null) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- undocumented Bull internals
      const redis = (job as any).queue?.client
      if (redis) {
        const deferred = await getJobSummary(redis, job.id)
        if (deferred && (deferred.summary != null || deferred.chapters != null)) {
          result = { ...(result as object), ...(deferred.summary != null && { summary: deferred.summary }), ...(deferred.chapters != null && { chapters: deferred.chapters }) }
        }
      }
    } catch (_) {}
  }

  const payload: {
    status: string
    progress: number
    result?: unknown
    requiresAuth?: boolean
    queuePosition?: number
    jobToken?: string
    youtubeStage?: YoutubeJobStage
    partialVersion?: number
    partialSegments?: { start: number; end: number; text: string; speaker?: string }[]
    partialTranscript?: string
  } = revealResults
    ? { status, progress, result, queuePosition }
    : {
        status,
        progress,
        queuePosition,
        ...(status === 'completed' ? { requiresAuth: true } : {}),
      }
  if (jobToken) payload.jobToken = jobToken

  if (revealResults && state === 'active') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- undocumented Bull internals
      const redis = (job as any).queue?.client
      if (redis) {
        // Include YouTube pipeline stage when present
        const stage = await getJobStage(redis, job.id)
        if (stage) payload.youtubeStage = stage

        const partial = await getJobPartial(redis, job.id)
        if (partial && partial.segments.length > 0) {
          const trimmed = trimPartialPayloadForResponse(partial)
          payload.partialVersion = trimmed.version
          payload.partialSegments = trimmed.segments
          payload.partialTranscript = segmentsToPartialTranscript(trimmed.segments)
        }
      }
    } catch (_) {}
  }
  return payload
}

/** Phase 4: Get deferred summary/chapters (DEFER_SUMMARY). Same auth as GET /:jobId. Returns 200 with { summary?, chapters? } when ready, or 200 {} when not yet available. */
router.get('/:jobId/summary', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    const clientJobToken = (req.query.jobToken as string)?.trim() || (req.headers['x-job-token'] as string)?.trim()
    const { jobId } = req.params
    const job = await getJobById(jobId)
    if (!job) {
      res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' })
      return res.status(404).json({ message: 'Job not found' })
    }
    const jobUserId = (job.data as JobData)?.userId
    const jobToken = (job.data as JobData)?.jobToken
    const allowedByUser = userId != null && jobUserId != null && userId === jobUserId
    const allowedByToken = clientJobToken && jobToken && clientJobToken === jobToken
    if (!allowedByUser && !allowedByToken) {
      return res.status(403).json({ message: 'Access denied. Provide Authorization, API key, or jobToken (query or x-job-token header).' })
    }
    if (!allowedByUser) {
      res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' })
      return res.status(200).json({ requiresAuth: true })
    }
    const redis = (job as any).queue?.client
    if (!redis) {
      return res.status(200).json({})
    }
    const deferred = await getJobSummary(redis, jobId)
    if (!deferred || (deferred.summary == null && deferred.chapters == null)) {
      res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' })
      return res.status(200).json({})
    }
    res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' })
    return res.status(200).json({
      ...(deferred.summary != null && { summary: deferred.summary }),
      ...(deferred.chapters != null && { chapters: deferred.chapters }),
    })
  } catch (error: any) {
    log.error({ msg: 'Job summary error', error: (error as Error)?.message ?? String(error) })
    res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' })
    return res.status(500).json({ message: error.message || 'Failed to get job summary' })
  }
})

/** Optional SSE stream for job status and partials. Same auth and payload shape as GET /:jobId. */
router.get('/:jobId/stream', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    const clientJobToken = (req.query.jobToken as string)?.trim() || (req.headers['x-job-token'] as string)?.trim()
    const { jobId } = req.params
    const job = await getJobById(jobId)
    if (!job) {
      return res.status(404).json({ message: 'Job not found' })
    }
    const jobUserId = (job.data as JobData)?.userId
    const jobToken = (job.data as JobData)?.jobToken
    const allowedByUser = userId != null && jobUserId != null && userId === jobUserId
    const allowedByToken = clientJobToken && jobToken && clientJobToken === jobToken
    if (!allowedByUser && !allowedByToken) {
      return res.status(403).json({ message: 'Access denied. Provide Authorization, API key, or jobToken (query or x-job-token header).' })
    }

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.flushHeaders?.()

    const send = (payload: object) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    const tick = async () => {
      const jobCurrent = await getJobById(jobId)
      if (!jobCurrent) {
        send({ status: 'failed', progress: 0 })
        return true
      }
      const payload = await buildJobStatusPayload(jobCurrent, {
        revealResults: allowedByUser,
      })
      send(payload)
      if (payload.status === 'completed' || payload.status === 'failed') {
        return true
      }
      return false
    }

    const done = await tick()
    if (done) {
      res.end()
      return
    }
    const interval = setInterval(async () => {
      if (res.writableEnded) {
        clearInterval(interval)
        return
      }
      try {
        const done = await tick()
        if (done) {
          clearInterval(interval)
          res.end()
        }
      } catch (_) {
        clearInterval(interval)
        res.end()
      }
    }, STREAM_POLL_INTERVAL_MS)
    req.on('close', () => {
      clearInterval(interval)
      if (!res.writableEnded) res.end()
    })
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || 'Failed to stream job status' })
    }
  }
})

router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    const clientJobToken = (req.query.jobToken as string)?.trim() || (req.headers['x-job-token'] as string)?.trim()
    const { jobId } = req.params
    const job = await getJobById(jobId)

    if (!job) {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      })
      return res.status(404).json({ message: 'Job not found' })
    }

    const jobUserId = (job.data as JobData)?.userId
    const jobToken = (job.data as JobData)?.jobToken
    const allowedByUser = userId != null && jobUserId != null && userId === jobUserId
    const allowedByToken = clientJobToken && jobToken && clientJobToken === jobToken
    if (!allowedByUser && !allowedByToken) {
      return res.status(403).json({ message: 'Access denied. Provide Authorization, API key, or jobToken (query or x-job-token header).' })
    }

    const payload = await buildJobStatusPayload(job, {
      revealResults: allowedByUser,
    })

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    })
    res.json(payload)
  } catch (error: any) {
    log.error({ msg: 'Job status error', error: (error as Error)?.message ?? String(error) })
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    })
    res.status(500).json({ message: error.message || 'Failed to get job status' })
  }
})

/** Claim a guest job — associates it with the authenticated user and increments their importCount. */
router.post('/:jobId/claim', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    if (!userId || userId.startsWith('guest_')) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    const clientJobToken = (req.body?.jobToken as string)?.trim() || (req.headers['x-job-token'] as string)?.trim()
    const { jobId } = req.params

    const job = await getJobById(jobId)
    if (!job) {
      return res.status(404).json({ message: 'Job not found' })
    }

    const jobUserId = (job.data as JobData)?.userId
    const jobToken = (job.data as JobData)?.jobToken

    if (!clientJobToken || !jobToken || clientJobToken !== jobToken) {
      return res.status(403).json({ message: 'Invalid job token.' })
    }

    // Only claim jobs that were run by a guest (not already owned by a real user)
    if (jobUserId && !jobUserId.startsWith('guest_')) {
      return res.status(409).json({ message: 'Job already claimed.' })
    }

    // Persist new owner on the queue job (required for share, billing attribution, etc.)
    try {
      await job.update({ ...(job.data as JobData), userId })
    } catch (updateErr: unknown) {
      log.error({
        msg: 'Claim job queue update failed',
        jobId,
        error: updateErr instanceof Error ? updateErr.message : String(updateErr),
      })
      return res.status(500).json({ message: 'Failed to claim job. Please try again.' })
    }

    // Update Prisma Job record with real userId so founder dashboard shows user's email
    try {
      await prisma.job.updateMany({ where: { id: jobId }, data: { userId } })
    } catch (prismaErr: unknown) {
      log.warn({
        msg: 'Claim job prisma update failed',
        jobId,
        error: prismaErr instanceof Error ? prismaErr.message : String(prismaErr),
      })
      // non-blocking — queue update already succeeded
    }

    // Increment real user's import counts to reflect the guest trial job.
    // Must update both importCount and importCountToday — the free-plan UI
    // reads importCountToday, so missing it leaves the counter stuck at 3/3.
    const claimedUser = await getUser(userId)
    if (claimedUser?.plan === 'free') {
      await recordFreePlanImport(userId)
    } else {
      await incrementUserUsage(userId, { importCount: 1, importCountToday: 1 })
    }

    return res.status(200).json({ ok: true })
  } catch (error: any) {
    log.error({ msg: 'Claim job error', error: (error as Error)?.message ?? String(error) })
    return res.status(500).json({ message: error.message || 'Failed to claim job' })
  }
})

export default router
