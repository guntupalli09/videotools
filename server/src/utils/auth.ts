import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import type { Request } from 'express'
import type { PlanType, User } from '../models/User'

/** One-time token for setting password after checkout. 24h expiry. */
export function generatePasswordSetupToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return { token, expiresAt }
}

/** One-time token for forgot-password reset link. 1h expiry. */
export function generatePasswordResetToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  return { token, expiresAt }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60

export interface AuthPayload {
  userId: string
  stripeCustomerId?: string
  plan: PlanType
}

export function signAuthToken(user: User): string {
  const payload: AuthPayload = {
    userId: user.id,
    stripeCustomerId: user.stripeCustomerId,
    plan: user.plan,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: THIRTY_DAYS_SECONDS,
  })
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload
    if (!decoded || !decoded.userId) return null
    return decoded
  } catch {
    return null
  }
}

export function getAuthFromRequest(req: Request): AuthPayload | null {
  const header = req.headers['authorization']
  if (!header || typeof header !== 'string') return null

  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return null

  return verifyAuthToken(token)
}

/** Short-lived token issued after OTP verify; used to start subscription checkout. */
const EMAIL_VERIFY_JWT_EXPIRY = '1h'

export interface EmailVerifiedPayload {
  email: string
  emailVerified: true
}

export function signEmailVerificationToken(email: string): string {
  return jwt.sign(
    { email: email.toLowerCase().trim(), emailVerified: true } as EmailVerifiedPayload,
    JWT_SECRET,
    { expiresIn: EMAIL_VERIFY_JWT_EXPIRY }
  )
}

export function verifyEmailVerificationToken(token: string): EmailVerifiedPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as EmailVerifiedPayload
    if (!decoded?.email || decoded.emailVerified !== true) return null
    return decoded
  } catch {
    return null
  }
}

