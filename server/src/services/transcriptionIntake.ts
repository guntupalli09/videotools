/**
 * Shared transcription-job intake logic, extracted from the original
 * `POST /api/upload` handler so the first-party web upload route and the
 * external `POST /api/v1/transcriptions` route call exactly the same
 * validation, quota-enforcement, and enqueue path — there is no second
 * transcription pipeline and no duplicated entitlement logic.
 *
 * This function does not write to the Express response. It returns a
 * discriminated result; each route maps that result to its own response
 * shape (the web route keeps its original `{ message }` error/`{ jobId,
 * status, jobToken }` success shape; the v1 route maps to the external
 * `{ error: { code, message } }` / `{ id, status, created_at }` contract).
 */
import { Request } from 'express'
import { RequestWithId } from '../middleware/requestId'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { fileQueue, addJobToQueue, getTotalQueueCount as getQueueCountFromWorker, JobData } from '../workers/videoProcessor'
import { validateFileType, validateSubtitleFile } from '../utils/fileValidation'
import { enforceLanguageLimits, enforceUsageLimits, getDailySoftCapConcurrency, getMaxMonthlyImports, getPlanLimits, applySystemLoadGuard, FREE_MONTHLY_IMPORT_QUOTA_MESSAGE, GUEST_DAILY_IMPORT_QUOTA_MESSAGE } from '../utils/limits'
import { resetDailyImportIfNeeded, resetDailyMinutesIfNeeded, resetUserUsageIfNeeded } from '../utils/usageReset'
import { getUser, saveUser, PlanType, User, atomicResetDailyImportIfNeeded, atomicResetDailyMinutesIfNeeded } from '../models/User'
import { hashFile, checkDuplicateProcessing } from './duplicate'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { isQueueAtHardLimit, isQueueAtSoftLimit, getSystemConcurrencyMultiplier } from '../utils/queueConfig'
import { checkAndRecordUpload } from '../utils/uploadRateLimit'
import { checkAndRecordGuestIpImport, extractClientIp } from '../utils/guestIpLimit'
import { trackJobCreated } from '../utils/analytics'
import { insertJobRecord } from '../lib/jobAnalytics'
import { probeVideoDurationResult } from '../services/ffmpeg'
import { getLogger } from '../lib/logger'
import { enforceSubscriptionState, resolveRequestPlan } from '../utils/subscriptionGuard'
import { normalizeLanguageCode } from '../utils/normalizeLanguage'
import type { ApiErrorCode } from '../utils/apiErrors'
import { resolveToolType } from './toolTypeResolution'

function notNullish<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined
}

const intakeLog = getLogger('api')

/** Where a transcription request originated. Server-set only — never read from client input. */
export type JobSource = 'web' | 'api' | 'zapier'

export interface TranscriptionIntakeOptions {
  source: JobSource
  apiKeyId?: string
  authenticatedUserId?: string
  /**
   * When set, overrides whatever `toolType` the client sent in the request
   * body. External API routes (POST /api/v1/transcriptions etc.) always set
   * this to the exact internal tool type their endpoint represents — the
   * route itself decides the operation, never client input. See
   * services/apiOperations.ts for the authoritative public->internal
   * mapping. The web upload route never sets this, so its behavior (client
   * chooses toolType) is unchanged.
   */
  forcedToolType?: string
}

export interface TranscriptionIntakeSuccess {
  ok: true
  jobId: string
  jobToken?: string
}

export interface TranscriptionIntakeError {
  ok: false
  httpStatus: number
  code: ApiErrorCode
  message: string
  retryAfterSeconds?: number
}

export type TranscriptionIntakeResult = TranscriptionIntakeSuccess | TranscriptionIntakeError

async function getTotalQueueCount(): Promise<number> {
  return getQueueCountFromWorker()
}

function err(httpStatus: number, code: ApiErrorCode, message: string, retryAfterSeconds?: number): TranscriptionIntakeError {
  return { ok: false, httpStatus, code, message, retryAfterSeconds }
}

/** Exported so other server-derived-operation intake pipelines (e.g. services/dualFileIntake.ts)
 *  can return the same discriminated result shape without duplicating it. */
export const intakeError = err

export { resolveToolType } from './toolTypeResolution'

