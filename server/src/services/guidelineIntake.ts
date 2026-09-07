/**
 * Shared "Make it Client Ready" guideline-formatting job intake, extracted
 * from the original inline `POST /api/guidelines/format` handler so the
 * first-party web route and the external `POST /api/v1/guideline-formats`
 * route call exactly the same validation, plan-gating, and enqueue path —
 * there is no second implementation.
 *
 * Unlike the video/subtitle tools, guideline formatting does NOT go through
 * workers/videoProcessor.ts's toolType switch — it has its own FormattingJob
 * table and guidelineQueue (workers/guidelineProcessor.ts). This function
 * reuses that exact pipeline rather than inventing a `guideline-format`
 * worker case.
 */
import crypto from 'crypto'
import { Request } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { getEffectiveUserId } from '../utils/auth'
import { getEffectivePlan } from '../utils/subscriptionGuard'
import { guidelineQueue } from '../workers/guidelineProcessor'
import type { CaptionCue, CaptionFormat, ParsedRule } from './guidelineEnforcer'
import { insertJobRecord } from '../lib/jobAnalytics'
import { pushLogEntry } from '../lib/logRing'
import Redis from 'ioredis'
import { intakeError, type TranscriptionIntakeResult, type JobSource } from './transcriptionIntake'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const gateRedis = new Redis(redisUrl, {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: true,
})

function secondsUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 1000))
}

function todayUTCString(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function guidelineDailyKey(userId: string): string {
  return `guidelines:daily:${userId}:${todayUTCString()}`
}

async function checkAndRecordGuidelineDaily(userId: string, limit: number): Promise<boolean> {
  const key = guidelineDailyKey(userId)
  const ttl = secondsUntilMidnightUTC()
  try {
    const pipeline = gateRedis.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, ttl)
    const results = await pipeline.exec()
    const count = (results?.[0]?.[1] as number) ?? 1
    return count <= limit
  } catch {
    // fail-open; do not block formatting if Redis is unavailable
    return true
  }
}

function estimateTranscriptMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return words / 150
}

export function validateRules(body: unknown): ParsedRule[] | null {
  if (!body || typeof body !== 'object') return null
  const rules = (body as { rules?: unknown }).rules
  if (!Array.isArray(rules) || rules.length === 0) return null
  const out: ParsedRule[] = []
  for (const r of rules) {
    if (!r || typeof r !== 'object') return null
    const o = r as Record<string, unknown>
    if (
      typeof o.id !== 'string' ||
      typeof o.category !== 'string' ||
      typeof o.label !== 'string' ||
      typeof o.currentValue !== 'string'
    ) {
      return null
    }
    out.push({ id: o.id, category: o.category, label: o.label, currentValue: o.currentValue })
  }
  return out
}

export function validateCaptionPayload(body: unknown): { format: CaptionFormat; cues: CaptionCue[] } | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const f = b.inputFormat
  if (f !== 'srt' && f !== 'vtt') return null
  const cues = b.cues
  if (!Array.isArray(cues) || cues.length === 0) return null
  const out: CaptionCue[] = []
  for (const c of cues) {
    if (!c || typeof c !== 'object') return null
    const o = c as Record<string, unknown>
    if (
      typeof o.index !== 'number' ||
      typeof o.startTime !== 'string' ||
      typeof o.endTime !== 'string' ||
      typeof o.text !== 'string'
    ) {
      return null
    }
    out.push({ index: o.index, startTime: o.startTime, endTime: o.endTime, text: o.text })
  }
  return { format: f, cues: out }
}

export interface GuidelineFormatIntakeOptions {
  source: JobSource
  apiKeyId?: string
  authenticatedUserId?: string
}

/**
 * Core "format a transcript against style rules" pipeline. Same validation
 * order, plan gating, and enqueue call as the original inline
 * `POST /api/guidelines/format` handler — only extracted into a
 * response-agnostic function returning the same discriminated result shape
 * used by transcriptionIntake.ts / dualFileIntake.ts.
 */
export async function runGuidelineFormatIntake(
  req: Request,
  opts: GuidelineFormatIntakeOptions
): Promise<TranscriptionIntakeResult> {
  try {
    const authedUserId = opts.authenticatedUserId ?? getEffectiveUserId(req)
    const userId = authedUserId ?? `guest_${crypto.randomUUID()}`
    const jobToken = crypto.randomUUID()

    const { plan } = await getEffectivePlan(req)

    const transcriptText = typeof req.body?.transcriptText === 'string' ? req.body.transcriptText : ''
    const trimmed = transcriptText.trim()
    if (!trimmed) {
      return intakeError(400, 'VALIDATION_ERROR', 'transcriptText must be a non-empty string')
    }

    if (plan === 'free') {
      const mins = estimateTranscriptMinutes(trimmed)
      if (mins > 30) {
        return intakeError(400, 'VALIDATION_ERROR', 'Free plan supports up to ~30 minutes of transcript text per run. Upgrade to Pro for longer transcripts.')
      }
    }

    const rules = validateRules(req.body)
    if (!rules) {
      return intakeError(400, 'VALIDATION_ERROR', 'rules must be a non-empty array; each item needs id, category, label, currentValue strings')
    }

    const presetIdRaw = req.body?.presetId
    const presetId = typeof presetIdRaw === 'string' && presetIdRaw.length > 0 ? presetIdRaw : null

    // Daily quota is checked/recorded last, immediately before the job is
    // actually created, so a request rejected by validation above (too long,
    // missing rules, etc.) never consumes a free-plan daily slot.
    if (plan === 'free') {
      const dailyLimitKey = authedUserId ?? `ip_${String(req.ip || req.headers['x-forwarded-for'] || 'unknown')}`
      const allowed = await checkAndRecordGuidelineDaily(dailyLimitKey, 3)
      if (!allowed) {
        return intakeError(429, 'QUOTA_EXCEEDED', 'Free plan limit reached: 3 guideline formats per month. Upgrade to Pro for unlimited.')
      }
    }

    const job = await prisma.formattingJob.create({
      data: {
        userId,
        jobToken,
        inputText: trimmed,
        status: 'queued',
        stage: 'queued',
        appliedRules: rules as unknown as Prisma.InputJsonValue,
        presetId,
      },
    })

    // Mirror into the persistent Job table so the Founder Dashboard counts it
    // like other tools, AND so the external API's GET /api/v1/guideline-formats/:id
    // status polling and ownership checks reuse the same durable record every
    // other /api/v1 operation uses (source/apiKeyId are only ever set here).
    void insertJobRecord({
      id: job.id,
      userId,
      toolType: 'guideline-formatting',
      source: opts.source,
      apiKeyId: opts.apiKeyId,
    })

    const caption = validateCaptionPayload(req.body)

    await guidelineQueue.add(
      caption
        ? { formattingJobId: job.id, transcriptText: trimmed, rules, userId, inputFormat: caption.format, cues: caption.cues }
        : { formattingJobId: job.id, transcriptText: trimmed, rules, userId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
    )

    pushLogEntry({
      ts: new Date().toISOString(),
      level: 'info',
      service: 'api',
      msg: 'guideline_format_enqueued',
      jobId: job.id,
      module: 'guidelines',
    })

    return { ok: true, jobId: job.id, jobToken }
  } catch (e) {
    return intakeError(500, 'INTERNAL_ERROR', e instanceof Error ? e.message : 'Internal error')
  }
}
