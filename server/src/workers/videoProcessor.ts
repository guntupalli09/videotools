import Queue from 'bull'
import path from 'path'
import fs from 'fs'
import archiver from 'archiver'
import { transcribeVideo } from '../services/transcription'
import { translateSubtitleFile } from '../services/translation'
import { fixSubtitleFile } from '../services/subtitles'
import { burnSubtitles, compressVideo, HUNG_JOB_MESSAGE } from '../services/ffmpeg'
import { generateOutputFilename, downloadVideoFromURL, validateVideoDuration } from '../services/video'
import { validateFileType, validateFileSize } from '../utils/fileValidation'
import { trimVideoSegment } from '../services/trimming'
import { generateMultiLanguageSubtitles } from '../services/multiLanguage'
import { BatchJob, getBatchById, saveBatch } from '../models/BatchJob'
import { getUser, saveUser, PlanType } from '../models/User'
import { getPlanLimits, getJobPriority, getMaxJobRuntimeMinutes } from '../utils/limits'
import { calculateTranslationMinutes, secondsToMinutes } from '../utils/metering'
import { saveDuplicateResult } from '../services/duplicate'
import { createRedisClient } from '../utils/redis'
import { MAX_GLOBAL_WORKERS, PAID_TIER_RESERVATION_QUEUE_THRESHOLD } from '../utils/queueConfig'

export const fileQueue = new Queue('file-processing', {
  createClient: createRedisClient,
})

/** Phase 2.5: Pro/Agency jobs when queue > 50 get 1 dedicated worker; remaining 2 serve all tiers. */
export const priorityQueue = new Queue('file-processing-priority', {
  createClient: createRedisClient,
})

export async function getTotalQueueCount(): Promise<number> {
  const [normalCounts, priorityCounts] = await Promise.all([
    fileQueue.getJobCounts(),
    priorityQueue.getJobCounts(),
  ])
  return (
    (normalCounts.waiting ?? 0) + (normalCounts.active ?? 0) + (normalCounts.delayed ?? 0) +
    (priorityCounts.waiting ?? 0) + (priorityCounts.active ?? 0) + (priorityCounts.delayed ?? 0)
  )
}

/** Add job to the appropriate queue by plan (Pro/Agency → priority when reservation active). Phase 2.5: auto-retry once on failure (e.g. HUNG_JOB). */
export async function addJobToQueue(
  plan: PlanType,
  data: JobData,
  options?: { priority?: number }
) {
  const priority = options?.priority ?? getJobPriority(plan)
  const totalCount = await getTotalQueueCount()
  const usePriorityQueue =
    (plan === 'pro' || plan === 'agency') &&
    totalCount > PAID_TIER_RESERVATION_QUEUE_THRESHOLD
  const jobOptions = { priority, attempts: 2 }
  if (usePriorityQueue) {
    return priorityQueue.add(data, jobOptions)
  }
  return fileQueue.add(data, jobOptions)
}

/** Get job by ID from either queue (for status endpoint). */
export async function getJobById(jobId: string) {
  let job = await priorityQueue.getJob(jobId)
  if (job) return job
  return fileQueue.getJob(jobId)
}

interface JobData {
  toolType: string
  userId?: string
  plan?: PlanType
  videoHash?: string
  cachedResult?: { downloadUrl: string; fileName?: string }
  filePath?: string
  filePath2?: string // For burn-subtitles (video + subtitle)
  originalName?: string
  originalName2?: string
  fileSize?: number
  url?: string // For URL-based inputs
  batchId?: string // For batch processing
  batchPosition?: number
  batchTotal?: number
  trimmedStart?: number // seconds
  trimmedEnd?: number // seconds
  options?: {
    format?: 'srt' | 'vtt'
    language?: string
    targetLanguage?: string
    compressionLevel?: 'light' | 'medium' | 'heavy'
    additionalLanguages?: string[] // For multi-language
  }
}

