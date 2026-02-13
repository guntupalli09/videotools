import express, { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { getUserByEmail, getUserByPasswordToken, saveUser } from '../models/User'
import { signAuthToken, signEmailVerificationToken } from '../utils/auth'

const router = express.Router()

// OTP store: email (lowercase) -> { code, expiresAt }
const otpStore = new Map<string, { code: string; expiresAt: Date }>()
const OTP_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
const OTP_LENGTH = 6

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
    })
    const body = await res.text()
    if (!res.ok) {
      console.error('[OTP] Resend error', res.status, body)
      throw new Error(`Failed to send email: ${body || res.statusText}`)
    }
    let data: { id?: string } = {}
    try {
      if (body) data = JSON.parse(body)
    } catch {
      // ignore
    }
    console.log('[OTP] Sent to', email, 'via Resend, id:', data.id || 'n/a')
  } else {
    console.log('[OTP] (RESEND_API_KEY not set) Code for', email, ':', code)
  }
}

router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string }
    const normalized = (email || '').toString().trim().toLowerCase()
    if (!normalized || !isValidEmail(normalized)) {
      return res.status(400).json({ message: 'A valid email address is required.' })
    }

    const hasResendKey = !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim())
    console.log('[OTP] send-otp called for', normalized, '| RESEND_API_KEY set:', hasResendKey)

    const code = generateOTP()
    otpStore.set(normalized, { code, expiresAt: new Date(Date.now() + OTP_EXPIRY_MS) })
    await sendOTPEmail(normalized, code)
    res.json({ ok: true, message: 'Verification code sent.' })
  } catch (error: any) {
    console.error('send-otp error:', error)
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

    const stored = otpStore.get(normalized)
    if (!stored) {
      return res.status(400).json({ message: 'Invalid or expired code. Request a new one.' })
    }
    if (stored.expiresAt < new Date()) {
      otpStore.delete(normalized)
      return res.status(400).json({ message: 'Code expired. Request a new one.' })
    }
    if (stored.code !== enteredCode) {
      return res.status(400).json({ message: 'Invalid code.' })
    }
    otpStore.delete(normalized)
    const token = signEmailVerificationToken(normalized)
    res.json({ ok: true, token, email: normalized })
  } catch (error: any) {
    console.error('verify-otp error:', error)
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

    const user = getUserByPasswordToken(token)
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
    saveUser(user)

    const jwt = signAuthToken(user)
    return res.json({ token: jwt })
  } catch (error: any) {
    console.error('setup-password error:', error)
    return res.status(500).json({ message: error.message || 'Failed to set password' })
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

    const user = getUserByEmail(email)
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const jwt = signAuthToken(user)
    return res.json({ token: jwt })
  } catch (error: any) {
    console.error('login error:', error)
    return res.status(500).json({ message: error.message || 'Login failed' })
  }
})

export default router

