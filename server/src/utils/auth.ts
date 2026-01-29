import jwt from 'jsonwebtoken'
import type { Request } from 'express'
import type { PlanType, User } from '../models/User'

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

