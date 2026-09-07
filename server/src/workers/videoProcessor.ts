import 'dotenv/config'
import crypto from 'crypto'
import os from 'os'
import Queue from 'bull'
import path from 'path'
import fs from 'fs'
import archiver from 'archiver'
import { transcribeVideo, transcribeVideoVerbose, transcribeAudioGapWindows } from '../services/transcription'
import { translateSubtitleFile, translateSubtitles, detectLanguageConsistency, translatePreservingLines } from '../services/translation'
import { fixSubtitleFile, validateSubtitleFile, validateAgainstSceneCuts } from '../services/subtitles'
import { generateSummary, generateChapters } from '../services/transcriptSummary'
import { exportTranscriptJson, exportTranscriptDocx, exportTranscriptPdf } from '../services/transcriptExport'
import { fireWebhook } from '../utils/webhook'
import { transcribeWithDiarization, resolveSpeakerNames } from '../services/diarization'
import { convertSubtitleFile } from '../services/subtitleConverter'
import { burnSubtitles, compressVideo, HUNG_JOB_MESSAGE, extractAudioForPlayback, detectSceneCuts, type CompressProfile } from '../services/ffmpeg'
import {
  downloadVideoFromURL,
  validateVideoDuration,
  resolveMeteringSeconds,
  type ValidateVideoDurationResult,
} from '../services/video'
import {
  audioExtractFilename,
  joinExportFilename,
  langCodeForFile,
  subtitlesConvertedFilename,
  subtitlesFixedFilename,
  subtitlesMultilangZipFilename,
  subtitlesOriginalFilename,
  subtitlesTranslatedFilename,
  targetLangFileSlug,
  transcriptBundleZipFilename,
  transcriptOriginalFilename,
  transcriptTranslatedTextFilename,
  videoBurnedInFilename,
  videoCompressedFilename,
} from '../utils/exportFileNames'
import { validateFileType, validateFileSize } from '../utils/fileValidation'
import { trimVideoSegment } from '../services/trimming'
import { LANGUAGE_NAMES, generateMultiLanguageSubtitles } from '../services/multiLanguage'
import { BatchJob, appendBatchFailure, getBatchById, incrementBatchProcessedVideos, saveBatch } from '../models/BatchJob'
import { getUser, saveUser, incrementUserUsage, PlanType } from '../models/User'
import { recordFreePlanImport } from '../utils/importQuota'
import { getPlanLimits, getJobPriority, getMaxJobRuntimeMinutes } from '../utils/limits'
import { resetUserUsageIfNeeded } from '../utils/usageReset'
import { calculateTranslationMinutes, secondsToMinutes } from '../utils/metering'
import { saveDuplicateResult } from '../services/duplicate'
import { createRedisClient } from '../utils/redis'
import { WORKER_HEARTBEAT_KEY, HEARTBEAT_TTL_SEC } from '../utils/workerHeartbeat'
import { parseSRT, parseVTT, detectSubtitleFormat, toSRT, toVTT } from '../utils/srtParser'
import { formatTranscript } from '../utils/transcriptFormatter'
import { segmentToStructuredText } from '../utils/pauseSegmenter'
import type { SubtitleEntry } from '../utils/srtParser'
import { createPartialWriter, deleteJobPartial } from '../utils/jobPartial'
import { setJobSummary } from '../utils/jobSummary'
import { waitForFileStable } from '../utils/fileStable'
import { registerActiveFiles, deregisterActiveFiles } from '../utils/activeFiles'
import { PROCESSING_V2, STREAM_PROGRESS, WORKER_CONCURRENCY_V2, YOUTUBE_QUEUE_SEPARATION } from '../utils/featureFlags'
import { MAX_GLOBAL_WORKERS, PAID_TIER_RESERVATION_QUEUE_THRESHOLD } from '../utils/queueConfig'
import {
  trackProcessingStarted,
  trackProcessingFinished,
  trackProcessingFailed,
  trackJobTimedOut,
  trackFirstPaidJobCompleted,
} from '../utils/analytics'
import { captureFunnelEvent } from '../utils/funnelEvents'
import {
  updateJobStarted,
  updateJobCompleted,
  updateJobFailed,
  updateJobDurationAndCosts,
  calcWhisperCostMicros,
} from '../lib/jobAnalytics'
import { withJobContext, withJobContextFull, getLogger } from '../lib/logger'
import { initSentry, captureJobError } from '../lib/sentry'
import { pushLogEntry } from '../lib/logRing'
import { incrementResendCounter } from '../lib/apiCreditsCache'
import {
  streamYoutubeAudioToFile,
  fetchYoutubeCaptions,
  evaluateCaptionDecision,
  type CaptionPatchWindow,
  type YoutubeAttemptCollector,
  type YoutubeAttemptRecord,
} from '../services/youtube'
import { resetProxyPoolState } from '../utils/youtubeProxyPool'
import { v4 as uuidv4 } from 'uuid'
import { startGuidelineWorker } from './guidelineProcessor'

/**
 * Fires 'first_paid_job_completed' analytics event exactly once per user.
 * Called before incrementUserUsage so we can check videoCount === 0.
 * No-op for free users or if videoCount > 0 already.
 */
async function maybeTrackFirstPaidJob(userId: string, plan: PlanType, toolType: string, jobId: string | number): Promise<void> {
  if (plan === 'free') return
  try {
    const snapshot = await getUser(userId)
    if (snapshot && (snapshot.usageThisMonth.videoCount ?? 0) === 0) {
      trackFirstPaidJobCompleted({ user_id: userId, plan, tool_type: toolType, job_id: String(jobId) })
    }
  } catch { /* non-blocking */ }
}

/** Inline stage helpers — write directly to Redis so no cross-file import is required. */
const JOB_STAGE_TTL = 3600
const jobStageKey = (id: string | number) => `job:stage:${id}`
async function setJobStage(redis: import('ioredis').Redis, id: string | number, stage: string): Promise<void> {
  try { await redis.set(jobStageKey(id), stage, 'EX', JOB_STAGE_TTL) } catch { /* non-blocking */ }
}
async function deleteJobStage(redis: import('ioredis').Redis, id: string | number): Promise<void> {
  try { await redis.del(jobStageKey(id)) } catch { /* non-blocking */ }
}

const workerLog = getLogger('worker')

const JOB_COMPLETED_EMAIL_SUBJECT = 'Your transcript is ready →'
const jobCompletedEmailRedis = createRedisClient('client')

