import type { Prisma } from '@prisma/client'
import { prisma } from '../db'

export type BatchStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'partial'

export interface BatchJob {
  id: string
  userId: string

  // Batch details
  totalVideos: number
  totalDuration: number // seconds
  processedVideos: number
  failedVideos: number

  // Status
  status: BatchStatus

  // Output
  zipPath?: string
  zipSize?: number

  // Error tracking
  errors: {
    videoName: string
    reason: string
  }[]

  // Timestamps
  createdAt: Date
  completedAt?: Date
  expiresAt: Date
}

function recordToBatch(row: {
  id: string
  userId: string
  totalVideos: number
  totalDuration: number
  processedVideos: number
  failedVideos: number
  status: string
  zipPath: string | null
  zipSize: number | null
  errors: unknown
  createdAt: Date
  completedAt: Date | null
  expiresAt: Date
}): BatchJob {
  const errors = Array.isArray(row.errors)
    ? (row.errors as { videoName: string; reason: string }[])
    : []
  return {
    id: row.id,
    userId: row.userId,
    totalVideos: row.totalVideos,
    totalDuration: row.totalDuration,
    processedVideos: row.processedVideos,
    failedVideos: row.failedVideos,
    status: row.status as BatchStatus,
    zipPath: row.zipPath ?? undefined,
    zipSize: row.zipSize ?? undefined,
    errors,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? undefined,
    expiresAt: row.expiresAt,
  }
}

export async function saveBatch(batch: BatchJob): Promise<void> {
  await prisma.batchJobRecord.upsert({
    where: { id: batch.id },
    create: {
      id: batch.id,
      userId: batch.userId,
      totalVideos: batch.totalVideos,
      totalDuration: batch.totalDuration,
      processedVideos: batch.processedVideos,
      failedVideos: batch.failedVideos,
      status: batch.status,
      zipPath: batch.zipPath ?? null,
      zipSize: batch.zipSize ?? null,
      errors: batch.errors as Prisma.InputJsonValue,
      createdAt: batch.createdAt,
      completedAt: batch.completedAt ?? null,
      expiresAt: batch.expiresAt,
    },
    update: {
      processedVideos: batch.processedVideos,
      failedVideos: batch.failedVideos,
      status: batch.status,
      zipPath: batch.zipPath ?? null,
      zipSize: batch.zipSize ?? null,
      errors: batch.errors as Prisma.InputJsonValue,
      completedAt: batch.completedAt ?? null,
    },
  })
}

export async function getBatchById(id: string): Promise<BatchJob | undefined> {
  const row = await prisma.batchJobRecord.findUnique({ where: { id } })
  if (!row) return undefined
  return recordToBatch(row)
}
