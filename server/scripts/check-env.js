#!/usr/bin/env node
/**
 * Loads server .env via dotenv and reports whether PostHog (and other optional) vars are set.
 * Run from repo root: node server/scripts/check-env.js
 * Or from server: node scripts/check-env.js (after npm install dotenv)
 * Does NOT print secret values.
 */
const path = require('path')
const fs = require('fs')

// Load dotenv from server/.env (when run from repo root or server)
const envPaths = [
  path.join(process.cwd(), 'server', '.env'),
  path.join(process.cwd(), '.env'),
]
let loaded = false
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p })
    loaded = true
    console.log('Loaded env from:', p)
    break
  }
}
if (!loaded) {
  console.warn('No .env file found at', envPaths.join(' or '))
}

const vars = [
  ['POSTHOG_KEY', 'PostHog (server)'],
  ['POSTHOG_HOST', 'PostHog host (optional)'],
]
let ok = true
for (const [key, label] of vars) {
  const val = process.env[key]
  const set = val != null && String(val).trim() !== ''
  console.log(set ? `  OK  ${key} (${label})` : `  --  ${key} (${label}) missing`)
  if (key === 'POSTHOG_KEY' && !set) ok = false
}
process.exit(ok ? 0 : 1)
