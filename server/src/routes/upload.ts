import express, { Request, Response } from 'express'
import { RequestWithId } from '../middleware/requestId'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { fileQueue, addJobToQueue, getJobById, getTotalQueueCount as getQueueCountFromWorker, JobData } from '../workers/videoProcessor'
import { validateFileType, validateFileSize, validateSubtitleFile } from '../utils/fileValidation'
import { enforceLanguageLimits, enforceUsageLimits, getDailySoftCapConcurrency, getJobPriority, getMaxDailyImports, getPlanLimits, applySystemLoadGuard } from '../utils/limits'
import { assertCanImport } from '../utils/importQuota'
import { resetDailyImportIfNeeded, resetDailyMinutesIfNeeded, resetUserUsageIfNeeded } from '../utils/usageReset'
import { getUser, saveUser, PlanType, User, atomicResetDailyImportIfNeeded, atomicResetDailyMinutesIfNeeded } from '../models/User'
import { hashFile, checkDuplicateProcessing } from '../services/duplicate'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { sanitizeFilename } from '../utils/sanitizeFilename'
import { assertPathWithinDir } from '../utils/assertPathWithinDir'
import { isQueueAtHardLimit, isQueueAtSoftLimit, getSystemConcurrencyMultiplier } from '../utils/queueConfig'
import { checkAndRecordUpload } from '../utils/uploadRateLimit'
import { checkAndRecordGuestIpImport, extractClientIp } from '../utils/guestIpLimit'
import { trackJobCreated } from '../utils/analytics'
import { insertJobRecord } from '../lib/jobAnalytics'
import { probeVideoDurationResult } from '../services/ffmpeg'
import { STREAM_UPLOAD_ASSEMBLY } from '../utils/featureFlags'
import { getLogger } from '../lib/logger'
import { isValidYoutubeUrl, getYoutubeMetadata, normalizeYoutubeUrl } from '../services/youtube'
import { checkAndRecordYoutubeJob } from '../utils/youtubeRateLimit'
import { enforceSubscriptionState, resolveRequestPlan } from '../utils/subscriptionGuard'
import { runTranscriptionIntake } from '../services/transcriptionIntake'
import { runFixSubtitlesDualIntake, runBurnSubtitlesIntake } from '../services/dualFileIntake'

const router = express.Router()
const uploadLog = getLogger('api')

import { normalizeLanguageCode } from '../utils/normalizeLanguage'

// Configure multer for file uploads. On Railway/Fly/Render only /tmp is guaranteed; relative paths can stall Multer.
const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

const MAX_CHUNKS = 2000

// Chunked upload metadata (uploadId -> { ... }). Not deleted until /complete finishes successfully.
const chunkUploadMeta = new Map<string, {
  userId: string | null
  plan: PlanType
  filename: string
  totalChunks: number
  totalSize: number
  toolType: string
  options: Record<string, unknown>
  /** Creation time — used to prune abandoned uploads. */
  createdAt: number
}>()

// Prune abandoned upload sessions (never completed) older than 4 hours
const CHUNK_META_TTL_MS = 4 * 60 * 60 * 1000
setInterval(() => {
  const cutoff = Date.now() - CHUNK_META_TTL_MS
  for (const [id, meta] of chunkUploadMeta.entries()) {
    if (meta.createdAt < cutoff) {
      chunkUploadMeta.delete(id)
      const dir = path.join(chunksDir, id)
      if (fs.existsSync(dir)) {
        fs.rm(dir, { recursive: true, force: true }, () => {})
      }
    }
  }
}, 30 * 60 * 1000).unref()

// Tracks uploadIds currently being assembled — prevents duplicate /complete calls
const completingUploads = new Set<string>()
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

// Exported so other routes needing an identical single-file multipart upload
// (e.g. the /api/v1 external facade) reuse this exact multer config instead
// of duplicating it.
export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 * 1024, // 20GB — max plan (Agency); plan enforcement after upload
  },
})

