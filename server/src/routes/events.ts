/**
 * POST /api/events — Fire-and-forget behavioral event tracking.
 * Records upload_started, transcription_completed, result_viewed,
 * export_clicked, session_returned, upgrade_clicked and activation events.
 * No auth required. Anonymous sessions accepted via sessionId.
 */

import express, { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { getEffectiveUserId } from '../utils/auth'
import { recordUpgradeIntent } from '../models/UpgradeIntent'

const router = express.Router()

const eventsLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
})

const VALID_EVENTS = new Set([
  'upload_started',
  'transcription_completed',
  'result_viewed',
  'export_clicked',
  'session_returned',
  'signup_completed',
  'activation_wizard_shown',
  'job_completed',
  'first_output_seen',
  'upgrade_prompt_seen',
  'upgrade_clicked',
  'checkout_started',
  'payment_completed',
  // Conversion Intent tracking (authenticated-only attribution; see
  // server/src/routes/adminConversionIntent.ts). checkout_completed is
  // intentionally NOT in this allowlist -- conversion must only ever be
  // read from User.plan/subscriptionStatus (authoritative, Stripe-webhook
  // driven), never trusted from a client-submitted event.
  'pricing_page_view',
  'checkout_session_created',
  'stripe_redirect',
  'paywall_shown',
  'free_plan_nudge_seen',
  'checkout_abandoned',
  'second_job_upgrade_nudge_seen',
  'third_job_upgrade_nudge_seen',
  'cancellation_reason_submitted',
  'pro_onboarding_nudge_seen',
  'result_upgrade_card_seen',
])

router.post('/', eventsLimit, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>

    const eventName = typeof body.eventName === 'string' ? body.eventName : ''
    if (!VALID_EVENTS.has(eventName)) {
      return res.status(400).json({ message: 'Invalid event name' })
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : ''
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' })

    const userId = getEffectiveUserId(req) || null
    const metadata =
      typeof body.metadata === 'object' && body.metadata !== null && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : {}

    if (eventName === 'first_output_seen' && userId) {
      const existing = await prisma.eventLog.findFirst({ where: { userId, eventName }, select: { id: true } })
      if (existing) return res.status(200).json({ ok: true, deduped: true })
    }

    await prisma.eventLog.create({
      data: { eventName, userId, sessionId, metadata: metadata as unknown as Prisma.InputJsonValue },
    })

    // Update UserMetrics asynchronously for authenticated users
    if (userId) {
      upsertUserMetrics(userId, eventName).catch(() => {})
      if (eventName === 'upgrade_clicked') {
        recordUpgradeIntent({ userId, source: 'upgrade_clicked' }).catch(() => {})
      }
    }

    return res.status(201).json({ ok: true })
  } catch {
    return res.status(500).json({ message: 'Failed to log event' })
  }
})

export async function upsertUserMetrics(userId: string, triggerEvent?: string): Promise<void> {
  const existing = await prisma.userMetrics.findUnique({ where: { userId } })
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })

  const isPaying = user != null && user.plan !== 'free'

  let totalExports = existing?.totalExports ?? 0
  let hasReturned = existing?.hasReturned ?? false
  let totalSessions = existing?.totalSessions ?? 0

  if (triggerEvent === 'export_clicked') totalExports += 1
  if (triggerEvent === 'session_returned') hasReturned = true
  // Count a new session when first event of a fresh session arrives (upload_started is a good proxy)
  if (triggerEvent === 'upload_started' && existing == null) totalSessions += 1

  const userScore = totalExports * 3 + (hasReturned ? 5 : 0) + (isPaying ? 10 : 0)

  let segment = 'explorer'
  if (isPaying) segment = 'paying'
  else if (totalSessions >= 2) segment = 'power_user'
  else if (totalExports > 0) segment = 'activated'

  await prisma.userMetrics.upsert({
    where: { userId },
    create: { userId, totalSessions, totalExports, hasReturned, isPaying, userScore, segment },
    update: { totalExports, hasReturned, isPaying, userScore, segment },
  })
}

export default router
