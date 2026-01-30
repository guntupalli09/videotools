/**
 * Phase 2.5: Auto-scaling triggers (objective, data-only).
 * Upgrade CPX31 → CPX41 when ANY condition is true:
 * - Pro users wait >10 min avg for 30 min
 * - CPU >85% for 15 min sustained
 * - Queue length >200 for 30 min continuous
 *
 * These are objective triggers; no manual judgment.
 * Hook these into your monitoring/alerting (e.g. Prometheus, Datadog).
 * Caller should get queue length via getTotalQueueCount() from workers/videoProcessor and pass here.
 */

import { QUEUE_SOFT_LIMIT } from './queueConfig'

/** Trigger: queue > 200 for 30 min continuous. Call from a cron every 1–5 min and track duration. */
export function shouldAlertQueueSustainedHigh(queueLength: number): boolean {
  return queueLength > QUEUE_SOFT_LIMIT
}

/** Trigger: Pro users wait >10 min avg for 30 min — implement by tracking job wait times by plan in your metrics. */
/** Trigger: CPU >85% for 15 min sustained — implement via OS/metrics (process.cpuUsage, or host metrics). */