/**
 * Core "create a transcription job from an uploaded file" pipeline. Identical
 * behavior to the original inline `POST /api/upload` handler — validation
 * order, quota checks, and enqueue call are unchanged, only extracted into a
 * response-agnostic function. `req.file` (set by multer) is required.
 */
export async function runTranscriptionIntake(
  req: Request,
  opts: TranscriptionIntakeOptions
): Promise<TranscriptionIntakeResult> {
  try {
    const userId =
      opts.authenticatedUserId ??
      getEffectiveUserId(req) ??
      `guest_${uuidv4()}`

    if (userId.startsWith('guest_')) {
      const xUserId = (req.headers['x-user-id'] as string | undefined)?.trim()
      if (xUserId && !xUserId.startsWith('guest_') && xUserId !== 'demo-user') {
        if (req.file) try { fs.unlinkSync(req.file.path) } catch { /* ignore */ }
        return err(401, 'FORBIDDEN', 'Session expired. Please log in again.')
      }
    }

    const { toolType: clientToolType, url, webhookUrl, ...options } = req.body
    const toolType = resolveToolType(clientToolType, opts.forcedToolType)

    if (url && (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles')) {
      return err(400, 'VALIDATION_ERROR', 'URL downloads are temporarily disabled.')
    }

    const auth = getAuthFromRequest(req)
    const rateLimitKey = userId
    let user = await getUser(userId)
    const now = new Date()
    if (user) await enforceSubscriptionState(user, now)
    const plan = resolveRequestPlan(user, auth?.plan)

    // Guest IP daily cap — prevents limit bypass via fresh guest UUIDs per request
    if (userId.startsWith('guest_')) {
      const clientIp = extractClientIp(req)
      if (!await checkAndRecordGuestIpImport(clientIp)) {
        if (req.file) try { fs.unlinkSync(req.file.path) } catch { /* ignore */ }
        return err(403, 'QUOTA_EXCEEDED', GUEST_DAILY_IMPORT_QUOTA_MESSAGE)
      }
    }

    if (!await checkAndRecordUpload(rateLimitKey)) {
      return err(429, 'RATE_LIMITED', 'Too many uploads. Please wait a minute before trying again.', 60)
    }

    const queueCount = await getTotalQueueCount()
    if (isQueueAtHardLimit(queueCount)) {
      return err(503, 'INTERNAL_ERROR', 'High demand right now. Please retry shortly.', 30)
    }
    if (isQueueAtSoftLimit(queueCount) && plan === 'free') {
      return err(503, 'INTERNAL_ERROR', 'High demand right now. Please retry shortly.', 60)
    }

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
      } as User
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

    // Free plan: 3 imports per calendar month (resets on the 1st UTC)
    const monthlyCap = getMaxMonthlyImports(user.plan)
    if (monthlyCap !== null && (user.usageThisMonth.importCount ?? 0) >= monthlyCap) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path) } catch { /* ignore */ }
      }
      return err(403, 'QUOTA_EXCEEDED', FREE_MONTHLY_IMPORT_QUOTA_MESSAGE)
    }

    const activeJobs = await fileQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeForUser = activeJobs.filter((j) => (j.data as JobData)?.userId === userId)
    const planConcurrency = getDailySoftCapConcurrency(plan, user?.usageThisMonth?.dailyMinutesToday ?? 0)
    const effectiveConcurrency = applySystemLoadGuard(planConcurrency, getSystemConcurrencyMultiplier(queueCount))
    if (activeForUser.length >= effectiveConcurrency) {
      return err(429, 'QUOTA_EXCEEDED', 'MAX_CONCURRENT_JOBS_REACHED')
    }

    if (!toolType) {
      return err(400, 'VALIDATION_ERROR', 'toolType is required')
    }

    if (!req.file) {
      intakeLog.warn({ msg: '[upload] no file in request', toolType, bodyKeys: Object.keys(req.body) })
      return err(400, 'VALIDATION_ERROR', 'No file uploaded')
    }
    const file = req.file

    if (file.size > limits.maxFileSize) {
      fs.unlinkSync(file.path)
      return err(400, 'FILE_TOO_LARGE', 'File exceeds plan limit. Upgrade for larger files.')
    }

    const allowedAudioExt = ['.mp3', '.webm', '.wav', '.m4a']
    const looksLikeAudio =
      (file.mimetype && file.mimetype.startsWith('audio/')) ||
      allowedAudioExt.some((ext) => file.originalname.toLowerCase().endsWith(ext))
    const isAudioOnlyUpload =
      (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles') &&
      (req.body.uploadMode === 'audio-only' || looksLikeAudio)
    const inputType: 'video' | 'audio' = isAudioOnlyUpload && looksLikeAudio ? 'audio' : 'video'
    const originalNameForJob =
      inputType === 'audio' && req.body.originalFileName
        ? String(req.body.originalFileName)
        : file.originalname

    let typeError: string | null = null
    if (toolType === 'translate-subtitles' || toolType === 'fix-subtitles' || toolType === 'convert-subtitles') {
      const isPlainText = file.originalname.toLowerCase().endsWith('.txt')
      if (toolType === 'translate-subtitles' && isPlainText) {
        intakeLog.info({ msg: '[upload] txt translation file accepted', originalname: file.originalname })
      } else {
        const subResult = await validateSubtitleFile(file.path)
        intakeLog.info({
          msg: '[upload] subtitle validation',
          toolType,
          originalname: file.originalname,
          detectedFormat: subResult.detectedFormat,
          validationError: subResult.error ?? undefined,
        })
        if (subResult.error) {
          typeError = subResult.error
        }
      }
    } else if (toolType !== 'burn-subtitles' && inputType !== 'audio') {
      typeError = await validateFileType(file.path, file.originalname)
    }

    if (typeError) {
      fs.unlinkSync(file.path)
      return err(400, 'UNSUPPORTED_FILE', typeError)
    }

    let additionalLanguages: string[] = []
    if (options.additionalLanguages) {
      try {
        additionalLanguages = typeof options.additionalLanguages === 'string'
          ? JSON.parse(options.additionalLanguages)
          : options.additionalLanguages
      } catch {
        // Ignore parse errors
      }
    }

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
      language: normalizeLanguageCode(options.language),
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
      // Speaker diarization is a paid-plan feature (real Replicate GPU cost per job) —
      // never trust a client-supplied flag; free plan never gets it regardless of what was sent.
      speakerDiarization: plan !== 'free' && (options.speakerDiarization === true || options.speakerDiarization === 'true'),
      numSpeakers: options.numSpeakers ? Number(options.numSpeakers) : undefined,
      diarizationLanguage: typeof options.diarizationLanguage === 'string' && options.diarizationLanguage.trim() ? options.diarizationLanguage.trim() : undefined,
      glossary: typeof options.glossary === 'string' && options.glossary.trim() ? options.glossary.trim() : undefined,
      exportFormats,
    }
    if (additionalLanguages.length > 0) {
      jobOptions.additionalLanguages = additionalLanguages
    }

    if (user && toolType === 'video-to-subtitles' && additionalLanguages.length > 0) {
      const langCheck = enforceLanguageLimits(user, additionalLanguages)
      if (!langCheck.allowed) {
        fs.unlinkSync(file.path)
        return err(403, 'QUOTA_EXCEEDED', langCheck.reason || 'MULTI_LANGUAGE_NOT_AVAILABLE')
      }
    }

    const minuteChargingTools = ['video-to-transcript', 'video-to-subtitles', 'burn-subtitles', 'compress-video']
    if (minuteChargingTools.includes(toolType)) {
      const probe = await probeVideoDurationResult(file.path)
      let durationSeconds = probe.known ? probe.seconds : 0
      if (!probe.known) {
        intakeLog.info({
          msg: 'upload_duration_unknown',
          toolType,
          plan: user.plan,
          duration_source: probe.source,
        })
      }
      if (notNullish(options.trimmedStart) && notNullish(options.trimmedEnd)) {
        const start = parseFloat(String(options.trimmedStart))
        const end = parseFloat(String(options.trimmedEnd))
        durationSeconds = Math.max(0, end - start)
      }

      const durationLimits = getPlanLimits(user.plan)
      if (probe.known && durationSeconds > durationLimits.maxVideoDuration * 60) {
        fs.unlinkSync(file.path)
        const durationMin = Math.round(durationSeconds / 60)
        return err(
          400,
          'DURATION_EXCEEDED',
          `Video is ${durationMin} minutes — your plan allows up to ${durationLimits.maxVideoDuration} minutes per video. Trim or upgrade.`
        )
      }
      if (!probe.known && user.plan === 'free') {
        fs.unlinkSync(file.path)
        return err(400, 'UNSUPPORTED_FILE', 'Could not determine video length. Please re-encode the file or try a different format.')
      }

      if (user.plan !== 'free') {
        const requestedMinutes = Math.ceil(durationSeconds / 60)
        const limitCheck = await enforceUsageLimits(user, requestedMinutes)
        if (!limitCheck.allowed) {
          fs.unlinkSync(file.path)
          return err(403, 'QUOTA_EXCEEDED', 'Monthly minute limit reached. Upgrade or wait for reset.')
        }
      }
    }

    let videoHash: string | undefined
    if (
      userId &&
      (toolType === 'video-to-transcript' || toolType === 'video-to-subtitles') &&
      inputType !== 'audio'
    ) {
      try {
        videoHash = await hashFile(file.path)
        const cacheOptions = { ...jobOptions } as Record<string, unknown>
        if (notNullish(options.trimmedStart)) cacheOptions.trimmedStart = parseFloat(String(options.trimmedStart))
        if (notNullish(options.trimmedEnd)) cacheOptions.trimmedEnd = parseFloat(String(options.trimmedEnd))
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
          const cachedJobToken = (cachedJob.data as JobData)?.jobToken
          try {
            await insertJobRecord({
              id: String(cachedJob.id),
              userId,
              toolType: 'cached-result',
              planAtRun: plan,
              jobToken: cachedJobToken,
              source: opts.source,
              apiKeyId: opts.apiKeyId,
            })
          } catch {
            // non-blocking
          }

          return { ok: true, jobId: String(cachedJob.id), jobToken: cachedJobToken }
        }
      } catch {
        // If hashing fails, fall back to normal processing
      }
    }

    let parsedPrecomputedTranscript: JobData['precomputedTranscript'] | undefined
    if (typeof options.precomputedTranscript === 'string' && options.precomputedTranscript.trim()) {
      try {
        parsedPrecomputedTranscript = JSON.parse(options.precomputedTranscript)
      } catch {
        // Ignore — fall back to normal Whisper transcription
      }
    }

    const job = await addJobToQueue(plan, {
      toolType,
      filePath: file.path,
      userId,
      plan,
      videoHash,
      originalName: originalNameForJob,
      fileSize: file.size,
      trimmedStart: notNullish(options.trimmedStart) ? parseFloat(String(options.trimmedStart)) : undefined,
      trimmedEnd: notNullish(options.trimmedEnd) ? parseFloat(String(options.trimmedEnd)) : undefined,
      options: Object.keys(jobOptions).length > 0 ? jobOptions : undefined,
      webhookUrl: typeof webhookUrl === 'string' && webhookUrl.trim() ? webhookUrl.trim() : undefined,
      inputType: inputType === 'audio' ? 'audio' : undefined,
      requestId: (req as RequestWithId).requestId,
      ...(parsedPrecomputedTranscript && { precomputedTranscript: parsedPrecomputedTranscript }),
    })
    const jobToken = (job.data as JobData)?.jobToken
    try {
      trackJobCreated({
        job_id: String(job.id),
        user_id: userId,
        tool_type: toolType,
        file_size_bytes: file.size,
        plan,
      })
    } catch {
      // non-blocking
    }
    try {
      await insertJobRecord({
        id: String(job.id),
        userId,
        toolType: inputType === 'audio' ? 'voice-to-transcript' : toolType,
        planAtRun: plan,
        fileSizeBytes: file.size,
        jobToken,
        source: opts.source,
        apiKeyId: opts.apiKeyId,
      })
    } catch {
      // non-blocking
    }

    return { ok: true, jobId: String(job.id), jobToken }
  } catch (error: any) {
    intakeLog.error({ msg: 'Upload error', error: String(error) })
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch {
        // Ignore cleanup errors
      }
    }
    return err(500, 'INTERNAL_ERROR', error?.message || 'Upload failed')
  }
}
