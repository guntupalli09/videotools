import crypto from 'crypto'
import express, { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import Redis from 'ioredis'
import { getUserByEmail, getUserByPasswordToken, getUserByPasswordResetToken, saveUser } from '../models/User'
import type { User } from '../models/User'
import { signAuthToken, signEmailVerificationToken, verifyEmailVerificationToken, generatePasswordResetToken } from '../utils/auth'
import { getPlanAndEmailForStripeCustomer } from '../services/stripe'
import { getPlanLimits } from '../utils/limits'
import { applyReferralOnSignup } from '../services/referral'
import { getLogger } from '../lib/logger'
import { incrementResendCounter } from '../lib/apiCreditsCache'
import { prisma } from '../db'
import {
  trackOtpRequested,
  trackOtpVerified,
  trackOtpFailed,
  trackPasswordResetCompleted,
  trackPasswordSetupCompleted,
  trackGoogleAuthCompleted,
  trackDemoLoginStarted,
} from '../utils/analytics'

const log = getLogger('api')

const router = express.Router()

const otpSendLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.ip ?? 'unknown'),
  message: { message: 'Too many OTP requests. Please wait a minute before trying again.' },
})

// OTP store: Redis-backed so OTPs survive server restarts and work across multiple instances
const OTP_EXPIRY_SECONDS = 10 * 60 // 10 minutes
const OTP_LENGTH = 6

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const otpRedis = new Redis(redisUrl, {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  connectTimeout: 5000,
  commandTimeout: 5000,
  lazyConnect: true,
})
otpRedis.on('error', (err) => log.error({ msg: 'OTP Redis connection error', error: err.message }))

function otpKey(email: string): string { return `otp:${email}` }

async function storeOTP(email: string, code: string): Promise<void> {
  await otpRedis.set(otpKey(email), code, 'EX', OTP_EXPIRY_SECONDS)
}

async function getOTP(email: string): Promise<string | null> {
  return otpRedis.get(otpKey(email))
}

async function deleteOTP(email: string): Promise<void> {
  await otpRedis.del(otpKey(email))
}

function generateOTP(): string {
  let code = ''
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }
  return code
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function sendOTPEmail(email: string, code: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Your VideoText verification code',
        text: `Your verification code is: ${code}. It expires in 10 minutes.`,
      }),
      signal: AbortSignal.timeout(8000),
    })
    const body = await res.text()
    if (!res.ok) {
      log.error({ msg: 'OTP Resend error', status: res.status, body })
      throw new Error(`Failed to send email: ${body || res.statusText}`)
    }
    let data: { id?: string } = {}
    try {
      if (body) data = JSON.parse(body)
    } catch {
      // ignore
    }
    log.info({ msg: 'OTP sent via Resend', email, id: data.id || 'n/a' })
    incrementResendCounter()
  } else {
    log.info({ msg: 'OTP code (RESEND_API_KEY not set)', email, code })
  }
}

