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

/** Convenience for tools: emit job completed with duration (observation only). */
export function texJobCompleted(durationMs: number, toolId?: string): void {
  emitTexEvent('job_completed', { durationMs, toolId })
}

/** Convenience for tools: emit job failed (observation only). */
export function texJobFailed(): void {
  emitTexEvent('error', { type: 'job_failed' })
}

/** Convenience for tools: emit job started (observation only). */
export function texJobStarted(): void {
  emitTexEvent('job_started', {})
}
