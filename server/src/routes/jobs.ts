import express, { Request, Response } from 'express'
import { getJobById } from '../workers/videoProcessor'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { getJobPartial, trimPartialPayloadForResponse, segmentsToPartialTranscript } from '../utils/jobPartial'
import { getJobSummary } from '../utils/jobSummary'

const router = express.Router()

/** Phase 2.5: Return queue position (jobs ahead) for transparency: "Processing… {N} jobs ahead of you." */
async function getQueuePosition(job: import('bull').Job): Promise<number> {
  const queue = job.queue
  const waiting = await queue.getWaiting()
  const idx = waiting.findIndex((j) => j.id === job.id)
  return idx >= 0 ? idx : 0
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

    const state = await job.getState()
    const progress = job.progress() || 0

    let status: 'queued' | 'processing' | 'completed' | 'failed' = 'queued'
    if (state === 'completed') {
      status = 'completed'
    } else if (state === 'failed') {
      status = 'failed'
    } else if (state === 'active') {
      status = 'processing'
    }

    let result = job.returnvalue || undefined
    const queuePosition = state === 'waiting' ? await getQueuePosition(job) : undefined

    if (state === 'completed' && result != null) {
      try {
        const redis = (job as any).queue?.client
        if (redis) {
          const deferred = await getJobSummary(redis, jobId)
          if (deferred && (deferred.summary != null || deferred.chapters != null)) {
            result = { ...(result as object), ...(deferred.summary != null && { summary: deferred.summary }), ...(deferred.chapters != null && { chapters: deferred.chapters }) }
          }
        }
      } catch (_) {
        // omit deferred summary on error
      }
    }

    const payload: { status: string; progress: number; result?: unknown; queuePosition?: number; jobToken?: string; partialVersion?: number; partialSegments?: { start: number; end: number; text: string; speaker?: string }[]; partialTranscript?: string } = {
      status,
      progress,
      result,
      queuePosition,
    }
    if (jobToken) payload.jobToken = jobToken

    if (state === 'active') {
      try {
        const redis = (job as any).queue?.client
        if (redis) {
          const partial = await getJobPartial(redis, jobId)
          if (partial && partial.segments.length > 0) {
            const trimmed = trimPartialPayloadForResponse(partial)
            payload.partialVersion = trimmed.version
            payload.partialSegments = trimmed.segments
            payload.partialTranscript = segmentsToPartialTranscript(trimmed.segments)
          }
        }
      } catch (_) {
        // omit partial on error
      }
    }

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
