import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// pg/SCRAM requires a string URL with user:password; env.ts sets DATABASE_URL before this is imported.
const raw = process.env.DATABASE_URL

if (!raw || raw.trim().length === 0) {
  throw new Error('DATABASE_URL must be set before importing db.ts')
}

const connectionString = raw.trim()
const adapter = new PrismaPg({ connectionString })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
