/**
 * Stripe webhook idempotency — persisted to Postgres so duplicate events are
 * safely rejected even across server restarts and horizontal scaling.
 */
import { prisma } from '../db'

export async function hasProcessedStripeEvent(eventId: string): Promise<boolean> {
  const row = await prisma.stripeEventLog.findUnique({ where: { eventId } })
  return row !== null
}

export async function markStripeEventProcessed(event: {
  id: string
  type: string
}): Promise<void> {
  await prisma.stripeEventLog.upsert({
    where: { eventId: event.id },
    create: { eventId: event.id, eventType: event.type },
    update: {},
  })
}

/** Purge event log entries older than 30 days (called from nightly maintenance). */
export async function purgeOldStripeEvents(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  await prisma.stripeEventLog.deleteMany({ where: { processedAt: { lt: cutoff } } })
}
