import express, { Request, Response } from 'express'
import { getAuthFromRequest } from '../utils/auth'
import { getReferralStats, normalizeReferralCode } from '../services/referral'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const router = express.Router()

function siteOrigin(req: Request): string {
  const env = process.env.SITE_URL || process.env.CLIENT_URL || ''
  if (env) return env.replace(/\/+$/, '')
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https'
  const host = req.get('x-forwarded-host') || req.get('host') || 'videotext.io'
  return `${proto}://${host}`.replace(/\/+$/, '')
}

/** GET /api/referral/me — referral link, code, stats (authenticated). */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) {
      return res.status(401).json({ message: 'Sign in required.' })
    }
    const stats = await getReferralStats(auth.userId, siteOrigin(req))
    return res.json(stats)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    log.error({ msg: 'referral_me_error', error: msg })
    return res.status(500).json({ message: 'Could not load referral info.' })
  }
})

/** GET /api/referral/validate?code= — public check before signup. */
router.get('/validate', async (req: Request, res: Response) => {
  try {
    const code = normalizeReferralCode(String(req.query.code || ''))
    if (!code) {
      return res.json({ valid: false })
    }
    const { prisma } = await import('../db')
    const referrer = await prisma.user.findFirst({
      where: { referralCode: code },
      select: { id: true },
    })
    return res.json({ valid: Boolean(referrer), code })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    log.error({ msg: 'referral_validate_error', error: msg })
    return res.status(500).json({ message: 'Could not validate code.' })
  }
})

export default router
