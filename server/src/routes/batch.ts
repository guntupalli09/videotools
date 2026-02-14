import express, { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { getVideoDuration } from '../services/ffmpeg'
import { validateFileSize, validateFileType } from '../utils/fileValidation'
import { BatchJob, saveBatch, getBatchById } from '../models/BatchJob'
import { getUser, saveUser, PlanType, User } from '../models/User'
import { getPlanLimits, enforceBatchLimits, enforceUsageLimits, getJobPriority } from '../utils/limits'
import { addJobToQueue, getTotalQueueCount } from '../workers/videoProcessor'
import { RequestWithId } from '../middleware/requestId'
import { getAuthFromRequest } from '../utils/auth'
import { isQueueAtHardLimit, isQueueAtSoftLimit } from '../utils/queueConfig'
import { checkAndRecordUpload } from '../utils/uploadRateLimit'

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
    const uniqueName = `${uuidv4()}-${file.originalname}`
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
  const headerUserId = (req.headers['x-user-id'] as string) || 'demo-user'
  const userId = auth?.userId || headerUserId
  let user = await getUser(userId)
  // Paid plans: from auth, or from existing Stripe-backed user; unauthenticated without Stripe = free (abuse-proof)
  const derivedPlan: PlanType =
    auth?.plan && (auth.plan === 'basic' || auth.plan === 'pro' || auth.plan === 'agency')
      ? auth.plan
      : user?.stripeCustomerId
        ? user.plan
        : 'free'

  if (!user) {
    const plan = derivedPlan
    const limits = getPlanLimits(plan)
    const now = new Date()
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
        resetDate,
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
    // Keep user plan/limits in sync (free, basic, pro, agency) so minute tracking is correct
    if (user.plan !== derivedPlan) {
      user.plan = derivedPlan
      user.limits = getPlanLimits(derivedPlan)
      user.updatedAt = new Date()
      await saveUser(user)
    }
  }

  return user
}

// POST /api/batch/upload
router.post(
  '/upload',
  upload.array('files'),
  async (req: Request, res: Response) => {
    const user = await getOrCreateDemoUser(req)

    try {
      const files = req.files as Express.Multer.File[]
      const { primaryLanguage, additionalLanguages } = req.body

      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' })
      }

      if (!checkAndRecordUpload(user.id)) {
        res.setHeader('Retry-After', '60')
        return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
      }
      const queueCount = await getTotalQueueCount()
      if (isQueueAtHardLimit(queueCount)) {
        return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
      }
      if (isQueueAtSoftLimit(queueCount)) {
        return res.status(503).json({ message: 'High demand right now. Batch uploads are temporarily disabled. Please retry shortly.' })
      }

      // Basic plan enforcement: batch not available
      if (!user.limits.batchEnabled) {
        // Free: NO BATCH (disabled), Basic: NO BATCH with upgrade prompt
        return res.status(403).json({ message: 'Batch processing not available for this plan' })
      }

      // Validate each file and collect durations
      const videoMeta: { path: string; originalName: string; duration: number }[] = []

      for (const file of files) {
        if (file.size > user.limits.maxFileSize) {
          fs.unlinkSync(file.path)
          return res.status(400).json({ message: `File exceeds plan limit. Upgrade for larger files.` })
        }

        const typeError = await validateFileType(file.path)
        if (typeError) {
          fs.unlinkSync(file.path)
          return res.status(400).json({ message: typeError })
        }

        const duration = await getVideoDuration(file.path)
        videoMeta.push({
          path: file.path,
          originalName: file.originalname,
          duration,
        })
      }

      const batchesToday = user.usageThisMonth.batchCount
      const batchCheck = await enforceBatchLimits(
        user,
        videoMeta.map((v) => ({ duration: v.duration })),
        batchesToday
      )

      if (!batchCheck.allowed) {
        const statusCode =
          batchCheck.reason === 'BATCH_NOT_AVAILABLE' ? 403 : 400
        for (const v of videoMeta) fs.unlinkSync(v.path)
        return res.status(statusCode).json({ message: batchCheck.reason })
      }

      // Server-side minute limit: reject batch if user would exceed plan
      const totalDurationSeconds = videoMeta.reduce(
        (sum, v) => sum + v.duration,
        0
      )
      const requestedMinutes = Math.ceil(totalDurationSeconds / 60)
      const limitCheck = await enforceUsageLimits(user, requestedMinutes)
      if (!limitCheck.allowed) {
        for (const v of videoMeta) fs.unlinkSync(v.path)
        return res.status(403).json({ message: 'Monthly minute limit reached. Upgrade or wait for reset.' })
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

      saveBatch(batch)

      // Track batch usage count; minute charging happens per video jobs
      user.usageThisMonth.batchCount += 1
      user.updatedAt = new Date()
      await saveUser(user)

      // Queue individual video jobs for batch processing
      const additionalLangs = Array.isArray(additionalLanguages) 
        ? additionalLanguages 
        : (additionalLanguages ? JSON.parse(additionalLanguages) : [])
      
      for (let i = 0; i < videoMeta.length; i++) {
        const video = videoMeta[i]
        await addJobToQueue(user.plan, {
          toolType: 'batch-video-to-subtitles',
          filePath: video.path,
          originalName: video.originalName,
          fileSize: fs.statSync(video.path).size,
          userId: user.id,
          plan: user.plan,
          batchId,
          batchPosition: i + 1,
          batchTotal: videoMeta.length,
          options: {
            format: 'srt',
            language: primaryLanguage || 'en',
            additionalLanguages: additionalLangs,
          },
          requestId: (req as RequestWithId).requestId,
        })
      }

      // Update batch status to processing
      batch.status = 'processing'
      saveBatch(batch)

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
      console.error('Batch upload error:', error)
      res.status(500).json({ message: error.message || 'Batch upload failed' })
    }
  }
)

// GET /api/batch/:batchId/status
router.get('/:batchId/status', (req: Request, res: Response) => {
  const { batchId } = req.params
  const batch = getBatchById(batchId)

  if (!batch) {
    return res.status(404).json({ message: 'Batch not found' })
  }

  const completed = batch.processedVideos
  const failed = batch.failedVideos
  const total = batch.totalVideos
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)

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
router.get('/:batchId/download', (req: Request, res: Response) => {
  const { batchId } = req.params
  const batch = getBatchById(batchId)

  if (!batch) {
    return res.status(404).json({ message: 'Batch not found' })
  }

  if (!batch.zipPath || !fs.existsSync(batch.zipPath)) {
    return res.status(404).json({ message: 'ZIP file not ready yet' })
  }

  const filename = `batch_${batchId}.zip`
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Type', 'application/zip')

  const fileStream = fs.createReadStream(batch.zipPath)
  fileStream.pipe(res)
})

export default router

