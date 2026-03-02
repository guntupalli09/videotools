/**
 * Placeholder: backfill Job table from PostHog export (processing_finished / processing_failed).
 * Idempotent by jobId.
 *
 * Usage (when implemented):
 *   cd server && npx tsx scripts/backfillJobsFromPosthog.ts path/to/export.json
 *
 * Expected export format (TODO: confirm with PostHog export schema):
 *   - Array of events with at least: event name, properties.job_id, properties.user_id,
 *     properties.tool_type, properties.processing_ms (for finished), timestamp.
 *   - processing_finished → insert/update Job as completed (status, completedAt, processingMs).
 *   - processing_failed → insert/update Job as failed (status, failureReason).
 *
 * Idempotency: before insert, check if Job with same id exists; if so, skip or update only missing fields.
 */

import path from 'path'

const exportPath = process.argv[2] ?? ''

async function main() {
  if (!exportPath) {
    console.warn('Usage: npx tsx scripts/backfillJobsFromPosthog.ts <path-to-posthog-export.json>')
    console.warn('PostHog export format not yet confirmed; script is a stub.')
    process.exit(1)
  }

  const resolved = path.resolve(process.cwd(), exportPath)
  console.warn('[backfillJobs] Stub: would read', resolved)
  // TODO: Load JSON (require('fs').readFileSync + JSON.parse or readline for large files)
  // TODO: Filter events by name: 'processing_finished' | 'processing_failed'
  // TODO: For each processing_finished:
  //   - Map to Job: id = properties.job_id, userId = properties.user_id, toolType = properties.tool_type,
  //     status = 'completed', completedAt = timestamp, processingMs = properties.processing_ms, planAtRun = properties.plan (if any)
  //   - Check prisma.job.findUnique({ where: { id } }); if exists skip (or upsert), else create
  // TODO: For each processing_failed:
  //   - Map to Job: id = properties.job_id, userId = properties.user_id, toolType = properties.tool_type,
  //     status = 'failed', failureReason = properties.error_message
  //   - Same idempotency by jobId
  // TODO: Log summary: total events, inserted, skipped (duplicate), errors
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
