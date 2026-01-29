import express, { Request, Response } from 'express'
import { fileQueue } from '../workers/videoProcessor'

const router = express.Router()

router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params
    const job = await fileQueue.getJob(jobId)

    if (!job) {
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

    res.json({
      status,
      progress,
      result,
    })
  } catch (error: any) {
    console.error('Job status error:', error)
    res.status(500).json({ message: error.message || 'Failed to get job status' })
  }
})

export default router
