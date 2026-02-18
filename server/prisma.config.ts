import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { defineConfig } from 'prisma/config'

// Load project root .env so POSTGRES_PASSWORD is available (docker-compose uses it)
const rootEnv = path.join(process.cwd(), '..', '.env')
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv, override: false })
}
// Build DATABASE_URL for localhost if only POSTGRES_* is set (root .env has no DATABASE_URL with localhost)
if (!process.env.DATABASE_URL && process.env.POSTGRES_PASSWORD) {
  const user = process.env.POSTGRES_USER || 'videotools'
  const db = process.env.POSTGRES_DB || 'videotext'
  const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD)
  process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost:5433/${db}`
}
const url = process.env.DATABASE_URL ?? 'postgresql://videotools:videotools@localhost:5433/videotext'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url,
  },
})
