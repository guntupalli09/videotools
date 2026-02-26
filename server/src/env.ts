/**
 * Load env so DATABASE_URL and REDIS_URL are set before db/redis are imported.
 * Must be the first import in index.ts.
 *
 * Convention:
 * - NODE_ENV=production  → server/.env.production
 * - anything else        → server/.env.development
 *
 * Values provided by the process environment (e.g. Docker env or `env_file`)
 * are never overridden.
 */
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envFileName = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
const envPath = path.join(__dirname, '..', envFileName)

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false })
}