function getOrCreateUserForJob(userId: string, plan: PlanType) {
  const existing = getUser(userId)
  if (existing) {
    const now = new Date()
    if (now > existing.usageThisMonth.resetDate) {
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      existing.usageThisMonth = {
        totalMinutes: 0,
        videoCount: 0,
        batchCount: 0,
        languageCount: 0,
        translatedMinutes: 0,
        resetDate,
      }
      existing.overagesThisMonth = { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }
      existing.updatedAt = now
      saveUser(existing)
    }
    return existing
  }

  const limits = getPlanLimits(plan)
  const now = new Date()
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const user = {
    id: userId,
    email: `${userId}@example.com`,
    passwordHash: '',
    plan,
    stripeCustomerId: '',
    subscriptionId: '',
    paymentMethodId: undefined,
    usageThisMonth: {
      totalMinutes: 0,
      videoCount: 0,
      batchCount: 0,
      languageCount: 0,
      translatedMinutes: 0,
      resetDate,
    },
    limits,
    overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
    createdAt: now,
    updatedAt: now,
  }
  saveUser(user)
  return user
}

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')

async function generateBatchZip(batchId: string, batch: BatchJob): Promise<void> {
  const zipPath = path.join(tempDir, `batch-${batchId}.zip`)
  const output = fs.createWriteStream(zipPath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const zipSize = archive.pointer()
      batch.zipPath = zipPath
      batch.zipSize = zipSize
      batch.status = batch.failedVideos > 0 ? 'partial' : 'completed'
      batch.completedAt = new Date()
      saveBatch(batch)
      resolve()
    })

    archive.on('error', (err: any) => {
      reject(err)
    })

    archive.pipe(output)

    // Find all SRT files for this batch
    const batchFiles = fs.readdirSync(tempDir)
      .filter(f => f.startsWith(`batch-${batchId}-`) && f.endsWith('.srt'))
      .map(f => ({
        path: path.join(tempDir, f),
        name: f.replace(`batch-${batchId}-`, ''), // Remove batch prefix
      }))

    // Add all SRT files
    for (const file of batchFiles) {
      archive.file(file.path, { name: file.name })
    }

    // Add error log if there are errors
    if (batch.errors.length > 0) {
      const errorLog = batch.errors
        .map(e => `${e.videoName}: ${e.reason}`)
        .join('\n')
      archive.append(errorLog, { name: 'error_log.txt' })
    }

    archive.finalize()
  })
}

/** Phase 2.5: 1 worker for Pro/Agency, 2 for all tiers = MAX_GLOBAL_WORKERS (3). */
const NORMAL_CONCURRENCY = 2
const PRIORITY_CONCURRENCY = 1

const RUNTIME_QUEUE_THRESHOLD = 20
const RUNTIME_CHECK_INTERVAL_MS = 15 * 1000