async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Reset your VideoText password',
        text: `You requested a password reset. Click the link below to set a new password (valid for 1 hour):\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
      }),
      signal: AbortSignal.timeout(8000),
    })
    const body = await res.text()
    if (!res.ok) {
      log.error({ msg: 'Reset Resend error', status: res.status, body })
      throw new Error(`Failed to send email: ${body || res.statusText}`)
    }
    log.info({ msg: 'Password reset email sent', email })
    incrementResendCounter()
  } else {
    log.info({ msg: 'Password reset link (RESEND_API_KEY not set)', email, resetLink })
  }
}

router.post('/send-otp', otpSendLimit, async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string }
    const normalized = (email || '').toString().trim().toLowerCase()
    if (!normalized || !isValidEmail(normalized)) {
      return res.status(400).json({ message: 'A valid email address is required.' })
    }

    const existingUser = await getUserByEmail(normalized)
    if (existingUser?.passwordHash) {
      return res.status(409).json({ message: 'Account already exists. Please log in.' })
    }

    const hasResendKey = !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim())
    log.info({ msg: 'OTP send-otp called', email: normalized, resendKeySet: hasResendKey })

    const code = generateOTP()
    await storeOTP(normalized, code)
    await sendOTPEmail(normalized, code)
    trackOtpRequested({ email: normalized, is_new_user: !existingUser })
    res.json({ ok: true, message: 'Verification code sent.' })
  } catch (error: any) {
    log.error({ msg: 'send-otp error', error: (error as Error)?.message ?? String(error) })
    res.status(500).json({ message: error.message || 'Failed to send code.' })
  }
})

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email?: string; code?: string }
    const normalized = (email || '').toString().trim().toLowerCase()
    const enteredCode = (code || '').toString().trim()
    if (!normalized || !isValidEmail(normalized) || !enteredCode) {
      return res.status(400).json({ message: 'Email and verification code are required.' })
    }

    const storedCode = await getOTP(normalized)
    if (!storedCode) {
      trackOtpFailed({ email: normalized, reason: 'expired' })
      return res.status(400).json({ message: 'Invalid or expired code. Request a new one.' })
    }
    if (storedCode !== enteredCode) {
      trackOtpFailed({ email: normalized, reason: 'invalid_code' })
      return res.status(400).json({ message: 'Invalid code.' })
    }
    await deleteOTP(normalized)
    trackOtpVerified({ email: normalized })
    const token = signEmailVerificationToken(normalized)
    res.json({ ok: true, token, email: normalized })
  } catch (error: any) {
    log.error({ msg: 'verify-otp error', error: (error as Error)?.message ?? String(error) })
    res.status(500).json({ message: error.message || 'Verification failed.' })
  }
})

interface SetupPasswordBody {
  token: string
  password: string
}

router.post('/setup-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as SetupPasswordBody

    if (!token || !password) {
      return res.status(400).json({ message: 'token and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }

    const user = await getUserByPasswordToken(token)
    if (!user || !user.passwordSetupToken) {
      return res.status(400).json({ message: 'Invalid or already used token' })
    }

    if (user.passwordSetupUsed) {
      return res.status(400).json({ message: 'Token already used' })
    }

    if (!user.passwordSetupExpiresAt || user.passwordSetupExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Token expired' })
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    user.passwordHash = hash
    user.passwordSetupUsed = true
    user.passwordSetupToken = undefined
    user.passwordSetupExpiresAt = undefined
    user.updatedAt = new Date()
    await saveUser(user)
    trackPasswordSetupCompleted({ user_id: user.id, plan: user.plan })

    const jwt = signAuthToken(user)
    return res.json({ token: jwt })
  } catch (error: any) {
    log.error({ msg: 'setup-password error', error: (error as Error)?.message ?? String(error) })
    return res.status(500).json({ message: error.message || 'Failed to set password' })
  }
})

interface SignupBody {
  email: string
  password: string
}

/** Complete signup after OTP verification. Body: { verificationToken, password, referralCode? }. */
interface CompleteSignupBody {
  verificationToken: string
  password: string
  referralCode?: string
}

router.post('/complete-signup', async (req: Request, res: Response) => {
  try {
    const { verificationToken, password, referralCode } = req.body as CompleteSignupBody
    if (!verificationToken || !password) {
      return res.status(400).json({ message: 'Verification token and password are required.' })
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' })
    }

    const payload = verifyEmailVerificationToken(verificationToken)
    if (!payload?.email) {
      return res.status(400).json({ message: 'Invalid or expired verification. Please request a new code.' })
    }

    const normalized = payload.email.toLowerCase().trim()
    const existing = await getUserByEmail(normalized)
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists. Log in instead.' })
    }

    const now = new Date()
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const user: User = {
      id: crypto.randomUUID(),
      email: normalized,
      passwordHash,
      plan: 'free',
      stripeCustomerId: undefined,
      subscriptionId: undefined,
      paymentMethodId: undefined,
      billingPeriodStart: undefined,
      billingPeriodEnd: undefined,
      passwordSetupToken: undefined,
      passwordSetupExpiresAt: undefined,
      passwordSetupUsed: false,
      passwordResetToken: undefined,
      passwordResetExpiresAt: undefined,
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
      limits: getPlanLimits('free'),
      overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
      createdAt: now,
      updatedAt: now,
    }

    await saveUser(user)
    let referralApplied = false
    try {
      const refResult = await applyReferralOnSignup(user.id, referralCode)
      referralApplied = refResult.applied
    } catch {
      // Signup succeeds even if referral fails — logged in service
    }
    const jwt = signAuthToken(user)
    return res.status(201).json({
      token: jwt,
      userId: user.id,
      plan: user.plan,
      email: user.email,
      referralApplied,
    })
  } catch (error: unknown) {
    log.error({ msg: 'complete-signup error', error: (error as Error)?.message ?? String(error) })
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Signup failed' })
  }
})

interface LoginBody {
  email: string
  password: string
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginBody
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' })
    }

    const user = await getUserByEmail(email)
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // If user has Stripe customer but plan is still free (e.g. webhook delay or duplicate account), re-sync from Stripe
    if (user.stripeCustomerId && user.plan === 'free') {
      try {
        const stripeData = await getPlanAndEmailForStripeCustomer(user.stripeCustomerId)
        if (stripeData && (stripeData.plan === 'basic' || stripeData.plan === 'pro' || stripeData.plan === 'agency' || stripeData.plan === 'founding_workflow')) {
          user.plan = stripeData.plan
          user.limits = getPlanLimits(stripeData.plan)
          user.updatedAt = new Date()
          await saveUser(user)
        }
      } catch (e) {
        log.warn({ msg: 'Login plan re-sync from Stripe failed', error: (e as Error)?.message ?? String(e) })
      }
    }

    const jwt = signAuthToken(user)
    return res.json({
      token: jwt,
      userId: user.id,
      plan: user.plan,
      email: user.email,
    })
  } catch (error: any) {
    log.error({ msg: 'login error', error: (error as Error)?.message ?? String(error) })
    return res.status(500).json({ message: error.message || 'Login failed' })
  }
})

/** Forgot password: send reset link to email if account exists and has a password. */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string }
    const normalized = (email || '').toString().trim().toLowerCase()
    if (!normalized || !isValidEmail(normalized)) {
      return res.status(400).json({ message: 'A valid email address is required.' })
    }

    const user = await getUserByEmail(normalized)
    const baseUrl = process.env.BASE_URL || process.env.VITE_SITE_URL || 'https://videotext.io'
    const baseOrigin = baseUrl.replace(/\/$/, '')

    if (user?.passwordHash) {
      const { token, expiresAt } = generatePasswordResetToken()
      user.passwordResetToken = token
      user.passwordResetExpiresAt = expiresAt
      user.updatedAt = new Date()
      await saveUser(user)
      const resetLink = `${baseOrigin}/reset-password?token=${encodeURIComponent(token)}`
      await sendPasswordResetEmail(normalized, resetLink)
    }

    res.json({ ok: true, message: "If an account exists with that email, we've sent a password reset link." })
  } catch (error: any) {
    log.error({ msg: 'forgot-password error', error: (error as Error)?.message ?? String(error) })
    res.status(500).json({ message: error.message || 'Failed to send reset link.' })
  }
})

/** Reset password using token from email. */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string }
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required.' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' })
    }

    const user = await getUserByPasswordResetToken(token)
    if (!user || !user.passwordResetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Request a new one.' })
    }
    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      user.passwordResetToken = undefined
      user.passwordResetExpiresAt = undefined
      user.updatedAt = new Date()
      await saveUser(user)
      return res.status(400).json({ message: 'Reset link has expired. Request a new one.' })
    }

    const salt = await bcrypt.genSalt(10)
    user.passwordHash = await bcrypt.hash(newPassword, salt)
    user.passwordResetToken = undefined
    user.passwordResetExpiresAt = undefined
    user.updatedAt = new Date()
    await saveUser(user)
    trackPasswordResetCompleted({ user_id: user.id })

    res.json({ ok: true, message: 'Password updated. You can now log in.' })
  } catch (error: any) {
    log.error({ msg: 'reset-password error', error: (error as Error)?.message ?? String(error) })
    res.status(500).json({ message: error.message || 'Failed to reset password.' })
  }
})

// ─── Magic login link ──────────────────────────────────────────────────────────
// Generates a one-time token stored in Redis (1h expiry) and returns it so callers
// can embed it in an email link.  Separate endpoint validates the token and returns a JWT.

const MAGIC_LINK_EXPIRY_SECONDS = 60 * 60 // 1 hour
function magicKey(token: string) { return `magic:${token}` }

export async function createMagicLinkToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  await otpRedis.set(magicKey(token), userId, 'EX', MAGIC_LINK_EXPIRY_SECONDS)
  return token
}

/** GET /api/auth/magic-login?token=xxx
 *  Validates the one-time token, returns a JWT, and deletes the token (single-use).
 */
router.get('/magic-login', async (req: Request, res: Response) => {
  try {
    const { token } = req.query as { token?: string }
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Token is required.' })
    }
    const userId = await otpRedis.get(magicKey(token))
    if (!userId) {
      return res.status(400).json({ message: 'Magic link expired or already used.' })
    }
    await otpRedis.del(magicKey(token))

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' })
    }

    // Map DB row to User model shape
    const userObj = {
      id: user.id,
      email: user.email,
      plan: user.plan as import('../models/User').PlanType,
    }
    const jwt = signAuthToken(userObj as import('../models/User').User)
    return res.json({ token: jwt, userId: user.id, plan: user.plan, email: user.email })
  } catch (error: any) {
    log.error({ msg: 'magic-login error', error: (error as Error)?.message ?? String(error) })
    return res.status(500).json({ message: 'Magic login failed.' })
  }
})

/** Demo login: returns a JWT for the shared demo account (pro plan). No password required.
 *  Controlled by DEMO_ENABLED env var (defaults to true). Rate-limited to prevent abuse.
 */
const demoRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.ip ?? 'unknown'),
  message: { message: 'Too many demo requests. Please wait a minute.' },
})

router.post('/demo', demoRateLimit, async (req: Request, res: Response) => {
  try {
    const disabled = process.env.DEMO_ENABLED === 'false'
    if (disabled) {
      return res.status(404).json({ message: 'Demo not available.' })
    }

    // Each demo visitor gets their own ephemeral session user so usage never bleeds
    // between visitors and the minute counter never blocks anyone.
    // Assign a sequential number (demo-user-001, 002, …) so logs and the founder
    // dashboard show readable identifiers instead of random UUIDs.
    const demoEmailDomain = (process.env.DEMO_EMAIL || 'demo@videotext.io').split('@')[1] || 'videotext.io'
    const existingCount = await prisma.user.count({
      where: { email: { startsWith: 'demo-user-', mode: 'insensitive' } },
    })
    const seqNum = String(existingCount + 1).padStart(3, '0')
    const demoEmail = `demo-user-${seqNum}@${demoEmailDomain}`

    const now = new Date()
    // Reset date far in the future so the session user never hits a monthly reset
    const resetDate = new Date(now.getFullYear() + 1, 0, 1)
    const randomHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
    const demoLimits = {
      ...getPlanLimits('pro'),
      minutesPerMonth: 9999, // effectively unlimited for a demo session
    }
    const user = {
      id: crypto.randomUUID(),
      email: demoEmail,
      passwordHash: randomHash,
      plan: 'pro' as const,
      stripeCustomerId: undefined,
      subscriptionId: undefined,
      paymentMethodId: undefined,
      billingPeriodStart: undefined,
      billingPeriodEnd: undefined,
      passwordSetupToken: undefined,
      passwordSetupExpiresAt: undefined,
      passwordSetupUsed: false,
      passwordResetToken: undefined,
      passwordResetExpiresAt: undefined,
      usageThisMonth: {
        totalMinutes: 0,
        videoCount: 0,
        batchCount: 0,
        languageCount: 0,
        translatedMinutes: 0,
        importCount: 0,
        resetDate,
      },
      limits: demoLimits,
      overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
      createdAt: now,
      updatedAt: now,
    } as User
    await saveUser(user)
    log.info({ msg: 'Demo session created', user: demoEmail, ip: req.ip })
    trackDemoLoginStarted({ demo_user_id: user.id })

    const token = signAuthToken(user, { isDemo: true })
    return res.json({ token, userId: user.id, plan: user.plan, email: user.email, isDemo: true })
  } catch (error: any) {
    log.error({ msg: 'demo login error', error: (error as Error)?.message ?? String(error) })
    return res.status(500).json({ message: error.message || 'Demo login failed.' })
  }
})

// ─── Google OAuth ──────────────────────────────────────────────────────────────

const googleAuthLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.ip ?? 'unknown'),
  message: { message: 'Too many Google login attempts. Please wait a minute.' },
})

/**
 * POST /api/auth/google
 * Body: { credential: string }  — Google ID token from Google Identity Services
 * Verifies the token with Google, finds or creates the user, returns a JWT.
 */
router.post('/google', googleAuthLimit, async (req: Request, res: Response) => {
  try {
    const { credential, referralCode } = req.body as { credential?: string; referralCode?: string }
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ message: 'Google credential is required.' })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return res.status(503).json({ message: 'Google login is not configured on this server.' })
    }

    // Verify Google ID token via Google's public tokeninfo endpoint (no SDK needed)
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!tokenInfoRes.ok) {
      return res.status(401).json({ message: 'Invalid Google credential.' })
    }
    const tokenInfo = await tokenInfoRes.json() as {
      email?: string
      email_verified?: string
      aud?: string
      sub?: string
      name?: string
      given_name?: string
      family_name?: string
    }

    // Ensure the token was issued for our app
    if (tokenInfo.aud !== clientId) {
      log.warn({ msg: 'Google token audience mismatch', aud: tokenInfo.aud, expected: clientId })
      return res.status(401).json({ message: 'Invalid Google credential.' })
    }
    if (!tokenInfo.email || tokenInfo.email_verified !== 'true') {
      return res.status(401).json({ message: 'Google account email is not verified.' })
    }

    const email = tokenInfo.email.toLowerCase().trim()
    const googleName = tokenInfo.name || [tokenInfo.given_name, tokenInfo.family_name].filter(Boolean).join(' ') || null
    let user = await getUserByEmail(email)
    let isNewUser = false

    if (!user) {
      isNewUser = true
      // New user — create account. passwordHash is a random unusable value (Google is the auth provider).
      const now = new Date()
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const randomHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
      const newUser: User = {
        id: crypto.randomUUID(),
        email,
        name: googleName,
        passwordHash: randomHash,
        plan: 'free',
        stripeCustomerId: undefined,
        subscriptionId: undefined,
        paymentMethodId: undefined,
        billingPeriodStart: undefined,
        billingPeriodEnd: undefined,
        passwordSetupToken: undefined,
        passwordSetupExpiresAt: undefined,
        passwordSetupUsed: false,
        passwordResetToken: undefined,
        passwordResetExpiresAt: undefined,
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
        limits: getPlanLimits('free'),
        overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
        createdAt: now,
        updatedAt: now,
      }
      await saveUser(newUser)
      user = newUser
      log.info({ msg: 'Google OAuth new user created', email })
      let referralApplied = false
      try {
        const refResult = await applyReferralOnSignup(user.id, referralCode)
        referralApplied = refResult.applied
      } catch {
        // non-blocking
      }
      trackGoogleAuthCompleted({ user_id: user.id, plan: user.plan, is_new_user: isNewUser })
      const token = signAuthToken(user)
      return res.json({
        token,
        userId: user.id,
        plan: user.plan,
        email: user.email,
        name: user.name ?? null,
        isNewUser,
        referralApplied,
      })
    } else {
      // Update name if we now have one and the user didn't have one stored
      if (googleName && !user.name) {
        user = { ...user, name: googleName }
        await saveUser(user)
      }
      log.info({ msg: 'Google OAuth existing user login', email })
    }

    trackGoogleAuthCompleted({ user_id: user.id, plan: user.plan, is_new_user: isNewUser })
    const token = signAuthToken(user)
    return res.json({ token, userId: user.id, plan: user.plan, email: user.email, name: user.name ?? null, isNewUser })
  } catch (error: unknown) {
    log.error({ msg: 'google-auth error', error: (error as Error)?.message ?? String(error) })
    return res.status(500).json({ message: 'Google login failed.' })
  }
})

export default router