function isRealEmail(email: string | undefined | null): email is string {
  return Boolean(email && email.includes('@') && !email.startsWith('demo-user-'))
}

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
  const pathWithSlash = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${baseUrl}${pathWithSlash}`
}

async function sendJobCompletedEmail(params: { jobId: string; userId?: string; downloadUrl?: string }): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey || !params.userId || !params.downloadUrl) return

  const lock = await jobCompletedEmailRedis.set(`job_completed_email:${params.jobId}`, '1', 'EX', 30 * 24 * 60 * 60, 'NX')
  if (lock !== 'OK') return

  const user = await getUser(params.userId)
  if (!isRealEmail(user?.email)) return

  const link = absoluteUrl(params.downloadUrl)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>',
      to: [user.email],
      subject: JOB_COMPLETED_EMAIL_SUBJECT,
      text: `Your transcript is ready →\n\n${link}`,
    }),
    signal: AbortSignal.timeout(8_000),
  })

  if (res.ok) {
    incrementResendCounter()
    workerLog.info({ msg: 'job_completed_email_sent', jobId: params.jobId, userId: params.userId })
    return
  }

  const body = await res.text().catch(() => '')
  workerLog.warn({ msg: 'job_completed_email_failed', jobId: params.jobId, userId: params.userId, status: res.status, body })
}


/** Lock settings: 10-minute lock (covers long YouTube audio downloads) with 15s renewal intervals. */
const QUEUE_SETTINGS = {
  createClient: createRedisClient,
  settings: {
    lockDuration: 600000,   // 10 minutes — covers yt-dlp + Whisper for long videos
    lockRenewTime: 15000,   // renew every 15s (well before 600s expiry)
    maxStalledCount: 3,     // allow 3 stalls before marking permanently failed
    stalledInterval: 30000, // check for stalled jobs every 30s
  },
}

export const fileQueue = new Queue('file-processing', QUEUE_SETTINGS)

/** Phase 2.5: Pro/Agency jobs when queue > 50 get 1 dedicated worker; remaining 2 serve all tiers. */
export const priorityQueue = new Queue('file-processing-priority', QUEUE_SETTINGS)

/** Phase 8: YouTube pipeline separation. Bull default lockDuration (30s) causes "job stalled" on caption fetch.
 *  lockDuration 10min, lockRenewTime 15s = lock renewed every 15s during processing.
 *  Verify deployed worker has these settings — rebuild image if stalling persists. */
const YT_QUEUE_OPTS = {
  createClient: createRedisClient,
  settings: {
    lockDuration: 600000,
    lockRenewTime: 15000,
    maxStalledCount: 3,
    stalledInterval: 60000,
  },
}
export const captionQueue = new Queue('youtube-caption-v2', YT_QUEUE_OPTS)
export const audioQueue = new Queue('youtube-audio-v2', YT_QUEUE_OPTS)
export const transcriptionQueue = new Queue('youtube-transcription-v2', {
  createClient: createRedisClient,
  settings: { lockDuration: 1800000, lockRenewTime: 60000, maxStalledCount: 3, stalledInterval: 60000 },
})

export async function getTotalQueueCount(): Promise<number> {
  const queues = [fileQueue, priorityQueue, ...(YOUTUBE_QUEUE_SEPARATION ? [captionQueue, audioQueue, transcriptionQueue] : [])]
  const counts = await Promise.all(queues.map((q: import('bull').Queue<JobData>) => q.getJobCounts()))
  return counts.reduce((sum: number, c: { waiting?: number; active?: number; delayed?: number }) => sum + (c.waiting ?? 0) + (c.active ?? 0) + (c.delayed ?? 0), 0)
}

/** Add job to the appropriate queue by plan (Pro/Agency → priority when reservation active). Always attaches jobToken for polling. */
export async function addJobToQueue(
  plan: PlanType,
  data: JobData,
  options?: { priority?: number }
) {
  const jobToken = data.jobToken ?? crypto.randomUUID()
  const jobData: JobData = { ...data, jobToken }
  const priority = options?.priority ?? getJobPriority(plan)
  const totalCount = await getTotalQueueCount()
  const usePriorityQueue =
    (plan === 'pro' || plan === 'agency') &&
    totalCount > PAID_TIER_RESERVATION_QUEUE_THRESHOLD
  // Use the UUID jobToken as the Bull job ID so the DB record ID never conflicts
  // with auto-incremented IDs from a previous Redis instance or queue flush.
  const jobOptions = {
    priority,
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    jobId: jobToken,
  }
  if (YOUTUBE_QUEUE_SEPARATION && data.toolType === 'youtube-to-transcript') {
    return captionQueue.add(jobData, jobOptions)
  }
  if (usePriorityQueue) {
    return priorityQueue.add(jobData, jobOptions)
  }
  return fileQueue.add(jobData, jobOptions)
}

/** Get job by ID from either queue (for status endpoint). Hand-off chain: caption → audio → transcription. */
export async function getJobById(jobId: string) {
  let job = await priorityQueue.getJob(jobId)
  if (job) return job
  job = await fileQueue.getJob(jobId)
  if (job) return job
  if (!YOUTUBE_QUEUE_SEPARATION) return null
  const ytQueues = [captionQueue, audioQueue, transcriptionQueue]
  for (const q of ytQueues) {
    const j = await q.getJob(jobId)
    if (!j) continue
    const rv = j.returnvalue
    if ((await j.getState()) === 'completed' && rv && typeof rv === 'object' && (rv as any).__handedOff) continue
    return j
  }
  return null
}

export interface JobData {
  toolType: string
  userId?: string
  /** Token for anonymous job polling; always set at job creation. */
  jobToken?: string
  plan?: PlanType
  videoHash?: string
  cachedResult?: { downloadUrl: string; fileName?: string }
  filePath?: string
  filePath2?: string // For burn-subtitles (video + subtitle)
  originalName?: string
  originalName2?: string
  fileSize?: number
  url?: string // Legacy; URL downloads disabled — worker rejects if present
  batchId?: string // For batch processing
  batchPosition?: number
  batchTotal?: number
  trimmedStart?: number // seconds
  trimmedEnd?: number // seconds
  /** When set, file at filePath is pre-extracted audio; skip server-side extractAudio. */
  inputType?: 'audio'
  /** Request ID from API for correlation (UI → API → worker). */
  requestId?: string
  options?: {
    format?: 'srt' | 'vtt'
    language?: string
    targetLanguage?: string
    compressionLevel?: 'light' | 'medium' | 'heavy'
    additionalLanguages?: string[] // For multi-language
    targetFormat?: 'srt' | 'vtt' | 'txt' // Phase 1B: convert-subtitles
    fixTiming?: boolean
    timingOffsetMs?: number
    grammarFix?: boolean
    lineBreakFix?: boolean
    removeFillers?: boolean
    burnFontSize?: 'small' | 'medium' | 'large'
    burnPosition?: 'bottom' | 'middle'
    burnBackgroundOpacity?: 'none' | 'low' | 'high'
    compressProfile?: 'web' | 'mobile' | 'archive'
    // Transcript extras
    includeSummary?: boolean
    includeChapters?: boolean
    exportFormats?: ('txt' | 'json' | 'docx' | 'pdf')[]
    speakerDiarization?: boolean
    numSpeakers?: number
    diarizationLanguage?: string
    glossary?: string
  }
  webhookUrl?: string
  /** YouTube ingestion fields — set by /api/upload/youtube; worker fetches & encodes audio. */
  youtubeUrl?: string
  youtubeTitle?: string
  youtubeThumbnailUrl?: string
  youtubeDurationSec?: number
  /** Video's default language from metadata; used for caption fallback. */
  youtubeDefaultLanguage?: string
  /** Set when YouTube fell back to audio download (observability). */
  youtubeFallbackToAudio?: boolean
  /** Caption source used when YouTube captions are accepted. */
  youtubeCaptionSource?: 'timedtext' | 'player_api' | 'ytdlp'
  youtubeCaptionSourceDetail?: string
  /** Final YouTube resolution path for observability and client trust. */
  youtubeResolutionPath?: 'caption' | 'caption_patch' | 'audio_cookies' | 'audio_proxy' | 'failed'
  /** Missing windows to patch via gap-only ASR when caption decision is PATCH. */
  captionPatchWindows?: CaptionPatchWindow[]
  /** Failure taxonomy and fallback chain for YouTube ingest observability. */
  youtubeErrorCode?: 'NO_CAPTIONS' | 'AUTH_REQUIRED' | 'GEO_BLOCKED' | 'RATE_LIMITED' | 'QUEUE_TIMEOUT' | 'STREAM_ERROR' | 'UNKNOWN'
  fallbackHistory?: string[]
  youtubeAttempts?: YoutubeAttemptRecord[]
  youtubeProxyUsed?: boolean
  youtubeProxyId?: string
  youtubeDecisionScore?: number
  youtubeConfidence?: number
  degradedExecution?: boolean
  costEstimate?: number
  highCost?: boolean
  queueTimeoutRetryCount?: number
  /** Pre-computed transcript from YouTube captions; skips Whisper. */
  precomputedTranscript?: { fullText: string; segments: { start: number; end: number; text: string }[] }
  /** Set to true after usage is counted; persisted to Redis via job.update() to prevent double-counting on retry. */
  usageIncremented?: boolean
}

async function getOrCreateUserForJob(userId: string, plan: PlanType) {
  const existing = await getUser(userId)
  if (existing) {
    const now = new Date()
    if (existing.plan !== plan) {
      existing.plan = plan
      existing.limits = getPlanLimits(plan)
      existing.updatedAt = now
      await saveUser(existing)
    }
    if (resetUserUsageIfNeeded(existing, now)) {
      await saveUser(existing)
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
  await saveUser(user)
  return user
}

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')

function sanitizeBatchFolderName(name: string): string {
  const n = name.replace(/[^\w\u00C0-\u024F\-_.]+/g, '_').replace(/_+/g, '_').trim().replace(/^_|_$/g, '') || 'video'
  return n.slice(0, 80)
}

/** Subtitle cues for batch ZIP; include [Speaker] prefix in cue text when diarization produced labels. */
function segmentsToSubtitleEntriesForBatch(
  segments: { start: number; end: number; text: string; speaker?: string }[]
): SubtitleEntry[] {
  return segments.map((s, i) => ({
    index: i + 1,
    startTime: s.start,
    endTime: s.end,
    text: s.speaker ? `[${s.speaker}] ${s.text}` : s.text,
  }))
}

/** Recursively add a directory tree to the zip with stable paths (fixes flat/dump zips from archiver.directory on some platforms). */
function appendFsDirToArchive(archive: ReturnType<typeof archiver>, dirFsPath: string, zipPathPrefix: string): void {
  if (!fs.existsSync(dirFsPath)) return
  for (const name of fs.readdirSync(dirFsPath)) {
    const full = path.join(dirFsPath, name)
    const stat = fs.statSync(full)
    const zipName = zipPathPrefix ? `${zipPathPrefix}/${name}`.replace(/\\/g, '/') : name.replace(/\\/g, '/')
    if (stat.isDirectory()) {
      appendFsDirToArchive(archive, full, zipName)
    } else {
      archive.file(full, { name: zipName })
    }
  }
}

async function generateBatchZip(batchId: string, batch: BatchJob): Promise<void> {
  const zipPath = path.join(tempDir, `batch-${batchId}.zip`)
  const output = fs.createWriteStream(zipPath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  const stagingRoot = path.join(tempDir, 'batch-zip-staging', batchId)

  return new Promise((resolve, reject) => {
    output.on('close', async () => {
      const zipSize = archive.pointer()
      batch.zipPath = zipPath
      batch.zipSize = zipSize
      batch.status = batch.failedVideos === batch.totalVideos ? 'failed' : batch.failedVideos > 0 ? 'partial' : 'completed'
      batch.completedAt = new Date()
      await saveBatch(batch)
      try {
        if (fs.existsSync(stagingRoot)) {
          fs.rmSync(stagingRoot, { recursive: true, force: true })
        }
      } catch {
        /* ignore */
      }
      resolve()
    })

    archive.on('error', (err: any) => {
      output.destroy()
      archive.abort()
      reject(err)
    })

    archive.pipe(output)

    let added = false
    if (fs.existsSync(stagingRoot)) {
      const sub = fs.readdirSync(stagingRoot)
      if (sub.length > 0) {
        appendFsDirToArchive(archive, stagingRoot, 'Batch')
        added = true
        archive.append(
          `VideoText batch export\nBatch ID: ${batchId}\n\n` +
            `Folder "Batch" contains one subfolder per input video (name includes position if filenames collide).\n\n` +
            `Per video (same outputs as single-file Video → Transcript, except no summary/chapters in batch):\n` +
            `  • *_transcript_original_<lang>.txt — plain transcript (spoken language)\n` +
            `  • *_transcript_original_<lang>.json — full text + segments (speaker field when diarization ran)\n` +
            `  • *_subtitles_original_<lang>.srt / .vtt — timed subtitles ([Speaker] when diarization ran)\n` +
            `  • *_speakers_labeled.txt — speaker lines (if speaker labels enabled)\n` +
            `  • *_transcript_notion_blocks.json — Notion-ready blocks\n` +
            `  • *_subtitles_translated_<lang>.srt/.vtt, *_transcript_translated_<lang>.txt — per target language\n`,
          { name: 'README.txt' }
        )
      }
    }

    if (!added) {
      const batchFiles = fs
        .readdirSync(tempDir)
        .filter((f) => f.startsWith(`batch-${batchId}-`) && f.endsWith('.srt'))
        .map((f) => ({
          path: path.join(tempDir, f),
          name: f.replace(`batch-${batchId}-`, ''),
        }))
      for (const file of batchFiles) {
        archive.file(file.path, { name: file.name })
        try {
          const converted = convertSubtitleFile(file.path, 'vtt')
          const vttName = file.name.replace(/\.srt$/i, '.vtt')
          archive.append(converted.content, { name: vttName })
        } catch {
          /* ignore */
        }
      }
    }

    if (batch.errors.length > 0) {
      const errorLog = batch.errors.map((e) => `${e.videoName}: ${e.reason}`).join('\n')
      archive.append(errorLog, { name: 'error_log.txt' })
    }

    archive.finalize()
  })
}

/** Worker concurrency. When WORKER_CONCURRENCY_V2: normal = min(cpuCount, 4), priority = 2; else env-based. */
const availableCPU = typeof os.cpus === 'function' ? os.cpus().length : 4
const NORMAL_CONCURRENCY = WORKER_CONCURRENCY_V2
  ? Math.max(1, Math.min(4, availableCPU))
  : Math.max(1, Math.min(4, parseInt(process.env.WORKER_NORMAL_CONCURRENCY || '2', 10)))
const PRIORITY_CONCURRENCY = WORKER_CONCURRENCY_V2
  ? 2
  : Math.max(1, Math.min(2, parseInt(process.env.WORKER_PRIORITY_CONCURRENCY || '1', 10)))

const RUNTIME_QUEUE_THRESHOLD = 20
const RUNTIME_CHECK_INTERVAL_MS = 15 * 1000

const HANDED_OFF = { __handedOff: true } as const
const YT_DLP_GLOBAL_CAP = Math.max(1, parseInt(process.env.YT_DLP_GLOBAL_MAX_PERMITS || process.env.YT_DLP_MAX_CONCURRENCY || '4', 10))
const CAPTION_CONCURRENCY = Math.max(
  1,
  Math.min(
    YT_DLP_GLOBAL_CAP,
    parseInt(process.env.CAPTION_CONCURRENCY || String(YT_DLP_GLOBAL_CAP), 10)
  )
)
const AUDIO_CONCURRENCY = Math.max(
  1,
  Math.min(
    YT_DLP_GLOBAL_CAP,
    parseInt(process.env.AUDIO_CONCURRENCY || String(Math.min(2, YT_DLP_GLOBAL_CAP)), 10)
  )
)
const TRANSCRIPTION_CONCURRENCY = Math.max(1, Math.min(2, parseInt(process.env.TRANSCRIPTION_CONCURRENCY || '2', 10)))
const YT_METRIC_KEY_PREFIX = 'metrics:yt:resolution:'

function ytMetricDayKey(d = new Date()): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${YT_METRIC_KEY_PREFIX}${y}-${m}-${day}`
}

async function recordYoutubeResolutionMetric(
  redis: import('ioredis').Redis,
  data: JobData
): Promise<void> {
  if (!data.youtubeResolutionPath) return
  const key = ytMetricDayKey()
  const path = data.youtubeResolutionPath
  const source = data.youtubeCaptionSource || 'none'
  const errorCode = data.youtubeErrorCode || 'none'
  const patch = path === 'caption_patch' ? 1 : 0
  const fallback = path === 'audio_cookies' ? 1 : 0
  const attempts = data.youtubeAttempts || []
  const proxyUsed = attempts.some((a) => a.type === 'proxy' && a.result === 'success') ? 1 : 0
  const failedAfterProxy = attempts.some((a) => a.type === 'proxy' && a.result === 'fail') ? 1 : 0
  const attemptsCount = attempts.length
  const hasProxyAttempt = attempts.some((a) => a.type === 'proxy') ? 1 : 0
  const directLatency = attempts.filter((a) => a.type === 'direct').reduce((sum, a) => sum + a.latencyMs, 0)
  const cookiesLatency = attempts.filter((a) => a.type === 'cookies').reduce((sum, a) => sum + a.latencyMs, 0)
  const proxyLatency = attempts.filter((a) => a.type === 'proxy').reduce((sum, a) => sum + a.latencyMs, 0)
  const confidenceScaled = typeof data.youtubeConfidence === 'number'
    ? Math.round(Math.max(0, Math.min(1, data.youtubeConfidence)) * 1000)
    : 0
  const degradedExecution = data.degradedExecution ? 1 : 0
  const highCost = data.highCost ? 1 : 0

  try {
    await redis
      .multi()
      .hincrby(key, 'total', 1)
      .hincrby(key, `path:${path}`, 1)
      .hincrby(key, `source:${source}`, 1)
      .hincrby(key, `error:${errorCode}`, 1)
      .hincrby(key, 'patch_count', patch)
      .hincrby(key, 'fallback_count', fallback)
      .hincrby(key, 'proxy_used', proxyUsed)
      .hincrby(key, 'failed_after_proxy', failedAfterProxy)
      .hincrby(key, 'proxy_attempt_jobs', hasProxyAttempt)
      .hincrby(key, 'attempts_count', attemptsCount)
      .hincrby(key, 'latency_direct_ms', Math.round(directLatency))
      .hincrby(key, 'latency_cookies_ms', Math.round(cookiesLatency))
      .hincrby(key, 'latency_proxy_ms', Math.round(proxyLatency))
      .hincrby(key, 'confidence_sum_scaled', confidenceScaled)
      .hincrby(key, 'degraded_execution_count', degradedExecution)
      .hincrby(key, 'high_cost_count', highCost)
      .expire(key, 45 * 24 * 60 * 60)
      .exec()

    if (attempts.length > 0) {
      const perProxy = new Map<string, { success: number; fail: number }>()
      for (const attempt of attempts) {
        if (attempt.type !== 'proxy' || !attempt.proxyId) continue
        const current = perProxy.get(attempt.proxyId) || { success: 0, fail: 0 }
        if (attempt.success) current.success += 1
        else current.fail += 1
        perProxy.set(attempt.proxyId, current)
      }
      if (perProxy.size > 0) {
        const metrics = redis.multi()
        for (const [proxyId, v] of perProxy) {
          metrics.hincrby(key, `proxy:${proxyId}:success`, v.success)
          metrics.hincrby(key, `proxy:${proxyId}:fail`, v.fail)
        }
        await metrics.exec()
      }
    }

    const totals = await redis.hmget(key, 'total', 'proxy_used', 'failed_after_proxy')
    const totalJobs = Number(totals[0] || 0)
    const proxyUsedJobs = Number(totals[1] || 0)
    const proxyFailJobs = Number(totals[2] || 0)
    const proxyUsagePct = totalJobs > 0 ? proxyUsedJobs / totalJobs : 0
    const proxyFailPct = proxyUsedJobs > 0 ? proxyFailJobs / proxyUsedJobs : 0
    if (proxyUsagePct > 0.3 || proxyFailPct > 0.2) {
      const baseCap = Math.max(1, parseInt(process.env.YT_DLP_GLOBAL_MAX_PERMITS || process.env.YT_DLP_MAX_CONCURRENCY || '4', 10))
      const reducedCap = Math.max(1, Math.floor(baseCap / 2))
      await redis.hset(
        key,
        'degradation_flag',
        '1',
        'degradation_reason',
        proxyUsagePct > 0.3 ? 'proxy_usage_high' : 'proxy_failure_high'
      )
      await redis
        .multi()
        .set('yt_dlp_global_semaphore:max_permits_dynamic', String(reducedCap), 'EX', 15 * 60)
        .set('yt_alert:youtube_degradation', JSON.stringify({
          at: new Date().toISOString(),
          proxyUsagePct,
          proxyFailPct,
          reducedCap,
        }), 'EX', 60 * 60)
        .exec()
      workerLog.error({
        msg: 'yt_system_degradation_alert',
        proxyUsagePct: Math.round(proxyUsagePct * 1000) / 1000,
        proxyFailPct: Math.round(proxyFailPct * 1000) / 1000,
        reducedCap,
      })
      await resetProxyPoolState()
    } else {
      const baseCap = Math.max(1, parseInt(process.env.YT_DLP_GLOBAL_MAX_PERMITS || process.env.YT_DLP_MAX_CONCURRENCY || '4', 10))
      await redis.set('yt_dlp_global_semaphore:max_permits_dynamic', String(baseCap), 'EX', 15 * 60)
    }
  } catch {
    /* non-blocking */
  }
}

