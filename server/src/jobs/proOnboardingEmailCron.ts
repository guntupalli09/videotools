import { prisma } from '../db'
import { createMagicLinkToken } from '../routes/auth'
import { generateUnsubscribeToken } from '../routes/newsletter'
import { createRedisClient } from '../utils/redis'
import { getLogger } from '../lib/logger'
import { captureFunnelEvent } from '../utils/funnelEvents'
import { sendGrowthEmail } from '../utils/mailer'

const redis = createRedisClient('client')
const log = getLogger('worker')

type ProOnboardingStage = 'day1' | 'day7'

type StageConfig = {
  minHours: number
  maxHours: number
  idempotencyKey: (userId: string) => string
  subject: string
  headline: string
  bullets: string[]
  ctaPath: string
  ctaLabel: string
}

const STAGE_CONFIG: Record<ProOnboardingStage, StageConfig> = {
  day1: {
    minHours: 24,
    maxHours: 36,
    idempotencyKey: (userId) => `pro-onboarding:day1:${userId}`,
    subject: 'Your Pro workflows — batch, longer files, burn-in & share links',
    headline: 'You unlocked the full VideoText workflow',
    bullets: [
      'Batch process up to 20 videos and download one ZIP of SRTs',
      'Upload videos up to 2 hours — no more 30-minute free cap',
      'Burn subtitles directly into your video for delivery',
      'Create shareable read-only transcript links for your team',
    ],
    ctaPath: '/batch-process',
    ctaLabel: 'Try batch processing',
  },
  day7: {
    minHours: 168,
    maxHours: 216,
    idempotencyKey: (userId) => `pro-onboarding:day7:${userId}`,
    subject: 'Pro power move: translate → burn-in → share',
    headline: 'Get more from Pro this week',
    bullets: [
      'Run a batch folder overnight — one ZIP, named SRTs per video',
      'Translate subtitles, then burn them in for client delivery',
      'Share a transcript link instead of emailing huge DOCX files',
      'Process long interviews and podcasts up to 2 hours',
    ],
    ctaPath: '/translate-subtitles',
    ctaLabel: 'Open translate + burn workflow',
  },
}

const STAGES: ProOnboardingStage[] = ['day1', 'day7']
const PAID_PLANS = ['pro', 'business'] as const

function isUserInStage(hoursSincePayment: number, stage: ProOnboardingStage): boolean {
  const config = STAGE_CONFIG[stage]
  return hoursSincePayment >= config.minHours && hoursSincePayment < config.maxHours
}

function proOnboardingHtml(stage: ProOnboardingStage, ctaUrl: string, unsubLink: string): string {
  const template = STAGE_CONFIG[stage]
  const bulletHtml = template.bullets
    .map((b) => `<li style="margin:0 0 10px;color:#a5a5c8;font-size:15px;line-height:1.55">${b}</li>`)
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#161628;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e">
        <tr>
          <td style="padding:34px 36px 12px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.25">${template.headline}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 20px">
            <ul style="margin:0;padding-left:20px">${bulletHtml}</ul>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 30px">
            <a href="${ctaUrl}" style="display:block;background:#2563EB;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700">${template.ctaLabel}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 36px 24px;border-top:1px solid #2d2d4e;text-align:center">
            <p style="margin:0;color:#404060;font-size:11px">VideoText.io · <a href="${unsubLink}" style="color:#404060">unsubscribe</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function runProOnboardingEmailSequence(): Promise<void> {
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_SMTP_APP_PASSWORD) return

  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
  const apiBaseUrl = (process.env.API_BASE_URL || 'https://api.videotext.io').replace(/\/$/, '')
  const now = Date.now()

  const paidUsers = await prisma.user.findMany({
    where: {
      plan: { in: [...PAID_PLANS] },
      newsletterSubscribed: { not: false },
      email: { not: '' },
    },
    select: { id: true, email: true, plan: true, billingPeriodStart: true },
  })

  const paymentEvents = await prisma.eventLog.findMany({
    where: {
      userId: { in: paidUsers.map((u) => u.id) },
      eventName: 'payment_completed',
    },
    select: { userId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const firstPaymentByUser = new Map<string, Date>()
  for (const row of paymentEvents) {
    if (!row.userId || firstPaymentByUser.has(row.userId)) continue
    firstPaymentByUser.set(row.userId, row.createdAt)
  }

  let sent = 0
  let skipped = 0

  for (const user of paidUsers) {
    const paidAt =
      firstPaymentByUser.get(user.id) ??
      user.billingPeriodStart ??
      null
    if (!paidAt) continue

    const hoursSincePayment = (now - paidAt.getTime()) / (1000 * 60 * 60)
    const stage = STAGES.find((value) => isUserInStage(hoursSincePayment, value))
    if (!stage) continue

    const key = STAGE_CONFIG[stage].idempotencyKey(user.id)
    const alreadySent = await redis.get(key)
    if (alreadySent) {
      skipped += 1
      continue
    }

    const token = await createMagicLinkToken(user.id)
    const ctaUrl = `${baseUrl}/magic-login?token=${encodeURIComponent(token)}&next=${encodeURIComponent(STAGE_CONFIG[stage].ctaPath)}`
    const unsubToken = generateUnsubscribeToken(user.email)
    const apiUnsubLink = `${apiBaseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(user.email)}&token=${unsubToken}`
    const html = proOnboardingHtml(stage, ctaUrl, apiUnsubLink)
    const subject = STAGE_CONFIG[stage].subject

    const ok = await sendGrowthEmail({ to: user.email, subject, html, unsubscribeUrl: apiUnsubLink })

    if (ok) {
      sent += 1
      captureFunnelEvent({
        eventName: 'upgrade_prompt_seen',
        userId: user.id,
        source: 'pro_onboarding_email_cron',
        plan: user.plan,
        metadata: { stage, channel: 'email' },
      }).catch(() => {})
      await redis.set(key, '1', 'EX', 60 * 60 * 24 * 60)
    } else {
      log.warn({ msg: 'Pro onboarding email send failed', email: user.email, stage })
    }
  }

  log.info({
    msg: 'Pro onboarding email cron',
    paidUsers: paidUsers.length,
    sent,
    skipped,
    timestamp: new Date().toISOString(),
  })
}

export async function startProOnboardingEmailCron(): Promise<void> {
  if (process.env.PRO_ONBOARDING_EMAILS_ENABLED !== 'true') return

  const intervalMinutes = Number(process.env.PRO_ONBOARDING_EMAILS_INTERVAL_MINUTES || 60)
  log.info({ msg: 'Pro onboarding email scheduler started', intervalMinutes })

  await runProOnboardingEmailSequence()

  setInterval(async () => {
    try {
      await runProOnboardingEmailSequence()
    } catch (err) {
      log.error({ msg: 'Pro onboarding cron error', error: (err as Error)?.message })
    }
  }, intervalMinutes * 60 * 1000)
}
