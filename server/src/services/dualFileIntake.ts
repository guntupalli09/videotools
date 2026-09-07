/**
 * Shared two-file ("dual") job intake logic for fix-subtitles (subtitle
 * required, video optional for scene context) and burn-subtitles (video +
 * subtitle both required), extracted from the original inline
 * `POST /api/upload/dual` handler so the first-party web upload route and
 * the external `/api/v1/subtitle-fixes` / `/api/v1/subtitle-burns` routes
 * call exactly the same validation, quota-enforcement, and enqueue path —
 * mirrors services/transcriptionIntake.ts's single-file pattern. There is
 * no second implementation of either pipeline.
 *
 * Like transcriptionIntake.ts, these functions do not write to the Express
 * response — they return the same TranscriptionIntakeResult discriminated
 * union, so callers (web route and /api/v1 routes) can map it to their own
 * response shape.
 */
import { Request } from 'express'
import { RequestWithId } from '../middleware/requestId'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { fileQueue, addJobToQueue, getTotalQueueCount as getQueueCountFromWorker, JobData } from '../workers/videoProcessor'
import { validateFileType, validateSubtitleFile } from '../utils/fileValidation'
import { enforceUsageLimits, getDailySoftCapConcurrency, getMaxMonthlyImports, getPlanLimits, applySystemLoadGuard, FREE_MONTHLY_IMPORT_QUOTA_MESSAGE, GUEST_DAILY_IMPORT_QUOTA_MESSAGE } from '../utils/limits'
import { resetDailyImportIfNeeded, resetDailyMinutesIfNeeded, resetUserUsageIfNeeded } from '../utils/usageReset'
import { getUser, saveUser, PlanType, User, atomicResetDailyImportIfNeeded, atomicResetDailyMinutesIfNeeded } from '../models/User'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { isQueueAtHardLimit, getSystemConcurrencyMultiplier } from '../utils/queueConfig'
import { checkAndRecordUpload } from '../utils/uploadRateLimit'
import { checkAndRecordGuestIpImport, extractClientIp } from '../utils/guestIpLimit'
import { insertJobRecord } from '../lib/jobAnalytics'
import { probeVideoDurationResult } from '../services/ffmpeg'
import { getLogger } from '../lib/logger'
import { enforceSubscriptionState, resolveRequestPlan } from '../utils/subscriptionGuard'
import { intakeError, type TranscriptionIntakeResult, type JobSource } from './transcriptionIntake'

const log = getLogger('api')

export interface DualFileIntakeOptions {
  source: JobSource
  apiKeyId?: string
  authenticatedUserId?: string
}

type MulterFields = { [fieldname: string]: Express.Multer.File[] }

function getFiles(req: Request): MulterFields {
  return (req.files as MulterFields) || {}
}

async function resolveUserAndPlan(req: Request, authenticatedUserId?: string) {
  const userId = authenticatedUserId ?? getEffectiveUserId(req) ?? `guest_${uuidv4()}`
  const auth = getAuthFromRequest(req)
  let user = await getUser(userId)
  const now = new Date()
  if (user) await enforceSubscriptionState(user, now)
  const plan = resolveRequestPlan(user, auth?.plan)
  return { userId, user, plan, now }
}

function buildEphemeralUser(userId: string, plan: PlanType, now: Date): User {
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    id: userId,
    email: `${userId}@example.com`,
    passwordHash: '',
    plan,
    stripeCustomerId: undefined,
    subscriptionId: undefined,
    paymentMethodId: undefined,
    usageThisMonth: {
      totalMinutes: 0, videoCount: 0, batchCount: 0, languageCount: 0, translatedMinutes: 0, importCount: 0, resetDate,
      importCountToday: 0,
      importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      dailyMinutesToday: 0,
      dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
    limits: getPlanLimits(plan),
    overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
    createdAt: now,
    updatedAt: now,
  } as User
}

function safeUnlink(path: string | undefined): void {
  if (!path) return
  try {
    fs.unlinkSync(path)
  } catch {
    // ignore cleanup errors
  }
}

async function getTotalQueueCount(): Promise<number> {
  return getQueueCountFromWorker()
}

