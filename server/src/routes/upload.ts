import express, { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { fileQueue, addJobToQueue, getTotalQueueCount as getQueueCountFromWorker } from '../workers/videoProcessor'
import { validateFileType, validateFileSize, validateSubtitleFile } from '../utils/fileValidation'
import { enforceLanguageLimits, getJobPriority, getPlanLimits } from '../utils/limits'
import { getUser, saveUser, PlanType, User } from '../models/User'
import { hashFile, checkDuplicateProcessing } from '../services/duplicate'
import { getAuthFromRequest } from '../utils/auth'
import { isQueueAtHardLimit, isQueueAtSoftLimit } from '../utils/queueConfig'
import { checkAndRecordUpload } from '../utils/uploadRateLimit'

const router = express.Router()

// Configure multer for file uploads. On Railway/Fly/Render only /tmp is guaranteed; relative paths can stall Multer.
const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB (plan enforcement happens after upload)
  },
})

async function getTotalQueueCount(): Promise<number> {
  return getQueueCountFromWorker()
}

// Single file upload
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { toolType, url, ...options } = req.body

    const auth = getAuthFromRequest(req)
    const headerUserId = (req.headers['x-user-id'] as string) || 'demo-user'
    const headerPlan = (req.headers['x-plan'] as string) as PlanType | undefined

    const userId = auth?.userId || headerUserId
    const plan: PlanType =
      auth?.plan && (auth.plan === 'basic' || auth.plan === 'pro' || auth.plan === 'agency')
        ? auth.plan
        : headerPlan === 'basic' || headerPlan === 'pro' || headerPlan === 'agency'
        ? headerPlan
        : 'free'

    // Phase 2.5: rate limit 3 uploads per minute per user
    if (!checkAndRecordUpload(userId)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
    }

    const queueCount = await getTotalQueueCount()
    if (isQueueAtHardLimit(queueCount)) {
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }
    if (url && (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles') && isQueueAtSoftLimit(queueCount)) {
      return res.status(503).json({ message: 'High demand right now. URL imports are temporarily disabled. Please retry shortly.' })
    }

    // Ensure user exists (in-memory store for Phase 1.5)
    let user = getUser(userId)
    if (!user) {
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
        overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
        createdAt: now,
        updatedAt: now,
      }
      saveUser(user)
    } else {
      // Monthly reset
      const now = new Date()
      if (now > user.usageThisMonth.resetDate) {
        const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        user.usageThisMonth = {
          totalMinutes: 0,
          videoCount: 0,
          batchCount: 0,
          languageCount: 0,
          translatedMinutes: 0,
          resetDate,
        }
        user.overagesThisMonth = { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }
        user.updatedAt = now
        saveUser(user)
      }
    }

    // Enforce max concurrent jobs (simple queue-based check)
    const activeJobs = await fileQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeForUser = activeJobs.filter((j) => (j.data as any)?.userId === userId)
    if (activeForUser.length >= user.limits.maxConcurrentJobs) {
      return res.status(429).json({ message: 'MAX_CONCURRENT_JOBS_REACHED' })
    }

    if (!toolType) {
      return res.status(400).json({ message: 'toolType is required' })
    }

    // Handle URL-based input (for video-to-transcript and video-to-subtitles)
    if (url && (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles')) {
      // Validate URL
      try {
        new URL(url)
      } catch {
        return res.status(400).json({ message: 'Invalid URL' })
      }

      const job = await addJobToQueue(plan, {
        toolType,
        url,
        userId,
        plan,
        options: options.format || options.language ? options : undefined,
      })

      return res.status(202).json({
        jobId: job.id,
        status: 'queued',
      })
    }

    // File-based input
    if (!req.file) {
      console.warn('[upload] no file in request', { toolType, bodyKeys: Object.keys(req.body) })
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Validate file size (plan-based)
    if (req.file.size > user.limits.maxFileSize) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ message: `File exceeds plan limit. Upgrade for larger files.` })
    }

    // Validate file type based on tool
    let typeError: string | null = null
    if (toolType === 'translate-subtitles' || toolType === 'fix-subtitles') {
      const subResult = await validateSubtitleFile(req.file.path)
      console.log('[upload] subtitle validation', {
        toolType,
        originalname: req.file.originalname,
        detectedFormat: subResult.detectedFormat,
        validationError: subResult.error ?? undefined,
      })
      if (subResult.error) {
        typeError = subResult.error
      }
    } else if (toolType !== 'burn-subtitles') {
      // For video tools, validate video type
      typeError = await validateFileType(req.file.path)
    }

    if (typeError) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ message: typeError })
    }

    // Cleanup (unlinkSync) runs only on error paths above; we never delete the file before enqueue.
    // The worker needs the file on disk; fileCleanup cron removes old files later.

    // Parse additional languages if provided
    let additionalLanguages: string[] = []
    if (options.additionalLanguages) {
      try {
        additionalLanguages = typeof options.additionalLanguages === 'string'
          ? JSON.parse(options.additionalLanguages)
          : options.additionalLanguages
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Create job in queue
    const jobOptions: any = {
      format: options.format,
      language: options.language,
      targetLanguage: options.targetLanguage,
      compressionLevel: options.compressionLevel,
    }
    if (additionalLanguages.length > 0) {
      jobOptions.additionalLanguages = additionalLanguages
    }

    // Enforce multi-language limits (plan-based)
    if (toolType === 'video-to-subtitles' && additionalLanguages.length > 0) {
      const langCheck = enforceLanguageLimits(user, additionalLanguages)
      if (!langCheck.allowed) {
        fs.unlinkSync(req.file.path)
        return res.status(403).json({ message: langCheck.reason || 'MULTI_LANGUAGE_NOT_AVAILABLE' })
      }
    }

    // Duplicate detection for expensive video tools (last 30 days)
    let videoHash: string | undefined
    if (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles') {
      try {
        videoHash = await hashFile(req.file.path)
        const cached = await checkDuplicateProcessing(userId, videoHash)
        if (cached && fs.existsSync(cached.outputPath)) {
          const cachedFileName = path.basename(cached.outputPath)
          const cachedJob = await addJobToQueue(plan, {
            toolType: 'cached-result',
            userId,
            plan,
            cachedResult: {
              downloadUrl: `/api/download/${cachedFileName}`,
              fileName: cachedFileName,
            },
          })

          return res.status(202).json({
            jobId: cachedJob.id,
            status: 'queued',
          })
        }
      } catch {
        // If hashing fails, fall back to normal processing
      }
    }

    const job = await addJobToQueue(plan, {
      toolType,
      filePath: req.file.path,
      userId,
      plan,
      videoHash,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      trimmedStart: options.trimmedStart ? parseFloat(options.trimmedStart) : undefined,
      trimmedEnd: options.trimmedEnd ? parseFloat(options.trimmedEnd) : undefined,
      options: Object.keys(jobOptions).length > 0 ? jobOptions : undefined,
    })

    res.status(202).json({
      jobId: job.id,
      status: 'queued',
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    res.status(500).json({ message: error.message || 'Upload failed' })
  }
})

// Dual file upload (for burn-subtitles)
router.post('/dual', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'subtitles', maxCount: 1 },
]), async (req: Request, res: Response) => {
  try {
    const { toolType, trimmedStart, trimmedEnd } = req.body
    const userId = (req.headers['x-user-id'] as string) || 'demo-user'
    const planHeader = (req.headers['x-plan'] as string) as PlanType | undefined
    const plan: PlanType =
      planHeader === 'basic' || planHeader === 'pro' || planHeader === 'agency'
        ? planHeader
        : 'free'

    if (!checkAndRecordUpload(userId)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
    }
    const queueCount = await getTotalQueueCount()
    if (isQueueAtHardLimit(queueCount)) {
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }

    // Enforce max concurrent jobs (simple queue-based check)
    const activeJobs = await fileQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeForUser = activeJobs.filter((j) => (j.data as any)?.userId === userId)
    const limitsForPlan = getPlanLimits(plan)
    if (activeForUser.length >= limitsForPlan.maxConcurrentJobs) {
      return res.status(429).json({ message: 'MAX_CONCURRENT_JOBS_REACHED' })
    }
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }

    if (!toolType || toolType !== 'burn-subtitles') {
      return res.status(400).json({ message: 'toolType must be burn-subtitles' })
    }

    if (!files.video || !files.subtitles) {
      // Cleanup any uploaded files
      if (files.video) fs.unlinkSync(files.video[0].path)
      if (files.subtitles) fs.unlinkSync(files.subtitles[0].path)
      return res.status(400).json({ message: 'Both video and subtitle files are required' })
    }

    const videoFile = files.video[0]
    const subtitleFile = files.subtitles[0]

    // Validate video file (plan-based size)
    const limits = getPlanLimits(plan)
    if (videoFile.size > limits.maxFileSize) {
      fs.unlinkSync(videoFile.path)
      fs.unlinkSync(subtitleFile.path)
      return res.status(400).json({ message: `File exceeds plan limit. Upgrade for larger files.` })
    }

    const videoTypeError = await validateFileType(videoFile.path)
    if (videoTypeError) {
      fs.unlinkSync(videoFile.path)
      fs.unlinkSync(subtitleFile.path)
      return res.status(400).json({ message: videoTypeError })
    }

    // Validate subtitle file (content-based; no extension check)
    const subResult = await validateSubtitleFile(subtitleFile.path)
    console.log('[upload] subtitle validation (dual)', {
      toolType: 'burn-subtitles',
      originalname: subtitleFile.originalname,
      detectedFormat: subResult.detectedFormat,
      validationError: subResult.error ?? undefined,
    })
    if (subResult.error) {
      fs.unlinkSync(videoFile.path)
      fs.unlinkSync(subtitleFile.path)
      return res.status(400).json({ message: subResult.error })
    }

    // Create job in queue
    const job = await addJobToQueue(plan, {
      toolType: 'burn-subtitles',
      filePath: videoFile.path,
      filePath2: subtitleFile.path,
      userId,
      plan,
      originalName: videoFile.originalname,
      originalName2: subtitleFile.originalname,
      fileSize: videoFile.size,
      trimmedStart: trimmedStart ? parseFloat(trimmedStart) : undefined,
      trimmedEnd: trimmedEnd ? parseFloat(trimmedEnd) : undefined,
    })

    res.status(202).json({
      jobId: job.id,
      status: 'queued',
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    if (files.video) {
      try {
        fs.unlinkSync(files.video[0].path)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (files.subtitles) {
      try {
        fs.unlinkSync(files.subtitles[0].path)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    res.status(500).json({ message: error.message || 'Upload failed' })
  }
})

export default router
