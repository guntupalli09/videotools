import express, { Request, Response } from 'express'
import { getJobById } from '../workers/videoProcessor'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { getJobPartial, trimPartialPayloadForResponse, segmentsToPartialTranscript } from '../utils/jobPartial'
import { getJobSummary } from '../utils/jobSummary'

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
async function buildJobStatusPayload(job: import('bull').Job): Promise<{
  status: string
  progress: number
  result?: unknown
  queuePosition?: number
  jobToken?: string
  partialVersion?: number
  partialSegments?: { start: number; end: number; text: string; speaker?: string }[]
  partialTranscript?: string
}> {
  const state = await job.getState()
  const progress = job.progress() || 0
  let status: 'queued' | 'processing' | 'completed' | 'failed' = 'queued'
  if (state === 'completed') status = 'completed'
  else if (state === 'failed') status = 'failed'
  else if (state === 'active') status = 'processing'

  let result = job.returnvalue || undefined
  const queuePosition = state === 'waiting' ? await getQueuePosition(job) : undefined
  const jobToken = (job.data as any)?.jobToken

  if (state === 'completed' && result != null) {
    try {
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
    queuePosition?: number
    jobToken?: string
    partialVersion?: number
    partialSegments?: { start: number; end: number; text: string; speaker?: string }[]
    partialTranscript?: string
  } = { status, progress, result, queuePosition }
  if (jobToken) payload.jobToken = jobToken

  if (state === 'active') {
    try {
      const redis = (job as any).queue?.client
      if (redis) {
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
    const jobUserId = (job.data as any)?.userId
    const jobToken = (job.data as any)?.jobToken
    const allowedByUser = userId != null && jobUserId != null && userId === jobUserId
    const allowedByToken = clientJobToken && jobToken && clientJobToken === jobToken
    if (!allowedByUser && !allowedByToken) {
      return res.status(403).json({ message: 'Access denied. Provide Authorization, API key, or jobToken (query or x-job-token header).' })
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
    console.error('Job summary error:', error)
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
    const jobUserId = (job.data as any)?.userId
    const jobToken = (job.data as any)?.jobToken
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
      const payload = await buildJobStatusPayload(jobCurrent)
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

    const jobUserId = (job.data as any)?.userId
    const jobToken = (job.data as any)?.jobToken
    const allowedByUser = userId != null && jobUserId != null && userId === jobUserId
    const allowedByToken = clientJobToken && jobToken && clientJobToken === jobToken
    if (!allowedByUser && !allowedByToken) {
      return res.status(403).json({ message: 'Access denied. Provide Authorization, API key, or jobToken (query or x-job-token header).' })
    }

    const payload = await buildJobStatusPayload(job)

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    })
    res.json(payload)
  } catch (error: any) {
    console.error('Job status error:', error)
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    })
    res.status(500).json({ message: error.message || 'Failed to get job status' })
  }
})

export default router
