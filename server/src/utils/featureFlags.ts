/**
 * Pipeline performance upgrade feature flags.
 * All default to FALSE. Set env to "true" | "1" | "yes" (case-insensitive) to enable.
 * When all flags are false, system behavior is unchanged from baseline.
 */
/** Exported for direct unit testing (tests/featureFlags.test.ts) — the parsing rule itself is what matters, not module-load-order-dependent env state. */
export function isFlagEnabled(value: string | undefined): boolean {
  if (value == null || typeof value !== 'string') return false
  return /^(1|true|yes)$/i.test(value.trim())
}

/** Phase 2: One-pass extract+split audio (PROCESSING_V2) */
export const PROCESSING_V2 = isFlagEnabled(process.env.PROCESSING_V2)

/** Phase 4: Defer summary/chapters to async; return transcript first (DEFER_SUMMARY) */
export const DEFER_SUMMARY = isFlagEnabled(process.env.DEFER_SUMMARY)

/** Phase 5–6: Chunk-based progress interpolation + min stream visibility (STREAM_PROGRESS) */
export const STREAM_PROGRESS = isFlagEnabled(process.env.STREAM_PROGRESS)

/** Phase 1: Streaming reassembly in /api/upload/complete (STREAM_UPLOAD_ASSEMBLY) */
export const STREAM_UPLOAD_ASSEMBLY = isFlagEnabled(process.env.STREAM_UPLOAD_ASSEMBLY)

/** Phase 7: Higher worker concurrency (WORKER_CONCURRENCY_V2) */
export const WORKER_CONCURRENCY_V2 = isFlagEnabled(process.env.WORKER_CONCURRENCY_V2)

/** Phase 8: Separate queues for YouTube pipeline so captions never wait behind Whisper (YOUTUBE_QUEUE_SEPARATION) */
export const YOUTUBE_QUEUE_SEPARATION = isFlagEnabled(process.env.YOUTUBE_QUEUE_SEPARATION)

/**
 * Analytics Sprint 1 (revised): shadow-compute the corrected Stripe MRR
 * extraction (2026-01-28.clover object shape — see stripeMrr.ts V2 functions)
 * alongside the existing, currently-inert legacy extraction on every
 * invoice.payment_succeeded webhook. Log-only — does not change what gets
 * written to SubscriptionSnapshot. Safe to enable at any time; adds one
 * extra Stripe API call (invoices.retrieve with expand) per webhook event.
 */
export const MRR_EXTRACTION_V2_SHADOW = isFlagEnabled(process.env.MRR_EXTRACTION_V2_SHADOW)

/**
 * Analytics Sprint 1 (revised): once MRR_EXTRACTION_V2_SHADOW's comparison
 * report has been validated (see docs/analytics/SPRINT_PLAN.md Sprint 1),
 * enabling this flag switches SubscriptionSnapshot writes to use the
 * corrected (V2) extraction result instead of the legacy one. Must not be
 * enabled without MRR_EXTRACTION_V2_SHADOW also enabled and validated first.
 * Rollback is this flag alone — no code change required.
 */
export const MRR_EXTRACTION_V2_WRITE = isFlagEnabled(process.env.MRR_EXTRACTION_V2_WRITE)

/**
 * Analytics Sprint 3: enables the scheduled Stripe-vs-Postgres MRR/active-
 * subscriber reconciliation job (see services/stripeReconciliation.ts and
 * docs/analytics/STRIPE_RECONCILIATION_PLAN.md). Read-only against both
 * systems except for inserting its own result into MrrReconciliationRun.
 * Ships disabled — with this flag off, the scheduled job is a no-op; the
 * standalone CLI script (scripts/stripe-reconciliation-report.ts) can still
 * be run manually regardless of this flag, for on-demand checks.
 */
export const STRIPE_RECONCILIATION_ENABLED = isFlagEnabled(process.env.STRIPE_RECONCILIATION_ENABLED)

/**
 * Analytics Sprint 5: shadow-compute canonical (business_users/business_jobs
 * view-based) dashboard metrics alongside the existing, unchanged legacy
 * queries on every GET /api/admin/dashboard request. Log-only — the served
 * response is always built from the legacy computation regardless of this
 * flag; enabling it can never change what the dashboard UI shows. Shadow
 * computation runs AFTER the response has already been sent, so a slow or
 * failing shadow query can never affect response time or reliability.
 */
export const DASHBOARD_SHADOW_COMPUTE = isFlagEnabled(process.env.DASHBOARD_SHADOW_COMPUTE)

/**
 * Analytics Sprint 6: enables the controlled cutover of exactly 9 approved
 * dashboard fields (see docs/analytics/SPRINT_6_RECONCILIATION_REPORT.md)
 * to their canonical (business_users/business_jobs) sources. Dedicated flag,
 * separate from DASHBOARD_SHADOW_COMPUTE, so shadow-mode observation and
 * the actual served-value cutover can be toggled independently. Per-field
 * fallback: any canonical field that throws, times out, or returns
 * structurally invalid data falls back to the already-computed legacy value
 * for that field only (see services/canonicalDashboardCutover.ts) — a
 * single field's failure never affects the others or the response's
 * success. Rollback is exactly this flag alone.
 */
export const DASHBOARD_CANONICAL_CUTOVER = isFlagEnabled(process.env.DASHBOARD_CANONICAL_CUTOVER)

/**
 * Analytics Sprint 7: redirects the DailyMetrics/MonthlyMetrics rollup
 * generator (services/recomputeMetrics.ts) to source
 * totalUsers/newUsers/activeUsers/jobsCreated/jobsCompleted/jobsFailed/
 * avgProcessingMs/p95ProcessingMs from the Sprint 4 canonical views
 * (business_users/business_jobs, filtered by includeInBusinessMetrics)
 * instead of the raw "User"/"Job" tables. MRR/churnedUsers/newPaidUsers/
 * newMrrCents/churnedMrrCents/churnRatePercent are NOT affected by this flag
 * at all -- no canonical subscription model (business_subscriptions) exists
 * yet, so those fields always continue reading SubscriptionSnapshot
 * regardless of this flag's value. With this flag off (the default), every
 * rollup field is computed exactly as before -- zero behavior change.
 * Rollback is this flag alone; recompute is idempotent and re-runnable at
 * any time either way. See docs/analytics/SPRINT_7_RECONCILIATION_REPORT.md.
 */
export const ROLLUP_CANONICAL_SOURCE = isFlagEnabled(process.env.ROLLUP_CANONICAL_SOURCE)

/**
 * Geo / PPP pricing: when enabled, checkout and /api/billing/prices resolve tier from
 * x-vercel-ip-country (or cf-ipcountry). Requires matching Stripe Price IDs per tier.
 */
export const PPP_PRICING_ENABLED = isFlagEnabled(process.env.PPP_PRICING_ENABLED)