const classifyYoutubeErrorCode = (msg: string): JobData['youtubeErrorCode'] => {
  const m = msg.toLowerCase()
  if (m.includes('sign in') || m.includes('bot') || m.includes('login')) return 'AUTH_REQUIRED'
  if (m.includes('region') || m.includes('geo')) return 'GEO_BLOCKED'
  if (m.includes('429') || m.includes('rate limit') || m.includes('too many requests')) return 'RATE_LIMITED'
  if (m.includes('queue_timeout') || m.includes('queue timeout') || m.includes('semaphore acquire timeout')) return 'QUEUE_TIMEOUT'
  if (m.includes('private') || m.includes('unavailable') || m.includes('removed')) return 'STREAM_ERROR'
  if (m.includes('timed out') || m.includes('timeout')) return 'STREAM_ERROR'
  if (m.includes('403') || m.includes('signature') || m.includes('no video formats found')) return 'STREAM_ERROR'
  if (m.includes('no captions')) return 'NO_CAPTIONS'
  return 'UNKNOWN'
}

const deriveAttemptErrorCode = (attempts?: YoutubeAttemptRecord[]): JobData['youtubeErrorCode'] | undefined => {
  const lastFailure = [...(attempts || [])].reverse().find((a) => a.result === 'fail' && a.errorCode)
  if (!lastFailure?.errorCode) return undefined
  if (lastFailure.errorCode === 'UNKNOWN' || lastFailure.errorCode === 'NO_CAPTIONS' || lastFailure.errorCode === 'AUTH_REQUIRED' || lastFailure.errorCode === 'GEO_BLOCKED' || lastFailure.errorCode === 'RATE_LIMITED' || lastFailure.errorCode === 'QUEUE_TIMEOUT' || lastFailure.errorCode === 'STREAM_ERROR') {
    return lastFailure.errorCode as JobData['youtubeErrorCode']
  }
  return undefined
}

const isQueueTimeoutError = (msg: string): boolean => {
  const m = msg.toLowerCase()
  return m.includes('queue_timeout') || m.includes('queue timeout') || m.includes('semaphore acquire timeout')
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function retryMetricMinuteKey(kind: string, now = Date.now()): string {
  const minuteBucket = Math.floor(now / 60_000)
  return `metrics:yt:retry:${kind}:${minuteBucket}`
}

async function computeQueuePressure(
  redis: import('ioredis').Redis,
  log: ReturnType<typeof withJobContext>,
  queueTimeoutRate: number
): Promise<number> {
  const counts = await audioQueue.getJobCounts()
  const queueDepth = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0)
  const queueCapacity = Math.max(1, parseInt(process.env.YT_AUDIO_QUEUE_CAPACITY || String(AUDIO_CONCURRENCY * 20), 10))
  const maxPermits = Math.max(1, parseInt(process.env.YT_DLP_GLOBAL_MAX_PERMITS || process.env.YT_DLP_MAX_CONCURRENCY || '4', 10))
  const activePermits = Number(await redis.zcard('yt_dlp_global_semaphore:leases').catch(() => 0))
  const queueDepthRatio = queueDepth / queueCapacity
  const permitUtilization = activePermits / maxPermits
  const pressureScore = clamp01(
    0.4 * queueDepthRatio +
    0.3 * permitUtilization +
    0.3 * queueTimeoutRate
  )
  log.info({ msg: 'queue_pressure', queueDepth, queueCapacity, queueDepthRatio, activePermits, maxPermits, permitUtilization, queueTimeoutRate, pressureScore })
  return pressureScore
}

function computeAdaptiveQueueDelayMs(pressureScore: number): number {
  const baseDelay = 5_000 + Math.floor(Math.random() * 10_000)
  const maxDelay = 45_000
  const scaled = Math.min(maxDelay, Math.round(baseDelay * (1 + pressureScore * 2)))
  const jitterFactor = 0.75 + (Math.random() * 0.5) // ±25%
  return Math.max(5_000, Math.min(maxDelay, Math.round(scaled * jitterFactor)))
}

async function requeueOnQueueTimeout(
  job: import('bull').Job<JobData>,
  data: JobData,
  log: ReturnType<typeof withJobContext>
): Promise<boolean> {
  const redis = (job as any).queue?.client as import('ioredis').Redis | undefined
  if (redis) {
    await redis
      .multi()
      .incr(retryMetricMinuteKey('queue_timeout'))
      .expire(retryMetricMinuteKey('queue_timeout'), 2 * 60)
      .exec()
      .catch(() => {})
  }
  const currentRetries = data.queueTimeoutRetryCount || 0
  let maxRetries = 2
  if (currentRetries >= maxRetries) return false

  let delayMs = 10_000
  let pressureScore = 0
  let queueTimeoutRate = 0
  let retrySuccessRate = 1
  if (redis) {
    const retriesInLastMinute = Number(await redis.get(retryMetricMinuteKey('scheduled')).catch(() => '0') || 0)
    const queueTimeoutEvents = Number(await redis.get(retryMetricMinuteKey('queue_timeout')).catch(() => '0') || 0)
    const audioAttempts = Number(await redis.get(retryMetricMinuteKey('attempts')).catch(() => '0') || 0)
    queueTimeoutRate = audioAttempts > 0 ? queueTimeoutEvents / audioAttempts : 0
    pressureScore = await computeQueuePressure(redis, log, queueTimeoutRate).catch(() => 0)

    const successfulRetries = Number(await redis.get('metrics:yt:retry:success').catch(() => '0') || 0)
    const totalRetries = Number(await redis.get('metrics:yt:retry:count').catch(() => '0') || 0)
    retrySuccessRate = totalRetries > 0 ? successfulRetries / totalRetries : 1
    if (totalRetries >= 10 && retrySuccessRate < 0.3) {
      maxRetries = 1
      if (currentRetries >= maxRetries) {
        log.warn({
          msg: 'retry_feedback_suppressed',
          jobId: String(job.id),
          retry_success_rate: retrySuccessRate,
          successfulRetries,
          totalRetries,
          maxRetries,
        })
        return false
      }
    }

    const circuitOpenUntil = Number(await redis.get('yt:retry:circuit:open_until').catch(() => '0') || 0)
    const now = Date.now()
    const circuitThreshold = Math.max(10, parseInt(process.env.YT_RETRY_CIRCUIT_THRESHOLD_PER_MIN || '25', 10))
    if (circuitOpenUntil > now || (pressureScore > 0.9 && retriesInLastMinute > circuitThreshold)) {
      const cooldownMs = Math.max(30_000, Math.min(60_000, parseInt(process.env.YT_RETRY_CIRCUIT_COOLDOWN_MS || '45000', 10)))
      const openUntil = now + cooldownMs
      await redis.set('yt:retry:circuit:open_until', String(openUntil), 'PX', cooldownMs).catch(() => {})
      await redis.incr('metrics:yt:retry:circuit_breaker_triggers').catch(() => {})
      await redis.expire('metrics:yt:retry:circuit_breaker_triggers', 24 * 60 * 60).catch(() => {})
      log.error({
        msg: 'retry_circuit_open',
        jobId: String(job.id),
        retries_in_last_minute: retriesInLastMinute,
        queue_timeout_rate: queueTimeoutRate,
        pressureScore,
        openUntil,
      })
      return false
    }
    delayMs = computeAdaptiveQueueDelayMs(pressureScore)
    if (totalRetries >= 10 && retrySuccessRate < 0.3) {
      delayMs = Math.min(45_000, Math.round(delayMs * 1.5))
    }
  } else {
    delayMs = computeAdaptiveQueueDelayMs(0)
  }

  const nextData: JobData = {
    ...data,
    queueTimeoutRetryCount: currentRetries + 1,
    youtubeErrorCode: 'QUEUE_TIMEOUT',
    fallbackHistory: [...(data.fallbackHistory || []), `queue_timeout_retry:${currentRetries + 1}`],
  }
  await audioQueue.add(nextData, {
    jobId: `${data.jobToken ?? String(job.id)}:qt:${currentRetries + 1}:${Date.now()}`,
    delay: delayMs,
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: true,
    priority: typeof (job.opts as any)?.priority === 'number'
      ? Math.max(1, Number((job.opts as any).priority) - 1)
      : undefined,
  })
  if (redis) {
    await redis
      .multi()
      .incr(retryMetricMinuteKey('scheduled'))
      .expire(retryMetricMinuteKey('scheduled'), 2 * 60)
      .incrbyfloat('metrics:yt:retry:delay_sum_ms', delayMs)
      .incr('metrics:yt:retry:count')
      .expire('metrics:yt:retry:delay_sum_ms', 24 * 60 * 60)
      .expire('metrics:yt:retry:count', 24 * 60 * 60)
      .exec()
      .catch(() => {})
  }
  log.warn({ msg: 'queue_retry_scheduled', jobId: String(job.id), retryCount: currentRetries + 1, delayMs, pressureScore, queue_timeout_rate: queueTimeoutRate, retry_success_rate: retrySuccessRate, maxRetries })
  return true
}

async function processCaptionJob(job: import('bull').Job<JobData>): Promise<unknown> {
  const data = job.data as JobData
  const log = withJobContext(job.id, data.requestId)
  log.info({ msg: 'caption_job_claimed', jobId: String(job.id), youtubeUrl: data.youtubeUrl?.slice(0, 60) })
  updateJobStarted(String(job.id)).catch(() => {})
  log.info({ msg: 'caption_job_started', jobId: String(job.id) })
  // Stage 1: fetching captions — set before the network call so UI shows progress immediately
  const redis = (job as any).queue?.client as import('ioredis').Redis | undefined
  if (redis) await setJobStage(redis, job.id, 'fetching_captions')
  const options = data.options
  log.info({ msg: 'caption_fetch_start', jobId: String(job.id) })
  const ytCollector: YoutubeAttemptCollector = { attempts: [] }
  const captions = await fetchYoutubeCaptions(
    data.youtubeUrl!,
    tempDir,
    options?.language as string | undefined,
    data.youtubeDurationSec ?? undefined,
    data.youtubeDefaultLanguage,
    ytCollector
  )
  ;(data as any).youtubeAttempts = [...(data.youtubeAttempts || []), ...(ytCollector.attempts || [])]
  if (ytCollector.proxyUsed) {
    ;(data as any).youtubeProxyUsed = true
    ;(data as any).youtubeProxyId = ytCollector.proxyId
  }
  const derivedCaptionError = deriveAttemptErrorCode(ytCollector.attempts)
  if (derivedCaptionError && !captions) {
    ;(data as any).youtubeErrorCode = derivedCaptionError
  }
  log.info({ msg: 'caption_fetch_done', jobId: String(job.id), hasCaptions: !!captions, segmentCount: captions?.segments?.length ?? 0 })
  const decision = captions ? evaluateCaptionDecision(captions, data.youtubeDurationSec ?? 0, options?.language as string | undefined) : null
  log.info({
    msg: 'caption_decision_done',
    jobId: String(job.id),
    action: decision?.action ?? 'fallback',
    score: decision ? Math.round(decision.score * 1000) / 1000 : 0,
    coverage: decision ? Math.round(decision.coverage * 1000) / 1000 : 0,
    alignment: decision ? Math.round(decision.alignmentScore * 1000) / 1000 : 0,
    duplicationPenalty: decision ? Math.round(decision.duplicationPenalty * 1000) / 1000 : 0,
    languageConsistency: decision ? Math.round(decision.languageConsistency * 1000) / 1000 : 0,
    maxGap: decision ? Math.round(decision.maxGap * 10) / 10 : 0,
    patchWindowCount: decision?.patchWindows.length ?? 0,
  })
  if (captions && decision?.action === 'accept') {
    log.info({ msg: 'caption_using_captions', jobId: String(job.id) })
    ;(data as any).precomputedTranscript = captions
    ;(data as any).youtubeCaptionSource = captions.source
    ;(data as any).youtubeCaptionSourceDetail = captions.sourceDetail
    ;(data as any).youtubeResolutionPath = 'caption'
    ;(data as any).youtubeDecisionScore = decision.score
    ;(data as any).fallbackHistory = [...(data.fallbackHistory || []), `captions:accept:${captions.source}`]
    ;(data as any).filePath = ''
    ;(data as any).inputType = 'audio'
    ;(data as any).originalName = (data.youtubeTitle || 'youtube_video').replace(/[^\w\s.\-]/g, '_').trim() + '.wav'
    ;(data as any).toolType = 'video-to-transcript'
    ;(data as any).youtubeUrl = undefined
    log.info({ msg: 'caption_job_completed', source: 'caption', jobId: String(job.id) })
    return processJob(job)
  }
  if (captions && decision?.action === 'patch') {
    if (redis) await setJobStage(redis, job.id, 'downloading_audio')
    log.info({ msg: 'caption_handoff_to_gap_patch', jobId: String(job.id), windowCount: decision.patchWindows.length })
    const nextData: JobData = {
      ...data,
      toolType: 'youtube-audio-to-transcript',
      youtubeFallbackToAudio: true,
      youtubeResolutionPath: 'caption_patch',
      precomputedTranscript: captions,
      youtubeCaptionSource: captions.source,
      youtubeCaptionSourceDetail: captions.sourceDetail,
      captionPatchWindows: decision.patchWindows,
      youtubeDecisionScore: decision.score,
      fallbackHistory: [...(data.fallbackHistory || []), `captions:patch:${captions.source}`, `gap_windows:${decision.patchWindows.length}`],
    }
    await audioQueue.add(nextData, { jobId: data.jobToken ?? String(job.id), attempts: 3, backoff: { type: 'exponential' as const, delay: 2000 } })
    log.info({ msg: 'caption_job_completed', source: 'handoff_gap_patch', jobId: String(job.id) })
    return HANDED_OFF
  }
  if (redis) await setJobStage(redis, job.id, 'downloading_audio')
  log.info({ msg: 'caption_handoff_to_audio', jobId: String(job.id) })
  if (!captions) {
    ;(data as any).youtubeErrorCode = 'NO_CAPTIONS'
  }
  const nextData: JobData = {
    ...data,
    toolType: 'youtube-audio-to-transcript',
    youtubeFallbackToAudio: true,
    youtubeResolutionPath: 'audio_cookies',
    youtubeDecisionScore: decision?.score,
    fallbackHistory: [...(data.fallbackHistory || []), 'captions:fallback', 'audio:full_transcription'],
    youtubeAttempts: data.youtubeAttempts,
    youtubeProxyUsed: data.youtubeProxyUsed,
    youtubeProxyId: data.youtubeProxyId,
  }
  await audioQueue.add(nextData, { jobId: data.jobToken ?? String(job.id), attempts: 3, backoff: { type: 'exponential' as const, delay: 2000 } })
  log.info({ msg: 'caption_job_completed', source: 'handoff_audio', jobId: String(job.id) })
  return HANDED_OFF
}

