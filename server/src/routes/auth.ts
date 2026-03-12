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
import { getLogger } from '../lib/logger'

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
      return res.status(400).json({ message: 'Invalid or expired code. Request a new one.' })
    }
    if (storedCode !== enteredCode) {
      return res.status(400).json({ message: 'Invalid code.' })
    }
    await deleteOTP(normalized)
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

/** Complete signup after OTP verification. Body: { verificationToken, password }. */
interface CompleteSignupBody {
  verificationToken: string
  password: string
}

router.post('/complete-signup', async (req: Request, res: Response) => {
  try {
    const { verificationToken, password } = req.body as CompleteSignupBody
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
      },
      limits: getPlanLimits('free'),
      overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
      createdAt: now,
      updatedAt: now,
    }

    await saveUser(user)
    const jwt = signAuthToken(user)
    return res.status(201).json({
      token: jwt,
      userId: user.id,
      plan: user.plan,
      email: user.email,
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

    res.json({ ok: true, message: 'Password updated. You can now log in.' })
  } catch (error: any) {
    log.error({ msg: 'reset-password error', error: (error as Error)?.message ?? String(error) })
    res.status(500).json({ message: error.message || 'Failed to reset password.' })
  }
})

export default router

