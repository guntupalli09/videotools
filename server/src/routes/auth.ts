import express, { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { getUserByEmail, getUserByPasswordToken, saveUser } from '../models/User'
import { signAuthToken } from '../utils/auth'

const router = express.Router()

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

