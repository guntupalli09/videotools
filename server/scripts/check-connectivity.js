#!/usr/bin/env node
/**
 * Checks that Redis and Postgres are reachable (REDIS_URL, DATABASE_URL).
 * Use from repo root: node server/scripts/check-connectivity.js
 * Or from server: node scripts/check-connectivity.js
 * Loads server/.env so same config as API is used.
 */
const path = require('path')
const fs = require('fs')

const envPaths = [
  path.join(process.cwd(), 'server', '.env'),
  path.join(process.cwd(), '.env'),
]
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p })
    break
  }
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const DATABASE_URL = process.env.DATABASE_URL

const TIMEOUT_MS = 5000

function timeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

async function checkRedis() {
  const Redis = require('ioredis')
  const redis = new Redis(REDIS_URL, {
    connectTimeout: TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
  })
  try {
    await timeout(redis.ping(), TIMEOUT_MS, 'Redis')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  } finally {
    redis.disconnect()
  }
}

async function checkPostgres() {
  if (!DATABASE_URL || DATABASE_URL.trim() === '') {
    return { ok: false, error: 'DATABASE_URL not set' }
  }
  const { Client } = require('pg')
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: TIMEOUT_MS })
  try {
    await timeout(client.connect(), TIMEOUT_MS, 'Postgres')
    await timeout(client.query('SELECT 1'), 2000, 'Postgres query')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  } finally {
    await client.end().catch(() => {})
  }
}

async function main() {
  console.log('Connectivity check (REDIS_URL and DATABASE_URL)\n')
  console.log('REDIS_URL:', REDIS_URL.replace(/:[^:@]+@/, ':****@'))
  console.log('DATABASE_URL:', DATABASE_URL ? DATABASE_URL.replace(/:[^:@]+@/, ':****@') : '(not set)\n')

  const [redisResult, pgResult] = await Promise.all([checkRedis(), checkPostgres()])

  console.log('\nRedis:  ', redisResult.ok ? 'OK' : 'FAIL — ' + redisResult.error)
  console.log('Postgres:', pgResult.ok ? 'OK' : 'FAIL — ' + pgResult.error)

  const ok = redisResult.ok && pgResult.ok
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