async function getTotalQueueCount(): Promise<number> {
  return getQueueCountFromWorker()
}

// Single file upload — the core validation/quota/enqueue logic lives in
// services/transcriptionIntake.ts (runTranscriptionIntake) so the external
// /api/v1/transcriptions route reuses exactly this pipeline instead of a
// second implementation. This handler only maps the shared result back to
// the original web-app response shape ({ message } on error, { jobId,
// status, jobToken } on success) — unchanged from before the extraction.
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  const result = await runTranscriptionIntake(req, { source: 'web' })
  if (!result.ok) {
    if (result.retryAfterSeconds) res.setHeader('Retry-After', String(result.retryAfterSeconds))
    return res.status(result.httpStatus).json({ message: result.message })
  }
  res.status(202).json({
    jobId: result.jobId,
    status: 'queued',
    jobToken: result.jobToken,
  })
})

// Dual file upload (for burn-subtitles / fix-subtitles with scene context).
// The core validation/quota/enqueue logic for each lives in
// services/dualFileIntake.ts (runFixSubtitlesDualIntake / runBurnSubtitlesIntake)
// so the external /api/v1/subtitle-fixes and /api/v1/subtitle-burns routes
// reuse exactly this pipeline instead of a second implementation. This
// handler only maps the shared result back to the original web-app response
// shape ({ message } on error, { jobId, status, jobToken } on success) —
// unchanged from before the extraction.
router.post('/dual', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'subtitles', maxCount: 1 },
]), async (req: Request, res: Response) => {
  const toolType = req.body?.toolType
  const isBurnSubtitles = toolType === 'burn-subtitles'
  const isFixSubtitles = toolType === 'fix-subtitles'

  if (!toolType || (!isBurnSubtitles && !isFixSubtitles)) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    if (files?.video) try { fs.unlinkSync(files.video[0].path) } catch { /* ignore */ }
    if (files?.subtitles) try { fs.unlinkSync(files.subtitles[0].path) } catch { /* ignore */ }
    return res.status(400).json({ message: 'toolType must be burn-subtitles or fix-subtitles' })
  }

  const result = isFixSubtitles
    ? await runFixSubtitlesDualIntake(req, { source: 'web' })
    : await runBurnSubtitlesIntake(req, { source: 'web' })

  if (!result.ok) {
    if (result.retryAfterSeconds) res.setHeader('Retry-After', String(result.retryAfterSeconds))
    return res.status(result.httpStatus).json({ message: result.message })
  }
  res.status(202).json({
    jobId: result.jobId,
    status: 'queued',
    jobToken: result.jobToken,
  })
})

// Timeout for init (Redis/DB can hang; respond 503 instead of leaving client pending).
const INIT_TIMEOUT_MS = 25_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

