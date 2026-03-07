/**
 * Founder-only admin support routes. Mounted at /api/admin alongside adminDashboard.ts.
 * Covers: alert config, daily digest, user lookup/impersonation, credits, billing extension.
 */

import express, { Request, Response } from 'express'
import { getAuthFromRequest, signAuthToken } from '../utils/auth'
import { getUser, getUserByEmail, saveUser } from '../models/User'
import { getPlanLimits } from '../utils/limits'
import { prisma } from '../db'
import { fileQueue } from '../workers/videoProcessor'
import type { PlanType } from '../models/User'

const router = express.Router()
export default router

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireFounder(req: Request, res: Response): Promise<string | null> {
  const auth = getAuthFromRequest(req)
  if (!auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return null }
  const user = await getUser(auth.userId)
  if (!user) { res.status(401).json({ message: 'Unauthorized' }); return null }
  if ((user as { role?: string }).role !== 'founder') { res.status(403).json({ message: 'Forbidden' }); return null }
  return auth.userId
}

// ── Alert config types & helpers ──────────────────────────────────────────────

const ALERTS_CONFIG_KEY = 'videotext:alerts:config'
const ALERTS_LOG_KEY = 'videotext:alerts:log'
const ALERTS_COOLDOWN_PREFIX = 'videotext:alerts:cooldown:'
const ALERT_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour between same-type alerts
const DIGEST_LAST_SENT_KEY = 'videotext:digest:lastSent'

interface AlertConfig {
  enabled: { failureRate: boolean; workerStale: boolean; mrrDrop: boolean }
  thresholds: { failureRatePct: number; workerStaleMinutes: number; mrrDropPct: number }
  alertEmail: string
  digestEnabled: boolean
  digestHourUtc: number // 0-23
}

interface AlertLogEntry {
  type: string
  triggeredAt: string
  value: string
  message: string
}

const DEFAULT_CONFIG: AlertConfig = {
  enabled: { failureRate: true, workerStale: true, mrrDrop: true },
  thresholds: { failureRatePct: 5, workerStaleMinutes: 5, mrrDropPct: 10 },
  alertEmail: process.env.FOUNDER_ALERT_EMAIL || '',
  digestEnabled: true,
  digestHourUtc: 8,
}

