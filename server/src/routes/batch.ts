import express, { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { probeVideoDurationResult } from '../services/ffmpeg'
import { validateFileSize, validateFileType } from '../utils/fileValidation'
import { BatchJob, saveBatch, getBatchById } from '../models/BatchJob'
import { getUser, saveUser, User, atomicResetDailyImportIfNeeded, atomicResetDailyMinutesIfNeeded } from '../models/User'
import {
  getPlanLimits,
  enforceBatchLimits,
  enforceUsageLimits,
  getDailySoftCapConcurrency,
  getJobPriority,
  getMaxMonthlyImports,
  FREE_MONTHLY_IMPORT_QUOTA_MESSAGE,
  sumBatchVideoDurationsSeconds,
} from '../utils/limits'
import { resetDailyImportIfNeeded, resetDailyMinutesIfNeeded, resetUserUsageIfNeeded } from '../utils/usageReset'
import { addJobToQueue, getTotalQueueCount } from '../workers/videoProcessor'
import { insertJobRecord } from '../lib/jobAnalytics'
import { RequestWithId } from '../middleware/requestId'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { sanitizeFilename } from '../utils/sanitizeFilename'
import { isQueueAtHardLimit, isQueueAtSoftLimit } from '../utils/queueConfig'
import { checkAndRecordUpload } from '../utils/uploadRateLimit'
import { getLogger } from '../lib/logger'
import { enforceSubscriptionState, resolveRequestPlan } from '../utils/subscriptionGuard'

const log = getLogger('api')
const router = express.Router()

// Shared temp directory (same as upload.ts). On Railway/Fly/Render only /tmp is guaranteed.
const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir)
  },
  filename: (_req, file, cb) => {
    const safe = sanitizeFilename(file.originalname)
    const uniqueName = `${uuidv4()}-${safe}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 * 1024, // 20GB — max plan (Agency); plan enforcement after upload
  },
})

async function getOrCreateDemoUser(req: Request): Promise<User> {
  const auth = getAuthFromRequest(req)
  const userId = getEffectiveUserId(req)
  if (!userId) {
    const err = new Error('Authentication required for batch uploads.') as Error & { statusCode?: number }
    err.statusCode = 401
    throw err
  }
  let user = await getUser(userId)
  const now = new Date()
  if (user) await enforceSubscriptionState(user, now)
  const derivedPlan = resolveRequestPlan(user, auth?.plan)

  if (!user) {
    const plan = derivedPlan
    const limits = getPlanLimits(plan)
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    user = {
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
        importCount: 0,
        resetDate,
        importCountToday: 0,
        importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        dailyMinutesToday: 0,
        dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
      limits,
      overagesThisMonth: {
        minutes: 0,
        languages: 0,
        batches: 0,
        totalCharge: 0,
      },
      createdAt: now,
      updatedAt: now,
    }

    await saveUser(user)
  } else {
    if (resetUserUsageIfNeeded(user, now)) {
      await saveUser(user)
    }
    const dailyImportReset = resetDailyImportIfNeeded(user, now)
    const dailyMinutesReset = resetDailyMinutesIfNeeded(user, now)
    if (dailyImportReset) await atomicResetDailyImportIfNeeded(user.id, now, user.usageThisMonth.importCountTodayResetDate!)
    if (dailyMinutesReset) await atomicResetDailyMinutesIfNeeded(user.id, now, user.usageThisMonth.dailyMinutesTodayResetDate!)
  }

  return user
}

// POST /api/batch/upload
router.post(
  '/upload',
  upload.array('files'),
  async (req: Request, res: Response) => {
    let user: User
    try {
      user = await getOrCreateDemoUser(req)
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number }
      if (e.statusCode === 401) {
        return res.status(401).json({ message: e.message })
      }
      throw err
    }

    try {
      const files = req.files as Express.Multer.File[]
      const { primaryLanguage, additionalLanguages } = req.body

      let batchOptsParsed: {
        additionalLanguages?: string[]
        speakerDiarization?: boolean
        numSpeakers?: number
        diarizationLanguage?: string
      } = {}
      try {
        const raw = req.body.batchOptions
        if (typeof raw === 'string' && raw.trim()) batchOptsParsed = JSON.parse(raw)
      } catch {
        /* ignore invalid JSON */
      }

      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' })
      }

      if (user.suspended) {
        return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' })
      }

      if (!await checkAndRecordUpload(user.id)) {
        res.setHeader('Retry-After', '60')
        return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
      }
      const queueCount = await getTotalQueueCount()
      if (isQueueAtHardLimit(queueCount)) {
        res.setHeader('Retry-After', '30')
        return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
      }
      if (isQueueAtSoftLimit(queueCount)) {
        res.setHeader('Retry-After', '30')
        return res.status(503).json({ message: 'High demand right now. Batch uploads are temporarily disabled. Please retry shortly.' })
      }

      // Basic plan enforcement: batch not available
      if (!user.limits.batchEnabled) {
        // Free: NO BATCH (disabled), Basic: NO BATCH with upgrade prompt
        return res.status(403).json({ message: 'Batch processing not available for this plan' })
      }

      // Validate each file and collect durations (unknown duration is allowed; batch cap uses conservative estimates)
      const videoMeta: { path: string; originalName: string; duration: number; durationKnown: boolean }[] = []

      for (const file of files) {
        if (file.size > user.limits.maxFileSize) {
          fs.unlinkSync(file.path)
          return res.status(400).json({ message: `File exceeds plan limit. Upgrade for larger files.` })
        }

        const typeError = await validateFileType(file.path, file.originalname)
        if (typeError) {
          fs.unlinkSync(file.path)
          return res.status(400).json({ message: typeError })
        }

        const probe = await probeVideoDurationResult(file.path)
        videoMeta.push({
          path: file.path,
          originalName: file.originalname,
          duration: probe.known ? probe.seconds : 0,
          durationKnown: probe.known,
        })
        if (!probe.known) {
          log.info({
            msg: 'batch_video_duration_unknown',
            originalName: file.originalname,
            duration_source: probe.source,
          })
        }
      }

      if (videoMeta.length === 0) {
        return res.status(400).json({
          message: 'No valid videos to process.',
        })
      }

      const batchesToday = user.usageThisMonth.batchCount ?? 0
      const batchCheck = await enforceBatchLimits(
        user,
        videoMeta.map((v) => ({ duration: v.duration, durationKnown: v.durationKnown })),
        batchesToday
      )

      if (!batchCheck.allowed) {
        const statusCode =
          batchCheck.reason === 'BATCH_NOT_AVAILABLE' ? 403 : 400
        for (const v of videoMeta) fs.unlinkSync(v.path)
        return res.status(statusCode).json({ message: batchCheck.reason })
      }

      // Free plan: 3 imports per calendar month (batch not available for free anyway)
      const batchMonthlyCap = getMaxMonthlyImports(user.plan)
      if (batchMonthlyCap !== null) {
        const importCount = user.usageThisMonth.importCount ?? 0
        if (importCount >= batchMonthlyCap) {
          for (const v of videoMeta) fs.unlinkSync(v.path)
          return res.status(403).json({ message: FREE_MONTHLY_IMPORT_QUOTA_MESSAGE })
        }
        if (importCount + videoMeta.length > batchMonthlyCap) {
          for (const v of videoMeta) fs.unlinkSync(v.path)
          return res.status(403).json({ message: FREE_MONTHLY_IMPORT_QUOTA_MESSAGE })
        }
      }

      // Server-side minute limit for paid plans only
      const totalDurationSeconds = sumBatchVideoDurationsSeconds(
        user,
        videoMeta.map((v) => ({ duration: v.duration, durationKnown: v.durationKnown }))
      )
      const requestedMinutes = Math.ceil(totalDurationSeconds / 60)
      if (user.plan !== 'free') {
        const limitCheck = await enforceUsageLimits(user, requestedMinutes)
        if (!limitCheck.allowed) {
          for (const v of videoMeta) fs.unlinkSync(v.path)
          return res.status(403).json({ message: 'Monthly minute limit reached. Upgrade or wait for reset.' })
        }
      }

      const estimatedDurationMinutes = Math.ceil(totalDurationSeconds / 60)

      const batchId = uuidv4()
      const now = new Date()

      const batch: BatchJob = {
        id: batchId,
        userId: user.id,
        totalVideos: videoMeta.length,
        totalDuration: totalDurationSeconds,
        processedVideos: 0,
        failedVideos: 0,
        status: 'queued',
        zipPath: undefined,
        zipSize: undefined,
        errors: [],
        createdAt: now,
        completedAt: undefined,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      }

      await saveBatch(batch)

      // Track batch usage count; minute charging happens per video jobs
      user.usageThisMonth.batchCount = (user.usageThisMonth.batchCount ?? 0) + 1
      user.updatedAt = new Date()
      await saveUser(user)

      // Queue individual video jobs for batch processing
      let additionalLangs = Array.isArray(additionalLanguages)
        ? additionalLanguages
        : additionalLanguages
          ? JSON.parse(additionalLanguages)
          : []
      if (Array.isArray(batchOptsParsed.additionalLanguages) && batchOptsParsed.additionalLanguages.length > 0) {
        additionalLangs = batchOptsParsed.additionalLanguages
      }

      for (let i = 0; i < videoMeta.length; i++) {
        const video = videoMeta[i]
        const fileSize = fs.statSync(video.path).size
        const job = await addJobToQueue(user.plan, {
          toolType: 'batch-video-to-subtitles',
          filePath: video.path,
          originalName: video.originalName,
          fileSize,
          userId: user.id,
          plan: user.plan,
          batchId,
          batchPosition: i + 1,
          batchTotal: videoMeta.length,
          options: {
            format: 'srt',
            language: primaryLanguage || 'en',
            additionalLanguages: additionalLangs,
            speakerDiarization: batchOptsParsed.speakerDiarization === true,
            numSpeakers:
              batchOptsParsed.numSpeakers != null && !Number.isNaN(Number(batchOptsParsed.numSpeakers))
                ? Number(batchOptsParsed.numSpeakers)
                : undefined,
            diarizationLanguage:
              typeof batchOptsParsed.diarizationLanguage === 'string' && batchOptsParsed.diarizationLanguage.trim()
                ? batchOptsParsed.diarizationLanguage.trim()
                : undefined,
          },
          requestId: (req as RequestWithId).requestId,
        })
        try {
          await insertJobRecord({
            id: String(job.id),
            userId: user.id,
            toolType: 'batch-video-to-subtitles',
            planAtRun: user.plan,
            fileSizeBytes: fileSize,
          })
        } catch {
          // non-blocking
        }
      }

      // Update batch status to processing
      batch.status = 'processing'
      await saveBatch(batch)

      res.json({
        batchId,
        totalVideos: videoMeta.length,
        estimatedDuration: estimatedDurationMinutes,
        estimatedMinutes: estimatedDurationMinutes,
        primaryLanguage: primaryLanguage || 'en',
        additionalLanguages: additionalLangs,
        status: 'queued',
      })
    } catch (error: any) {
      log.error({ msg: 'Batch upload error', error: (error as Error)?.message ?? String(error) })
      res.status(500).json({ message: error.message || 'Batch upload failed' })
    }
  }
)

// GET /api/batch/:batchId/status
router.get('/:batchId/status', async (req: Request, res: Response) => {
  const { batchId } = req.params
  const batch = await getBatchById(batchId)

  if (!batch) {
    return res.status(404).json({ message: 'Batch not found' })
  }

  const completed = batch.processedVideos
  const failed = batch.failedVideos
  const total = batch.totalVideos
  const done = completed + failed
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100)

  res.json({
    batchId: batch.id,
    status: batch.status,
    progress: {
      total,
      completed,
      failed,
      percentage,
    },
    estimatedTimeRemaining: 0,
    errors: batch.errors,
  })
})

// GET /api/batch/:batchId/download
router.get('/:batchId/download', async (req: Request, res: Response) => {
  const { batchId } = req.params
  const requestingUserId = getEffectiveUserId(req)
  const batch = await getBatchById(batchId)

  if (!batch) {
    return res.status(404).json({ message: 'Batch not found' })
  }

  // Ownership check: /api/batch/upload requires authentication (see
  // getOrCreateDemoUser above), so every batch always has a real owning
  // userId — an unauthenticated request must never be treated as a match.
  // (Previously this only rejected when BOTH sides were non-null and
  // mismatched, so an unauthenticated request — requestingUserId === null —
  // fell through and could download any user's batch.)
  if (!requestingUserId) {
    return res.status(401).json({ message: 'Authentication required.' })
  }
  if (requestingUserId !== batch.userId) {
    return res.status(403).json({ message: 'Not authorized to download this batch' })
  }

  if (!batch.zipPath || !fs.existsSync(batch.zipPath)) {
    return res.status(404).json({ message: 'ZIP file not ready yet' })
  }

  const filename = `batch_${batchId}.zip`
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Type', 'application/zip')

  const fileStream = fs.createReadStream(batch.zipPath)
  fileStream.on('error', (err) => {
    log.error({ msg: 'batch/download stream error', error: (err as Error)?.message ?? String(err) })
    if (!res.headersSent) res.status(500).json({ message: 'Download failed' })
  })
  fileStream.pipe(res)
})

export default router