async function processAudioJob(job: import('bull').Job<JobData>): Promise<unknown> {
  const data = job.data as JobData
  const log = withJobContext(job.id, data.requestId)
  log.info({ msg: 'audio_job_claimed', jobId: String(job.id) })
  updateJobStarted(String(job.id)).catch(() => {})
  log.info({ msg: 'audio_job_started', jobId: String(job.id) })
  const redis = (job as any).queue?.client as import('ioredis').Redis | undefined
  if (redis) {
    await redis
      .multi()
      .incr(retryMetricMinuteKey('attempts'))
      .expire(retryMetricMinuteKey('attempts'), 2 * 60)
      .exec()
      .catch(() => {})
  }
  if (redis) await setJobStage(redis, job.id, 'downloading_audio')
  const ytAudioPath = path.join(tempDir, `${uuidv4()}_yt_audio.wav`)
  log.info({ msg: 'audio_download_start', jobId: String(job.id), youtubeUrl: data.youtubeUrl?.slice(0, 50) })
  const ytCollector: YoutubeAttemptCollector = { attempts: [] }
  try {
    const ytResolution = await streamYoutubeAudioToFile(data.youtubeUrl!, ytAudioPath, ytCollector)
    ;(data as any).youtubeAttempts = [...(data.youtubeAttempts || []), ...(ytCollector.attempts || [])]
    if (ytCollector.proxyUsed) {
      ;(data as any).youtubeProxyUsed = true
      ;(data as any).youtubeProxyId = ytCollector.proxyId
    }
    ;(data as any).youtubeResolutionPath = ytResolution.resolutionPath
    ;(data as any).youtubeErrorCode = ytResolution.errorCode ?? undefined
    ;(data as any).fallbackHistory = [...(data.fallbackHistory || []), ...ytResolution.fallbackHistory]
    ;(data as any).youtubeDecisionScore = ytResolution.confidence
    ;(data as any).degradedExecution = ytResolution.degradedExecution
    ;(data as any).costEstimate = ytResolution.costEstimate
    log.info({ msg: 'audio_download_done', jobId: String(job.id) })
    if (redis && (data.queueTimeoutRetryCount || 0) > 0) {
      await redis
        .multi()
        .incr('metrics:yt:retry:success')
        .expire('metrics:yt:retry:success', 24 * 60 * 60)
        .exec()
        .catch(() => {})
    }
  } catch (err: any) {
    log.error({ msg: 'yt_stream_failed', error: err.message })
    ;(data as any).youtubeAttempts = [...(data.youtubeAttempts || []), ...(ytCollector.attempts || [])]
    if (ytCollector.proxyUsed) {
      ;(data as any).youtubeProxyUsed = true
      ;(data as any).youtubeProxyId = ytCollector.proxyId
    }
    ;(data as any).youtubeErrorCode = deriveAttemptErrorCode(ytCollector.attempts) || classifyYoutubeErrorCode(err.message)
    if (isQueueTimeoutError(err.message)) {
      const requeued = await requeueOnQueueTimeout(job, data, log)
      if (requeued) return HANDED_OFF
    }
    throw new Error(`YouTube audio extraction failed: ${err.message}`)
  }
  const nextData: JobData = {
    ...data,
    filePath: ytAudioPath,
    inputType: 'audio',
    originalName: (data.youtubeTitle || 'youtube_video').replace(/[^\w\s.\-]/g, '_').trim() + '.wav',
    toolType: 'video-to-transcript',
    youtubeUrl: undefined,
    youtubeFallbackToAudio: true,
    youtubeResolutionPath: data.youtubeResolutionPath || 'failed',
    fallbackHistory: [...(data.fallbackHistory || []), 'audio:downloaded'],
    youtubeAttempts: data.youtubeAttempts,
    youtubeProxyUsed: data.youtubeProxyUsed,
    youtubeProxyId: data.youtubeProxyId,
  }
  if (redis) await setJobStage(redis, job.id, 'transcribing')
  log.info({ msg: 'audio_handoff_to_transcription', jobId: String(job.id) })
  await transcriptionQueue.add(nextData, { jobId: data.jobToken ?? String(job.id), attempts: 3, backoff: { type: 'exponential' as const, delay: 2000 } })
  log.info({ msg: 'audio_job_completed', jobId: String(job.id) })
  return HANDED_OFF
}

async function processTranscriptionJob(job: import('bull').Job<JobData>): Promise<unknown> {
  const data = job.data as JobData
  withJobContext(job.id, data.requestId).info({ msg: 'transcription_job_started', jobId: String(job.id) })
  const redis = (job as any).queue?.client as import('ioredis').Redis | undefined
  if (redis) await setJobStage(redis, job.id, 'transcribing')
  return processJob(job)
}

