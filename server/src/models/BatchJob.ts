export type BatchStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'partial'

export interface BatchJob {
  id: string
  userId: string

  // Batch details
  totalVideos: number
  totalDuration: number // seconds
  processedVideos: number
  failedVideos: number

  // Status
  status: BatchStatus

  // Output
  zipPath?: string
  zipSize?: number

  // Error tracking
  errors: {
    videoName: string
    reason: string
  }[]

  // Timestamps
  createdAt: Date
  completedAt?: Date
  expiresAt: Date
}

const batches = new Map<string, BatchJob>()

export function saveBatch(batch: BatchJob): void {
  batches.set(batch.id, batch)
}

export function getBatchById(id: string): BatchJob | undefined {
  return batches.get(id)
}

