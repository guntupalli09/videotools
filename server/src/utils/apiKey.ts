import { Request, Response, NextFunction } from 'express'

/**
 * In-memory API key store. Format: API_KEYS=key1:userId1,key2:userId2
 * Or single key: API_KEY=secret (maps to userId "api-user")
 */
const keyToUser = new Map<string, string>()

function loadApiKeys() {
  if (keyToUser.size > 0) return
  if (process.env.API_KEY) {
    keyToUser.set(process.env.API_KEY.trim(), 'api-user')
  }
  const keysEnv = process.env.API_KEYS
  if (keysEnv) {
    keysEnv.split(',').forEach((pair) => {
      const [key, userId] = pair.trim().split(':')
      if (key && userId) keyToUser.set(key.trim(), userId.trim())
    })
  }
}

/**
 * Middleware: if Authorization: Bearer <key> or X-Api-Key: <key> is present,
 * resolve to userId and set req.headers['x-user-id'] (and optionally x-plan).
 * Does not reject requests without a key (other auth can apply).
 */
export function apiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  loadApiKeys()
  const authHeader = req.headers.authorization
  const apiKey = req.headers['x-api-key'] as string | undefined
  const key = apiKey?.trim() || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined)
  if (key && keyToUser.has(key)) {
    const userId = keyToUser.get(key)!
    req.headers['x-user-id'] = userId
    if (!req.headers['x-plan']) req.headers['x-plan'] = 'free'
  }
  next()
}