// ─── Chunked upload (init + chunk + complete) for large files ─────────────────
router.get('/init', (_req: Request, res: Response) => {
  res.status(405).json({ message: 'Method Not Allowed. Use POST /api/upload/init.' })
})
router.post('/init', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req) ?? `guest_${uuidv4()}`
    const auth = getAuthFromRequest(req)
    const rateLimitKey = userId
    let user: User | null = null
    try {
      user = (await withTimeout(getUser(userId), INIT_TIMEOUT_MS, 'getUser')) ?? null
    } catch (e) {
      const msg = (e as Error)?.message ?? ''
      const isTimeout = msg.includes('timed out')
      if (isTimeout) {
        uploadLog.error({ msg: '[upload/init] getUser timeout' })
        return res.status(503).json({ message: 'Service temporarily busy. Please retry.' })
      }
      uploadLog.warn({ msg: '[upload/init] getUser failed', error: msg })
    }
    const now = new Date()
    if (user) await enforceSubscriptionState(user, now)
    const plan = resolveRequestPlan(user, auth?.plan)

    if (user?.suspended) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' })
    }

    // Guest IP daily cap
    if (userId.startsWith('guest_')) {
      const clientIp = extractClientIp(req)
      if (!await checkAndRecordGuestIpImport(clientIp)) {
        return res.status(403).json({ message: "You've used today's 3 free imports. They reset at midnight — or upgrade to Pro." })
      }
    }

    if (!await checkAndRecordUpload(rateLimitKey)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ message: 'Too many uploads. Please wait a minute before trying again.' })
    }

    let queueCount: number
    try {
      queueCount = await withTimeout(getTotalQueueCount(), INIT_TIMEOUT_MS, 'getTotalQueueCount')
    } catch (e) {
      const msg = (e as Error)?.message ?? ''
      const isTimeout = msg.includes('timed out')
      if (isTimeout) {
        uploadLog.error({ msg: '[upload/init] queue count timeout (Redis slow or unreachable)' })
        res.setHeader('Retry-After', '30')
        return res.status(503).json({ message: 'Queue temporarily unavailable. Please retry in a moment.' })
      }
      uploadLog.error({ msg: '[upload/init] queue count failed', error: msg })
      res.setHeader('Retry-After', '30')
      return res.status(503).json({ message: 'Queue unavailable. Please retry in a moment.' })
    }
    if (isQueueAtHardLimit(queueCount)) {
      res.setHeader('Retry-After', '30')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }
    if (isQueueAtSoftLimit(queueCount) && plan === 'free') {
      res.setHeader('Retry-After', '60')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }

    const body = req.body
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ message: 'Request body must be JSON with filename, totalChunks, toolType, totalSize' })
    }
    const { filename, totalSize, totalChunks, toolType, ...rest } = body as {
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
      uploadLog.error({ msg: '[upload/init] mkdir failed', dir, error: (e as Error)?.message })
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
      createdAt: Date.now(),
    })

    uploadLog.info({
      msg: 'upload_start',
      env: process.env.NODE_ENV,
      uploadId,
      totalChunks,
      totalSizeBytes: totalSize,
    })

    return res.json({ uploadId })
  } catch (error: any) {
    const msg = error?.message || String(error)
    const stack = error?.stack
    uploadLog.error({ msg: '[upload/init] 500', error: msg, stack: stack || undefined })
    return res.status(500).json({ message: msg || 'Upload init failed' })
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
    uploadLog.info({
      msg: 'chunk_upload_state',
      uploadId,
      metaExists: !!meta,
    })
    if (!meta) {
      res.status(404).json({ message: 'Upload session not found or expired' })
      return
    }

    const body = req.body as Buffer
    if (!body || !Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ message: 'Chunk body required (raw binary)' })
      return
    }

    const chunkPath = path.join(chunksDir, uploadId, `chunk_${chunkIndex}`)
    await fs.promises.writeFile(chunkPath, body)
    // Verify chunk was written so we never confirm a chunk the server doesn't have
    const stat = await fs.promises.stat(chunkPath).catch(() => null)
    if (!stat || stat.size !== body.length) {
      try { await fs.promises.unlink(chunkPath) } catch { /* ignore */ }
      uploadLog.error({ msg: '[upload/chunk] write verify failed', uploadId, chunkIndex, expected: body.length, actual: stat?.size })
      res.status(500).json({ message: 'Chunk write failed. Please retry.' })
      return
    }
    res.json({ ok: true })
  } catch (error: any) {
    uploadLog.error({ msg: '[upload/chunk] 500', error: error?.message || String(error), stack: error?.stack })
    res.status(500).json({ message: error.message || 'Chunk upload failed' })
  }
}

