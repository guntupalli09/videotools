import express, { Request, Response } from 'express'
import { getJobById } from '../workers/videoProcessor'

const router = express.Router()

/** Phase 2.5: Return queue position (jobs ahead) for transparency: "Processing… {N} jobs ahead of you." */
async function getQueuePosition(job: import('bull').Job): Promise<number> {
  const queue = job.queue
  const waiting = await queue.getWaiting()
  const idx = waiting.findIndex((j) => j.id === job.id)
  return idx >= 0 ? idx : 0
}

router.get('/:jobId', async (req: Request, res: Response) => {
  try {
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

    const result = job.returnvalue || undefined
    const queuePosition = state === 'waiting' ? await getQueuePosition(job) : undefined

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    })
    res.json({
      status,
      progress,
      result,
      queuePosition,
    })
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
