import Queue from 'bull'
import path from 'path'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const fileQueue = new Queue('file-processing', {
  redis: redisUrl,
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
      console.error('Processing error:', error)
      throw error
    }
  })

  fileQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
  })

  fileQueue.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err)
  })
}
