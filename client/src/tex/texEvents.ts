/**
 * Tex event bus — observation only. No business logic.
 * Tools emit; Tex subscribes. If no listener, emit is a no-op.
 */

export type TexEventType =
  | 'tool_greeting'
  | 'plan_nudge'
  | 'error'
  | 'job_started'
  | 'job_completed'
  | 'trigger'
  | 'context'

export interface TexEventPayloads {
  tool_greeting: { pathname: string; toolId: string | null }
  plan_nudge: { plan: string; message: string }
  error: { type: 'job_failed' | 'upload_error'; message?: string }
  job_started: Record<string, never>
  job_completed: { durationMs: number; toolId?: string }
  trigger: { id: string; message: string; link?: { path: string; label: string } }
  context: {
    pathname?: string
    plan?: string
    fileCount?: number
    fileSize?: number
    hasMultipleLanguages?: boolean
    idleAfterUpload?: boolean
  }
}

type Listener = (type: TexEventType, payload: unknown) => void

const listeners: Set<Listener> = new Set()

export function subscribeTexEvents(fn: Listener): () => void {
  try {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  } catch {
    return () => {}
  }
}

export function emitTexEvent<T extends TexEventType>(
  type: T,
  payload: TexEventPayloads[T]
): void {
  try {
    listeners.forEach((fn) => {
      try {
        fn(type, payload)
      } catch {
        // ignore so one listener cannot break others
      }
    })
  } catch {
    // emit must not throw
  }
}

/** Pending job completion when panel was closed — so we can show it when the user opens Tex. */
const PENDING_JOB_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
let pendingJobCompletion: { durationMs: number; toolId?: string; at: number } | null = null

/** Convenience for tools: emit job completed with duration (observation only). */
export function texJobCompleted(durationMs: number, toolId?: string): void {
  const payload = { durationMs, toolId }
  emitTexEvent('job_completed', payload)
  pendingJobCompletion = { ...payload, at: Date.now() }
}

/** Get pending job completion if recent (panel was closed when job completed). Call from panel on open. */
export function getPendingJobCompletion(): { durationMs: number; toolId?: string } | null {
  if (!pendingJobCompletion) return null
  if (Date.now() - pendingJobCompletion.at > PENDING_JOB_EXPIRY_MS) {
    pendingJobCompletion = null
    return null
  }
  return { durationMs: pendingJobCompletion.durationMs, toolId: pendingJobCompletion.toolId }
}

/** Clear pending after panel has shown it. */
export function clearPendingJobCompletion(): void {
  pendingJobCompletion = null
}

/** Convenience for tools: emit job failed (observation only). Optional suggestedMessage from getFailureMessage(). */
export function texJobFailed(suggestedMessage?: string): void {
  emitTexEvent('error', { type: 'job_failed', message: suggestedMessage })
}

/** Convenience for tools: emit job started (observation only). */
export function texJobStarted(): void {
  emitTexEvent('job_started', {})
}
