import './env'
import path from 'path'
import fs from 'fs'
import express from 'express'
import cors from 'cors'
import { initSentry, setupSentryErrorHandler, sentryRequestIdScope } from './lib/sentry'

initSentry()
import rateLimit from 'express-rate-limit'
import uploadRoutes, { handleUploadChunk } from './routes/upload'
import jobRoutes from './routes/jobs'
import downloadRoutes from './routes/download'
import audioRoutes from './routes/audio'
import usageRoutes from './routes/usage'
import batchRoutes from './routes/batch'
import billingRoutes from './routes/billing'
import authRoutes from './routes/auth'
import translateTranscriptRoutes from './routes/translateTranscript'
import translateSubtitlesRoutes from './routes/translateSubtitles'
import { stripeWebhookHandler } from './routes/stripeWebhook'
import { startWorker, getTotalQueueCount, fileQueue, priorityQueue } from './workers/videoProcessor'
import { startFileCleanup } from './utils/fileCleanup'
import { createRedisClient } from './utils/redis'
import { apiKeyAuth } from './utils/apiKey'
import { flushAnalytics } from './utils/analytics'
import { requestIdMiddleware } from './middleware/requestId'
import { getLogger } from './lib/logger'
import healthRoutes from './routes/health'
import feedbackRoutes from './routes/feedback'
import eventsRoutes from './routes/events'
import shareRoutes from './routes/share'
import feedbackSystemRoutes from './routes/feedbackSystem'
import cancellationFeedbackRoutes from './routes/cancellationFeedback'
import adminDashboardRoutes, { clearDashboardCache } from './routes/adminDashboard'
import adminConversionIntentRoutes from './routes/adminConversionIntent'
import adminSupportRoutes, { runAlertChecks, maybeSendDailyDigest } from './routes/adminSupport'
import { runRecompute } from './services/recomputeMetrics'
import { pushLogEntry } from './lib/logRing'
import { purgeOldStripeEvents } from './models/StripeEventLog'
import { isAllowedOrigin, normalizeOrigin } from './utils/allowedOrigins'
import { prisma } from './db'
import { refreshApiCredits } from './lib/apiCreditsCache'
import { createMagicLinkToken } from './routes/auth'
import { attachLiveTranscription } from './routes/liveTranscription'
import { maybeRunYoutubeCanary } from './services/youtubeCanary'
import { startOnboardingEmailCron } from './jobs/onboardingEmailCron'
import { startProOnboardingEmailCron } from './jobs/proOnboardingEmailCron'
import { startUpgradeRescueCron } from './jobs/upgradeRescueCron'
import { startPricingIntentRescueCron } from './jobs/pricingIntentRescueCron'
import { startXPostCron } from './jobs/xPostCron'
import { startLinkedInPostCron } from './jobs/linkedinPostCron'
import { startSubstackPostCron } from './jobs/substackPostCron'
import { runReconciliation } from './services/stripeReconciliation'
import { stripe } from './services/stripe'
import { STRIPE_RECONCILIATION_ENABLED } from './utils/featureFlags'
import { generateUnsubscribeToken } from './routes/newsletter'
import guidelinesRoutes from './routes/guidelines'
import { guidelineQueue, startGuidelineWorker } from './workers/guidelineProcessor'
import publicStatsRoutes from './routes/publicStats'
import newsletterRoutes from './routes/newsletter'
import foundingTeamRoutes from './routes/foundingTeam'
import apiKeysRoutes from './routes/apiKeys'
import apiV1Routes from './routes/apiV1'

const log = getLogger('api')

// ── Startup validation ──────────────────────────────────────────────────────
// Catch missing critical env vars before serving any traffic.
if (process.env.NODE_ENV === 'production') {
  const required = ['STRIPE_WEBHOOK_SECRET', 'STRIPE_SECRET_KEY', 'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET']
  const missing = required.filter((k) => !process.env[k]?.trim())
  if (missing.length > 0) {
    log.error({ msg: '[startup] Missing required environment variables', vars: missing.join(', ') })
    process.exit(1)
  }
}

// ── Global error safety nets ─────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  const msg = `unhandledRejection: ${String(reason)}`
  log.error({ msg: 'unhandledRejection — uncaught promise error', reason: String(reason) })
  pushLogEntry({ ts: new Date().toISOString(), level: 'error', service: 'api', msg })
  // Do not exit: let the process continue serving requests
})