/**
 * fix-subtitles via the two-file entry point: subtitle file required, video
 * file optional (used for scene-context-aware fixes). Identical logic to
 * the `isFixSubtitles` branch of the original `POST /api/upload/dual`
 * handler.
 */
export async function runFixSubtitlesDualIntake(
  req: Request,
  opts: DualFileIntakeOptions
): Promise<TranscriptionIntakeResult> {
  const files = getFiles(req)
  try {
    const { userId, plan } = await resolveUserAndPlan(req, opts.authenticatedUserId)

    if (userId.startsWith('guest_')) {
      const xUserId = (req.headers['x-user-id'] as string | undefined)?.trim()
      if (xUserId && !xUserId.startsWith('guest_') && xUserId !== 'demo-user') {
        safeUnlink(files.video?.[0]?.path)
        safeUnlink(files.subtitles?.[0]?.path)
        return intakeError(401, 'FORBIDDEN', 'Session expired. Please log in again.')
      }

      const clientIp = extractClientIp(req)
      if (!(await checkAndRecordGuestIpImport(clientIp))) {
        safeUnlink(files.video?.[0]?.path)
        safeUnlink(files.subtitles?.[0]?.path)
        return intakeError(403, 'QUOTA_EXCEEDED', GUEST_DAILY_IMPORT_QUOTA_MESSAGE)
      }
    }

    if (!files.subtitles) {
      safeUnlink(files.video?.[0]?.path)
      return intakeError(400, 'VALIDATION_ERROR', 'Subtitle file is required')
    }

    if (!(await checkAndRecordUpload(userId))) {
      return intakeError(429, 'RATE_LIMITED', 'Too many uploads. Please wait a minute before trying again.', 60)
    }

    const now = new Date()
    let fixUser = await getUser(userId)
    if (fixUser) {
      await enforceSubscriptionState(fixUser, now)
      if (resetUserUsageIfNeeded(fixUser, now)) await saveUser(fixUser)
      const dailyImportReset = resetDailyImportIfNeeded(fixUser, now)
      if (dailyImportReset) await atomicResetDailyImportIfNeeded(fixUser.id, now, fixUser.usageThisMonth.importCountTodayResetDate!)
    } else if (!userId.startsWith('guest_')) {
      fixUser = buildEphemeralUser(userId, plan, now)
      await saveUser(fixUser)
    }

    const fixMonthlyCap = getMaxMonthlyImports(plan)
    if (fixMonthlyCap !== null && fixUser && (fixUser.usageThisMonth.importCount ?? 0) >= fixMonthlyCap) {
      safeUnlink(files.subtitles[0].path)
      safeUnlink(files.video?.[0]?.path)
      return intakeError(403, 'QUOTA_EXCEEDED', FREE_MONTHLY_IMPORT_QUOTA_MESSAGE)
    }

    const subtitleFileForFix = files.subtitles[0]
    const videoFileForScenes = files.video?.[0]
    const subValidation = await validateSubtitleFile(subtitleFileForFix.path)
    if (subValidation.error) {
      safeUnlink(subtitleFileForFix.path)
      safeUnlink(videoFileForScenes?.path)
      return intakeError(400, 'UNSUPPORTED_FILE', subValidation.error)
    }

    const fixJob = await addJobToQueue(plan, {
      toolType: 'fix-subtitles',
      filePath: subtitleFileForFix.path,
      filePath2: videoFileForScenes?.path,
      userId,
      plan,
      originalName: subtitleFileForFix.originalname,
      fileSize: subtitleFileForFix.size,
      requestId: (req as RequestWithId).requestId,
    })
    const jobToken = (fixJob.data as JobData)?.jobToken
    try {
      await insertJobRecord({
        id: String(fixJob.id),
        userId,
        toolType: 'fix-subtitles',
        planAtRun: plan,
        fileSizeBytes: subtitleFileForFix.size,
        jobToken,
        source: opts.source,
        apiKeyId: opts.apiKeyId,
      })
    } catch {
      // non-blocking
    }

    return { ok: true, jobId: String(fixJob.id), jobToken }
  } catch (error) {
    log.error({ msg: 'fix_subtitles_dual_intake_error', error: error instanceof Error ? error.message : String(error) })
    safeUnlink(files.video?.[0]?.path)
    safeUnlink(files.subtitles?.[0]?.path)
    return intakeError(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Upload failed')
  }
}

/**
 * burn-subtitles: video + subtitle files both required. Identical logic to
 * the burn-subtitles branch of the original `POST /api/upload/dual` handler
 * — this is the *only* production entry point for burn-subtitles (there is
 * no single-file variant), so the external API must accept two files too.
 */
export async function runBurnSubtitlesIntake(
  req: Request,
  opts: DualFileIntakeOptions
): Promise<TranscriptionIntakeResult> {
  const files = getFiles(req)
  try {
    const { userId, plan, now } = await resolveUserAndPlan(req, opts.authenticatedUserId)

    if (userId.startsWith('guest_')) {
      const xUserId = (req.headers['x-user-id'] as string | undefined)?.trim()
      if (xUserId && !xUserId.startsWith('guest_') && xUserId !== 'demo-user') {
        safeUnlink(files.video?.[0]?.path)
        safeUnlink(files.subtitles?.[0]?.path)
        return intakeError(401, 'FORBIDDEN', 'Session expired. Please log in again.')
      }
      const clientIp = extractClientIp(req)
      if (!(await checkAndRecordGuestIpImport(clientIp))) {
        safeUnlink(files.video?.[0]?.path)
        safeUnlink(files.subtitles?.[0]?.path)
        return intakeError(403, 'QUOTA_EXCEEDED', GUEST_DAILY_IMPORT_QUOTA_MESSAGE)
      }
    }

    if (!(await checkAndRecordUpload(userId))) {
      safeUnlink(files.video?.[0]?.path)
      safeUnlink(files.subtitles?.[0]?.path)
      return intakeError(429, 'RATE_LIMITED', 'Too many uploads. Please wait a minute before trying again.', 60)
    }

    const queueCount = await getTotalQueueCount()
    if (isQueueAtHardLimit(queueCount)) {
      safeUnlink(files.video?.[0]?.path)
      safeUnlink(files.subtitles?.[0]?.path)
      return intakeError(503, 'INTERNAL_ERROR', 'High demand right now. Please retry shortly.', 30)
    }

    if (!files.video || !files.subtitles) {
      safeUnlink(files.video?.[0]?.path)
      safeUnlink(files.subtitles?.[0]?.path)
      return intakeError(400, 'VALIDATION_ERROR', 'Both video and subtitle files are required')
    }

    const videoFile = files.video[0]
    const subtitleFile = files.subtitles[0]

    let burnUser = await getUser(userId)
    const burnLimits = getPlanLimits(plan)
    if (!burnUser) {
      burnUser = buildEphemeralUser(userId, plan, now)
      if (!userId.startsWith('guest_')) await saveUser(burnUser)
    } else {
      if (burnUser.plan !== plan) {
        burnUser.plan = plan
        burnUser.limits = getPlanLimits(plan)
        burnUser.updatedAt = now
        await saveUser(burnUser)
      }
      if (resetUserUsageIfNeeded(burnUser, now)) await saveUser(burnUser)
      const dailyImportReset = resetDailyImportIfNeeded(burnUser, now)
      const dailyMinutesReset = resetDailyMinutesIfNeeded(burnUser, now)
      if (dailyImportReset) await atomicResetDailyImportIfNeeded(burnUser.id, now, burnUser.usageThisMonth.importCountTodayResetDate!)
      if (dailyMinutesReset) await atomicResetDailyMinutesIfNeeded(burnUser.id, now, burnUser.usageThisMonth.dailyMinutesTodayResetDate!)
    }

    const burnMonthlyCap = getMaxMonthlyImports(burnUser.plan)
    if (burnMonthlyCap !== null && (burnUser.usageThisMonth.importCount ?? 0) >= burnMonthlyCap) {
      safeUnlink(videoFile.path)
      safeUnlink(subtitleFile.path)
      return intakeError(403, 'QUOTA_EXCEEDED', FREE_MONTHLY_IMPORT_QUOTA_MESSAGE)
    }

    const activeJobs = await fileQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeForUser = activeJobs.filter((j) => (j.data as JobData)?.userId === userId)
    const burnPlanConcurrency = getDailySoftCapConcurrency(plan, burnUser?.usageThisMonth?.dailyMinutesToday ?? 0)
    const burnEffectiveConcurrency = applySystemLoadGuard(burnPlanConcurrency, getSystemConcurrencyMultiplier(queueCount))
    if (activeForUser.length >= burnEffectiveConcurrency) {
      safeUnlink(videoFile.path)
      safeUnlink(subtitleFile.path)
      return intakeError(429, 'QUOTA_EXCEEDED', 'MAX_CONCURRENT_JOBS_REACHED')
    }

    if (videoFile.size > burnLimits.maxFileSize) {
      safeUnlink(videoFile.path)
      safeUnlink(subtitleFile.path)
      return intakeError(400, 'FILE_TOO_LARGE', 'File exceeds plan limit. Upgrade for larger files.')
    }

    const videoTypeError = await validateFileType(videoFile.path, videoFile.originalname)
    if (videoTypeError) {
      safeUnlink(videoFile.path)
      safeUnlink(subtitleFile.path)
      return intakeError(400, 'UNSUPPORTED_FILE', videoTypeError)
    }

    const subResult = await validateSubtitleFile(subtitleFile.path)
    log.info({
      msg: '[upload] subtitle validation (dual)',
      toolType: 'burn-subtitles',
      originalname: subtitleFile.originalname,
      detectedFormat: subResult.detectedFormat,
      validationError: subResult.error ?? undefined,
    })
    if (subResult.error) {
      safeUnlink(videoFile.path)
      safeUnlink(subtitleFile.path)
      return intakeError(400, 'UNSUPPORTED_FILE', subResult.error)
    }

    const { trimmedStart, trimmedEnd, burnFontSize, burnPosition, burnBackgroundOpacity } = req.body
    let durationSeconds: number
    const probe = await probeVideoDurationResult(videoFile.path)
    durationSeconds = probe.known ? probe.seconds : 0
    if (!probe.known) {
      log.info({ msg: 'upload_duration_unknown_allowing_job', toolType: 'burn-subtitles', duration_source: probe.source })
    }
    if (trimmedStart !== null && trimmedStart !== undefined && trimmedEnd !== null && trimmedEnd !== undefined) {
      const start = parseFloat(String(trimmedStart))
      const end = parseFloat(String(trimmedEnd))
      durationSeconds = Math.max(0, end - start)
    }
    const requestedMinutes = Math.ceil(durationSeconds / 60)
    if (burnUser.plan !== 'free') {
      const limitCheck = await enforceUsageLimits(burnUser, requestedMinutes)
      if (!limitCheck.allowed) {
        safeUnlink(videoFile.path)
        safeUnlink(subtitleFile.path)
        return intakeError(403, 'QUOTA_EXCEEDED', 'Monthly minute limit reached. Upgrade or wait for reset.')
      }
    }

    const job = await addJobToQueue(plan, {
      toolType: 'burn-subtitles',
      filePath: videoFile.path,
      filePath2: subtitleFile.path,
      userId,
      plan,
      originalName: videoFile.originalname,
      originalName2: subtitleFile.originalname,
      fileSize: videoFile.size,
      trimmedStart: trimmedStart !== null && trimmedStart !== undefined ? parseFloat(String(trimmedStart)) : undefined,
      trimmedEnd: trimmedEnd !== null && trimmedEnd !== undefined ? parseFloat(String(trimmedEnd)) : undefined,
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
    const jobToken = (job.data as JobData)?.jobToken
    try {
      await insertJobRecord({
        id: String(job.id),
        userId,
        toolType: 'burn-subtitles',
        planAtRun: plan,
        fileSizeBytes: videoFile.size,
        jobToken,
        source: opts.source,
        apiKeyId: opts.apiKeyId,
      })
    } catch {
      // non-blocking
    }

    return { ok: true, jobId: String(job.id), jobToken }
  } catch (error) {
    log.error({ msg: 'burn_subtitles_intake_error', error: error instanceof Error ? error.message : String(error) })
    safeUnlink(files.video?.[0]?.path)
    safeUnlink(files.subtitles?.[0]?.path)
    return intakeError(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Upload failed')
  }
}
