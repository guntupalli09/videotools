/**
 * Load env so DATABASE_URL (and Redis for local dev) are set before db/redis are imported.
 * Must be the first import in index.ts.
 */
import 'dotenv/config'
import path from 'path'
import fs from 'fs'

// Project root .env (used by docker-compose); try cwd then __dirname so it works regardless of how server is started
const rootEnvCwd = path.join(process.cwd(), '..', '.env')
const rootEnvDir = path.join(__dirname, '..', '..', '.env')
const rootEnv = fs.existsSync(rootEnvCwd) ? rootEnvCwd : fs.existsSync(rootEnvDir) ? rootEnvDir : null
if (rootEnv && !process.env.DATABASE_URL) {
  require('dotenv').config({ path: rootEnv, override: false })
  if (!process.env.DATABASE_URL && process.env.POSTGRES_PASSWORD) {
    const user = process.env.POSTGRES_USER || 'videotools'
    const db = process.env.POSTGRES_DB || 'videotext'
    const host = process.env.POSTGRES_HOST || 'localhost'
    const port = process.env.POSTGRES_PORT || '5433'
    const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD)
    process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:${port}/${db}`
  }
}
// Default only when still unset (Docker default is videotools; if you set POSTGRES_PASSWORD in root .env, it must match)
if (!process.env.DATABASE_URL || (typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length === 0)) {
  process.env.DATABASE_URL = 'postgresql://videotools:videotools@localhost:5433/videotext'
}

// When running on host (not in Docker), redis://redis:6379 won't resolve — use localhost.
// Inside Docker, keep redis://redis:6379 so the API container can reach the Redis service.
const inDocker = fs.existsSync('/.dockerenv')
if (process.env.REDIS_URL === 'redis://redis:6379' && !inDocker) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}