async function processJob(job: import('bull').Job<JobData>) {
  const jobId = job.id
  console.log('[JOB]', jobId, 'RECEIVED')

  const data = job.data as JobData
  const plan = (data.plan || 'free') as PlanType
  const maxRuntimeMs = getMaxJobRuntimeMinutes(plan) * 60 * 1000

  const run = async (): Promise<any> => {
    console.log('[JOB]', jobId, 'STARTED')
    const { toolType, options } = data

    // Instrument progress so every update is logged; Bull persists progress for status endpoint
    const progressFn = job.progress.bind(job)
    ;(job as any).progress = async (value?: number | object) => {
      const out = await progressFn(value)
      if (typeof value === 'number') console.log('[JOB]', jobId, 'PROGRESS', value)
      return out
    }

    try {
      await job.progress(5)

      let result: any

      switch (toolType) {
        case 'cached-result': {
          await job.progress(100)
          return data.cachedResult
        }
        case 'video-to-transcript': {
          let videoPath = data.filePath!
          const userId = data.userId || 'demo-user'
          const plan = data.plan || 'free'
          
          // Download from URL if provided
          if (data.url) {
            await job.progress(10)
            const downloadedPath = path.join(tempDir, `video-${Date.now()}.mp4`)
            await downloadVideoFromURL(data.url, downloadedPath)
            videoPath = downloadedPath
          }

          // Trim video if start/end times provided
          if (data.trimmedStart !== undefined && data.trimmedEnd !== undefined) {
            await job.progress(12)
            const trimResult = await trimVideoSegment({
              inputPath: videoPath,
              startTime: data.trimmedStart,
              endTime: data.trimmedEnd,
            })
            videoPath = trimResult.outputPath
          }

          // Validate duration
          await job.progress(15)
          const durationCheck = await validateVideoDuration(videoPath, getPlanLimits(plan).maxVideoDuration)
          if (!durationCheck.valid) {
            throw new Error(durationCheck.error || 'Video too long')
          }

          // Transcribe
          await job.progress(30)
          const transcript = await transcribeVideo(videoPath, 'text', options?.language)

          // Save transcript
          await job.progress(80)
          const outputFilename = generateOutputFilename(data.originalName || 'video', '_transcript', '.txt')
          const outputPath = path.join(tempDir, outputFilename)
          fs.writeFileSync(outputPath, transcript)

          result = {
            downloadUrl: `/api/download/${outputFilename}`,
            fileName: outputFilename,
          }

          if (data.videoHash) {
            await saveDuplicateResult(userId, data.videoHash, outputPath)
          }

          // Metering (minutes) - based on trimmed duration if provided
          const processedSeconds =
            data.trimmedStart !== undefined && data.trimmedEnd !== undefined
              ? Math.max(0, data.trimmedEnd - data.trimmedStart)
              : durationCheck.duration || 0
          const minutes = secondsToMinutes(processedSeconds)
          const user = getOrCreateUserForJob(userId, plan)
          user.usageThisMonth.totalMinutes += minutes
          user.usageThisMonth.videoCount += 1
          user.updatedAt = new Date()
          saveUser(user)
          break
        }

        case 'video-to-subtitles': {
          let videoPath = data.filePath!
          const userId = data.userId || 'demo-user'
          const plan = data.plan || 'free'
          
          // Download from URL if provided
          if (data.url) {
            await job.progress(10)
            const downloadedPath = path.join(tempDir, `video-${Date.now()}.mp4`)
            await downloadVideoFromURL(data.url, downloadedPath)
            videoPath = downloadedPath
          }

          // Trim video if start/end times provided
          // (trimmed duration is what should be metered; metering enforcement is handled upstream)
          if (data.trimmedStart !== undefined && data.trimmedEnd !== undefined) {
            await job.progress(12)
            const trimResult = await trimVideoSegment({
              inputPath: videoPath,
              startTime: data.trimmedStart,
              endTime: data.trimmedEnd,
            })
            videoPath = trimResult.outputPath
          }

          // Validate duration
          await job.progress(15)
          const durationCheck = await validateVideoDuration(videoPath, getPlanLimits(plan).maxVideoDuration)
          if (!durationCheck.valid) {
            throw new Error(durationCheck.error || 'Video too long')
          }

          const format = options?.format || 'srt'
          const additionalLangs = options?.additionalLanguages || []
          
          // Multi-language processing
          if (additionalLangs.length > 0) {
            await job.progress(30)
            const multiLangResults = await generateMultiLanguageSubtitles(
              videoPath,
              options?.language || 'en',
              additionalLangs,
              format
            )
            
            // Save all language files
            await job.progress(80)
            const outputFiles: { [lang: string]: string } = {}
            
            // Save primary language
            const primaryLang = options?.language || 'en'
            const primaryExt = format === 'srt' ? '.srt' : '.vtt'
            const primaryFilename = generateOutputFilename(data.originalName || 'video', `_${primaryLang}`, primaryExt)
            const primaryPath = path.join(tempDir, primaryFilename)
            fs.writeFileSync(primaryPath, multiLangResults[primaryLang])
            outputFiles[primaryLang] = primaryFilename
            
            // Save additional languages
            for (const lang of additionalLangs) {
              const langExt = format === 'srt' ? '.srt' : '.vtt'
              const langFilename = generateOutputFilename(data.originalName || 'video', `_${lang}`, langExt)
              const langPath = path.join(tempDir, langFilename)
              fs.writeFileSync(langPath, multiLangResults[lang])
              outputFiles[lang] = langFilename
            }

            // Create ZIP for multi-language outputs
            const baseName = path.basename(data.originalName || 'video', path.extname(data.originalName || 'video'))
            const zipFilename = `${baseName}_languages.zip`
            const zipPath = path.join(tempDir, zipFilename)
            const zipStream = fs.createWriteStream(zipPath)
            const zip = archiver('zip', { zlib: { level: 9 } })

            await new Promise<void>((resolve, reject) => {
              zipStream.on('close', () => resolve())
              zip.on('error', (err: any) => reject(err))
              zip.pipe(zipStream)

              Object.entries(outputFiles).forEach(([lang, filename]) => {
                const filePath = path.join(tempDir, filename)
                zip.file(filePath, { name: filename })
              })

              zip.finalize()
            })

            result = {
              downloadUrl: `/api/download/${zipFilename}`,
              fileName: zipFilename,
              multiLanguage: outputFiles,
            }

            // Metering: primary + 0.5x per additional language
            const processedSeconds =
              data.trimmedStart !== undefined && data.trimmedEnd !== undefined
                ? Math.max(0, data.trimmedEnd - data.trimmedStart)
                : durationCheck.duration || 0
            const baseMinutes = secondsToMinutes(processedSeconds)
            const translatedMinutes = calculateTranslationMinutes(processedSeconds, additionalLangs.length)
            const user = getOrCreateUserForJob(userId, plan)
            user.usageThisMonth.totalMinutes += baseMinutes + translatedMinutes
            user.usageThisMonth.translatedMinutes += translatedMinutes
            user.usageThisMonth.languageCount += additionalLangs.length
            user.usageThisMonth.videoCount += 1
            user.updatedAt = new Date()
            saveUser(user)
          } else {
            // Single language
            await job.progress(30)
            const subtitles = await transcribeVideo(videoPath, format, options?.language)

            // Save subtitles
            await job.progress(80)
            const ext = format === 'srt' ? '.srt' : '.vtt'
            const outputFilename = generateOutputFilename(data.originalName || 'video', '', ext)
            const outputPath = path.join(tempDir, outputFilename)
            fs.writeFileSync(outputPath, subtitles)

            result = {
              downloadUrl: `/api/download/${outputFilename}`,
              fileName: outputFilename,
            }

          if (data.videoHash) {
            await saveDuplicateResult(userId, data.videoHash, outputPath)
          }

            // Metering (minutes)
            const processedSeconds =
              data.trimmedStart !== undefined && data.trimmedEnd !== undefined
                ? Math.max(0, data.trimmedEnd - data.trimmedStart)
                : durationCheck.duration || 0
            const minutes = secondsToMinutes(processedSeconds)
            const user = getOrCreateUserForJob(userId, plan)
            user.usageThisMonth.totalMinutes += minutes
            user.usageThisMonth.videoCount += 1
            user.updatedAt = new Date()
            saveUser(user)
          }
          break
        }

        case 'batch-video-to-subtitles': {
          // Batch processing: process single video, save SRT, update batch status
          let videoPath = data.filePath!
          const batchId = data.batchId!
          const batch = getBatchById(batchId)
          
          if (!batch) {
            throw new Error('Batch not found')
          }

          try {
            // Trim if needed
            let trimmedDuration = 0
            if (data.trimmedStart !== undefined && data.trimmedEnd !== undefined) {
              await job.progress(5)
              const trimResult = await trimVideoSegment({
                inputPath: videoPath,
                startTime: data.trimmedStart,
                endTime: data.trimmedEnd,
              })
              videoPath = trimResult.outputPath
              trimmedDuration = trimResult.trimmedDuration
            }

            // Transcribe
            await job.progress(20)
            const format = options?.format || 'srt'
            const subtitles = await transcribeVideo(videoPath, format, options?.language)

            // Save SRT file (preserve original name for ZIP)
            await job.progress(80)
            const originalName = data.originalName || 'video'
            const nameWithoutExt = path.basename(originalName, path.extname(originalName))
            const srtFilename = `${nameWithoutExt}.srt`
            const srtPath = path.join(tempDir, `batch-${batchId}-${srtFilename}`)
            fs.writeFileSync(srtPath, subtitles)

            // Update batch progress
            batch.processedVideos += 1
            saveBatch(batch)

            // Check if batch is complete
            if (batch.processedVideos + batch.failedVideos >= batch.totalVideos) {
              await generateBatchZip(batchId, batch)
            }

            result = {
              downloadUrl: `/api/download/${path.basename(srtPath)}`,
              fileName: path.basename(srtPath),
              batchId,
              srtPath,
            }
          } catch (error: any) {
            // Track failure
            batch.failedVideos += 1
            batch.errors.push({
              videoName: data.originalName || 'unknown',
              reason: error.message || 'Processing failed',
            })
            saveBatch(batch)

            // Check if batch is complete (even with failures)
            if (batch.processedVideos + batch.failedVideos >= batch.totalVideos) {
              await generateBatchZip(batchId, batch)
            }

            throw error
          }
          break
        }

        case 'translate-subtitles': {
          await job.progress(20)
          const translated = await translateSubtitleFile(
            data.filePath!,
            options?.targetLanguage || 'arabic'
          )

          // Save translated file
          await job.progress(70)
          const langCode = options?.targetLanguage === 'hindi' ? 'hi' : 'ar'
          const ext = translated.format === 'srt' ? '.srt' : '.vtt'
          const outputFilename = generateOutputFilename(data.originalName || 'subtitles', `_${langCode}`, ext)
          const outputPath = path.join(tempDir, outputFilename)
          fs.writeFileSync(outputPath, translated.content)

          result = {
            downloadUrl: `/api/download/${outputFilename}`,
            fileName: outputFilename,
          }
          break
        }

        case 'fix-subtitles': {
          await job.progress(20)
          const fixed = fixSubtitleFile(data.filePath!)

          // Save fixed file
          await job.progress(70)
          const ext = fixed.format === 'srt' ? '.srt' : '.vtt'
          const outputFilename = generateOutputFilename(data.originalName || 'subtitles', '_fixed', ext)
          const outputPath = path.join(tempDir, outputFilename)
          fs.writeFileSync(outputPath, fixed.content)

          result = {
            downloadUrl: `/api/download/${outputFilename}`,
            fileName: outputFilename,
            issues: fixed.issues,
          }
          break
        }

        case 'burn-subtitles': {
          await job.progress(10)
          let videoPath = data.filePath!
          const subtitlePath = data.filePath2!
          const userId = data.userId || 'demo-user'
          const plan = data.plan || 'free'

          // Trim video if start/end times provided
          if (data.trimmedStart !== undefined && data.trimmedEnd !== undefined) {
            await job.progress(12)
            const trimResult = await trimVideoSegment({
              inputPath: videoPath,
              startTime: data.trimmedStart,
              endTime: data.trimmedEnd,
            })
            videoPath = trimResult.outputPath
          }

          // Burn subtitles
          await job.progress(20)
          const outputFilename = generateOutputFilename(data.originalName || 'video', '_subtitled', '.mp4')
          const outputPath = path.join(tempDir, outputFilename)

          await burnSubtitles(
            videoPath,
            subtitlePath,
            outputPath,
            (progress) => {
              // Update progress (20% to 90%)
              const mappedProgress = 20 + (progress.percent * 0.7)
              job.progress(mappedProgress)
            }
          )

          result = {
            downloadUrl: `/api/download/${outputFilename}`,
            fileName: outputFilename,
          }

          // Metering (minutes) - based on trimmed duration if provided, else probe duration via ffprobe validate
          const durationCheck = await validateVideoDuration(videoPath, getPlanLimits(plan).maxVideoDuration)
          const processedSeconds =
            data.trimmedStart !== undefined && data.trimmedEnd !== undefined
              ? Math.max(0, data.trimmedEnd - data.trimmedStart)
              : durationCheck.duration || 0
          const minutes = secondsToMinutes(processedSeconds)
          const user = getOrCreateUserForJob(userId, plan)
          user.usageThisMonth.totalMinutes += minutes
          user.usageThisMonth.videoCount += 1
          user.updatedAt = new Date()
          saveUser(user)
          break
        }

        case 'compress-video': {
          await job.progress(10)
          let videoPath = data.filePath!
          const userId = data.userId || 'demo-user'
          const plan = data.plan || 'free'

          // Trim video if start/end times provided
          if (data.trimmedStart !== undefined && data.trimmedEnd !== undefined) {
            await job.progress(12)
            const trimResult = await trimVideoSegment({
              inputPath: videoPath,
              startTime: data.trimmedStart,
              endTime: data.trimmedEnd,
            })
            videoPath = trimResult.outputPath
          }

          // Get CRF value
          const crfMap: Record<string, number> = {
            light: 23,
            medium: 28,
            heavy: 32,
          }
          const crf = crfMap[options?.compressionLevel || 'medium']

          // Compress
          await job.progress(20)
          const outputFilename = generateOutputFilename(data.originalName || 'video', '_compressed', '.mp4')
          const outputPath = path.join(tempDir, outputFilename)

          await compressVideo(
            videoPath,
            outputPath,
            crf,
            (progress) => {
              // Update progress (20% to 90%)
              const mappedProgress = 20 + (progress.percent * 0.7)
              job.progress(mappedProgress)
            }
          )

          result = {
            downloadUrl: `/api/download/${outputFilename}`,
            fileName: outputFilename,
          }

          // Metering (minutes)
          const durationCheck = await validateVideoDuration(videoPath, getPlanLimits(plan).maxVideoDuration)
          const processedSeconds =
            data.trimmedStart !== undefined && data.trimmedEnd !== undefined
              ? Math.max(0, data.trimmedEnd - data.trimmedStart)
              : durationCheck.duration || 0
          const minutes = secondsToMinutes(processedSeconds)
          const user = getOrCreateUserForJob(userId, plan)
          user.usageThisMonth.totalMinutes += minutes
          user.usageThisMonth.videoCount += 1
          user.updatedAt = new Date()
          saveUser(user)
          break
        }

        default:
          throw new Error(`Unknown tool type: ${toolType}`)
      }

      await job.progress(100)
      return result
    } catch (error: any) {
      // Log and rethrow so Bull marks job as failed; outer handler also logs for consistency
      console.error('[JOB]', jobId, 'FAILED', error?.message ?? error)
      if (error?.stack) console.error(error.stack)
      throw error
    }
  }

  // Phase 2.5: tier-aware runtime — enforce only when queue >= 20; re-check periodically so we relax when queue drops.
  let deadline: number | null = null
  let rejectDynamic: (err: Error) => void
  const dynamicRuntimePromise = new Promise<never>((_, rej) => {
    rejectDynamic = rej
  })
  const interval = setInterval(async () => {
    const q = await getTotalQueueCount()
    if (q < RUNTIME_QUEUE_THRESHOLD) {
      deadline = null
      return
    }
    const now = Date.now()
    if (deadline === null) deadline = now + maxRuntimeMs
    if (now > deadline) {
      clearInterval(interval)
      rejectDynamic(new Error('Job exceeded maximum runtime. Minutes were not charged. Please retry or upgrade for longer jobs.'))
    }
  }, RUNTIME_CHECK_INTERVAL_MS)

  try {
    const result = await Promise.race([run(), dynamicRuntimePromise])
    clearInterval(interval)
    // Success: return value is persisted by Bull as job.returnvalue; job state becomes "completed"
    console.log('[JOB]', jobId, 'COMPLETED')
    return result
  } catch (err: any) {
    clearInterval(interval)
    // Failure: rethrow so Bull marks job as "failed" and stores error; no job can exit without terminal state
    console.error('[JOB]', jobId, 'FAILED', err?.message ?? err)
    if (err?.stack) console.error(err.stack)
    throw err
  }
}