process.on('uncaughtException', (err) => {
  const msg = `uncaughtException: ${err.message}`
  log.error({ msg: 'uncaughtException — unhandled synchronous throw', error: err.message, stack: err.stack })
  pushLogEntry({ ts: new Date().toISOString(), level: 'error', service: 'api', msg, extra: err.stack?.slice(0, 300) })
  // Exit: uncaught sync exceptions leave the process in an undefined state
  process.exit(1)
})

const app = express()
app.disable('etag')
const PORT = process.env.PORT || 3001

// Required behind Railway / Render / Fly / Vercel: trust one proxy hop so rate-limit doesn't throw on X-Forwarded-For
app.set('trust proxy', 1)

// Phase 2.5: Per-user upload rate limit (3/min) is applied in upload and batch routes; no global upload cap here.
// Optional: general API rate limit for other routes if needed
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many requests. Please wait.',
  standardHeaders: true,
  legacyHeaders: false,
})

// CORS: allowlist is managed in utils/allowedOrigins.ts.
// Includes: production domain(s), localhost dev, and https://*.vercel.app previews.
const corsHeaders = [
  'Content-Type',
  'Authorization',
  'X-User-Id',
  'X-Plan',
  'X-Upload-Id',
  'X-Chunk-Index',
  'X-Api-Key',
  'X-Job-Token',
]

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.join(', ') : value
}

function getClientIp(req: express.Request): string | undefined {
  return (
    headerValue(req.headers['cf-connecting-ip']) ||
    headerValue(req.headers['x-forwarded-for']) ||
    req.socket.remoteAddress ||
    req.ip
  )
}

// Log the full request context for rejected CORS origins before the cors package
// short-circuits the request. This is intentionally noisy for rejects so we can
// identify who is calling the API from a disallowed origin in production logs.
app.use((req, _res, next) => {
  const rawOrigin = headerValue(req.headers.origin)
  const normalizedOrigin = rawOrigin ? normalizeOrigin(rawOrigin) : undefined

  if (normalizedOrigin && !isAllowedOrigin(normalizedOrigin)) {
    log.error({
      msg: '[cors] rejected origin',
      origin: normalizedOrigin,
      rawOrigin,
      method: req.method,
      path: req.originalUrl || req.path,
      referer: headerValue(req.headers.referer),
      host: headerValue(req.headers.host),
      userAgent: headerValue(req.headers['user-agent']),
      ip: getClientIp(req),
    })
  }

  next()
})

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const normalized = typeof origin === 'string' ? normalizeOrigin(origin) : origin
    log.info({ msg: '[cors] incoming origin', origin: normalized ?? 'undefined' })

    if (!normalized || isAllowedOrigin(normalized)) {
      callback(null, true)
      return
    }

    callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: corsHeaders,
  credentials: true,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// Agent discovery: Link response headers (RFC 8288)
app.use((_req, res, next) => {
  res.setHeader('Link', [
    '</.well-known/api-catalog>; rel="api-catalog"',
    '</llms.txt>; rel="service-doc"',
  ].join(', '))
  next()
})

// CORS debug instrumentation (do not alter behavior)
app.use((req, res, next) => {
  const origin = req.get('origin') ?? 'undefined'
  const path = req.originalUrl || req.path
  log.info({ msg: '[REQ]', method: req.method, path, origin })

  if (req.method === 'OPTIONS') {
    log.info({ msg: '[OPTIONS]', stage: 'received', method: req.method, path, origin })
  }

  res.on('finish', () => {
    const allowOrigin = res.getHeader('Access-Control-Allow-Origin')
    const hasCorsHeader = allowOrigin !== undefined && allowOrigin !== null
    log.info({
      msg: req.method === 'OPTIONS' ? '[OPTIONS]' : '[RES]',
      stage: 'sent',
      method: req.method,
      path,
      status: res.statusCode,
      hasAccessControlAllowOrigin: hasCorsHeader,
      accessControlAllowOrigin: hasCorsHeader ? String(allowOrigin) : null,
    })
  })

  next()
})

app.get('/api/debug/cors', (req, res) => {
  res.json({
    origin: req.headers.origin ?? null,
    responseHeaders: res.getHeaders(),
  })
})