router.post('/complete', async (req: Request, res: Response) => {
  const tStart = Date.now()
  let uploadId: string | undefined
  try {
    ;({ uploadId } = req.body as { uploadId?: string })
    if (!uploadId) {
      return res.status(400).json({ message: 'uploadId required' })
    }

    const meta = chunkUploadMeta.get(uploadId)
    if (!meta) {
      return res.status(404).json({ message: 'Upload session not found or expired' })
    }
    if (completingUploads.has(uploadId)) {
      return res.status(409).json({ message: 'Upload completion already in progress for this session' })
    }
    completingUploads.add(uploadId)
    if (meta.userId && !meta.userId.startsWith('guest_')) {
      const user = await getUser(meta.userId)
      if (user) {
        await enforceSubscriptionState(user)
        meta.plan = user.plan
      }
    }
    // Do NOT delete meta here — only after /complete finishes successfully (in finish handler)

    const dir = path.join(chunksDir, uploadId)
    if (!fs.existsSync(dir)) {
      return res.status(400).json({ message: 'No chunks found' })
    }

    // Pre-flight disk check: require at least 3× the declared file size in free space.
    // This covers: assembled file + extracted audio + audio chunks without running out mid-write.
    // 3× is conservative but safe; 20GB files need ~60GB headroom which is expected on Agency plans.
    try {
      const diskStat = fs.statfsSync(tempDir)
      const freeBytesNow = diskStat.bfree * diskStat.bsize
      const needed = (meta.totalSize ?? 0) * 3
      if (needed > 0 && freeBytesNow < needed) {
        completingUploads.delete(uploadId)
        uploadLog.warn({ msg: '[upload/complete] disk pre-flight failed', freeMb: Math.round(freeBytesNow / 1024 / 1024), neededMb: Math.round(needed / 1024 / 1024) })
        return res.status(503).json({ message: 'Server storage is temporarily full. Please try again in a few minutes.' })
      }
    } catch {
      // statfsSync not available on all platforms — skip the check rather than blocking the upload
    }

    const totalChunks = Math.min(meta.totalChunks, MAX_CHUNKS)
    const totalSizeBytes = meta.totalSize
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

    async function doEnqueueJob(): Promise<{ job: Awaited<ReturnType<typeof addJobToQueue>>; fileSize: number }> {
      if (!meta) throw new Error('Upload session not found')
      let user = meta.userId ? await getUser(meta.userId) : null
      const now = new Date()
      if (user) {
        await enforceSubscriptionState(user, now)
        meta.plan = user.plan
      }
      if (!user && meta.userId) {
        const limits = getPlanLimits(meta.plan)
        const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        user = {
          id: meta.userId!,
          email: `${meta.userId}@example.com`,
          passwordHash: '',
          plan: meta.plan,
          stripeCustomerId: undefined,
          subscriptionId: undefined,
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
          overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
          createdAt: now,
          updatedAt: now,
        }
        // Guest users are ephemeral — skip DB write to avoid stripeCustomerId unique constraint issues
        if (!meta.userId!.startsWith('guest_')) await saveUser(user)
      }
      if (user) {
        const dailyImportReset = resetDailyImportIfNeeded(user, now)
        const dailyMinutesReset = resetDailyMinutesIfNeeded(user, now)
        if (dailyImportReset && !meta.userId!.startsWith('guest_')) await atomicResetDailyImportIfNeeded(user.id, now, user.usageThisMonth.importCountTodayResetDate!)
        if (dailyMinutesReset && !meta.userId!.startsWith('guest_')) await atomicResetDailyMinutesIfNeeded(user.id, now, user.usageThisMonth.dailyMinutesTodayResetDate!)
        const importGate = assertCanImport(user)
        if (!importGate.ok) {
          throw Object.assign(new Error(importGate.message), { statusCode: 403 })
        }
      }
      const fileSize = fs.statSync(outPath).size
      const planLimit = getPlanLimits(meta.plan).maxFileSize
      if (fileSize > planLimit) {
        fs.unlinkSync(outPath)
        throw Object.assign(new Error('File exceeds plan limit. Upgrade for larger files.'), { statusCode: 400 })
      }
      const opts = meta.options || {}
      const trimmedStart = opts.trimmedStart != null ? (typeof opts.trimmedStart === 'number' ? opts.trimmedStart : parseFloat(String(opts.trimmedStart))) : undefined
      const trimmedEnd = opts.trimmedEnd != null ? (typeof opts.trimmedEnd === 'number' ? opts.trimmedEnd : parseFloat(String(opts.trimmedEnd))) : undefined
      const { trimmedStart: _s, trimmedEnd: _e, uploadMode: _um, originalFileName: _ofn, originalFileSize: _ofs, ...restOptions } = opts
      // Speaker diarization is a paid-plan feature (real Replicate GPU cost per job) —
      // never trust a client-supplied flag; free plan never gets it regardless of what was sent.
      if (meta.plan === 'free') {
        (restOptions as Record<string, unknown>).speakerDiarization = false
      }
      const isChunkedAudioOnly =
        (meta.toolType === 'video-to-transcript' || meta.toolType === 'video-to-subtitles') &&
        opts.uploadMode === 'audio-only'
      const job = await addJobToQueue(meta.plan, {
        toolType: meta.toolType,
        filePath: outPath,
        userId: meta.userId!,
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
        await insertJobRecord({
          id: String(job.id),
          userId: meta.userId!,
          toolType: isChunkedAudioOnly ? 'voice-to-transcript' : meta.toolType,
          planAtRun: meta.plan,
          fileSizeBytes: fileSize,
          jobToken: (job.data as JobData)?.jobToken,
        })
      } catch {
        // non-blocking
      }
      return { job, fileSize }
    }

    const timings: {
      tStart: number
      tValidationStart: number
      tValidationEnd: number
      tAssemblyStart: number
      tAssemblyEnd: number
      tOutEnd: number
      tFinishEnter: number
      tBeforeEnqueue: number
      tAfterEnqueue: number
      tBeforeResponse: number
    } = {
      tStart,
      tValidationStart: 0,
      tValidationEnd: 0,
      tAssemblyStart: 0,
      tAssemblyEnd: 0,
      tOutEnd: 0,
      tFinishEnter: 0,
      tBeforeEnqueue: 0,
      tAfterEnqueue: 0,
      tBeforeResponse: 0,
    }

    timings.tValidationStart = Date.now()
    if (STREAM_UPLOAD_ASSEMBLY) {
      // Phase 1: streaming reassembly — validate then stream chunks without loading into memory
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
      }
    timings.tValidationEnd = Date.now()
    timings.tAssemblyStart = Date.now()
      try {
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(dir, `chunk_${i}`)
          await new Promise<void>((resolve, reject) => {
            const src = fs.createReadStream(chunkPath)
            src.on('error', reject)
            src.on('end', resolve)
            src.pipe(out, { end: false })
          })
          await fs.promises.unlink(chunkPath)
        }
      } catch (err: any) {
        out.destroy()
        try { fs.unlinkSync(outPath) } catch { /* ignore */ }
        uploadLog.error({ msg: '[upload/complete] streaming reassembly failed', error: err?.message || String(err), stack: err?.stack })
        return res.status(500).json({ message: err?.message || 'Upload complete failed' })
      }
    timings.tAssemblyEnd = Date.now()
    } else {
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
    timings.tValidationEnd = Date.now()
    timings.tAssemblyStart = timings.tValidationStart
    timings.tAssemblyEnd = timings.tValidationEnd
    }

    const onError = (err: any) => {
      completingUploads.delete(uploadId!)
      if (res.headersSent) return
      try { fs.unlinkSync(outPath) } catch { /* ignore */ }
      uploadLog.error({ msg: '[upload/complete] 500', error: err?.message || String(err), stack: err?.stack })
      res.status(500).json({ message: err?.message || 'Upload complete failed' })
    }
    out.once('error', onError)
    out.once('finish', async () => {
      completingUploads.delete(uploadId!)
      timings.tFinishEnter = Date.now()
      out.removeListener('error', onError)
      if (res.headersSent) return
      try {
        try { fs.rmdirSync(dir) } catch { /* ignore if not empty or missing */ }
        timings.tBeforeEnqueue = Date.now()
        const { job, fileSize } = await doEnqueueJob()
        timings.tAfterEnqueue = Date.now()
        timings.tBeforeResponse = Date.now()
        chunkUploadMeta.delete(uploadId!)
        uploadLog.info({
          msg: 'upload_complete_timing',
          uploadId,
          totalChunks,
          totalSizeBytes,
          validation_ms: timings.tValidationEnd - timings.tValidationStart,
          assembly_ms: timings.tAssemblyEnd - timings.tAssemblyStart,
          stream_finish_wait_ms: timings.tFinishEnter - timings.tOutEnd,
          enqueue_ms: timings.tAfterEnqueue - timings.tBeforeEnqueue,
          total_complete_route_ms: timings.tBeforeResponse - timings.tStart,
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
          jobToken: (job.data as JobData)?.jobToken,
        })
      } catch (error: any) {
        if (error?.statusCode === 400) {
          return res.status(400).json({ message: error?.message || 'File exceeds plan limit. Upgrade for larger files.' })
        }
        onError(error)
      }
    })
    timings.tOutEnd = Date.now()
    out.end()
  } catch (error: any) {
    if (uploadId) completingUploads.delete(uploadId)
    uploadLog.error({ msg: '[upload/complete] 500', error: error?.message || String(error), stack: error?.stack })
    return res.status(500).json({ message: error.message || 'Upload complete failed' })
  }
})

