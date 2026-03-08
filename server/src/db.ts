import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// pg/SCRAM requires a string URL with user:password; env.ts sets DATABASE_URL before this is imported.
const raw = process.env.DATABASE_URL

if (!raw || raw.trim().length === 0) {
  throw new Error('DATABASE_URL must be set before importing db.ts')
}

const connectionString = raw.trim()
// Cap the connection pool so Postgres isn't exhausted under concurrent load.
// With 2 API replicas this allows up to 20 connections total (10 each).
const pool = new pg.Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