// Request ID: correlate UI → API → worker (read from edge or generate)
app.use(requestIdMiddleware)
app.use(sentryRequestIdScope)

// Stripe webhook must receive the raw body for signature verification
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
)

// Chunked upload chunk endpoint: raw body (must be before express.json())
app.post(
  '/api/upload/chunk',
  express.raw({ type: 'application/octet-stream', limit: '10mb' }),
  handleUploadChunk
)
// Allow preflight and avoid 404 confusion: GET returns 405 so the path is clearly registered
app.all('/api/upload/chunk', (req, res) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  res.set('Allow', 'POST')
  res.status(405).json({ message: 'Method not allowed. Use POST with x-upload-id and x-chunk-index.' })
})

// JSON body parsing for all other routes — 4 MB to accommodate share-link transcript snapshots
app.use(express.json({ limit: '4mb' }))
app.use('/api', generalLimiter)

// Optional API key auth (sets trusted identity on req.apiKeyUser)
app.use('/api/upload', apiKeyAuth)
app.use('/api/job', apiKeyAuth)
app.use('/api/batch', apiKeyAuth)
app.use('/api/translate-transcript', apiKeyAuth)
app.use('/api/translate-subtitles', apiKeyAuth)
app.use('/api/guidelines', apiKeyAuth)
// Download ownership (Phase 1 fix) now checks getEffectiveUserId(), so an
// API-key-authenticated request must resolve an identity here too.
app.use('/api/download', apiKeyAuth)

