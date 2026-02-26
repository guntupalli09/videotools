import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { defineConfig } from 'prisma/config'

// Align Prisma with the same NODE_ENV-based env loading as the server.
const envFileName = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
const envPath = path.join(__dirname, envFileName)

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false })
}

const url = process.env.DATABASE_URL

if (!url || url.trim().length === 0) {
  throw new Error('DATABASE_URL must be set for Prisma (via server/.env.development or server/.env.production)')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: url.trim(),
  },
})