function attachQueueEvents(queue: import('bull').Queue<JobData>) {
  queue.on('completed', async (job) => {
    console.log(`Job ${job.id} completed`)
    const data = job.data as JobData
    if (data.batchId) {
      const batch = getBatchById(data.batchId)
      if (batch) {
        const allJobs = await queue.getJobs(['completed', 'failed'])
        const batchJobs = allJobs.filter((j) => (j.data as JobData).batchId === data.batchId)
        if (batchJobs.length >= batch.totalVideos && !batch.zipPath) {
          await generateBatchZip(data.batchId, batch)
        }
      }
    }
  })
  queue.on('failed', async (job, err) => {
    if (err?.message === HUNG_JOB_MESSAGE) {
      console.warn(`Job ${job?.id} hung (no FFmpeg output 90s); ${(job?.opts?.attempts ?? 2) - (job?.attemptsMade ?? 1) > 0 ? 'will retry' : 'final failure, minutes not charged'}`)
    } else {
      console.error(`Job ${job?.id} failed:`, err)
    }
    const data = job?.data as JobData
    if (data?.batchId) {
      const batch = getBatchById(data.batchId)
      if (batch) {
        batch.failedVideos += 1
        batch.errors.push({
          videoName: data.originalName || 'unknown',
          reason: err?.message || 'Processing failed',
        })
        saveBatch(batch)
        if (batch.processedVideos + batch.failedVideos >= batch.totalVideos && !batch.zipPath) {
          await generateBatchZip(data.batchId, batch)
        }
      }
    }
  })
}

export function startWorker() {
  fileQueue.process(NORMAL_CONCURRENCY, processJob)
  priorityQueue.process(PRIORITY_CONCURRENCY, processJob)
  attachQueueEvents(fileQueue)
  attachQueueEvents(priorityQueue)
}

// When run as main (worker container): node dist/workers/videoProcessor.js
if (require.main === module) {
  startWorker()
  console.log('Worker process started (normal: 2, priority: 1)')
}