// Routes
app.use('/api/upload', uploadRoutes)
app.use('/api/job', jobRoutes)
app.use('/api/download', downloadRoutes)
app.use('/api/audio', audioRoutes)
app.use('/api/usage', usageRoutes)
app.use('/api/batch', batchRoutes)
// API key management (Settings → Integrations → API Keys) — JWT/session-gated.
app.use('/api/api-keys', apiKeysRoutes)
// Stable external facade (private/beta) — see docs/API_PRIVATE_BETA.md.
app.use('/api/v1', apiV1Routes)
app.use('/api/billing', billingRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/translate-transcript', translateTranscriptRoutes)
app.use('/api/translate-subtitles', translateSubtitlesRoutes)
app.use('/api/guidelines', guidelinesRoutes)
app.use('/api/shares', shareRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/feedback', feedbackSystemRoutes)
app.use('/api/feedback', cancellationFeedbackRoutes)
app.use('/api/admin/feedback', feedbackSystemRoutes)
app.use('/api/admin', adminDashboardRoutes)
app.use('/api/admin', adminConversionIntentRoutes)
app.use('/api/admin', adminSupportRoutes)
app.use('/api/stats', publicStatsRoutes)
app.use('/api/newsletter', newsletterRoutes)
app.use('/api/founding-team', foundingTeamRoutes)

// Health and ops (no /api prefix)
app.use(healthRoutes)

// Legacy health check (keep for backward compat)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Sentry error handler (after all routes; captures errors and sends response)
setupSentryErrorHandler(app)

// Optional: serve client SPA from a dist folder (avoids 404 for /video-to-transcript and assets when running combined).
// Set CLIENT_DIST to the absolute path to the client build (e.g. /app/dist or path.join(__dirname, '../../dist')).
const clientDist = process.env.CLIENT_DIST || path.join(__dirname, '../../dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false }))
  // SPA fallback: any GET not served by static (e.g. /video-to-transcript) returns index.html
  // Markdown for Agents: serve markdown when Accept: text/markdown on homepage
  app.get('*', (req, res) => {
    if (req.path === '/' && (req.headers.accept || '').includes('text/markdown')) {
      const mdPath = path.join(clientDist, 'llms.txt')
      if (fs.existsSync(mdPath)) {
        const content = fs.readFileSync(mdPath, 'utf-8')
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
        res.setHeader('x-markdown-tokens', String(content.split(/\s+/).length))
        return res.send(content)
      }
    }
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Start server
const server = app.listen(PORT, () => {
  log.info({ msg: 'Server listening', port: PORT })
  log.info({ msg: 'Stripe configured (secret key and price IDs present)' })

  // Worker runs in a separate container when Dockerized (DISABLE_WORKER=true).
  if (process.env.DISABLE_WORKER !== 'true') {
    startWorker()
    startGuidelineWorker()
    log.info({ msg: 'Background worker started' })
  }

  // Start file cleanup cron — pass a Redis client so it can check the active-file registry
  // before deleting anything.  A dedicated client avoids contending with Bull's connections.
  const cleanupRedis = process.env.REDIS_URL ? createRedisClient('client') : undefined
  startFileCleanup(cleanupRedis)
  log.info({ msg: 'File cleanup cron started' })

  // Alert checks: infra-critical checks (redis/db/worker/stuck) run every 60s;
  // rate/MRR checks run every 5 min (they have 1h cooldowns so extra frequency is free).
  setInterval(() => { runAlertChecks().catch((e) => log.warn({ msg: 'Alert checks failed', error: (e as Error)?.message })) }, 60 * 1000)
  // Daily digest check every minute (sends once per day at configured hour)
  setInterval(() => { maybeSendDailyDigest().catch((e) => log.warn({ msg: 'Daily digest failed', error: (e as Error)?.message })) }, 60 * 1000)

  // Auto-recompute metrics so the command centre is always up-to-date:
  // 1. Hourly light recompute: last 2 days + current month (keeps today's charts fresh)
  setInterval(() => {
    runRecompute(2, 1)
      .then(() => { clearDashboardCache(); log.info({ msg: 'Hourly metrics recompute done' }) })
      .catch((err) => log.warn({ msg: 'Hourly metrics recompute failed', error: (err as Error)?.message }))
  }, 60 * 60 * 1000)

  // 2. Nightly full recompute: 90 days + 12 months at 2 AM UTC (keeps historical charts accurate)
  let lastFullRecomputeDate = ''
  setInterval(() => {
    const now = new Date()
    if (now.getUTCHours() !== 2) return
    const todayKey = now.toISOString().slice(0, 10)
    if (lastFullRecomputeDate === todayKey) return
    lastFullRecomputeDate = todayKey
    runRecompute(90, 12)
      .then(() => { clearDashboardCache(); log.info({ msg: 'Nightly full metrics recompute done' }) })
      .catch((err) => log.warn({ msg: 'Nightly metrics recompute failed', error: (err as Error)?.message }))
    purgeOldStripeEvents()
      .then(() => log.info({ msg: 'Nightly stripe event log purge done' }))
      .catch((err) => log.warn({ msg: 'Stripe event log purge failed', error: (err as Error)?.message }))
  }, 60 * 1000)

  // Analytics Sprint 3: nightly Stripe-vs-Postgres MRR/active-subscriber
  // reconciliation, once per day at 3 AM UTC (offset from the 2 AM recompute
  // above to avoid load collision). Ships disabled — STRIPE_RECONCILIATION_ENABLED
  // defaults false, so this is a no-op until explicitly turned on. Read-only
  // against Stripe/Postgres except for its own row in MrrReconciliationRun.
  // See docs/analytics/STRIPE_RECONCILIATION_PLAN.md.
  let lastReconciliationDate = ''
  setInterval(() => {
    if (!STRIPE_RECONCILIATION_ENABLED) return
    const now = new Date()
    if (now.getUTCHours() !== 3) return
    const todayKey = now.toISOString().slice(0, 10)
    if (lastReconciliationDate === todayKey) return
    lastReconciliationDate = todayKey
    runReconciliation(stripe)
      .then((result) => log.info({ msg: 'Nightly Stripe reconciliation done', severity: result.severity }))
      .catch((err) => log.warn({ msg: 'Nightly Stripe reconciliation failed', error: (err as Error)?.message }))
  }, 60 * 1000)

  // API credits: refresh OpenAI balance + Resend usage every 3 hours
  // Initial fetch on startup (non-blocking), then every 3h
  refreshApiCredits()
    .then(() => log.info({ msg: 'API credits initial fetch done' }))
    .catch((err) => log.warn({ msg: 'API credits initial fetch failed', error: (err as Error)?.message }))
  setInterval(() => {
    refreshApiCredits()
      .then(() => log.info({ msg: 'API credits 3h refresh done' }))
      .catch((err) => log.warn({ msg: 'API credits refresh failed', error: (err as Error)?.message }))
  }, 3 * 60 * 60 * 1000)

  // YouTube ingestion canary suite: runs once/day when enabled.
  setInterval(() => {
    maybeRunYoutubeCanary()
      .catch((err) => log.warn({ msg: 'YouTube canary failed', error: (err as Error)?.message }))
  }, 60 * 60 * 1000)

  // Daily quota reset email — fires once per day at 9 AM CST (15:00 UTC)
  // Sends free-plan users a magic-login email so they can open the tool in one click.
  let lastDailyEmailDate = ''
  setInterval(async () => {
    try {
      const now = new Date()
      // CST = UTC-6 (no DST adjustment needed — close enough for a daily email)
      const cstHour = (now.getUTCHours() - 6 + 24) % 24
      if (cstHour !== 9) return
      const todayKey = now.toISOString().slice(0, 10)
      if (lastDailyEmailDate === todayKey) return
      lastDailyEmailDate = todayKey

      const resendKey = process.env.RESEND_API_KEY
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
      const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
      const apiBaseUrl = (process.env.API_BASE_URL || 'https://api.videotext.io').replace(/\/$/, '')

      if (!resendKey) {
        log.info({ msg: 'Daily email skipped — RESEND_API_KEY not set' })
        return
      }

      // Fetch all free-plan users with a real email who haven't unsubscribed
      const freeUsers = await prisma.user.findMany({
        where: {
          plan: 'free',
          email: { not: { startsWith: 'demo-user-' }, contains: '@' },
          newsletterSubscribed: { not: false },
        },
        select: { id: true, email: true },
      })

      const sendOne = async (email: string, html: string, unsubscribeUrl: string): Promise<boolean> => {
        const maxAttempts = 4
        let backoff = 2000
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: fromEmail,
              to: [email],
              subject: 'Your 3 free daily transcriptions have arrived! 🎬',
              html,
              headers: {
                'List-Unsubscribe': `<${unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            }),
            signal: AbortSignal.timeout(8000),
          })
          if (res.ok) return true
          const remaining = res.headers.get('x-ratelimit-remaining')
          const reset = res.headers.get('x-ratelimit-reset')
          if (res.status === 429) {
            log.warn({ msg: 'Daily email rate limited', email, attempt, remaining, reset, backoff })
            await new Promise((r) => setTimeout(r, backoff))
            backoff *= 2
            continue
          }
          log.warn({ msg: 'Daily email send failed', email, status: res.status, attempt })
          return false
        }
        log.warn({ msg: 'Daily email gave up after retries', email })
        return false
      }

      log.info({ msg: 'Daily quota email — sending', count: freeUsers.length })
      let sent = 0
      for (const u of freeUsers) {
        try {
          const magicToken = await createMagicLinkToken(u.id)
          const openLink = `${baseUrl}/magic-login?token=${magicToken}&next=/video-to-transcript`
          const unsubToken = generateUnsubscribeToken(u.email)
          const apiUnsubLink = `${apiBaseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(u.email)}&token=${unsubToken}`
          const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e">
        <tr>
          <td style="padding:40px 40px 24px;text-align:center">
            <div style="width:56px;height:56px;background:#2563EB;border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;line-height:56px;font-size:28px">🎬</div>
            <h1 style="margin:0 0 8px;color:#ffffff;font-size:28px;font-weight:700;line-height:1.2">3 New Transcriptions<br>Available</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px">
            <p style="margin:0 0 16px;color:#a0a0c0;font-size:15px;line-height:1.6">Hey!</p>
            <p style="margin:0 0 16px;color:#a0a0c0;font-size:15px;line-height:1.6">Your 3 free daily transcriptions have reset. Upload a video and get your transcript, subtitles, or captions in minutes.</p>
            <p style="margin:0 0 32px;color:#a0a0c0;font-size:15px;line-height:1.6">Click below — you'll be logged in instantly, no password needed.</p>
            <a href="${openLink}" style="display:block;background:#2563EB;color:#ffffff;text-decoration:none;text-align:center;padding:16px 32px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.5px">OPEN NOW</a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #2d2d4e;text-align:center">
            <p style="margin:0 0 8px;color:#606080;font-size:12px">Want unlimited transcriptions with no watermark?</p>
            <a href="${baseUrl}/pricing" style="color:#2563EB;font-size:12px;text-decoration:none;font-weight:600">Upgrade to Pro → $7.99/mo</a>
            <p style="margin:16px 0 0;color:#404060;font-size:11px">VideoText.io · <a href="${apiUnsubLink}" style="color:#404060">unsubscribe</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
          if (await sendOne(u.email, html, apiUnsubLink)) sent++
        } catch (e) {
          log.warn({ msg: 'Daily email error', email: u.email, error: (e as Error)?.message })
        }
        await new Promise((r) => setTimeout(r, 500))
      }
      log.info({ msg: 'Daily quota emails sent', sent, total: freeUsers.length })
    } catch (e) {
      log.warn({ msg: 'Daily email cron error', error: (e as Error)?.message })
    }
  }, 60 * 1000) // check every minute

  // Activation sequence (Day 0/1/3/7) for free users who signed up but never started.
  startOnboardingEmailCron().catch((e) => {
    log.error({ msg: 'Failed to start onboarding cron', error: (e as Error)?.message })
  })

  startProOnboardingEmailCron().catch((e) => {
    log.error({ msg: 'Failed to start pro onboarding cron', error: (e as Error)?.message })
  })

  // Upgrade rescue sequence for users who clicked upgrade but did not complete payment in 24h.
  startUpgradeRescueCron()

  // Near-real-time nudge for users who just showed pricing intent (pricing_page_view,
  // upgrade_clicked, checkout-tier events). Checks every 60s; personalizes by the
  // user's actual tool usage and video length when they have job history.
  startPricingIntentRescueCron()

  // X (Twitter) posting, 3x/day, via Typefully's direct API — see xPostCron.ts
  // for why (Zapier has no X integration; X's API also blocks links in
  // automated posts, so this cron never includes one).
  startXPostCron()

  // LinkedIn + Substack, same Typefully API, same rendered cards — replaces
  // the earlier Zapier-based LinkedIn routine (see linkedinPostCron.ts).
  startLinkedInPostCron()
  startSubstackPostCron()

  // Optional heap memory monitoring — set MEMORY_DEBUG=1 to enable
  if (process.env.MEMORY_DEBUG === '1') {
    setInterval(() => {
      const { rss, heapUsed, heapTotal, external } = process.memoryUsage()
      log.info({
        msg: 'memory_usage',
        rss_mb: Math.round(rss / 1024 / 1024),
        heapUsed_mb: Math.round(heapUsed / 1024 / 1024),
        heapTotal_mb: Math.round(heapTotal / 1024 / 1024),
        external_mb: Math.round(external / 1024 / 1024),
      })
    }, 5 * 60 * 1000)
  }

  // Warm up Bull's Redis connections so first readyz/upload init doesn't timeout
  const warmupMs = 25_000
  Promise.race([
    getTotalQueueCount(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('warmup timeout')), warmupMs)),
  ])
    .then((n) => log.info({ msg: 'Redis warmup OK', queueCount: n }))
    .catch((e) => log.warn({ msg: 'Redis warmup failed (readyz may still work later)', error: (e as Error)?.message }))
})

// Attach live transcription WebSocket server (requires DEEPGRAM_API_KEY env var)
attachLiveTranscription(server)

// Handle server errors gracefully
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    log.error({ msg: 'Server port already in use', port: PORT })
    process.exit(1)
  } else {
    log.error({ msg: 'Server error', error: String(error) })
    process.exit(1)
  }
})

// Handle process termination gracefully — close Bull queues before exiting so
// in-progress jobs are not hard-killed without cleanup.
async function shutdown() {
  flushAnalytics()
  log.info({ msg: 'Shutdown: closing Bull queues…' })
  await Promise.allSettled([
    fileQueue?.close(),
    priorityQueue?.close(),
    guidelineQueue?.close(),
  ])
  server.close(() => {
    log.info({ msg: 'Server closed' })
    process.exit(0)
  })
  // Force-exit after 15 s if connections don't drain
  setTimeout(() => {
    log.warn({ msg: 'Shutdown timeout — forcing exit' })
    process.exit(1)
  }, 15_000).unref()
}

process.on('SIGTERM', () => {
  log.info({ msg: 'SIGTERM received, shutting down gracefully' })
  shutdown().catch((e) => { log.error({ msg: 'Shutdown error', error: String(e) }); process.exit(1) })
})

process.on('SIGINT', () => {
  log.info({ msg: 'SIGINT received, shutting down gracefully' })
  shutdown().catch((e) => { log.error({ msg: 'Shutdown error', error: String(e) }); process.exit(1) })
})
