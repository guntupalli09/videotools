export type JobType =
  | 'transcript'
  | 'subtitles'
  | 'translate'
  | 'batch'
  | 'burn'
  | 'compress'

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface JobRecord {
  id: string
  userId: string

  // Job details
  type: JobType
  status: JobStatus
  priority: number

  // Video details
  videoHash?: string
  videoPath?: string
  videoDuration?: number // seconds
  videoSize?: number // bytes

  // Processing details
  trimmedStart?: number
  trimmedEnd?: number
  trimmedDuration?: number

  // Languages
  primaryLanguage?: string
  additionalLanguages?: string[]

  // Batch details
  batchId?: string
  batchPosition?: number
  batchTotal?: number

  // Output
  outputPath?: string
  outputSize?: number

  // Usage metering
  minutesCharged?: number
  overageMinutes?: number

  // Timestamps
  queuedAt: Date
  startedAt?: Date
  completedAt?: Date
  expiresAt?: Date

  // Error tracking
  error?: string
  retryCount?: number
}

// Lightweight in-memory store for Phase 1.5
const jobs = new Map<string, JobRecord>()

export function saveJob(job: JobRecord): void {
  jobs.set(job.id, job)
}

export function getJobById(id: string): JobRecord | undefined {
  return jobs.get(id)
}

