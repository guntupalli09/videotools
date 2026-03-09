import Queue from 'bull'
import path from 'path'
import { createRedisClient } from '../utils/redis'
import { getLogger } from '../lib/logger'
const dummyLog = getLogger('worker')

export const fileQueue = new Queue('file-processing', {
  createClient: createRedisClient,
})

interface JobData {
  filePath: string
  originalName: string
  fileSize: number
}

export function startWorker() {
  fileQueue.process(async (job) => {
    const { filePath, originalName } = job.data as JobData

    try {
      // Update progress
      await job.progress(10)

      // Simulate processing (wait 3 seconds)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await job.progress(50)

      await new Promise((resolve) => setTimeout(resolve, 1000))
      await job.progress(80)

      await new Promise((resolve) => setTimeout(resolve, 1000))
      await job.progress(100)

      // Return fake success result
      return {
        downloadUrl: `/api/download/${path.basename(filePath)}`,
        fileName: originalName,
      }
    } catch (error: any) {
      dummyLog.error({ msg: 'Processing error', error: String(error) })
      throw error
    }
  })

  fileQueue.on('completed', (job) => {
    dummyLog.info({ msg: 'Job completed', jobId: job.id })
  })

  fileQueue.on('failed', (job, err) => {
    dummyLog.error({ msg: 'Job failed', jobId: job?.id, error: String(err) })
  })
}