// ─── YouTube ingestion endpoint ──────────────────────────────────────────────
// POST /api/upload/youtube
//
// Validates the YouTube URL, fetches metadata (non-blocking — ~1-2 s network call),
// enforces plan duration + usage limits, applies YouTube-specific rate limiting
// (separate from the per-minute file upload limit), then enqueues a
// 'youtube-to-transcript' job.  The worker fetches and encodes the audio itself
// so this endpoint never downloads any media, keeping the API thread free.
//
// Response is identical to the file upload endpoint: { jobId, status, jobToken }
// so the client can use the exact same polling flow.
router.post('/youtube', async (req: Request, res: Response) => {
  const ytStartMs = Date.now()
  try {
    const userId = getEffectiveUserId(req) ?? `guest_${uuidv4()}`

    const { youtubeUrl, toolType: rawToolType, webhookUrl, ...options } = req.body

    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return res.status(400).json({ message: 'youtubeUrl is required.' })
    }

    if (!isValidYoutubeUrl(youtubeUrl)) {
      return res.status(400).json({ message: 'Invalid YouTube URL. Paste a youtube.com or youtu.be link.' })
    }

    const auth = getAuthFromRequest(req)
    let user = await getUser(userId)
    const now = new Date()
    if (user) await enforceSubscriptionState(user, now)
    const plan = resolveRequestPlan(user, auth?.plan)

    // ── Queue capacity ────────────────────────────────────────────────────────
    const queueCount = await getTotalQueueCount()
    if (isQueueAtHardLimit(queueCount)) {
      res.setHeader('Retry-After', '30')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }
    if (isQueueAtSoftLimit(queueCount) && plan === 'free') {
      res.setHeader('Retry-After', '60')
      return res.status(503).json({ message: 'High demand right now. Please retry shortly.' })
    }

    // ── YouTube-specific rate limit (hourly, separate from file upload limit) ─
    const ytRl = await checkAndRecordYoutubeJob(userId, plan)
    if (!ytRl.allowed) {
      const retryAfterSec = Math.ceil(ytRl.retryAfterMs / 1000)
      res.setHeader('Retry-After', String(retryAfterSec))
      return res.status(429).json({
        message: `YouTube limit reached. You can submit ${
          plan === 'free' ? '3' : plan === 'basic' ? '6' : plan === 'agency' ? '20' : '10'
        } YouTube jobs per hour on the ${plan} plan. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
      })
    }

    // ── Fetch metadata (title, duration, thumbnail) ───────────────────────────
    // This is the only network call in the API layer; all media fetching happens in the worker.
    let ytMeta: { title: string; durationSec: number; thumbnailUrl: string | undefined; videoId: string; defaultLanguage?: string }
    try {
      ytMeta = await getYoutubeMetadata(youtubeUrl)
    } catch (err: any) {
      uploadLog.warn({ msg: '[youtube] metadata fetch failed', error: err.message, youtubeUrl: youtubeUrl.slice(0, 80) })
      // Surface live/unavailable messages directly; mask low-level errors
      const msg: string = err.message || ''
      const userMessage = (
        msg.includes('Live stream') || msg.includes('live stream') ||
        msg.includes('unavailable') || msg.includes('private') ||
        msg.includes('age-restricted') || msg.includes('duration')
      )
        ? msg
        : 'Could not access that YouTube video. It may be private, age-restricted, or unavailable.'
      return res.status(400).json({ message: userMessage })
    }

    // ── Ensure/create user record ─────────────────────────────────────────────
    const limits = user?.limits ?? getPlanLimits(plan)
    if (!user) {
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      user = {
        id: userId,
        email: `${userId}@example.com`,
        passwordHash: '',
        plan,
        stripeCustomerId: undefined,
        subscriptionId: undefined,
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
        overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
        createdAt: now,
        updatedAt: now,
      }
      // Guest users are ephemeral — skip DB write to avoid stripeCustomerId unique constraint issues
      if (!userId.startsWith('guest_')) await saveUser(user)
    } else {
      if (user.plan !== plan) {
        user.plan = plan
        user.limits = getPlanLimits(plan)
        user.updatedAt = now
        await saveUser(user)
      }
      if (resetUserUsageIfNeeded(user, now)) {
        await saveUser(user)
      }
      const dailyImportReset = resetDailyImportIfNeeded(user, now)
      const dailyMinutesReset = resetDailyMinutesIfNeeded(user, now)
      if (dailyImportReset) await atomicResetDailyImportIfNeeded(user.id, now, user.usageThisMonth.importCountTodayResetDate!)
      if (dailyMinutesReset) await atomicResetDailyMinutesIfNeeded(user.id, now, user.usageThisMonth.dailyMinutesTodayResetDate!)
    }

    // ── Import count check (free plan: 3 imports/day, resets at midnight UTC) ─
    const ytImportGate = user ? assertCanImport(user) : { ok: true as const }
    if (!ytImportGate.ok) {
      return res.status(403).json({ message: ytImportGate.message })
    }

    // ── Concurrent job cap ────────────────────────────────────────────────────
    const activeJobs = await fileQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeForUser = activeJobs.filter((j) => (j.data as JobData)?.userId === userId)
    const ytPlanConcurrency = getDailySoftCapConcurrency(plan, user?.usageThisMonth?.dailyMinutesToday ?? 0)
    const ytEffectiveConcurrency = applySystemLoadGuard(ytPlanConcurrency, getSystemConcurrencyMultiplier(queueCount))
    if (activeForUser.length >= ytEffectiveConcurrency) {
      return res.status(429).json({ message: 'MAX_CONCURRENT_JOBS_REACHED' })
    }

    // ── Duration limit (plan-based) ───────────────────────────────────────────
    const maxDurationSec = limits.maxVideoDuration * 60
    if (ytMeta.durationSec > maxDurationSec) {
      return res.status(400).json({
        message: `This video is ${Math.round(ytMeta.durationSec / 60)} minutes. Your ${plan} plan supports videos up to ${limits.maxVideoDuration} minutes. Upgrade for longer videos.`,
      })
    }

    // ── Minute usage limits (paid plans) ─────────────────────────────────────
    if (user.plan !== 'free') {
      const requestedMinutes = Math.ceil(ytMeta.durationSec / 60)
      const limitCheck = await enforceUsageLimits(user, requestedMinutes)
      if (!limitCheck.allowed) {
        return res.status(403).json({ message: 'Monthly minute limit reached. Upgrade or wait for reset.' })
      }
    }

    // ── Parse transcript options ──────────────────────────────────────────────
    let exportFormats: ('txt' | 'json' | 'docx' | 'pdf')[] | undefined
    if (options.exportFormats) {
      try {
        const arr = typeof options.exportFormats === 'string'
          ? JSON.parse(options.exportFormats)
          : options.exportFormats
        if (Array.isArray(arr)) {
          exportFormats = arr.filter((f: string) => ['txt', 'json', 'docx', 'pdf'].includes(f))
        }
      } catch { /* ignore */ }
    }

    const jobOptions = {
      language: normalizeLanguageCode(options.language),
      includeSummary: options.includeSummary === true || options.includeSummary === 'true',
      includeChapters: options.includeChapters === true || options.includeChapters === 'true',
      // Speaker diarization is a paid-plan feature (real Replicate GPU cost per job) —
      // never trust a client-supplied flag; free plan never gets it regardless of what was sent.
      speakerDiarization: plan !== 'free' && (options.speakerDiarization === true || options.speakerDiarization === 'true'),
      numSpeakers: options.numSpeakers ? Number(options.numSpeakers) : undefined,
      diarizationLanguage: typeof options.diarizationLanguage === 'string' && options.diarizationLanguage.trim() ? options.diarizationLanguage.trim() : undefined,
      glossary: typeof options.glossary === 'string' && options.glossary.trim() ? options.glossary.trim() : undefined,
      exportFormats,
    }

    // ── Enqueue ───────────────────────────────────────────────────────────────
    const job = await addJobToQueue(plan, {
      toolType: 'youtube-to-transcript',
      userId,
      plan,
      youtubeUrl: normalizeYoutubeUrl(youtubeUrl.trim()),
      youtubeTitle: ytMeta.title,
      youtubeThumbnailUrl: ytMeta.thumbnailUrl,
      youtubeDurationSec: ytMeta.durationSec,
      youtubeDefaultLanguage: ytMeta.defaultLanguage,
      originalName: ytMeta.title.replace(/[^\w\s.\-]/g, '_').trim() + '.wav',
      options: jobOptions,
      webhookUrl: typeof webhookUrl === 'string' && webhookUrl.trim() ? webhookUrl.trim() : undefined,
      requestId: (req as RequestWithId).requestId,
    })

    uploadLog.info({
      msg: 'youtube_job_enqueued',
      jobId: job.id,
      durationMs: Date.now() - ytStartMs,
      ytDurationSec: ytMeta.durationSec,
    })

    try {
      trackJobCreated({
        job_id: String(job.id),
        user_id: userId,
        tool_type: 'youtube-to-transcript',
        file_size_bytes: 0,
        plan,
      })
    } catch { /* non-blocking */ }

    try {
      await insertJobRecord({
        id: String(job.id),
        userId,
        toolType: 'youtube-to-transcript',
        planAtRun: plan,
        fileSizeBytes: 0,
        jobToken: (job.data as JobData)?.jobToken,
      })
    } catch { /* non-blocking */ }

    return res.status(202).json({
      jobId: job.id,
      status: 'queued',
      jobToken: (job.data as JobData)?.jobToken,
      // Pass back metadata so the client can show the thumbnail/title immediately
      youtubeTitle: ytMeta.title,
      youtubeThumbnailUrl: ytMeta.thumbnailUrl,
      youtubeDurationSec: ytMeta.durationSec,
    })
  } catch (error: any) {
    uploadLog.error({ msg: '[youtube] endpoint error', error: String(error) })
    return res.status(500).json({ message: error.message || 'Failed to process YouTube URL.' })
  }
})

export default router
