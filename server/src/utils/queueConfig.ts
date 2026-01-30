/**
 * Phase 2.5: Queue limits and backpressure (CPX31 single-node).
 * MAX_GLOBAL_WORKERS = 3. Soft/hard limits for user messaging.
 */

export const MAX_GLOBAL_WORKERS = 3
export const QUEUE_SOFT_LIMIT = 200
export const QUEUE_HARD_LIMIT = 300
export const PAID_TIER_RESERVATION_QUEUE_THRESHOLD = 50

export function isQueueAtHardLimit(totalCount: number): boolean {
  return totalCount >= QUEUE_HARD_LIMIT
}

export function isQueueAtSoftLimit(totalCount: number): boolean {
  return totalCount >= QUEUE_SOFT_LIMIT
}
