import express, { Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../db'
import { getAuthFromRequest } from '../utils/auth'
import { getUser } from '../models/User'
import { getJobById, type JobData } from '../workers/videoProcessor'
import { getLogger } from '../lib/logger'
import { buildShareSignupUrl, planShowsProminentShareBranding } from '../utils/shareBranding'

const log = getLogger('api')
const router = express.Router()

const MAX_FULLTEXT = 1_200_000
const MAX_SEGMENTS = 50_000

function newShareSlug(): string {
  return crypto.randomBytes(18).toString('base64url')
}

type SharePayload = {
  fullText: string
  segments?: { start: number; end: number; text: string; speaker?: string }[]
  summary?: { summary?: string; bullets?: string[]; actionItems?: string[] }
}

function sanitizePayload(raw: unknown): SharePayload | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const fullText = typeof o.fullText === 'string' ? o.fullText : ''
  if (fullText.length > MAX_FULLTEXT) {
    return null
  }
  let segments: SharePayload['segments'] | undefined
  if (Array.isArray(o.segments)) {
    if (o.segments.length > MAX_SEGMENTS) return null
    segments = o.segments.map((s) => {
      if (!s || typeof s !== 'object') return null
      const seg = s as Record<string, unknown>
      return {
        start: Number(seg.start) || 0,
        end: Number(seg.end) || 0,
        text: typeof seg.text === 'string' ? seg.text.slice(0, 50_000) : '',
        ...(typeof seg.speaker === 'string' ? { speaker: seg.speaker.slice(0, 200) } : {}),
      }
    }).filter(Boolean) as SharePayload['segments']
  }
  let summary: SharePayload['summary'] | undefined
  if (o.summary && typeof o.summary === 'object') {
    const su = o.summary as Record<string, unknown>
    summary = {
      ...(typeof su.summary === 'string' ? { summary: su.summary.slice(0, 200_000) } : {}),
      ...(Array.isArray(su.bullets) ? { bullets: su.bullets.map((b) => String(b).slice(0, 2000)).slice(0, 500) } : {}),
      ...(Array.isArray(su.actionItems) ? { actionItems: su.actionItems.map((b) => String(b).slice(0, 2000)).slice(0, 500) } : {}),
    }
  }
  return { fullText, ...(segments?.length ? { segments } : {}), ...(summary && Object.keys(summary).length ? { summary } : {}) }
}

function publicShareFields(row: {
  slug: string
  variant: string
  sourceTool: string
  title: string
  targetLanguage: string | null
  payload: unknown
  createdAt: Date
  ownerPlan: string
}) {
  const prominentBranding = planShowsProminentShareBranding(row.ownerPlan)
  return {
    slug: row.slug,
    variant: row.variant,
    sourceTool: row.sourceTool,
    title: row.title,
    targetLanguage: row.targetLanguage,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
    ownerPlan: row.ownerPlan,
    showProminentBranding: prominentBranding,
    signupUrl: buildShareSignupUrl(row.slug, row.ownerPlan),
    embedPath: `/embed/${row.slug}`,
    sharePath: `/s/${row.slug}`,
  }
}

/** All logged-in users: create a read-only public link (free shares include VideoText branding). */
router.post('/', express.json({ limit: '4mb' }), async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) {
      return res.status(401).json({ message: 'Sign in required to create a share link.' })
    }
    const user = await getUser(auth.userId)
    if (!user) {
      return res.status(401).json({ message: 'Sign in required to create a share link.' })
    }

    const jobId = String(req.body?.jobId || '').trim()
    const jobToken = String(req.body?.jobToken || '').trim()
    const variant = String(req.body?.variant || '').toLowerCase() === 'translated' ? 'translated' : 'original'
    const rawSourceTool = String(req.body?.sourceTool || '')
    const sourceTool =
      rawSourceTool === 'voice-to-text' ? 'voice-to-text' :
      rawSourceTool === 'video-to-subtitles' ? 'video-to-subtitles' :
      'video-to-transcript'
    const title = typeof req.body?.title === 'string' ? req.body.title.slice(0, 300) : ''
    const targetLanguage = typeof req.body?.targetLanguage === 'string' ? req.body.targetLanguage.slice(0, 120) : null

    if (!jobId || !jobToken) {
      return res.status(400).json({ message: 'jobId and jobToken are required.' })
    }

    const job = await getJobById(jobId)
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' })
    }
    const data = job.data as JobData
    const jobUserId = data?.userId
    const storedToken = data?.jobToken
    if (!storedToken || storedToken !== jobToken) {
      return res.status(403).json({ message: 'Invalid job token.' })
    }
    if (!jobUserId || jobUserId !== auth.userId) {
      return res.status(403).json({ message: 'You can only share transcripts from your own jobs.' })
    }
    const state = await job.getState()
    if (state !== 'completed') {
      return res.status(400).json({ message: 'Job must be completed before sharing.' })
    }

    const payload = sanitizePayload(req.body?.payload)
    if (!payload || !payload.fullText.trim()) {
      return res.status(400).json({ message: 'payload.fullText is required.' })
    }

    const slug = newShareSlug()
    const ownerPlan = (user.plan || 'free').toLowerCase()
    const row = await prisma.transcriptShare.create({
      data: {
        slug,
        userId: auth.userId,
        jobId,
        variant,
        sourceTool,
        title: title || (sourceTool === 'voice-to-text' ? 'Voice recording' : sourceTool === 'video-to-subtitles' ? 'Subtitles' : 'Transcript'),
        targetLanguage: variant === 'translated' ? targetLanguage : null,
        payload: payload as object,
        ownerPlan,
      },
    })

    const publicPath = `/s/${row.slug}`
    log.info({ msg: 'transcript_share_created', userId: auth.userId, jobId, variant, slug: row.slug, ownerPlan })
    return res.status(201).json({
      slug: row.slug,
      path: publicPath,
      url: publicPath,
      embedPath: `/embed/${row.slug}`,
      showProminentBranding: planShowsProminentShareBranding(ownerPlan),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    log.error({ msg: 'transcript_share_create_error', error: msg })
    return res.status(500).json({ message: 'Could not create share link.' })
  }
})

/** Public read — no auth. */
router.get('/public/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '').trim()
    if (!slug || slug.length > 64) {
      return res.status(400).json({ message: 'Invalid link.' })
    }
    const row = await prisma.transcriptShare.findFirst({
      where: { slug, revokedAt: null },
    })
    if (!row) {
      res.set({ 'Cache-Control': 'public, max-age=60' })
      return res.status(404).json({ message: 'This share link is invalid or has been revoked.' })
    }

    res.set({
      'Cache-Control': 'public, max-age=120',
    })
    return res.json(publicShareFields(row))
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    log.error({ msg: 'transcript_share_public_error', error: msg })
    return res.status(500).json({ message: 'Could not load shared transcript.' })
  }
})

/** Revoke a share (owner only). */
router.post('/:slug/revoke', async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) {
      return res.status(401).json({ message: 'Sign in required.' })
    }
    const slug = String(req.params.slug || '').trim()
    if (!slug) return res.status(400).json({ message: 'Invalid slug.' })

    const result = await prisma.transcriptShare.updateMany({
      where: { slug, userId: auth.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    if (result.count === 0) {
      return res.status(404).json({ message: 'Share not found or already revoked.' })
    }
    return res.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    log.error({ msg: 'transcript_share_revoke_error', error: msg })
    return res.status(500).json({ message: 'Could not revoke share.' })
  }
})

export default router