async function getAlertConfig(): Promise<AlertConfig> {
  try {
    const raw = await fileQueue.client.get(ALERTS_CONFIG_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch { return DEFAULT_CONFIG }
}

async function saveAlertConfig(config: AlertConfig): Promise<void> {
  await fileQueue.client.set(ALERTS_CONFIG_KEY, JSON.stringify(config))
}

async function getAlertLog(): Promise<AlertLogEntry[]> {
  try {
    const raw = await fileQueue.client.get(ALERTS_LOG_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

async function appendAlertLog(entry: AlertLogEntry): Promise<void> {
  const log = await getAlertLog()
  log.unshift(entry)
  await fileQueue.client.set(ALERTS_LOG_KEY, JSON.stringify(log.slice(0, 30)))
}

async function isCoolingDown(type: string): Promise<boolean> {
  try {
    const v = await fileQueue.client.get(`${ALERTS_COOLDOWN_PREFIX}${type}`)
    if (!v) return false
    return Date.now() - parseInt(v, 10) < ALERT_COOLDOWN_MS
  } catch { return false }
}

async function setCooldown(type: string): Promise<void> {
  await fileQueue.client.set(`${ALERTS_COOLDOWN_PREFIX}${type}`, String(Date.now()), 'PX', ALERT_COOLDOWN_MS)
}

// ── Email helper ──────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
  if (!key) { console.log('[alert-email] (no RESEND_API_KEY)', subject); return }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) console.error('[alert-email] Resend error', res.status, await res.text())
}

// ── Alert checker (exported for scheduling in index.ts) ────────────────────────

export async function runAlertChecks(): Promise<void> {
  try {
    const config = await getAlertConfig()
    if (!config.alertEmail) return

    // 1. Failure rate
    if (config.enabled.failureRate && !(await isCoolingDown('failureRate'))) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const rows = await prisma.$queryRaw<[{ failureRate: number }]>`
        SELECT COALESCE(
          SUM(CASE WHEN status = 'failed' THEN 1.0 ELSE 0 END) / NULLIF(COUNT(*), 0), 0
        )::double precision as "failureRate"
        FROM "Job" WHERE "createdAt" >= ${thirtyDaysAgo}
      `
      const rate = Number(rows?.[0]?.failureRate ?? 0)
      if (rate > config.thresholds.failureRatePct / 100) {
        const pct = (rate * 100).toFixed(1)
        await sendEmail(
          config.alertEmail,
          `⚠️ VideoText: Failure rate ${pct}%`,
          `<p>Job failure rate is <strong>${pct}%</strong> (threshold: ${config.thresholds.failureRatePct}%). Check the <a href="https://videotext.io/founder">Command Centre</a>.</p>`,
        )
        await setCooldown('failureRate')
        await appendAlertLog({ type: 'failureRate', triggeredAt: new Date().toISOString(), value: `${pct}%`, message: `Failure rate exceeded ${config.thresholds.failureRatePct}%` })
      }
    }

    // 2. Worker stale
    if (config.enabled.workerStale && !(await isCoolingDown('workerStale'))) {
      const ts = await fileQueue.client.get('videotext:worker:heartbeat')
      if (ts) {
        const ageMs = Date.now() - parseInt(ts, 10)
        if (ageMs > config.thresholds.workerStaleMinutes * 60 * 1000) {
          const ageMins = (ageMs / 60000).toFixed(1)
          await sendEmail(
            config.alertEmail,
            `🔴 VideoText: Worker stale (${ageMins} min)`,
            `<p>Processing worker has not heartbeated in <strong>${ageMins} minutes</strong> (threshold: ${config.thresholds.workerStaleMinutes} min). <a href="https://videotext.io/founder">Check infra.</a></p>`,
          )
          await setCooldown('workerStale')
          await appendAlertLog({ type: 'workerStale', triggeredAt: new Date().toISOString(), value: `${ageMins}min stale`, message: `Worker stale for ${ageMins} minutes` })
        }
      }
    }

    // 3. MRR drop vs 7-day average
    if (config.enabled.mrrDrop && !(await isCoolingDown('mrrDrop'))) {
      const rows = await prisma.$queryRaw<{ mrrCents: number }[]>`
        SELECT "mrrCents" FROM "DailyMetrics" ORDER BY date DESC LIMIT 8
      `
      if (rows && rows.length >= 2) {
        const today = Number(rows[0].mrrCents)
        const prev = Number(rows[Math.min(7, rows.length - 1)].mrrCents)
        if (prev > 0) {
          const dropPct = ((prev - today) / prev) * 100
          if (dropPct > config.thresholds.mrrDropPct) {
            await sendEmail(
              config.alertEmail,
              `📉 VideoText: MRR dropped ${dropPct.toFixed(1)}%`,
              `<p>MRR dropped from <strong>$${(prev / 100).toFixed(0)}</strong> to <strong>$${(today / 100).toFixed(0)}</strong> (${dropPct.toFixed(1)}% drop). <a href="https://videotext.io/founder">View revenue.</a></p>`,
            )
            await setCooldown('mrrDrop')
            await appendAlertLog({ type: 'mrrDrop', triggeredAt: new Date().toISOString(), value: `-${dropPct.toFixed(1)}%`, message: `MRR dropped ${dropPct.toFixed(1)}% vs 7 days ago` })
          }
        }
      }
    }
  } catch (err) {
    console.error('[alerts] check error:', err)
  }
}

// ── Daily digest (exported for scheduling in index.ts) ────────────────────────

export async function maybeSendDailyDigest(): Promise<void> {
  try {
    const config = await getAlertConfig()
    if (!config.digestEnabled || !config.alertEmail) return

    const now = new Date()
    const hourUtc = now.getUTCHours()
    if (hourUtc !== config.digestHourUtc) return

    const todayKey = now.toISOString().slice(0, 10)
    const lastSent = await fileQueue.client.get(DIGEST_LAST_SENT_KEY)
    if (lastSent === todayKey) return // already sent today

    await sendDigestEmail(config.alertEmail)
    await fileQueue.client.set(DIGEST_LAST_SENT_KEY, todayKey)
  } catch (err) {
    console.error('[digest] scheduler error:', err)
  }
}

async function sendDigestEmail(to: string): Promise<void> {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  yesterday.setUTCHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setUTCDate(yesterdayEnd.getUTCDate() + 1)

  const [signupRow, jobsRow, failRow, mrrRow, paidRow] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM "User" WHERE "createdAt" >= ${yesterday} AND "createdAt" < ${yesterdayEnd}`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM "Job" WHERE "completedAt" >= ${yesterday} AND "completedAt" < ${yesterdayEnd} AND status = 'completed'`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM "Job" WHERE "createdAt" >= ${yesterday} AND "createdAt" < ${yesterdayEnd} AND status = 'failed'`,
    prisma.$queryRaw<[{ sum: bigint | null }]>`SELECT COALESCE(SUM("priceMonthly"), 0)::bigint as sum FROM "SubscriptionSnapshot" WHERE status = 'active' AND "periodStart" <= ${now} AND "periodEnd" >= ${now}`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM "User" WHERE plan != 'free'`,
  ])

  const signups = Number(signupRow?.[0]?.count ?? 0)
  const jobs = Number(jobsRow?.[0]?.count ?? 0)
  const failed = Number(failRow?.[0]?.count ?? 0)
  const mrr = Number(mrrRow?.[0]?.sum ?? 0)
  const paid = Number(paidRow?.[0]?.count ?? 0)
  const failRate = jobs + failed > 0 ? ((failed / (jobs + failed)) * 100).toFixed(1) : '0.0'
  const dateLabel = yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  const row = (label: string, val: string, color?: string) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;color:#666">${label}</td><td style="text-align:right;font-weight:600;font-size:15px;${color ? `color:${color}` : ''}">${val}</td></tr>`

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 4px 0;font-size:18px">VideoText Daily Digest</h2>
      <p style="margin:0 0 20px 0;color:#888;font-size:13px">${dateLabel}</p>
      <table style="width:100%;border-collapse:collapse">
        ${row('New signups', String(signups), signups > 0 ? '#059669' : undefined)}
        ${row('Jobs completed', String(jobs))}
        ${row('Jobs failed', `${failed} (${failRate}%)`, failed > 0 ? '#dc2626' : undefined)}
        ${row('Live MRR', `$${(mrr / 100).toFixed(0)}`, '#7c3aed')}
        ${row('Paid users', String(paid))}
      </table>
      <p style="margin:24px 0 0 0;font-size:12px"><a href="https://videotext.io/founder" style="color:#7c3aed;text-decoration:none">Open Command Centre →</a></p>
    </div>
  `
  await sendEmail(to, `VideoText Digest — ${dateLabel}`, html)
}

// ── Routes: alert config ──────────────────────────────────────────────────────

router.get('/alerts', async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!await requireFounder(req, res)) return res as Response
    const [config, log] = await Promise.all([getAlertConfig(), getAlertLog()])
    return res.json({ config, log })
  } catch (err) {
    console.error('[admin/alerts GET]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

router.post('/alerts', async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!await requireFounder(req, res)) return res as Response
    const { config } = req.body as { config: AlertConfig }
    if (!config) return res.status(400).json({ message: 'config required' })
    await saveAlertConfig(config)
    return res.json({ ok: true })
  } catch (err) {
    console.error('[admin/alerts POST]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

router.post('/alerts/test', async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!await requireFounder(req, res)) return res as Response
    const config = await getAlertConfig()
    if (!config.alertEmail) return res.status(400).json({ message: 'No alert email configured' })
    await sendEmail(config.alertEmail, '✅ VideoText: Test alert', '<p>Test alert from VideoText Command Centre. Alert emails are working.</p>')
    return res.json({ ok: true, sentTo: config.alertEmail })
  } catch (err) {
    console.error('[admin/alerts/test]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// ── Routes: daily digest ──────────────────────────────────────────────────────

router.get('/digest/preview', async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!await requireFounder(req, res)) return res as Response
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    yesterday.setUTCHours(0, 0, 0, 0)
    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setUTCDate(yesterdayEnd.getUTCDate() + 1)

    const [signupRow, jobsRow, failRow, mrrRow, paidRow] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM "User" WHERE "createdAt" >= ${yesterday} AND "createdAt" < ${yesterdayEnd}`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM "Job" WHERE "completedAt" >= ${yesterday} AND "completedAt" < ${yesterdayEnd} AND status = 'completed'`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM "Job" WHERE "createdAt" >= ${yesterday} AND "createdAt" < ${yesterdayEnd} AND status = 'failed'`,
      prisma.$queryRaw<[{ sum: bigint | null }]>`SELECT COALESCE(SUM("priceMonthly"), 0)::bigint as sum FROM "SubscriptionSnapshot" WHERE status = 'active' AND "periodStart" <= ${now} AND "periodEnd" >= ${now}`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM "User" WHERE plan != 'free'`,
    ])

    return res.json({
      date: yesterday.toISOString(),
      signups: Number(signupRow?.[0]?.count ?? 0),
      jobsCompleted: Number(jobsRow?.[0]?.count ?? 0),
      jobsFailed: Number(failRow?.[0]?.count ?? 0),
      mrrCents: Number(mrrRow?.[0]?.sum ?? 0),
      paidUsers: Number(paidRow?.[0]?.count ?? 0),
    })
  } catch (err) {
    console.error('[admin/digest/preview]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

router.post('/digest/send', async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!await requireFounder(req, res)) return res as Response
    const config = await getAlertConfig()
    const to = (req.body?.email as string | undefined) || config.alertEmail
    if (!to) return res.status(400).json({ message: 'No email configured — save alert email first' })
    await sendDigestEmail(to)
    return res.json({ ok: true, sentTo: to })
  } catch (err) {
    console.error('[admin/digest/send]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// ── Routes: user support ──────────────────────────────────────────────────────

type SupportJobRow = { id: string; toolType: string; status: string; createdAt: Date; processingMs: number | null; videoDurationSec: number | null; failureReason: string | null; planAtRun: string | null }

router.get('/support/user', async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!await requireFounder(req, res)) return res as Response
    const { email } = req.query
    if (!email || typeof email !== 'string') return res.status(400).json({ message: 'email query param required' })

    const user = await getUserByEmail(email.trim().toLowerCase())
    if (!user) return res.status(404).json({ message: 'User not found' })

    const [jobCountRow, allJobs] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM "Job" WHERE "userId" = ${user.id}`,
      prisma.$queryRaw<SupportJobRow[]>`
        SELECT id, "toolType", status, "createdAt", "processingMs", "videoDurationSec", "failureReason", "planAtRun"
        FROM "Job" WHERE "userId" = ${user.id}
        ORDER BY "createdAt" DESC LIMIT 100
      `,
    ])

    const failedCount = (allJobs ?? []).filter((j: SupportJobRow) => j.status === 'failed').length

    return res.json({
      id: user.id,
      email: user.email,
      plan: user.plan,
      role: user.role ?? 'user',
      suspended: user.suspended ?? false,
      restrictionNote: user.restrictionNote ?? null,
      stripeCustomerId: user.stripeCustomerId ?? null,
      billingPeriodEnd: user.billingPeriodEnd ?? null,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt ?? null,
      usageThisMonth: user.usageThisMonth,
      limits: user.limits,
      overagesThisMonth: user.overagesThisMonth,
      totalJobs: Number(jobCountRow?.[0]?.count ?? 0),
      failedJobCount: failedCount,
      jobs: (allJobs ?? []).map((j: SupportJobRow) => ({
        id: j.id,
        toolType: j.toolType,
        status: j.status,
        createdAt: j.createdAt.toISOString(),
        processingMs: j.processingMs,
        videoDurationSec: j.videoDurationSec,
        failureReason: j.failureReason,
        planAtRun: j.planAtRun,
      })),
    })
  } catch (err) {
    console.error('[admin/support/user]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

router.post('/support/impersonate', async (req: Request, res: Response): Promise<Response> => {
  try {
    const founderId = await requireFounder(req, res)
    if (!founderId) return res as Response
    const { userId } = req.body as { userId: string }
    if (!userId) return res.status(400).json({ message: 'userId required' })

    const user = await getUser(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    // Standard JWT — valid for 30 days (same as normal login)
    const token = signAuthToken(user)
    console.log(`[IMPERSONATE] Founder ${founderId} → user ${userId} (${user.email})`)
    return res.json({ token, email: user.email, plan: user.plan })
  } catch (err) {
    console.error('[admin/support/impersonate]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

router.post('/support/credit', async (req: Request, res: Response): Promise<Response> => {
  try {
    const founderId = await requireFounder(req, res)
    if (!founderId) return res as Response
    const { userId, minutes } = req.body as { userId: string; minutes: number }
    if (!userId || typeof minutes !== 'number' || minutes <= 0) {
      return res.status(400).json({ message: 'userId and positive minutes required' })
    }
    const user = await getUser(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.usageThisMonth.totalMinutes = Math.max(0, user.usageThisMonth.totalMinutes - minutes)
    user.updatedAt = new Date()
    await saveUser(user)
    console.log(`[CREDIT] ${founderId} → ${user.email}: +${minutes} min (new total: ${user.usageThisMonth.totalMinutes})`)
    return res.json({ ok: true, newTotalMinutes: user.usageThisMonth.totalMinutes })
  } catch (err) {
    console.error('[admin/support/credit]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

router.post('/support/extend-billing', async (req: Request, res: Response): Promise<Response> => {
  try {
    const founderId = await requireFounder(req, res)
    if (!founderId) return res as Response
    const { userId, days } = req.body as { userId: string; days: number }
    if (!userId || typeof days !== 'number' || days <= 0) {
      return res.status(400).json({ message: 'userId and positive days required' })
    }
    const user = await getUser(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const current = user.billingPeriodEnd ?? new Date()
    const extended = new Date(current.getTime() + days * 24 * 60 * 60 * 1000)
    user.billingPeriodEnd = extended
    if (user.usageThisMonth.resetDate < extended) {
      user.usageThisMonth.resetDate = extended
    }
    user.updatedAt = new Date()
    await saveUser(user)
    console.log(`[EXTEND] ${founderId} → ${user.email}: +${days}d → ${extended.toISOString()}`)
    return res.json({ ok: true, newBillingPeriodEnd: extended.toISOString() })
  } catch (err) {
    console.error('[admin/support/extend-billing]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

router.post('/support/set-plan', async (req: Request, res: Response): Promise<Response> => {
  try {
    const founderId = await requireFounder(req, res)
    if (!founderId) return res as Response
    const { userId, plan } = req.body as { userId: string; plan: PlanType }
    const valid: PlanType[] = ['free', 'basic', 'pro', 'agency', 'founding_workflow']
    if (!userId || !plan || !valid.includes(plan)) {
      return res.status(400).json({ message: 'userId and valid plan required' })
    }
    const user = await getUser(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.plan = plan
    user.limits = getPlanLimits(plan)
    user.updatedAt = new Date()
    await saveUser(user)
    console.log(`[SET-PLAN] ${founderId} → ${user.email}: ${plan}`)
    return res.json({ ok: true, plan })
  } catch (err) {
    console.error('[admin/support/set-plan]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Suspend or unsuspend a user. Suspended users cannot upload or process jobs.
router.post('/support/restrict', async (req: Request, res: Response): Promise<Response> => {
  try {
    const founderId = await requireFounder(req, res)
    if (!founderId) return res as Response
    const { userId, suspended, note } = req.body as { userId: string; suspended: boolean; note?: string }
    if (!userId || typeof suspended !== 'boolean') {
      return res.status(400).json({ message: 'userId and suspended (boolean) required' })
    }
    const user = await getUser(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.suspended = suspended
    user.restrictionNote = note ?? user.restrictionNote
    user.updatedAt = new Date()
    await saveUser(user)
    const action = suspended ? 'SUSPEND' : 'UNSUSPEND'
    console.log(`[${action}] ${founderId} → ${user.email}${note ? ` (${note})` : ''}`)
    return res.json({ ok: true, suspended, email: user.email })
  } catch (err) {
    console.error('[admin/support/restrict]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Revoke access: suspend + downgrade to free + clear subscription fields.
router.post('/support/revoke', async (req: Request, res: Response): Promise<Response> => {
  try {
    const founderId = await requireFounder(req, res)
    if (!founderId) return res as Response
    const { userId, note } = req.body as { userId: string; note?: string }
    if (!userId) return res.status(400).json({ message: 'userId required' })

    const user = await getUser(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.suspended = true
    user.restrictionNote = note ?? 'Access revoked by admin'
    user.plan = 'free'
    user.limits = getPlanLimits('free')
    // Clear subscription but keep Stripe customer ID for audit trail
    user.subscriptionId = undefined
    user.billingPeriodEnd = undefined
    user.updatedAt = new Date()
    await saveUser(user)
    console.log(`[REVOKE] ${founderId} → ${user.email}${note ? ` (${note})` : ''}`)
    return res.json({ ok: true, email: user.email })
  } catch (err) {
    console.error('[admin/support/revoke]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})
