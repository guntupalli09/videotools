import express, { Request, Response } from 'express'
import { prisma } from '../db'
import { getEffectiveUserId } from '../utils/auth'

const router = express.Router()

const FEEDBACK_VIEWER_SECRET = process.env.FEEDBACK_VIEWER_SECRET || ''

/** POST /api/feedback — store feedback from Tex panel. No auth required. */
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      toolId?: string
      stars?: number
      comment?: string
      userNameOrEmail?: string
      planAtSubmit?: string
    }
    const toolId =
      typeof body.toolId === 'string' && body.toolId.trim() ? body.toolId.trim() : null
    let stars: number | null = null
    if (typeof body.stars === 'number' && body.stars >= 1 && body.stars <= 5) {
      stars = Math.round(body.stars)
    }
    const comment =
      typeof body.comment === 'string' ? body.comment.slice(0, 2000).trim() : ''
    const userId = getEffectiveUserId(req) || null
    const userNameOrEmail =
      typeof body.userNameOrEmail === 'string'
        ? body.userNameOrEmail.slice(0, 500).trim() || null
        : null
    const planAtSubmit =
      typeof body.planAtSubmit === 'string' && /^(free|basic|pro|agency)$/i.test(body.planAtSubmit)
        ? body.planAtSubmit.toLowerCase()
        : null

    await prisma.feedback.create({
      data: {
        toolId,
        stars,
        comment: comment || '',
        userId,
        userNameOrEmail,
        planAtSubmit,
      },
    })
    return res.status(201).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to save feedback' })
  }
})

/** GET /api/feedback — list all feedback (newest first). Requires X-Feedback-Viewer header matching FEEDBACK_VIEWER_SECRET. */
router.get('/', async (req: Request, res: Response) => {
  const secret = (req.headers['x-feedback-viewer'] as string) || ''
  if (!FEEDBACK_VIEWER_SECRET || secret !== FEEDBACK_VIEWER_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  try {
    const list = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return res.json(list)
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load feedback' })
  }
})

export default router