async function processJob(job: import('bull').Job<JobData>) {
  const jobId = job.id
  const data = job.data as JobData
  const requestId = data.requestId
  const log = withJobContextFull(jobId, { requestId, userId: data.userId, plan: data.plan, toolType: data.toolType })
  log.info({ msg: 'job_received' })
  const plan = (data.plan || 'free') as PlanType
  const maxRuntimeMs = getMaxJobRuntimeMinutes(plan) * 60 * 1000
  const processingStartMs = Date.now()

  const mergeCaptionAndGapSegments = (
    base: { start: number; end: number; text: string; speaker?: string }[],
    gapSegments: { start: number; end: number; text: string; speaker?: string }[],
    windows: CaptionPatchWindow[]
  ) => {
    const outside = base.filter((seg) => !windows.some((w) => seg.end > w.start && seg.start < w.end))
    const merged = [...outside, ...gapSegments].sort((a, b) => a.start - b.start)
    return merged
  }

  const normalizeSegmentText = (text: string): string => {
    const compact = text.replace(/\s+/g, ' ').trim()
    if (!compact) return compact
    const punctuated = /[.!?]$/.test(compact) ? compact : `${compact}.`
    return punctuated.charAt(0).toUpperCase() + punctuated.slice(1)
  }

  const smoothSegmentBoundaries = (
    segs: { start: number; end: number; text: string; speaker?: string }[]
  ) => {
    const sorted = [...segs]
      .map((s) => ({ ...s, text: normalizeSegmentText(s.text) }))
      .sort((a, b) => a.start - b.start)
    for (let i = 0; i < sorted.length; i++) {
      const curr = sorted[i]
      if (curr.end < curr.start) curr.end = curr.start
      if (i < sorted.length - 1) {
        const next = sorted[i + 1]
        if (curr.end > next.start) {
          const split = Math.max(curr.start, Math.min(next.start, (curr.end + next.start) / 2))
          curr.end = split
          next.start = split
        }
      }
    }
    return sorted
  }

  const computeYoutubeConfidence = (
    resolutionPath: JobData['youtubeResolutionPath'],
    fallbackHistory: string[] | undefined,
    decisionScore?: number
  ): number => {
    const depthPenalty = Math.min((fallbackHistory?.length ?? 0) * 0.04, 0.25)
    const baseByPath =
      resolutionPath === 'caption'
        ? 0.9
        : resolutionPath === 'caption_patch'
          ? 0.78
          : 0.62
    const scoreBoost = typeof decisionScore === 'number' ? (decisionScore - 0.5) * 0.25 : 0
    return Math.max(0, Math.min(1, baseByPath + scoreBoost - depthPenalty))
  }

  const computeYoutubeCostEstimate = (
    resolutionPath: JobData['youtubeResolutionPath'],
    usedTranscription: boolean
  ): number => {
    if (resolutionPath === 'caption' && !usedTranscription) return 0
    if (resolutionPath === 'audio_cookies') return usedTranscription ? 3 : 1
    if (resolutionPath === 'audio_proxy') return usedTranscription ? 4 : 2
    if (resolutionPath === 'caption_patch') return 4
    return usedTranscription ? 4 : 2
  }

  const run = async (): Promise<any> => {
    log.info({ msg: 'job_started' })
    updateJobStarted(String(jobId)).catch(() => {})
    const { toolType, options } = data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- undocumented Bull internals
    const redis = (job as any).queue?.client as import('ioredis').Redis | undefined
    let partialWriter: ReturnType<typeof createPartialWriter> | null = null

    // Register every input file immediately so the cleanup cron never deletes them
    // while the job is in flight.  Deregistered (and deleted) in the finally block.
    // filePath2 is used by burn-subtitles (video + subtitle).
    const inputPaths = [data.filePath, (data as any).filePath2].filter((p): p is string => !!p)
    if (redis && inputPaths.length) {
      registerActiveFiles(redis, jobId, inputPaths).catch(() => {})
    }
    // Trim outputs — collected here so we can register + delete them in finally.
    // Each case that calls trimVideoSegment pushes the result path here and
    // re-registers so the cleanup cron sees the trim file as protected.
    const trimmedPaths: string[] = []
    // Tracks whether all processing succeeded so we can safely delete the input file.
    let jobSucceeded = false

    // Instrument progress so every update is logged; Bull persists progress for status endpoint
    const progressFn = job.progress.bind(job)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- undocumented Bull internals
    ;(job as any).progress = async (value?: number | object) => {
      const out = await progressFn(value)
      if (typeof value === 'number') log.debug({ msg: 'job_progress', progress: value })
      return out
    }

    try {
      await job.progress(5)

      // Wait for file to be stable before extraction (avoids reading partially flushed file after early enqueue).
      // Default 800ms; tune via FILE_STABLE_WAIT_MS env var for slow or fast disks.
      const fileStableWaitMs = Number(process.env.FILE_STABLE_WAIT_MS) || 800
      if (data.filePath && fs.existsSync(data.filePath)) {
        await waitForFileStable(data.filePath, fileStableWaitMs)
      }

      let result: any

      switch (toolType) {
        case 'cached-result': {
          await job.progress(100)
          jobSucceeded = true
          return data.cachedResult
        }
        case 'youtube-to-transcript': {
          log.info({ msg: 'yt_job_start', youtubeUrl: data.youtubeUrl?.slice(0, 50) })
          await job.progress(5)

          // Stage 1: fetching captions
          if (redis) await setJobStage(redis, jobId, 'fetching_captions')

          // Try captions first — skip Whisper if available (seconds vs minutes)
          const ytCollector: YoutubeAttemptCollector = { attempts: [] }
          const captions = await fetchYoutubeCaptions(
            data.youtubeUrl!,
            tempDir,
            options?.language as string | undefined,
            data.youtubeDurationSec,
            data.youtubeDefaultLanguage,
            ytCollector
          )
          ;(data as any).youtubeAttempts = [...(data.youtubeAttempts || []), ...(ytCollector.attempts || [])]
          if (ytCollector.proxyUsed) {
            ;(data as any).youtubeProxyUsed = true
            ;(data as any).youtubeProxyId = ytCollector.proxyId
          }
          const decision = captions ? evaluateCaptionDecision(captions, data.youtubeDurationSec ?? 0, options?.language as string | undefined) : null
          if (captions && decision?.action === 'accept') {
            // Stage 3: transcribing from captions (no audio download needed)
            if (redis) await setJobStage(redis, jobId, 'transcribing')
            ;(data as any).precomputedTranscript = captions
            ;(data as any).youtubeCaptionSource = captions.source
            ;(data as any).youtubeCaptionSourceDetail = captions.sourceDetail
            ;(data as any).youtubeResolutionPath = 'caption'
            ;(data as any).youtubeDecisionScore = decision.score
            ;(data as any).fallbackHistory = [...(data.fallbackHistory || []), `captions:accept:${captions.source}`]
            ;(data as any).filePath = ''
            ;(data as any).inputType = 'audio'
            ;(data as any).originalName =
              (data.youtubeTitle || 'youtube_video').replace(/[^\w\s.\-]/g, '_').trim() + '.wav'
            ;(data as any).toolType = 'video-to-transcript'
            ;(data as any).youtubeUrl = undefined
          } else {
            // Stage 2: downloading audio (captions unavailable or low coverage)
            if (redis) await setJobStage(redis, jobId, 'downloading_audio')
            const ytAudioPath = path.join(tempDir, `${uuidv4()}_yt_audio.wav`)
            const ytAudioCollector: YoutubeAttemptCollector = { attempts: [] }
            if (redis) {
              await redis
                .multi()
                .incr(retryMetricMinuteKey('attempts'))
                .expire(retryMetricMinuteKey('attempts'), 2 * 60)
                .exec()
                .catch(() => {})
            }
            try {
              const ytResolution = await streamYoutubeAudioToFile(data.youtubeUrl!, ytAudioPath, ytAudioCollector)
              ;(data as any).youtubeAttempts = [...(data.youtubeAttempts || []), ...(ytAudioCollector.attempts || [])]
              if (ytAudioCollector.proxyUsed) {
                ;(data as any).youtubeProxyUsed = true
                ;(data as any).youtubeProxyId = ytAudioCollector.proxyId
              }
              ;(data as any).youtubeResolutionPath = ytResolution.resolutionPath
              ;(data as any).youtubeErrorCode = ytResolution.errorCode ?? undefined
              ;(data as any).fallbackHistory = [...(data.fallbackHistory || []), ...ytResolution.fallbackHistory]
              ;(data as any).youtubeDecisionScore = ytResolution.confidence
              ;(data as any).degradedExecution = ytResolution.degradedExecution
              ;(data as any).costEstimate = ytResolution.costEstimate
              if (redis && (data.queueTimeoutRetryCount || 0) > 0) {
                await redis
                  .multi()
                  .incr('metrics:yt:retry:success')
                  .expire('metrics:yt:retry:success', 24 * 60 * 60)
                  .exec()
                  .catch(() => {})
              }
            } catch (err: any) {
              log.error({ msg: 'yt_stream_failed', error: err.message, youtubeUrl: data.youtubeUrl?.slice(0, 50) })
              ;(data as any).youtubeAttempts = [...(data.youtubeAttempts || []), ...(ytAudioCollector.attempts || [])]
              if (ytAudioCollector.proxyUsed) {
                ;(data as any).youtubeProxyUsed = true
                ;(data as any).youtubeProxyId = ytAudioCollector.proxyId
              }
              ;(data as any).youtubeErrorCode = deriveAttemptErrorCode(ytAudioCollector.attempts) || classifyYoutubeErrorCode(err.message)
              if (isQueueTimeoutError(err.message)) {
                const requeued = await requeueOnQueueTimeout(job, data, log)
                if (requeued) return HANDED_OFF
              }
              throw new Error(`YouTube audio download failed: ${err.message}. The video may be private, age-restricted, or unavailable in your region.`)
            }
            log.info({ msg: 'yt_stream_done', ytAudioPath })
            // Stage 3: transcribing downloaded audio
            if (redis) await setJobStage(redis, jobId, 'transcribing')
            ;(data as any).filePath = ytAudioPath
            ;(data as any).inputType = 'audio'
            ;(data as any).originalName =
              (data.youtubeTitle || 'youtube_video').replace(/[^\w\s.\-]/g, '_').trim() + '.wav'
            ;(data as any).toolType = 'video-to-transcript'
            ;(data as any).youtubeUrl = undefined
            if (captions && decision?.action === 'patch') {
              ;(data as any).precomputedTranscript = captions
              ;(data as any).youtubeCaptionSource = captions.source
              ;(data as any).youtubeCaptionSourceDetail = captions.sourceDetail
              ;(data as any).captionPatchWindows = decision.patchWindows
              ;(data as any).youtubeResolutionPath = 'caption_patch'
              ;(data as any).youtubeDecisionScore = decision.score
              ;(data as any).fallbackHistory = [...(data.fallbackHistory || []), `captions:patch:${captions.source}`, `gap_windows:${decision.patchWindows.length}`, 'audio:downloaded']
            } else {
              ;(data as any).youtubeResolutionPath = data.youtubeResolutionPath || 'failed'
              ;(data as any).youtubeDecisionScore = data.youtubeDecisionScore ?? decision?.score
              ;(data as any).fallbackHistory = [...(data.fallbackHistory || []), 'audio:downloaded', 'asr:full']
            }
          }
          await job.progress(20)
        }
        // eslint-disable-next-line no-fallthrough
        case 'video-to-transcript': {
          if (data.url) {
            throw new Error('URL downloads are temporarily disabled.')
          }
          let videoPath = data.filePath!
          const userId = data.userId
          const plan = data.plan || 'free'
          const includeSummary = options?.includeSummary === true
          const includeChapters = options?.includeChapters === true
          const exportFormats = options?.exportFormats && options.exportFormats.length > 0
            ? options.exportFormats
            : ['txt']
          const isAlreadyAudio = data.inputType === 'audio'
          let extractionStartAt: number | undefined
          let firstChunkCreatedAt: number | undefined
          let firstChunkTranscriptionStartAt: number | undefined
          let firstPartialEmittedAt: number | undefined
          let firstChunkDurationSec: number | undefined
          let totalVideoDurationSec: number | undefined
          let durationCheck: ValidateVideoDurationResult | undefined
          let videoPathForDuration: string | undefined
          let fullText: string
          let segments: { start: number; end: number; text: string; speaker?: string }[] = []
          const processingStartMs = Date.now()
          // Resolved inside the else-branch once videoPath is known; null for captions-only jobs
          let audioExtractionPromise: Promise<string | null> = Promise.resolve(null)

          if (data.precomputedTranscript) {
            fullText = data.precomputedTranscript.fullText
            segments = data.precomputedTranscript.segments.map((s) => ({ start: s.start, end: s.end, text: s.text }))
            totalVideoDurationSec = data.youtubeDurationSec ?? (segments.length > 0 ? Math.max(...segments.map((s) => s.end)) : 0)
            if (data.captionPatchWindows && data.captionPatchWindows.length > 0 && data.filePath) {
              const glossary = options?.glossary?.trim()
              const patched = await transcribeAudioGapWindows(
                data.filePath,
                data.captionPatchWindows,
                options?.language,
                glossary
              )
              if (patched.length > 0) {
                segments = mergeCaptionAndGapSegments(
                  segments,
                  patched.map((s) => ({ start: s.start, end: s.end, text: s.text })),
                  data.captionPatchWindows
                )
                segments = smoothSegmentBoundaries(segments)
                fullText = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim()
                ;(data as any).fallbackHistory = [...(data.fallbackHistory || []), `asr:gap_fill:${patched.length}`]
              }
            }
            if (redis) {
              partialWriter = createPartialWriter(redis, jobId)
              partialWriter.startDrain()
              if (segments.length > 0) partialWriter.onPartial(segments.slice(0, 2000))
            }
            log.info({ msg: 'transcription_from_captions', segmentCount: segments.length })
          } else {
          let videoPath = data.filePath!

          // Trim video if start/end times provided (not used for audio-only; client sends video when trim requested)
          if (
            !isAlreadyAudio &&
            data.trimmedStart !== undefined &&
            data.trimmedEnd !== undefined
          ) {
            await job.progress(12)
            const trimResult = await trimVideoSegment({
              inputPath: videoPath,
              startTime: data.trimmedStart,
              endTime: data.trimmedEnd,
            })
            videoPath = trimResult.outputPath
            trimmedPaths.push(videoPath)
            if (redis) registerActiveFiles(redis, jobId, [...inputPaths, ...trimmedPaths]).catch(() => {})
          }

          // Validate duration (works for both video and audio via ffprobe)
          await job.progress(15)
          videoPathForDuration = videoPath
          durationCheck = await validateVideoDuration(videoPath, getPlanLimits(plan).maxVideoDuration, plan)
          if (!durationCheck.valid) {
            throw new Error(durationCheck.error || 'Video too long')
          }
          totalVideoDurationSec =
            data.trimmedStart !== undefined && data.trimmedEnd !== undefined
              ? Math.max(0, data.trimmedEnd - data.trimmedStart)
              : durationCheck.durationKnown === false
                ? undefined
                : (durationCheck.duration ?? 0)

          // Kick off AAC extraction in parallel with transcription — never blocks the job.
          // Produces a universally browser-compatible audio file for the in-app player.
          const audioFilename = audioExtractFilename(data.originalName)
          const audioOutputPath = path.join(tempDir, audioFilename)
          audioExtractionPromise = extractAudioForPlayback(videoPath, audioOutputPath)
            .then(() => `/api/audio/${audioFilename}`)
            .catch((err: Error) => {
              log.warn({ msg: 'audio_extraction_for_playback_failed', error: err.message, jobId: String(jobId) })
              return null
            })

          const needVerbose = includeSummary || includeChapters || exportFormats.includes('json')
          const wantDiarization = options?.speakerDiarization === true

          // Live transcript (TTFW): stream partials whenever Redis is available
          if (redis) {
            partialWriter = createPartialWriter(redis, jobId)
            partialWriter.startDrain()
          }
          const onPartial = partialWriter
            ? (segs: { start: number; end: number; text: string; speaker?: string }[]) => {
                if (!firstPartialEmittedAt) {
                  firstPartialEmittedAt = Date.now()
                }
                partialWriter!.onPartial(segs)
              }
            : undefined
          const onChunkProgress = STREAM_PROGRESS && needVerbose
            ? (contiguousChunks: number, totalChunks: number) => {
                const p = totalChunks > 0 ? 25 + (contiguousChunks / totalChunks) * 30 : 25
                job.progress(Math.min(55, Math.max(25, Math.round(p))))
              }
            : undefined

          if (wantDiarization) {
            await job.progress(22)
            const glossary = options?.glossary?.trim()
            const diarStartMs = Date.now()
            log.info({ msg: 'diarization_started', language: options?.diarizationLanguage || options?.language || null, numSpeakers: options?.numSpeakers || null })
            const diar = await transcribeWithDiarization(videoPath, options?.diarizationLanguage || options?.language, { isAlreadyAudio, prompt: glossary, numSpeakers: options?.numSpeakers })
            if (diar) {
              fullText = diar.text
              // Resolve raw speaker IDs (e.g. SPEAKER_00) to real names or "Speaker N" labels.
              segments = resolveSpeakerNames(diar.segments)
              const speakerSet = new Set(segments.map((s) => s.speaker).filter(Boolean))
              log.info({ msg: 'diarization_completed', durationMs: Date.now() - diarStartMs, speakerCount: speakerSet.size, segmentCount: segments.length })
              if (partialWriter && segments.length > 0) {
                partialWriter.onPartial(segments.slice(0, 2000))
              }
            } else {
              log.warn({ msg: 'diarization_fallback', durationMs: Date.now() - diarStartMs })
              const verbose = await transcribeVideoVerbose(
                videoPath,
                options?.language,
                glossary,
                isAlreadyAudio,
                onPartial,
                onChunkProgress,
                jobId,
                {
                  onExtractionStart: () => {
                    if (!extractionStartAt) extractionStartAt = Date.now()
                  },
                  onFirstChunkCreated: (durationSec: number) => {
                    if (!firstChunkCreatedAt) {
                      firstChunkCreatedAt = Date.now()
                      firstChunkDurationSec = durationSec
                    }
                  },
                  onFirstChunkTranscriptionStart: () => {
                    if (!firstChunkTranscriptionStartAt) {
                      firstChunkTranscriptionStartAt = Date.now()
                    }
                  },
                }
              )
              fullText = verbose.text
              segments = verbose.segments || []
            }
          } else if (needVerbose) {
            await job.progress(25)
            const glossary = options?.glossary?.trim()
            const verbose = await transcribeVideoVerbose(
              videoPath,
              options?.language,
              glossary,
              isAlreadyAudio,
              onPartial,
              onChunkProgress,
              jobId,
              {
                onExtractionStart: () => {
                  if (!extractionStartAt) extractionStartAt = Date.now()
                },
                onFirstChunkCreated: (durationSec: number) => {
                  if (!firstChunkCreatedAt) {
                    firstChunkCreatedAt = Date.now()
                    firstChunkDurationSec = durationSec
                  }
                },
                onFirstChunkTranscriptionStart: () => {
                  if (!firstChunkTranscriptionStartAt) {
                    firstChunkTranscriptionStartAt = Date.now()
                  }
                },
              }
            )
            fullText = verbose.text
            segments = verbose.segments || []
          } else {
            await job.progress(30)
            const glossary = options?.glossary?.trim()
            // Audio-only / voice jobs: always use verbose path so we get timed segments for playback sync
            // (plain transcribeVideo returns text only). Streaming partials still require partialWriter.
            if (partialWriter || isAlreadyAudio) {
              const verbose = await transcribeVideoVerbose(
                videoPath,
                options?.language,
                glossary,
                isAlreadyAudio,
                partialWriter ? onPartial : undefined,
                undefined,
                jobId,
                {
                  onExtractionStart: () => {
                    if (!extractionStartAt) extractionStartAt = Date.now()
                  },
                  onFirstChunkCreated: (durationSec: number) => {
                    if (!firstChunkCreatedAt) {
                      firstChunkCreatedAt = Date.now()
                      firstChunkDurationSec = durationSec
                    }
                  },
                  onFirstChunkTranscriptionStart: () => {
                    if (!firstChunkTranscriptionStartAt) {
                      firstChunkTranscriptionStartAt = Date.now()
                    }
                  },
                }
              )
              fullText = verbose.text
              segments = verbose.segments || []
            } else {
              fullText = await transcribeVideo(videoPath, 'text', options?.language, glossary, isAlreadyAudio)
            }
          }
          }

          try {
            if (segments.length > 0) {
              fullText = segmentToStructuredText(segments)
            }
            fullText = formatTranscript(fullText)
          } catch {
            /* keep fullText unchanged on error */
          }

          // Await the parallel audio extraction started above (almost always already done by now)
          const playbackAudioUrl = await audioExtractionPromise

          const fileReceivedToTranscriptionFinishedMs = Date.now() - processingStartMs
          log.info({
            msg: 'transcription_completed',
            durationMs: fileReceivedToTranscriptionFinishedMs,
            fileSizeBytes: data.fileSize ?? undefined,
            extractionSkipped: isAlreadyAudio,
            fromCaptions: !!data.precomputedTranscript,
            segmentCount: segments.length,
          })

          const whisperLangForNames = options?.language || data.youtubeDefaultLanguage
          const filesToZip: { path: string; name: string }[] = []
          let primaryDownloadUrl: string
          let primaryFileName: string

          // Always write TXT (async to avoid blocking event loop)
          const txtFilename = transcriptOriginalFilename(data.originalName, whisperLangForNames, '.txt')
          const txtPath = path.join(tempDir, txtFilename)
          await fs.promises.writeFile(txtPath, fullText, 'utf-8')
          filesToZip.push({ path: txtPath, name: txtFilename })
          primaryDownloadUrl = `/api/download/${txtFilename}`
          primaryFileName = txtFilename
          if (STREAM_PROGRESS) await job.progress(55)

          let summary: { summary: string; bullets: string[]; actionItems?: string[] } | undefined
          let chapters: { title: string; startTime: number; endTime?: number }[] | undefined

          if (includeSummary || (includeChapters && segments.length > 0)) {
            // Fast path by default: return transcript first, compute summary/chapters asynchronously when Redis is available.
            if (redis) {
              summary = undefined
              chapters = undefined
              const fullTextForDefer = fullText
              const segmentsForDefer = segments
              const includeSummaryDefer = includeSummary
              const includeChaptersDefer = includeChapters && segments.length > 0
              const queueClient = redis
              setImmediate(() => {
                (async () => {
                  try {
                    const [summaryResult, chaptersResult] = await Promise.all([
                      includeSummaryDefer ? generateSummary(fullTextForDefer, { includeActionItems: true }) : Promise.resolve(undefined),
                      includeChaptersDefer ? generateChapters(segmentsForDefer) : Promise.resolve([]),
                    ])
                    await setJobSummary(queueClient, jobId, {
                      summary: summaryResult,
                      chapters: chaptersResult && chaptersResult.length > 0 ? chaptersResult : undefined,
                    })
                  } catch (e: any) {
                    log.warn({ err: e, msg: 'deferred_summary_failed', jobId: String(jobId) })
                  }
                })()
              })
            } else {
              if (!STREAM_PROGRESS) await job.progress(55)
              const summaryStartMs = Date.now()
              log.info({ msg: 'summary_started', includeSummary, includeChapters })
              const [summaryResult, chaptersResult] = await Promise.all([
                includeSummary ? generateSummary(fullText, { includeActionItems: true }) : Promise.resolve(undefined),
                includeChapters && segments.length > 0 ? generateChapters(segments) : Promise.resolve([]),
              ])
              summary = summaryResult
              chapters = chaptersResult && chaptersResult.length > 0 ? chaptersResult : undefined
              log.info({ msg: 'summary_completed', durationMs: Date.now() - summaryStartMs, hasSummary: !!summary, chapterCount: chapters?.length ?? 0 })
            }
          }
          if (redis && !STREAM_PROGRESS) await job.progress(55)

          if (STREAM_PROGRESS) await job.progress(60)
          await job.progress(70)

          // Export optional formats in parallel where possible
          const exportStartMs = Date.now()
          log.info({ msg: 'export_started', formats: exportFormats })
          const exportPromises: Promise<void>[] = []
          if (exportFormats.includes('json')) {
            const jsonFilename = transcriptOriginalFilename(data.originalName, whisperLangForNames, '.json')
            const jsonPath = path.join(tempDir, jsonFilename)
            exportTranscriptJson(fullText, segments, jsonPath)
            filesToZip.push({ path: jsonPath, name: jsonFilename })
          }
          if (exportFormats.includes('docx')) {
            const docxFilename = transcriptOriginalFilename(data.originalName, whisperLangForNames, '.docx')
            const docxPath = path.join(tempDir, docxFilename)
            exportPromises.push(exportTranscriptDocx(fullText, docxPath).then(() => {
              filesToZip.push({ path: docxPath, name: docxFilename })
            }))
          }
          if (exportFormats.includes('pdf')) {
            const pdfFilename = transcriptOriginalFilename(data.originalName, whisperLangForNames, '.pdf')
            const pdfPath = path.join(tempDir, pdfFilename)
            exportPromises.push(exportTranscriptPdf(fullText, pdfPath).then(() => {
              filesToZip.push({ path: pdfPath, name: pdfFilename })
            }))
          }
          if (exportPromises.length > 0) {
            await Promise.all(exportPromises)
          }
          log.info({ msg: 'export_completed', durationMs: Date.now() - exportStartMs, formats: exportFormats })

          await job.progress(75)
          if (STREAM_PROGRESS) await job.progress(80)

          // If multiple outputs, serve ZIP as primary
          if (filesToZip.length > 1) {
            const zipFilename = transcriptBundleZipFilename(data.originalName, whisperLangForNames)
            const zipPath = path.join(tempDir, zipFilename)
            const zipStream = fs.createWriteStream(zipPath)
            const zip = archiver('zip', { zlib: { level: 9 } })
            await new Promise<void>((resolve, reject) => {
              zipStream.on('close', () => resolve())
              zip.on('error', (err: any) => reject(err))
              zip.pipe(zipStream)
              filesToZip.forEach((f) => zip.file(f.path, { name: f.name }))
              zip.finalize()
            })
            primaryDownloadUrl = `/api/download/${zipFilename}`
            primaryFileName = zipFilename
          }

          const processedSeconds = data.precomputedTranscript
            ? (totalVideoDurationSec ?? 0)
            : await resolveMeteringSeconds({
                durationCheck: durationCheck!,
                trimmedStart: data.trimmedStart,
                trimmedEnd: data.trimmedEnd,
                segments,
                videoPath: videoPathForDuration!,
              })
          result = {
            downloadUrl: primaryDownloadUrl,
            fileName: primaryFileName,
            ...(segments.length > 0 && { segments }),
            ...(summary && { summary }),
            ...(chapters && chapters.length > 0 && { chapters }),
            // Benchmark / advertising: server-side processing time and video duration
            processingMs: fileReceivedToTranscriptionFinishedMs,
            videoDurationSeconds: processedSeconds,
            ...(STREAM_PROGRESS && { streamProgress: true }),
            // Server-transcoded AAC audio for the in-app player (null when extraction failed)
            ...(playbackAudioUrl && { audioUrl: playbackAudioUrl }),
            ...(data.youtubeResolutionPath && { resolutionPath: data.youtubeResolutionPath }),
            ...(data.youtubeCaptionSource && { captionSource: data.youtubeCaptionSource }),
            ...(data.youtubeCaptionSourceDetail && { captionSourceDetail: data.youtubeCaptionSourceDetail }),
            ...(data.youtubeErrorCode && { errorCode: data.youtubeErrorCode }),
            ...(data.fallbackHistory && data.fallbackHistory.length > 0 && { fallbackHistory: data.fallbackHistory }),
            ...(data.youtubeAttempts && data.youtubeAttempts.length > 0 && { attempts: data.youtubeAttempts }),
            ...(data.youtubeProxyUsed !== undefined && { proxyUsed: !!data.youtubeProxyUsed }),
            ...(data.youtubeProxyId && { proxyId: data.youtubeProxyId }),
            ...(data.degradedExecution !== undefined && { degradedExecution: !!data.degradedExecution }),
          }
          if (data.youtubeResolutionPath) {
            const confidence = computeYoutubeConfidence(
              data.youtubeResolutionPath,
              data.fallbackHistory,
              data.youtubeDecisionScore
            )
            const costEstimate = data.costEstimate ?? computeYoutubeCostEstimate(
              data.youtubeResolutionPath,
              !data.precomputedTranscript
            )
            const highCostThreshold = Math.max(3, parseInt(process.env.YOUTUBE_HIGH_COST_THRESHOLD || '3', 10))
            const highCost = costEstimate > highCostThreshold
            ;(data as any).youtubeConfidence = confidence
            ;(data as any).costEstimate = costEstimate
            ;(data as any).highCost = highCost
            ;(result as any).confidence = confidence
            ;(result as any).costEstimate = costEstimate
            ;(result as any).highCost = highCost
            if (highCost) {
              log.warn({ msg: 'high_cost_job', jobId: String(jobId), resolutionPath: data.youtubeResolutionPath, costEstimate, threshold: highCostThreshold })
            }
          }
          log.info({
            msg: 'yt_resolution_metrics',
            jobId: String(jobId),
            resolutionPath: data.youtubeResolutionPath ?? 'non_youtube',
            captionSource: data.youtubeCaptionSource ?? null,
            fallbackSteps: data.fallbackHistory?.length ?? 0,
            errorCode: data.youtubeErrorCode ?? null,
            confidence: data.youtubeConfidence ?? null,
            attemptsCount: data.youtubeAttempts?.length ?? 0,
            proxyUsed: (data.youtubeAttempts || []).some((a) => a.type === 'proxy' && a.result === 'success'),
            failedAfterProxy: (data.youtubeAttempts || []).some((a) => a.type === 'proxy' && a.result === 'fail'),
            costEstimate: data.costEstimate ?? (data.youtubeResolutionPath ? computeYoutubeCostEstimate(data.youtubeResolutionPath, !data.precomputedTranscript) : null),
            highCost: data.highCost ?? false,
            degradedExecution: !!data.degradedExecution,
          })
          if (redis) await recordYoutubeResolutionMetric(redis, data)

          const outputPath = path.join(tempDir, primaryFileName)
          if (data.videoHash && userId) {
            const cacheOpts = { ...data.options, trimmedStart: data.trimmedStart, trimmedEnd: data.trimmedEnd }
            await saveDuplicateResult(userId, data.videoHash, outputPath, 'video-to-transcript', cacheOpts, primaryFileName)
          }

          const minutes = secondsToMinutes(processedSeconds)
          if (userId && !job.data.usageIncremented) {
            await maybeTrackFirstPaidJob(userId, plan, job.data.toolType ?? 'video-to-transcript', jobId)
            await job.update({ ...job.data, usageIncremented: true })
            if (plan === 'free') {
              await recordFreePlanImport(userId)
            } else {
              await incrementUserUsage(userId, { totalMinutes: minutes, videoCount: 1, importCountToday: 1, dailyMinutesToday: minutes })
            }
          }

          // Fire-and-forget: record video duration + Whisper cost on the Job row
          if (processedSeconds > 0) {
            updateJobDurationAndCosts(
              String(jobId),
              processedSeconds,
              calcWhisperCostMicros(processedSeconds)
            ).catch(() => {})
          }

          if (firstPartialEmittedAt && (totalVideoDurationSec != null || processedSeconds > 0)) {
            const ttfwMs = firstPartialEmittedAt - processingStartMs
            log.info({
              msg: 'ttfw_metrics',
              jobId: String(jobId),
              ttfw_ms: ttfwMs,
              first_chunk_duration_sec: firstChunkDurationSec ?? null,
              total_video_duration_sec: totalVideoDurationSec ?? processedSeconds,
              file_size_bytes: data.fileSize ?? null,
            })
          }

          if (data.webhookUrl) {
            fireWebhook(data.webhookUrl, { jobId: String(jobId), status: 'completed', result }).catch(() => {})
          }
          if (partialWriter && redis) {
            await partialWriter.closeAndFlush()
            deleteJobPartial(redis, jobId)
          }
          break
        }

        case 'video-to-subtitles': {
          if (data.url) {
            throw new Error('URL downloads are temporarily disabled.')
          }
          let videoPath = data.filePath!
          const userId = data.userId
          const plan = data.plan || 'free'
          const isAlreadyAudio = data.inputType === 'audio'

          // Trim video if start/end times provided (not used for audio-only)
          if (
            !isAlreadyAudio &&
            data.trimmedStart !== undefined &&
            data.trimmedEnd !== undefined
          ) {
            await job.progress(12)
            const trimResult = await trimVideoSegment({
              inputPath: videoPath,
              startTime: data.trimmedStart,
              endTime: data.trimmedEnd,
            })
            videoPath = trimResult.outputPath
            trimmedPaths.push(videoPath)
            if (redis) registerActiveFiles(redis, jobId, [...inputPaths, ...trimmedPaths]).catch(() => {})
          }

          // Validate duration (works for both video and audio)
          await job.progress(15)
          const durationCheck = await validateVideoDuration(videoPath, getPlanLimits(plan).maxVideoDuration, plan)
          if (!durationCheck.valid) {
            throw new Error(durationCheck.error || 'Video too long')
          }

          const format = options?.format || 'srt'
          const additionalLangs = options?.additionalLanguages || []
          
          // Multi-language processing
          if (additionalLangs.length > 0) {
            await job.progress(30)
            const processingStartMs = Date.now()
            const multiLangResults = await generateMultiLanguageSubtitles(
              videoPath,
              options?.language || 'en',
              additionalLangs,
              format,
              isAlreadyAudio
            )
            const fileReceivedToTranscriptionFinishedMs = Date.now() - processingStartMs
            log.info({
              msg: 'transcription_completed',
              durationMs: fileReceivedToTranscriptionFinishedMs,
              fileSizeBytes: data.fileSize ?? undefined,
              multiLanguage: true,
              extractionSkipped: isAlreadyAudio,
            })
            
            // Save all language files
            await job.progress(80)
            const outputFiles: { [lang: string]: string } = {}
            
            // Save primary language (original transcription language)
            const primaryLang = options?.language || 'en'
            const primaryExt = format === 'srt' ? '.srt' : '.vtt'
            const primaryFilename = subtitlesOriginalFilename(data.originalName, primaryLang, primaryExt)
            const primaryPath = path.join(tempDir, primaryFilename)
            await fs.promises.writeFile(primaryPath, multiLangResults[primaryLang], 'utf-8')
            outputFiles[primaryLang] = primaryFilename
            
            // Save additional languages (translated subtitles)
            for (const lang of additionalLangs) {
              const langExt = format === 'srt' ? '.srt' : '.vtt'
              const langFilename = subtitlesTranslatedFilename(data.originalName, lang, langExt)
              const langPath = path.join(tempDir, langFilename)
              await fs.promises.writeFile(langPath, multiLangResults[lang], 'utf-8')
              outputFiles[lang] = langFilename
            }

            // Create ZIP for multi-language outputs
            const zipFilename = subtitlesMultilangZipFilename(data.originalName)
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

            if (data.videoHash && userId) {
              const cacheOpts = { ...data.options, trimmedStart: data.trimmedStart, trimmedEnd: data.trimmedEnd }
              await saveDuplicateResult(userId, data.videoHash, zipPath, 'video-to-subtitles', cacheOpts, zipFilename)
            }

            // Metering: primary + 0.5x per additional language
            const processedSeconds = await resolveMeteringSeconds({
              durationCheck,
              trimmedStart: data.trimmedStart,
              trimmedEnd: data.trimmedEnd,
              videoPath,
            })
            const baseMinutes = secondsToMinutes(processedSeconds)
            const translatedMinutes = calculateTranslationMinutes(processedSeconds, additionalLangs.length)
            if (userId && !job.data.usageIncremented) {
              await maybeTrackFirstPaidJob(userId, plan, job.data.toolType ?? 'subtitles', jobId)
              await job.update({ ...job.data, usageIncremented: true })
              if (plan === 'free') {
                await recordFreePlanImport(userId)
              } else {
                await incrementUserUsage(userId, {
                  totalMinutes: baseMinutes + translatedMinutes,
                  translatedMinutes,
                  languageCount: additionalLangs.length,
                  videoCount: 1,
                  importCountToday: 1,
                  dailyMinutesToday: baseMinutes + translatedMinutes,
                })
              }
            }
          } else {
            // Single language: use verbose path for partial streaming, then convert to SRT/VTT
            if (redis) {
              partialWriter = createPartialWriter(redis, jobId)
              partialWriter.startDrain()
            }
            const onPartialSub = partialWriter
              ? (segs: { start: number; end: number; text: string }[]) => partialWriter!.onPartial(segs)
              : undefined

            await job.progress(30)
            const glossary = options?.glossary?.trim()
            const processingStartMs = Date.now()
            const verboseResult = await transcribeVideoVerbose(videoPath, options?.language, glossary, isAlreadyAudio, onPartialSub, undefined, jobId)
            const fileReceivedToTranscriptionFinishedMs = Date.now() - processingStartMs
            log.info({
              msg: 'transcription_completed',
              durationMs: fileReceivedToTranscriptionFinishedMs,
              fileSizeBytes: data.fileSize ?? undefined,
              extractionSkipped: isAlreadyAudio,
            })

            // Sequential cue numbering (1-based); no duplicates or gaps. Partial on client is segment-only, not SRT.
            const entries: SubtitleEntry[] = verboseResult.segments.map((s, i) => ({
              index: i + 1,
              startTime: s.start,
              endTime: s.end,
              text: s.text,
            }))
            const subtitles = format === 'vtt' ? toVTT(entries) : toSRT(entries)

            // Save subtitles
            await job.progress(80)
            const ext = format === 'srt' ? '.srt' : '.vtt'
            const outputFilename = subtitlesOriginalFilename(data.originalName, options?.language, ext)
            const outputPath = path.join(tempDir, outputFilename)
            await fs.promises.writeFile(outputPath, subtitles, 'utf-8')

            let warnings: { type: string; message: string; line?: number }[] = []
            try {
              const val = validateSubtitleFile(outputPath)
              warnings = val.warnings
            } catch {
              // Phase 1B: derived validation must not block job
            }

            const processedSecondsSub = await resolveMeteringSeconds({
              durationCheck,
              trimmedStart: data.trimmedStart,
              trimmedEnd: data.trimmedEnd,
              segments: verboseResult.segments,
              videoPath,
            })
            result = {
              downloadUrl: `/api/download/${outputFilename}`,
              fileName: outputFilename,
              warnings: warnings.length > 0 ? warnings : undefined,
              processingMs: fileReceivedToTranscriptionFinishedMs,
              videoDurationSeconds: processedSecondsSub,
            }

            if (data.videoHash && userId) {
              const cacheOpts = { ...data.options, trimmedStart: data.trimmedStart, trimmedEnd: data.trimmedEnd }
              await saveDuplicateResult(userId, data.videoHash, outputPath, 'video-to-subtitles', cacheOpts, outputFilename)
            }

            // Metering (minutes or import count for free)
            const minutes = secondsToMinutes(processedSecondsSub)
            if (userId && !job.data.usageIncremented) {
              await maybeTrackFirstPaidJob(userId, plan, job.data.toolType ?? 'subtitles', jobId)
              await job.update({ ...job.data, usageIncremented: true })
              if (plan === 'free') {
                await recordFreePlanImport(userId)
              } else {
                await incrementUserUsage(userId, { totalMinutes: minutes, videoCount: 1, importCountToday: 1, dailyMinutesToday: minutes })
              }
            }

            // Fire-and-forget: record video duration + Whisper cost on the Job row
            if (processedSecondsSub > 0) {
              updateJobDurationAndCosts(
                String(jobId),
                processedSecondsSub,
                calcWhisperCostMicros(processedSecondsSub)
              ).catch(() => {})
            }

            if (partialWriter && redis) {
              await partialWriter.closeAndFlush()
              deleteJobPartial(redis, jobId)
            }
          }
          break
        }

        case 'batch-video-to-subtitles': {
          let videoPath = data.filePath!
          const batchId = data.batchId!
          let batch = await getBatchById(batchId)

          if (!batch) {
            throw new Error('Batch not found')
          }

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

            await job.progress(15)
            const glossary = options?.glossary?.trim()
            const lang = options?.language || 'en'
            const isAudio = data.inputType === 'audio'

            const processingStartMs = Date.now()

            let fullText = ''
            let segments: { start: number; end: number; text: string; speaker?: string }[] = []

            if (options?.speakerDiarization) {
              await job.progress(18)
              const diar = await transcribeWithDiarization(videoPath, options?.diarizationLanguage || lang, {
                isAlreadyAudio: isAudio,
                prompt: glossary,
                numSpeakers: options?.numSpeakers,
              })
              if (diar) {
                fullText = diar.text
                segments = resolveSpeakerNames(diar.segments)
              } else {
                const verbose = await transcribeVideoVerbose(videoPath, lang, glossary, isAudio, undefined, undefined, jobId)
                fullText = verbose.text
                segments = verbose.segments || []
              }
            } else {
              const verbose = await transcribeVideoVerbose(videoPath, lang, glossary, isAudio, undefined, undefined, jobId)
              fullText = verbose.text
              segments = verbose.segments || []
            }

            try {
              if (segments.length > 0) {
                fullText = segmentToStructuredText(segments)
              }
              fullText = formatTranscript(fullText)
            } catch {
              /* keep */
            }

            const originalName = data.originalName || 'video'
            const nameWithoutExt = path.basename(originalName, path.extname(originalName))
            const baseName = sanitizeBatchFolderName(nameWithoutExt)
            const pos = data.batchPosition ?? 1
            const folderKey = `${baseName}_${pos}`
            const stagingRoot = path.join(tempDir, 'batch-zip-staging', batchId)
            const outDir = path.join(stagingRoot, folderKey)
            fs.mkdirSync(outDir, { recursive: true })

            const entries = segmentsToSubtitleEntriesForBatch(segments)
            const primarySrt = toSRT(entries)
            const primaryVtt = toVTT(entries)
            const batchSourceLang = langCodeForFile(options?.language || 'en')
            const transcriptTxtName = joinExportFilename(baseName, `transcript_original_${batchSourceLang}`, '.txt')
            const transcriptJsonName = joinExportFilename(baseName, `transcript_original_${batchSourceLang}`, '.json')
            const subtitlesSrtName = joinExportFilename(baseName, `subtitles_original_${batchSourceLang}`, '.srt')
            const subtitlesVttName = joinExportFilename(baseName, `subtitles_original_${batchSourceLang}`, '.vtt')
            const notionName = joinExportFilename(baseName, 'transcript_notion_blocks', '.json')
            const speakersName = joinExportFilename(baseName, 'speakers_labeled', '.txt')
            await fs.promises.writeFile(path.join(outDir, transcriptTxtName), fullText, 'utf-8')
            exportTranscriptJson(
              fullText,
              segments.map((s) => ({
                start: s.start,
                end: s.end,
                text: s.text,
                ...(s.speaker ? { speaker: s.speaker } : {}),
              })),
              path.join(outDir, transcriptJsonName)
            )
            await fs.promises.writeFile(path.join(outDir, subtitlesSrtName), primarySrt, 'utf-8')
            await fs.promises.writeFile(path.join(outDir, subtitlesVttName), primaryVtt, 'utf-8')

            const notionBlocks = segments.map((s) => ({
              type: 'paragraph',
              rich_text: [{ text: { content: s.speaker ? `[${s.speaker}] ${s.text}` : s.text } }],
            }))
            await fs.promises.writeFile(
              path.join(outDir, notionName),
              JSON.stringify(notionBlocks, null, 2),
              'utf-8'
            )

            if (options?.speakerDiarization) {
              if (segments.some((s) => s.speaker)) {
                const speakerLines = segments.map(
                  (s) => `[${s.speaker || 'Speaker'}] ${s.start.toFixed(1)}s  ${s.text}`
                )
                await fs.promises.writeFile(
                  path.join(outDir, speakersName),
                  speakerLines.join('\n\n'),
                  'utf-8'
                )
              } else {
                await fs.promises.writeFile(
                  path.join(outDir, speakersName),
                  [
                    'Speaker diarization was enabled, but no speaker labels were returned for this file.',
                    '(Common when the audio is a single speaker or the model falls back to plain transcription.)',
                    '',
                    '--- Transcript ---',
                    '',
                    fullText,
                  ].join('\n'),
                  'utf-8'
                )
              }
            }

            const additionalLangs = options?.additionalLanguages || []
            const sourceLangName = LANGUAGE_NAMES[options?.language || 'en'] || 'English'
            for (const code of additionalLangs) {
              const langName = LANGUAGE_NAMES[code] || code
              const translatedEntries = await translateSubtitles(entries, langName, sourceLangName)
              const translatedPlain = translatedEntries.map((e) => e.text).join('\n\n')
              const trSrt = joinExportFilename(baseName, `subtitles_translated_${code}`, '.srt')
              const trVtt = joinExportFilename(baseName, `subtitles_translated_${code}`, '.vtt')
              const trTxt = joinExportFilename(baseName, `transcript_translated_${code}`, '.txt')
              await fs.promises.writeFile(path.join(outDir, trSrt), toSRT(translatedEntries), 'utf-8')
              await fs.promises.writeFile(path.join(outDir, trVtt), toVTT(translatedEntries), 'utf-8')
              await fs.promises.writeFile(path.join(outDir, trTxt), translatedPlain, 'utf-8')
            }

            const fileReceivedToTranscriptionFinishedMs = Date.now() - processingStartMs
            log.info({
              msg: 'transcription_completed',
              durationMs: fileReceivedToTranscriptionFinishedMs,
              fileSizeBytes: data.fileSize ?? undefined,
              batchId,
            })

            await job.progress(80)
            const batchAfterOk = await incrementBatchProcessedVideos(batchId)
            if (!batchAfterOk) throw new Error('Batch not found')
            batch = batchAfterOk

            const userId = data.userId
            const plan = (data.plan || 'free') as PlanType
            const processedSeconds =
              trimmedDuration > 0
                ? trimmedDuration
                : await resolveMeteringSeconds({
                    durationCheck: { durationKnown: false },
                    segments,
                    videoPath,
                  })
            const minutes = secondsToMinutes(processedSeconds)
            if (userId && !job.data.usageIncremented) {
              await maybeTrackFirstPaidJob(userId, plan, job.data.toolType ?? 'batch', jobId)
              await job.update({ ...job.data, usageIncremented: true })
              if (plan === 'free') {
                await recordFreePlanImport(userId)
              } else {
                const translatedExtra =
                  additionalLangs.length > 0 ? calculateTranslationMinutes(processedSeconds, additionalLangs.length) : 0
                await incrementUserUsage(userId, {
                  totalMinutes: minutes + translatedExtra,
                  videoCount: 1,
                  importCountToday: 1,
                  dailyMinutesToday: minutes + translatedExtra,
                  translatedMinutes: translatedExtra,
                })
              }
            }

            if (batch.processedVideos + batch.failedVideos >= batch.totalVideos) {
              await generateBatchZip(batchId, batch)
            }

            result = {
              downloadUrl: `/api/download/batch-${batchId}.zip`,
              fileName: `batch-${batchId}.zip`,
              batchId,
            }
          break
        }

        case 'translate-subtitles': {
          const userId = data.userId
          await job.progress(20)
          const targetLang = options?.targetLanguage || 'Spanish'
          const langSlug = targetLangFileSlug(targetLang)
          const filePath = data.filePath!
          const isTxtFile = filePath.toLowerCase().endsWith('.txt')

          if (isTxtFile) {
            // Plain-text translation: preserve exact line structure
            const raw = await fs.promises.readFile(filePath, 'utf-8')
            const translatedText = await translatePreservingLines(raw, targetLang)
            await job.progress(85)
            const outputFilename = transcriptTranslatedTextFilename(data.originalName, langSlug)
            const outputPath = path.join(tempDir, outputFilename)
            await fs.promises.writeFile(outputPath, translatedText, 'utf-8')
            result = {
              downloadUrl: `/api/download/${outputFilename}`,
              fileName: outputFilename,
            }
          } else {
            // SRT / VTT: timestamps are never touched — only text fields translated
            const translated = await translateSubtitleFile(filePath, targetLang)
            await job.progress(70)
            const ext = translated.format === 'srt' ? '.srt' : '.vtt'
            const outputFilename = subtitlesTranslatedFilename(data.originalName, langSlug, ext)
            const outputPath = path.join(tempDir, outputFilename)
            await fs.promises.writeFile(outputPath, translated.content, 'utf-8')

            let consistencyIssues: { line: number; issueType: string }[] = []
            try {
              const format = detectSubtitleFormat(outputPath)
              const entries = format === 'srt' ? parseSRT(outputPath) : parseVTT(outputPath)
              const check = detectLanguageConsistency(entries, targetLang)
              consistencyIssues = check.issues
            } catch {
              // Phase 1B: derived check must not block job
            }

            result = {
              downloadUrl: `/api/download/${outputFilename}`,
              fileName: outputFilename,
              consistencyIssues: consistencyIssues.length > 0 ? consistencyIssues : undefined,
            }
          }

          if (userId && !job.data.usageIncremented) {
            await job.update({ ...job.data, usageIncremented: true })
            const usagePlan = (data.plan || 'free') as PlanType
            if (usagePlan === 'free') await recordFreePlanImport(userId)
            else await incrementUserUsage(userId, { importCount: 1, importCountToday: 1 })
          }
          break
        }

        case 'fix-subtitles': {
          const userId = data.userId
          await job.progress(20)
          const opt = options as Record<string, unknown> | undefined
          const fixOptions = {
            fixTiming: opt?.fixTiming === true || opt?.fixTiming === 'true',
            timingOffsetMs: opt?.timingOffsetMs != null ? Number(opt.timingOffsetMs) : undefined,
            grammarFix: opt?.grammarFix === true || opt?.grammarFix === 'true',
            lineBreakFix: opt?.lineBreakFix === true || opt?.lineBreakFix === 'true',
            removeFillers: opt?.removeFillers === true || opt?.removeFillers === 'true',
          }
          const fixed = await fixSubtitleFile(data.filePath!, fixOptions)

          // Scene cut detection: if a video was uploaded alongside, detect cuts and flag spanning cues
          await job.progress(50)
          if (data.filePath2) {
            try {
              const cutTimestamps = await detectSceneCuts(data.filePath2)
              if (cutTimestamps.length > 0) {
                // Re-parse original file for timing — in analyze mode (all options false) these
                // match the output entries; the dual-upload path is only used for analyze.
                const format = detectSubtitleFormat(data.filePath!)
                const entries = format === 'srt' ? parseSRT(data.filePath!) : parseVTT(data.filePath!)
                const sceneCutWarnings = validateAgainstSceneCuts(entries, cutTimestamps)
                if (sceneCutWarnings.length > 0) {
                  fixed.warnings = [...(fixed.warnings ?? []), ...sceneCutWarnings]
                }
              }
            } catch (err) {
              workerLog.warn({ msg: 'Scene cut detection failed (non-blocking)', jobId, error: String(err) })
            }
          }

          // Save fixed file
          await job.progress(70)
          const ext = fixed.format === 'srt' ? '.srt' : '.vtt'
          const outputFilename = subtitlesFixedFilename(data.originalName, ext)
          const outputPath = path.join(tempDir, outputFilename)
          await fs.promises.writeFile(outputPath, fixed.content, 'utf-8')

          if (userId && !job.data.usageIncremented) {
            await job.update({ ...job.data, usageIncremented: true })
            const usagePlan = (data.plan || 'free') as PlanType
            if (usagePlan === 'free') await recordFreePlanImport(userId)
            else await incrementUserUsage(userId, { importCount: 1, importCountToday: 1 })
          }

          result = {
            downloadUrl: `/api/download/${outputFilename}`,
            fileName: outputFilename,
            issues: fixed.issues,
            warnings: fixed.warnings,
          }
          break
        }

        // Phase 1B — UTILITY 2B: Subtitle Format Converter. Derived from subtitle files only; no AI.
        case 'convert-subtitles': {
          const userId = data.userId
          await job.progress(20)
          const targetFormat = (options?.targetFormat || 'vtt') as 'srt' | 'vtt' | 'txt'
          const converted = convertSubtitleFile(data.filePath!, targetFormat)

          await job.progress(70)
          const outputFilename = subtitlesConvertedFilename(data.originalName, converted.format)
          const outputPath = path.join(tempDir, outputFilename)
          await fs.promises.writeFile(outputPath, converted.content, 'utf-8')

          if (userId && !job.data.usageIncremented) {
            await job.update({ ...job.data, usageIncremented: true })
            const usagePlan = (data.plan || 'free') as PlanType
            if (usagePlan === 'free') await recordFreePlanImport(userId)
            else await incrementUserUsage(userId, { importCount: 1, importCountToday: 1 })
          }

          result = {
            downloadUrl: `/api/download/${outputFilename}`,
            fileName: outputFilename,
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
            trimmedPaths.push(videoPath)
            if (redis) registerActiveFiles(redis, jobId, [...inputPaths, ...trimmedPaths]).catch(() => {})
          }

          await job.progress(14)
          const burnDurationCheck = await validateVideoDuration(videoPath, getPlanLimits(plan).maxVideoDuration, plan)
          if (!burnDurationCheck.valid) {
            throw new Error(burnDurationCheck.error || 'Video too long')
          }

          // Burn subtitles
          await job.progress(20)
          const outputFilename = videoBurnedInFilename(data.originalName)
          const outputPath = path.join(tempDir, outputFilename)

          const burnPreset = (options?.burnFontSize || options?.burnPosition || options?.burnBackgroundOpacity)
            ? {
                fontSize: options?.burnFontSize,
                position: options?.burnPosition,
                backgroundOpacity: options?.burnBackgroundOpacity,
              }
            : undefined

          await burnSubtitles(
            videoPath,
            subtitlePath,
            outputPath,
            (progress) => {
              const mappedProgress = 20 + (progress.percent * 0.7)
              job.progress(mappedProgress)
            },
            burnPreset
          )

          result = {
            downloadUrl: `/api/download/${outputFilename}`,
            fileName: outputFilename,
          }

          // Metering: minutes for paid, import count for free
          const processedSeconds = await resolveMeteringSeconds({
            durationCheck: burnDurationCheck,
            trimmedStart: data.trimmedStart,
            trimmedEnd: data.trimmedEnd,
            videoPath: outputPath,
            secondaryVideoPaths: [videoPath],
          })
          const minutes = secondsToMinutes(processedSeconds)
          if (userId && !job.data.usageIncremented) {
            await maybeTrackFirstPaidJob(userId, plan, job.data.toolType ?? 'video-tool', jobId)
            await job.update({ ...job.data, usageIncremented: true })
            if (plan === 'free') {
              await recordFreePlanImport(userId)
            } else {
              await incrementUserUsage(userId, { totalMinutes: minutes, videoCount: 1, importCountToday: 1, dailyMinutesToday: minutes })
            }
          }
          break
        }

        case 'compress-video': {
          await job.progress(10)
          let videoPath = data.filePath!
          const userId = data.userId
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
            trimmedPaths.push(videoPath)
            if (redis) registerActiveFiles(redis, jobId, [...inputPaths, ...trimmedPaths]).catch(() => {})
          }

          // Phase 1B: profile (web/mobile/archive) for resolution + CRF; else legacy compressionLevel
          const crfMap: Record<string, number> = {
            light: 23,
            medium: 28,
            heavy: 32,
          }
          const profile = options?.compressProfile as CompressProfile | undefined
          const crf = profile ? 28 : crfMap[options?.compressionLevel || 'medium']

          await job.progress(18)
          const compressDurationCheck = await validateVideoDuration(videoPath, getPlanLimits(plan).maxVideoDuration, plan)
          if (!compressDurationCheck.valid) {
            throw new Error(compressDurationCheck.error || 'Video too long')
          }

          await job.progress(20)
          const outputFilename = videoCompressedFilename(data.originalName)
          const outputPath = path.join(tempDir, outputFilename)

          await compressVideo(
            videoPath,
            outputPath,
            crf,
            (progress) => {
              const mappedProgress = 20 + (progress.percent * 0.7)
              job.progress(mappedProgress)
            },
            profile
          )

          result = {
            downloadUrl: `/api/download/${outputFilename}`,
            fileName: outputFilename,
          }

          // Metering: minutes for paid, import count for free
          const processedSeconds = await resolveMeteringSeconds({
            durationCheck: compressDurationCheck,
            trimmedStart: data.trimmedStart,
            trimmedEnd: data.trimmedEnd,
            videoPath: outputPath,
            secondaryVideoPaths: [videoPath],
          })
          const minutes = secondsToMinutes(processedSeconds)
          if (userId && !job.data.usageIncremented) {
            await maybeTrackFirstPaidJob(userId, plan, job.data.toolType ?? 'video-tool', jobId)
            await job.update({ ...job.data, usageIncremented: true })
            if (plan === 'free') {
              await recordFreePlanImport(userId)
            } else {
              await incrementUserUsage(userId, { totalMinutes: minutes, videoCount: 1, importCountToday: 1, dailyMinutesToday: minutes })
            }
          }
          break
        }

        default:
          throw new Error(`Unknown tool type: ${toolType}`)
      }

      jobSucceeded = true
      await job.progress(100)
      return result
    } catch (error: any) {
      if (redis) deleteJobPartial(redis, jobId)
      if (redis) deleteJobStage(redis, jobId)
      captureJobError(jobId, data.requestId, data.toolType, error)
      log.error({ err: error, msg: 'job_failed', error_message: error?.message ?? String(error) })
      throw error
    } finally {
      // Always close the drain loop whether job succeeded or failed (prevents Redis handle leak on crash)
      if (partialWriter) await partialWriter.closeAndFlush().catch(() => {})
      // Clean up stage key on success
      if (redis) deleteJobStage(redis, jobId)
      // Remove from active-file registry so the cleanup cron can reclaim disk
      if (redis) deregisterActiveFiles(redis, jobId).catch(() => {})
      // Delete input and trim-output files immediately on success — output files
      // are intentionally kept for download and rely on the 2.5 hr cron.
      // On failure we leave files intact so Bull can retry the job with the
      // same data.filePath (retries would fail if we deleted the input).
      if (jobSucceeded) {
        for (const p of [...inputPaths, ...trimmedPaths]) {
          try { if (p && fs.existsSync(p)) fs.unlinkSync(p) } catch { /* non-blocking */ }
        }
      }
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
    const totalJobMs = Date.now() - processingStartMs
    log.info({ msg: 'job_completed', durationMs: totalJobMs })
    try {
      trackProcessingFinished({
        job_id: String(jobId),
        user_id: data.userId || 'demo-user',
        tool_type: data.toolType,
        processing_ms: totalJobMs,
        extraction_skipped: data.toolType === 'cached-result',
      })
    } catch {
      // non-blocking
    }
    try {
      const resultFilename =
        result && typeof result === 'object' && typeof (result as { fileName?: unknown }).fileName === 'string'
          ? (result as { fileName: string }).fileName
          : undefined
      await updateJobCompleted(String(jobId), totalJobMs, resultFilename)
      if (data.userId) {
        const user = await getUser(data.userId)
        if (user) {
          user.lastActiveAt = new Date()
          await saveUser(user)
        }
        captureFunnelEvent({
          eventName: 'job_completed',
          userId: data.userId,
          source: data.toolType,
          metadata: { job_id: String(jobId), processing_ms: totalJobMs },
        }).catch(() => {})
        captureFunnelEvent({
          eventName: 'first_output_seen',
          userId: data.userId,
          source: data.toolType,
          metadata: { job_id: String(jobId) },
        }).catch(() => {})
      }
    } catch {
      // non-blocking
    }
    // Success: return value is persisted by Bull as job.returnvalue; job state becomes "completed"
    pushLogEntry({ ts: new Date().toISOString(), level: 'info', service: 'worker', msg: `job completed: ${data.toolType} in ${(totalJobMs / 1000).toFixed(1)}s`, jobId: String(jobId) })
    return result
  } catch (err: any) {
    clearInterval(interval)
    try {
      trackProcessingFailed({
        job_id: String(jobId),
        user_id: data.userId ?? undefined,
        tool_type: data.toolType,
        error_message: err?.message,
      })
    } catch {
      // non-blocking
    }
    if (err?.message?.includes('exceeded maximum runtime')) {
      try {
        trackJobTimedOut({
          job_id: String(jobId),
          user_id: data.userId ?? undefined,
          tool_type: data.toolType,
        })
      } catch {
        // non-blocking
      }
    }
    // Failure: rethrow so Bull marks job as "failed" and stores error; no job can exit without terminal state
    log.error({ err, msg: 'job_failed', error_message: err?.message ?? String(err) })
    pushLogEntry({ ts: new Date().toISOString(), level: 'error', service: 'worker', msg: `job failed: ${data.toolType} — ${err?.message ?? String(err)}`, jobId: String(jobId), extra: err?.stack?.slice(0, 200) })
    throw err
  }
}

