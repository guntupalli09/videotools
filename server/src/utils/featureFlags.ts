/**
 * Pipeline performance upgrade feature flags.
 * All default to FALSE. Set env to "true" | "1" | "yes" (case-insensitive) to enable.
 * When all flags are false, system behavior is unchanged from baseline.
 */
function isFlagEnabled(value: string | undefined): boolean {
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
