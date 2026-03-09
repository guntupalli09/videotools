import { Request, Response, NextFunction } from 'express'
import type { PlanType } from '../models/User'

/**
 * Trusted identity set by apiKeyAuth when a valid API key is present.
 * Routes must use this (or JWT) for userId/plan; do not trust x-user-id/x-plan headers from client.
 */
export interface ApiKeyUser {
  userId: string
  plan: PlanType
}

declare global {
  namespace Express {
    interface Request {
      apiKeyUser?: ApiKeyUser
    }
  }
}

/**
 * In-memory API key store.
 * Formats:
 *   API_KEY=secret                               → userId "api-user", plan "free"
 *   API_KEYS=key1:userId1,key2:userId2           → plan "free" for all
 *   API_KEYS=key1:userId1:pro,key2:userId2:basic → optional third segment sets plan
 */
const keyToUser = new Map<string, string>()
const keyToPlan = new Map<string, PlanType>()

const VALID_PLANS: PlanType[] = ['free', 'basic', 'pro', 'agency', 'founding_workflow']

function loadApiKeys() {
  if (keyToUser.size > 0) return
  if (process.env.API_KEY) {
    keyToUser.set(process.env.API_KEY.trim(), 'api-user')
  }
  const keysEnv = process.env.API_KEYS
  if (keysEnv) {
    keysEnv.split(',').forEach((entry) => {
      const parts = entry.trim().split(':')
      const key = parts[0]?.trim()
      const userId = parts[1]?.trim()
      const plan = parts[2]?.trim() as PlanType | undefined
      if (key && userId) {
        keyToUser.set(key, userId)
        if (plan && (VALID_PLANS as string[]).includes(plan)) {
          keyToPlan.set(key, plan)
        }
      }
    })
  }
}

/**
 * Middleware: if Authorization: Bearer <key> or X-Api-Key: <key> is present and valid,
 * set req.apiKeyUser only. Identity must not be read from headers.
 */
export function apiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  loadApiKeys()
  const authHeader = req.headers.authorization
  const apiKey = req.headers['x-api-key'] as string | undefined
  const key = apiKey?.trim() || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined)
  if (key && keyToUser.has(key)) {
    const userId = keyToUser.get(key)!
    const plan = keyToPlan.get(key) ?? 'free'
    req.apiKeyUser = { userId, plan }
  }
  next()
}