function attachQueueEvents(queue: import('bull').Queue<JobData>) {
  queue.on('completed', async (job) => {
    if ((job.returnvalue as any)?.__handedOff) return
    workerLog.info({ jobId: job.id, msg: 'job_completed' })
    const data = job.data as JobData
    const returnValue = job.returnvalue as { downloadUrl?: string } | undefined
    sendJobCompletedEmail({
      jobId: String(job.id),
      userId: data.userId,
      downloadUrl: returnValue?.downloadUrl,
    }).catch((err) => {
      workerLog.warn({ msg: 'job_completed_email_error', jobId: job.id, error: (err as Error)?.message })
    })
    if (data.batchId) {
      const batch = await getBatchById(data.batchId)
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
    const data = job?.data as JobData
    const queueName = (queue as any)?.name ?? 'unknown'
    workerLog.error({
      jobId: job?.id,
      queue: queueName,
      toolType: data?.toolType,
      err,
      errorMessage: err?.message,
      attemptsMade: job?.attemptsMade,
      msg: 'job_failed_event',
    })
    const attempts = job?.opts?.attempts ?? 2
    const made = job?.attemptsMade ?? 1
    const isFinalFailure = made >= attempts

    if (err?.message === HUNG_JOB_MESSAGE) {
      workerLog.warn({
        jobId: job?.id,
        msg: 'job_hung',
        willRetry: attempts - made > 0,
      })
    } else {
      workerLog.error({ jobId: job?.id, err, msg: 'job_failed' })
      if (isFinalFailure) {
        workerLog.error({
          jobId: job?.id,
          toolType: (job?.data as JobData)?.toolType,
          error: err?.message,
          msg: 'job_failed_permanent',
        })
      }
    }
    if (isFinalFailure) {
      try {
        const idsToUpdate = new Set<string>()
        if (job?.id != null) idsToUpdate.add(String(job.id))
        if (data?.jobToken) idsToUpdate.add(String(data.jobToken))
        await Promise.all([...idsToUpdate].map((id) => updateJobFailed(id, err?.message || 'Job failed')))
      } catch {
        // non-blocking
      }
    }
    if (data?.webhookUrl) {
      fireWebhook(data.webhookUrl, {
        jobId: String(job?.id),
        status: 'failed',
        error: err?.message || 'Job failed',
      }).catch(() => {})
    }
    if (data?.batchId && isFinalFailure) {
      const batchAfterFail = await appendBatchFailure(
        data.batchId,
        data.originalName || 'unknown',
        err?.message || 'Processing failed'
      )
      if (
        batchAfterFail &&
        batchAfterFail.processedVideos + batchAfterFail.failedVideos >= batchAfterFail.totalVideos &&
        !batchAfterFail.zipPath
      ) {
        await generateBatchZip(data.batchId, batchAfterFail)
      }
    }
  })
}

/** Write heartbeat to Redis so API /ops/queue can report last heartbeat age. Reuses Bull's client to avoid extra connections. */
function startHeartbeat() {
  const intervalMs = Math.min(HEARTBEAT_TTL_SEC * 1000, 30_000)
  setInterval(() => {
    fileQueue.client.setex(WORKER_HEARTBEAT_KEY, HEARTBEAT_TTL_SEC, String(Date.now())).catch(() => {})
  }, intervalMs)
}

export function startWorker() {
  fileQueue.process(NORMAL_CONCURRENCY, processJob)
  priorityQueue.process(PRIORITY_CONCURRENCY, processJob)
  attachQueueEvents(fileQueue)
  attachQueueEvents(priorityQueue)
  if (YOUTUBE_QUEUE_SEPARATION) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Bull internal settings
    const captionSettings = (captionQueue as any).settings
    workerLog.info({
      msg: 'youtube_queues_registered',
      captionConcurrency: CAPTION_CONCURRENCY,
      audioConcurrency: AUDIO_CONCURRENCY,
      transcriptionConcurrency: TRANSCRIPTION_CONCURRENCY,
      captionLockDurationMs: captionSettings?.lockDuration,
      captionLockRenewMs: captionSettings?.lockRenewTime,
    })
    captionQueue.process(CAPTION_CONCURRENCY, processCaptionJob)
    audioQueue.process(AUDIO_CONCURRENCY, processAudioJob)
    transcriptionQueue.process(TRANSCRIPTION_CONCURRENCY, processTranscriptionJob)
    attachQueueEvents(captionQueue)
    attachQueueEvents(audioQueue)
    attachQueueEvents(transcriptionQueue)
  } else {
    workerLog.info({ msg: 'youtube_queue_separation_disabled' })
  }
  startHeartbeat()
}

// When run as main (worker container): node dist/workers/videoProcessor.js
if (require.main === module) {
  initSentry()
  startWorker()
  startGuidelineWorker()
  workerLog.info({
    msg: 'Worker process started',
    normalConcurrency: NORMAL_CONCURRENCY,
    priorityConcurrency: PRIORITY_CONCURRENCY,
    PROCESSING_V2,
    ...(WORKER_CONCURRENCY_V2 && { workerConcurrencyV2: true, availableCPU }),
  })
}
