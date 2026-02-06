import type { JobStatus } from './api'

/** Interval (ms) for polling job/batch status. */
export const JOB_POLL_INTERVAL_MS = 1500

/**
 * Job polling state machine — lifecycle depends ONLY on jobStatus.status.
 *
 * VALID backend job statuses: 'queued' | 'processing' | 'completed' | 'failed'
 *
 * ALLOWED transitions (poll response → UI action):
 *   - status === 'queued' | 'processing' → continue polling (no UI state change)
 *   - status === 'completed' → stop polling, set UI to completed (result may be missing; never treat as failure)
 *   - status === 'failed' → stop polling, set UI to failed
 *
 * FORBIDDEN transitions:
 *   - Must NOT transition to failed when status is queued or processing
 *   - Must NOT transition to failed when result is missing (completed with no result is still completed)
 *   - Must NOT transition to failed on getJobStatus() throw (network/parse) — keep polling
 *
 * Why UI could show FAILED while backend returns PROCESSING (before this fix):
 *   - Poll catch block used to set failed on any throw (e.g. 404/network) — fixed by only failing on status === 'failed'
 *   - Requiring jobStatus.result for completed meant we never transitioned to completed when result was delayed; we never set failed for that, but the state machine was incomplete
 *   - This helper makes transitions explicit and deterministic: only status drives lifecycle.
 */
export type JobLifecycleTransition = 'continue' | 'completed' | 'failed'

export function getJobLifecycleTransition(jobStatus: JobStatus): JobLifecycleTransition {
  if (jobStatus.status === 'completed') return 'completed'
  if (jobStatus.status === 'failed') return 'failed'
  // queued | processing (or any other in-progress value) → keep polling
  return 'continue'
}
