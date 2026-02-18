import express, { Request, Response } from 'express'
import { RequestWithId } from '../middleware/requestId'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { fileQueue, addJobToQueue, getTotalQueueCount as getQueueCountFromWorker } from '../workers/videoProcessor'
import { validateFileType, validateFileSize, validateSubtitleFile } from '../utils/fileValidation'
import { enforceLanguageLimits, enforceUsageLimits, getJobPriority, getPlanLimits } from '../utils/limits'
import { getUser, saveUser, PlanType, User } from '../models/User'
import { hashFile, checkDuplicateProcessing } from '../services/duplicate'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { sanitizeFilename } from '../utils/sanitizeFilename'
import { assertPathWithinDir } from '../utils/assertPathWithinDir'
import { isQueueAtHardLimit, isQueueAtSoftLimit } from '../utils/queueConfig'
import { checkAndRecordUpload } from '../utils/uploadRateLimit'
import { trackJobCreated } from '../utils/analytics'
import { getVideoDuration } from '../services/ffmpeg'

const router = express.Router()

// Configure multer for file uploads. On Railway/Fly/Render only /tmp is guaranteed; relative paths can stall Multer.
const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

const MAX_CHUNKS = 300

// Chunked upload metadata (uploadId -> { userId?, plan, filename, totalChunks, totalSize, toolType, options })
const chunkUploadMeta = new Map<string, {
  userId: string | null
  plan: PlanType
  filename: string
  totalChunks: number
  totalSize: number
  toolType: string
  options: Record<string, unknown>
}>()
const chunksDir = path.join(tempDir, 'chunks')
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir)
  },
  filename: (req, file, cb) => {
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

async function getTotalQueueCount(): Promise<number> {
  return getQueueCountFromWorker()
}

// Single file upload
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { toolType, url, webhookUrl, ...options } = req.body

    if (url && (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles')) {
      return res.status(400).json({ message: 'URL downloads are temporarily disabled.' })
    }

    const auth = getAuthFromRequest(req)
    const userId = getEffectiveUserId(req)
    const rateLimitKey = userId ?? (req.ip ?? 'anonymous')
    let user = userId ? await getUser(userId) : null
    const plan: PlanType =
      auth?.plan && (auth.plan === 'basic' || auth.plan === 'pro' || auth.plan === 'agency')
        ? auth.plan
        : user?.stripeCustomerId
          ? user.plan
          : 'free'

    if (!checkAndRecordUpload(rateLimitKey)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
    }

    const queueCount = await getTotalQueueCount()
    if (isQueueAtHardLimit(queueCount)) {
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }

    const now = new Date()
    const limits = user?.limits ?? getPlanLimits(plan)
    if (!user && userId) {
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
      await saveUser(user)
    } else if (user) {
      if (user.plan !== plan) {
        user.plan = plan
        user.limits = getPlanLimits(plan)
        user.updatedAt = now
        saveUser(user)
      }
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
        await saveUser(user)
      }
    }

    const activeJobs = await fileQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeForUser = activeJobs.filter((j) => (j.data as any)?.userId === userId)
    if (activeForUser.length >= limits.maxConcurrentJobs) {
      return res.status(429).json({ message: 'MAX_CONCURRENT_JOBS_REACHED' })
    }

    if (!toolType) {
      return res.status(400).json({ message: 'toolType is required' })
    }

    // File-based input
    if (!req.file) {
      console.warn('[upload] no file in request', { toolType, bodyKeys: Object.keys(req.body) })
      return res.status(400).json({ message: 'No file uploaded' })
    }
    const file = req.file

    if (file.size > limits.maxFileSize) {
      fs.unlinkSync(file.path)
      return res.status(400).json({ message: `File exceeds plan limit. Upgrade for larger files.` })
    }

    // Audio-only upload (video-to-transcript / video-to-subtitles): client sent pre-extracted audio; skip server extraction
    const isAudioOnlyUpload =
      (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles') &&
      req.body.uploadMode === 'audio-only'
    const allowedAudioExt = ['.mp3', '.webm', '.wav', '.m4a']
    const looksLikeAudio =
      (file.mimetype && file.mimetype.startsWith('audio/')) ||
      allowedAudioExt.some((ext) => file.originalname.toLowerCase().endsWith(ext))
    const inputType: 'video' | 'audio' = isAudioOnlyUpload && looksLikeAudio ? 'audio' : 'video'
    const originalNameForJob =
      inputType === 'audio' && req.body.originalFileName
        ? String(req.body.originalFileName)
        : file.originalname

    // Validate file type based on tool
    let typeError: string | null = null
    if (toolType === 'translate-subtitles' || toolType === 'fix-subtitles' || toolType === 'convert-subtitles') {
      const subResult = await validateSubtitleFile(file.path)
      console.log('[upload] subtitle validation', {
        toolType,
        originalname: file.originalname,
        detectedFormat: subResult.detectedFormat,
        validationError: subResult.error ?? undefined,
      })
      if (subResult.error) {
        typeError = subResult.error
      }
    } else if (toolType !== 'burn-subtitles' && inputType !== 'audio') {
      // For video tools (and not audio-only), validate video type (extension fallback for AVI etc.)
      typeError = await validateFileType(file.path, file.originalname)
    }

    if (typeError) {
      fs.unlinkSync(file.path)
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
    let exportFormats: ('txt' | 'json' | 'docx' | 'pdf')[] | undefined
    if (options.exportFormats) {
      try {
        const arr = typeof options.exportFormats === 'string' ? JSON.parse(options.exportFormats) : options.exportFormats
        if (Array.isArray(arr)) exportFormats = arr.filter((f: string) => ['txt', 'json', 'docx', 'pdf'].includes(f))
      } catch {
        // ignore
      }
    }
    const jobOptions: any = {
      format: options.format,
      language: options.language,
      targetLanguage: options.targetLanguage,
      compressionLevel: options.compressionLevel,
      targetFormat: options.targetFormat,
      fixTiming: options.fixTiming,
      timingOffsetMs: options.timingOffsetMs,
      grammarFix: options.grammarFix,
      lineBreakFix: options.lineBreakFix,
      removeFillers: options.removeFillers === true || options.removeFillers === 'true',
      compressProfile: options.compressProfile,
      includeSummary: options.includeSummary === true || options.includeSummary === 'true',
      includeChapters: options.includeChapters === true || options.includeChapters === 'true',
      speakerDiarization: options.speakerDiarization === true || options.speakerDiarization === 'true',
      glossary: typeof options.glossary === 'string' && options.glossary.trim() ? options.glossary.trim() : undefined,
      exportFormats,
    }
    if (additionalLanguages.length > 0) {
      jobOptions.additionalLanguages = additionalLanguages
    }

    // Enforce multi-language limits (plan-based); requires authenticated user
    if (user && toolType === 'video-to-subtitles' && additionalLanguages.length > 0) {
      const langCheck = enforceLanguageLimits(user, additionalLanguages)
      if (!langCheck.allowed) {
        fs.unlinkSync(file.path)
        return res.status(403).json({ message: langCheck.reason || 'MULTI_LANGUAGE_NOT_AVAILABLE' })
      }
    }

    // Server-side minute limit: reject before queueing if user would exceed plan (abuse-proof); only for authenticated users
    const minuteChargingTools = ['video-to-transcript', 'video-to-subtitles', 'burn-subtitles', 'compress-video']
    if (user && minuteChargingTools.includes(toolType)) {
      let durationSeconds: number
      try {
        durationSeconds = await getVideoDuration(file.path)
      } catch {
        fs.unlinkSync(file.path)
        return res.status(400).json({ message: 'Could not read video/audio duration.' })
      }
      if (options.trimmedStart != null && options.trimmedEnd != null) {
        const start = parseFloat(String(options.trimmedStart))
        const end = parseFloat(String(options.trimmedEnd))
        durationSeconds = Math.max(0, end - start)
      }
      const requestedMinutes = Math.ceil(durationSeconds / 60)
      const limitCheck = await enforceUsageLimits(user, requestedMinutes)
      if (!limitCheck.allowed) {
        fs.unlinkSync(file.path)
        return res.status(403).json({ message: 'Monthly minute limit reached. Upgrade or wait for reset.' })
      }
    }

    // Cache lookup: same user + same file + same tool + same options → instant result (configurable TTL). Skip for audio-only (hash would be of audio, not video).
    let videoHash: string | undefined
    if (
      userId &&
      (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles') &&
      inputType !== 'audio'
    ) {
      try {
        videoHash = await hashFile(file.path)
        const cacheOptions = { ...jobOptions } as Record<string, unknown>
        if (options.trimmedStart != null) cacheOptions.trimmedStart = parseFloat(String(options.trimmedStart))
        if (options.trimmedEnd != null) cacheOptions.trimmedEnd = parseFloat(String(options.trimmedEnd))
        const cached = await checkDuplicateProcessing(userId, videoHash, toolType, cacheOptions)
        if (cached && fs.existsSync(cached.outputPath)) {
          const cachedFileName = cached.fileName || path.basename(cached.outputPath)
          const cachedJob = await addJobToQueue(plan, {
            toolType: 'cached-result',
            userId,
            plan,
            cachedResult: {
              downloadUrl: `/api/download/${cachedFileName}`,
              fileName: cachedFileName,
            },
            requestId: (req as RequestWithId).requestId,
          })

          return res.status(202).json({
            jobId: cachedJob.id,
            status: 'queued',
            jobToken: (cachedJob.data as any)?.jobToken,
          })
        }
      } catch {
        // If hashing fails, fall back to normal processing
      }
    }

    const job = await addJobToQueue(plan, {
      toolType,
      filePath: file.path,
      userId: userId ?? undefined,
      plan,
      videoHash,
      originalName: originalNameForJob,
      fileSize: file.size,
      trimmedStart: options.trimmedStart != null ? parseFloat(String(options.trimmedStart)) : undefined,
      trimmedEnd: options.trimmedEnd != null ? parseFloat(String(options.trimmedEnd)) : undefined,
      options: Object.keys(jobOptions).length > 0 ? jobOptions : undefined,
      webhookUrl: typeof webhookUrl === 'string' && webhookUrl.trim() ? webhookUrl.trim() : undefined,
      inputType: inputType === 'audio' ? 'audio' : undefined,
      requestId: (req as RequestWithId).requestId,
    })
    try {
      trackJobCreated({
        job_id: String(job.id),
        user_id: userId ?? undefined,
        tool_type: toolType,
        file_size_bytes: file.size,
        plan,
      })
    } catch {
      // non-blocking
    }
    res.status(202).json({
      jobId: job.id,
      status: 'queued',
      jobToken: (job.data as any)?.jobToken,
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
    const { toolType, trimmedStart, trimmedEnd, burnFontSize, burnPosition, burnBackgroundOpacity } = req.body
    const auth = getAuthFromRequest(req)
    const headerUserId = (req.headers['x-user-id'] as string) || 'demo-user'
    const userId = auth?.userId || headerUserId
    let burnUser = await getUser(userId)
    // Paid plans: from auth, or from existing Stripe-backed user; unauthenticated without Stripe = free (abuse-proof)
    const plan: PlanType =
      auth?.plan && (auth.plan === 'basic' || auth.plan === 'pro' || auth.plan === 'agency')
        ? auth.plan
        : burnUser?.stripeCustomerId
          ? burnUser.plan
          : 'free'

    if (!checkAndRecordUpload(userId)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
    }
    const queueCount = await getTotalQueueCount()
    if (isQueueAtHardLimit(queueCount)) {
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
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

    const burnLimits = getPlanLimits(plan)
    if (!burnUser && userId) {
      const now = new Date()
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      burnUser = {
        id: userId,
        email: `${userId}@example.com`,
        passwordHash: '',
        plan,
        stripeCustomerId: '',
        subscriptionId: '',
        paymentMethodId: undefined,
        usageThisMonth: { totalMinutes: 0, videoCount: 0, batchCount: 0, languageCount: 0, translatedMinutes: 0, resetDate },
        limits: burnLimits,
        overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
        createdAt: now,
        updatedAt: now,
      }
      await saveUser(burnUser)
    } else if (burnUser && burnUser.plan !== plan) {
      burnUser.plan = plan
      burnUser.limits = getPlanLimits(plan)
      burnUser.updatedAt = new Date()
      await saveUser(burnUser)
    }

    const activeJobs = await fileQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeForUser = activeJobs.filter((j) => (j.data as any)?.userId === userId)
    if (activeForUser.length >= burnLimits.maxConcurrentJobs) {
      return res.status(429).json({ message: 'MAX_CONCURRENT_JOBS_REACHED' })
    }

    // Validate video file (plan-based size)
    if (videoFile.size > burnLimits.maxFileSize) {
      fs.unlinkSync(videoFile.path)
      fs.unlinkSync(subtitleFile.path)
      return res.status(400).json({ message: `File exceeds plan limit. Upgrade for larger files.` })
    }

    const videoTypeError = await validateFileType(videoFile.path, videoFile.originalname)
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

    // Server-side minute limit for burn-subtitles
    let durationSeconds: number
    try {
      durationSeconds = await getVideoDuration(videoFile.path)
    } catch {
      fs.unlinkSync(videoFile.path)
      fs.unlinkSync(subtitleFile.path)
      return res.status(400).json({ message: 'Could not read video duration.' })
    }
    if (trimmedStart != null && trimmedEnd != null) {
      const start = parseFloat(String(trimmedStart))
      const end = parseFloat(String(trimmedEnd))
      durationSeconds = Math.max(0, end - start)
    }
    const requestedMinutes = Math.ceil(durationSeconds / 60)
    if (burnUser != null) {
      const limitCheck = await enforceUsageLimits(burnUser, requestedMinutes)
      if (!limitCheck.allowed) {
        fs.unlinkSync(videoFile.path)
        fs.unlinkSync(subtitleFile.path)
        return res.status(403).json({ message: 'Monthly minute limit reached. Upgrade or wait for reset.' })
      }
    }

    const job = await addJobToQueue(plan, {
      toolType: 'burn-subtitles',
      filePath: videoFile.path,
      filePath2: subtitleFile.path,
      userId: userId ?? undefined,
      plan,
      originalName: videoFile.originalname,
      originalName2: subtitleFile.originalname,
      fileSize: videoFile.size,
      trimmedStart: trimmedStart != null ? parseFloat(String(trimmedStart)) : undefined,
      trimmedEnd: trimmedEnd != null ? parseFloat(String(trimmedEnd)) : undefined,
      options:
        burnFontSize || burnPosition || burnBackgroundOpacity
          ? {
              burnFontSize: burnFontSize || undefined,
              burnPosition: burnPosition || undefined,
              burnBackgroundOpacity: burnBackgroundOpacity || undefined,
            }
          : undefined,
      requestId: (req as RequestWithId).requestId,
    })

    res.status(202).json({
      jobId: job.id,
      status: 'queued',
      jobToken: (job.data as any)?.jobToken,
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

// Timeout for init (Redis/DB can hang; respond 503 instead of leaving client pending).
const INIT_TIMEOUT_MS = 15_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

// ─── Chunked upload (init + chunk + complete) for large files ─────────────────
router.post('/init', async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    const userId = getEffectiveUserId(req)
    const rateLimitKey = userId ?? (req.ip ?? 'anonymous')
    let user: User | null = null
    if (userId) {
      try {
        user = (await withTimeout(getUser(userId), INIT_TIMEOUT_MS, 'getUser')) ?? null
      } catch (e) {
        if ((e as Error)?.message?.includes('timed out')) {
          console.error('[upload/init] getUser timeout')
          return res.status(503).json({ message: 'Service temporarily busy. Please retry.' })
        }
        console.warn('[upload/init] getUser failed', (e as Error)?.message)
      }
    }
    const plan: PlanType =
      auth?.plan && (auth.plan === 'basic' || auth.plan === 'pro' || auth.plan === 'agency')
        ? auth.plan
        : user?.stripeCustomerId
          ? user.plan
          : 'free'

    if (!checkAndRecordUpload(rateLimitKey)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
    }

    let queueCount: number
    try {
      queueCount = await withTimeout(getTotalQueueCount(), INIT_TIMEOUT_MS, 'getTotalQueueCount')
    } catch (e) {
      if ((e as Error)?.message?.includes('timed out')) {
        console.error('[upload/init] queue count timeout (Redis slow or unreachable)')
        return res.status(503).json({ message: 'Queue temporarily unavailable. Please retry in a moment.' })
      }
      console.error('[upload/init] queue count failed', (e as Error)?.message)
      return res.status(503).json({ message: 'Queue unavailable. Please retry in a moment.' })
    }
    if (isQueueAtHardLimit(queueCount)) {
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }

    const { filename, totalSize, totalChunks, toolType, ...rest } = req.body as {
      filename: string
      totalSize?: number
      totalChunks: number
      toolType: string
      [k: string]: unknown
    }
    if (!filename || !totalChunks || !toolType) {
      return res.status(400).json({ message: 'filename, totalChunks, and toolType are required' })
    }
    if (typeof totalSize !== 'number' || totalSize < 0) {
      return res.status(400).json({ message: 'totalSize is required and must be a non-negative number' })
    }
    if (totalChunks > MAX_CHUNKS || totalChunks < 1) {
      return res.status(400).json({ message: `totalChunks must be between 1 and ${MAX_CHUNKS}` })
    }

    const limits = getPlanLimits(user?.plan || plan)
    if (totalSize > limits.maxFileSize) {
      return res.status(400).json({ message: 'Total size exceeds plan limit. Upgrade for larger files.' })
    }

    const uploadId = uuidv4()
    const dir = path.join(chunksDir, uploadId)
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch (e) {
      console.error('[upload/init] mkdir failed', dir, (e as Error)?.message)
      return res.status(500).json({ message: 'Upload storage unavailable. Please retry.' })
    }

    chunkUploadMeta.set(uploadId, {
      userId,
      plan,
      filename,
      totalChunks,
      totalSize,
      toolType,
      options: rest || {},
    })

    return res.json({ uploadId })
  } catch (error: any) {
    console.error('[upload/init] 500', error?.message || error, error?.stack)
    return res.status(500).json({ message: error.message || 'Upload init failed' })
  }
})

/** Chunk handler: req.body is raw Buffer. Mount in index with express.raw() for POST /api/upload/chunk */
export async function handleUploadChunk(req: Request, res: Response): Promise<void> {
  try {
    const uploadId = req.headers['x-upload-id'] as string
    const chunkIndex = parseInt(req.headers['x-chunk-index'] as string, 10)
    if (!uploadId || Number.isNaN(chunkIndex) || chunkIndex < 0) {
      res.status(400).json({ message: 'x-upload-id and x-chunk-index required' })
      return
    }

    const meta = chunkUploadMeta.get(uploadId)
    if (!meta) {
      res.status(404).json({ message: 'Upload session not found or expired' })
      return
    }

    const body = (req as any).body
    if (!body || !Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ message: 'Chunk body required (raw binary)' })
      return
    }

    const chunkPath = path.join(chunksDir, uploadId, `chunk_${chunkIndex}`)
    await fs.promises.writeFile(chunkPath, body)
    res.json({ ok: true })
  } catch (error: any) {
    console.error('[upload/chunk] 500', error?.message || error, error?.stack)
    res.status(500).json({ message: error.message || 'Chunk upload failed' })
  }
}

router.post('/complete', async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.body as { uploadId?: string }
    if (!uploadId) {
      return res.status(400).json({ message: 'uploadId required' })
    }

    const meta = chunkUploadMeta.get(uploadId)
    if (!meta) {
      return res.status(404).json({ message: 'Upload session not found or expired' })
    }
    chunkUploadMeta.delete(uploadId)

    const dir = path.join(chunksDir, uploadId)
    if (!fs.existsSync(dir)) {
      return res.status(400).json({ message: 'No chunks found' })
    }

    const totalChunks = Math.min(meta.totalChunks, MAX_CHUNKS)
    const safeFilename = sanitizeFilename(meta.filename)
    const outPath = path.join(tempDir, `${uuidv4()}-${safeFilename}`)
    try {
      assertPathWithinDir(tempDir, path.resolve(outPath))
    } catch {
      return res.status(400).json({ message: 'Invalid filename' })
    }
    const out = fs.createWriteStream(outPath, { flags: 'a' })
    let totalSizeSoFar = 0
    const maxFileSize = getPlanLimits(meta.plan).maxFileSize
    const declaredTotal = meta.totalSize
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(dir, `chunk_${i}`)
      if (!fs.existsSync(chunkPath)) {
        out.destroy()
        try { fs.unlinkSync(outPath) } catch { /* ignore */ }
        return res.status(400).json({ message: `Missing chunk ${i}` })
      }
      const stat = fs.statSync(chunkPath)
      totalSizeSoFar += stat.size
      if (totalSizeSoFar > maxFileSize) {
        out.destroy()
        try { fs.unlinkSync(outPath) } catch { /* ignore */ }
        return res.status(400).json({ message: 'Total size exceeds plan limit. Upgrade for larger files.' })
      }
      if (declaredTotal != null && totalSizeSoFar > declaredTotal) {
        out.destroy()
        try { fs.unlinkSync(outPath) } catch { /* ignore */ }
        return res.status(400).json({ message: 'Chunk total exceeds declared totalSize.' })
      }
      const buf = fs.readFileSync(chunkPath)
      out.write(buf)
      fs.unlinkSync(chunkPath)
    }

    // Wait for the write stream to finish before stat/addJobToQueue (out.end() is async)
    const onError = (err: any) => {
      try { fs.unlinkSync(outPath) } catch { /* ignore */ }
      console.error('[upload/complete] 500', err?.message || err, err?.stack)
      res.status(500).json({ message: err?.message || 'Upload complete failed' })
    }
    out.once('error', onError)
      out.once('finish', async () => {
      out.removeListener('error', onError)
      try {
        try { fs.rmdirSync(dir) } catch { /* ignore if not empty or missing */ }
        let user = meta.userId ? await getUser(meta.userId) : null
          if (!user && meta.userId) {
            const limits = getPlanLimits(meta.plan)
            const now = new Date()
            const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
            user = {
              id: meta.userId!,
              email: `${meta.userId}@example.com`,
              passwordHash: '',
              plan: meta.plan,
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
            await saveUser(user)
          }
          const fileSize = fs.statSync(outPath).size
          const planLimit = getPlanLimits(meta.plan).maxFileSize
          if (fileSize > planLimit) {
            fs.unlinkSync(outPath)
            return res.status(400).json({ message: 'File exceeds plan limit. Upgrade for larger files.' })
          }
          const opts = meta.options || {}
          const trimmedStart = opts.trimmedStart != null ? (typeof opts.trimmedStart === 'number' ? opts.trimmedStart : parseFloat(String(opts.trimmedStart))) : undefined
          const trimmedEnd = opts.trimmedEnd != null ? (typeof opts.trimmedEnd === 'number' ? opts.trimmedEnd : parseFloat(String(opts.trimmedEnd))) : undefined
          const { trimmedStart: _s, trimmedEnd: _e, uploadMode: _um, originalFileName: _ofn, originalFileSize: _ofs, ...restOptions } = opts
          const isChunkedAudioOnly =
            (meta.toolType === 'video-to-transcript' || meta.toolType === 'video-to-subtitles') &&
            opts.uploadMode === 'audio-only'
          const job = await addJobToQueue(meta.plan, {
            toolType: meta.toolType,
            filePath: outPath,
            userId: meta.userId ?? undefined,
            plan: meta.plan,
            originalName: isChunkedAudioOnly && opts.originalFileName ? String(opts.originalFileName) : safeFilename,
            fileSize,
            trimmedStart,
            trimmedEnd,
            options: Object.keys(restOptions).length > 0 ? restOptions : undefined,
            inputType: isChunkedAudioOnly ? 'audio' : undefined,
            requestId: (req as RequestWithId).requestId,
          })
          try {
            trackJobCreated({
              job_id: String(job.id),
              user_id: meta.userId ?? undefined,
              tool_type: meta.toolType,
              file_size_bytes: fileSize,
              plan: meta.plan,
            })
          } catch {
            // non-blocking
          }
          return res.status(202).json({
            jobId: job.id,
            status: 'queued',
            jobToken: (job.data as any)?.jobToken,
          })
        } catch (error: any) {
          onError(error)
        }
      })
    out.end()
  } catch (error: any) {
    console.error('[upload/complete] 500', error?.message || error, error?.stack)
    return res.status(500).json({ message: error.message || 'Upload complete failed' })
  }
})

export default router
