/**
 * POST /api/feedback/cancellation-reason — 1-click churn reason capture.
 */

import express, { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { getEffectiveUserId } from '../utils/auth'
import { getUser } from '../models/User'
import { trackCancellationReasonSubmitted } from '../utils/analytics'

const router = express.Router()

const submitLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip ?? 'unknown',
})

const VALID_REASONS = new Set(['price', 'one_time_need', 'missing_feature'])
const VALID_TIMING = new Set(['pre_portal', 'post_cancel'])

router.post('/cancellation-reason', submitLimit, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>
    const userId = getEffectiveUserId(req)
    if (!userId) return res.status(401).json({ message: 'Sign in to submit feedback' })

    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const timing = typeof body.timing === 'string' ? body.timing.trim() : ''
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 64) : `server:${userId}`

    if (!VALID_REASONS.has(reason)) {
      return res.status(400).json({ message: 'Invalid cancellation reason' })
    }
    if (!VALID_TIMING.has(timing)) {
      return res.status(400).json({ message: 'Invalid timing' })
    }

    const user = await getUser(userId)
    const plan = (typeof body.plan === 'string' ? body.plan : user?.plan) ?? 'pro'

    await prisma.feedbackEvent.create({
      data: {
        userId,
        sessionId,
        triggerType: 'cancel',
        category: reason,
        freeText: timing,
        rating: timing,
        dismissed: false,
      },
    })

    await prisma.feedback.create({
      data: {
        toolId: 'billing',
        comment: `cancel:${reason} (${timing})`,
        userId,
        userNameOrEmail: user?.email ?? null,
        planAtSubmit: plan,
        source: 'cancel-survey',
      },
    })

    await prisma.eventLog.create({
      data: {
        eventName: 'cancellation_reason_submitted',
        userId,
        sessionId,
        metadata: {
          reason,
          timing,
          plan: plan.toLowerCase(),
        } as Prisma.InputJsonValue,
      },
    })

    trackCancellationReasonSubmitted({
      user_id: userId,
      reason,
      timing,
      plan: plan.toLowerCase(),
    })

    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ message: (err as Error)?.message || 'Failed to save feedback' })
  }
})

export default router
