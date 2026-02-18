/**
 * Create a test user in the DB (for local dev after DB reset).
 * Run from server/: npx tsx scripts/seed-test-user.ts
 * Uses SEED_USER_EMAIL and SEED_USER_PASSWORD, or AUTH_EMAIL / AUTH_PASSWORD from env or scripts/verify-credentials.env.
 */
import path from 'path'
import fs from 'fs'
const credPath = path.join(__dirname, 'verify-credentials.env')
if (fs.existsSync(credPath)) {
  const lines = fs.readFileSync(credPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}
import '../src/env'
import bcrypt from 'bcryptjs'
import { saveUser } from '../src/models/User'
import { getPlanLimits } from '../src/utils/limits'
import type { User, PlanType } from '../src/models/User'

async function main() {
  const email = (process.env.SEED_USER_EMAIL || process.env.AUTH_EMAIL || 'test@example.com').trim().toLowerCase()
  const password = process.env.SEED_USER_PASSWORD || process.env.AUTH_PASSWORD || 'password123'
  if (!email || !password) {
    console.error('Set SEED_USER_EMAIL and SEED_USER_PASSWORD (or AUTH_EMAIL / AUTH_PASSWORD), or use defaults.')
    process.exit(1)
  }
  const planRaw = (process.env.SEED_USER_PLAN || 'free').toLowerCase()
  const plan: PlanType =
    planRaw === 'basic' || planRaw === 'pro' || planRaw === 'agency' ? planRaw : 'free'
  const limits = getPlanLimits(plan)
  const now = new Date()
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const hash = await bcrypt.hash(password, 10)
  const user: User = {
    id: email,
    email,
    passwordHash: hash,
    plan,
    stripeCustomerId: undefined,
    subscriptionId: undefined,
    paymentMethodId: undefined,
    usageThisMonth: {
      totalMinutes: 0,
      videoCount: 0,
      batchCount: 0,
      languageCount: 0,
      translatedMinutes: 0,
      resetDate,
    },
    limits,
    overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
    createdAt: now,
    updatedAt: now,
  }
  await saveUser(user)
  console.log('Created test user:', email, '| plan:', plan)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
