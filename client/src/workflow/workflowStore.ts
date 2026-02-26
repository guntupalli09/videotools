/**
 * Global Workflow Tracker: module-scoped store + event emitter.
 * Only WorkflowTracker subscribes. Tools only call emitToolCompleted().
 */

export type WorkflowStatus = 'idle' | 'prompt_open' | 'active' | 'completed'

export interface WorkflowStep {
  toolId: string
  label: string
  pathname: string
}

export interface WorkflowSnapshot {
  status: WorkflowStatus
  steps: WorkflowStep[]
  startedAt: number | null
  completedAt: number | null
  /** Sum of all processing times (ms) for steps in this workflow. Used for "completed in X minutes". */
  totalProcessingMs: number
  lastCompletedTool: { toolId: string; pathname: string } | null
}

const WORKFLOW_CHANGE = 'workflow:change'
const STORAGE_KEY = 'videotext:workflow'

const TOOL_LABELS: Record<string, string> = {
  'video-to-transcript': 'Video to Transcript',
  'video-to-subtitles': 'Video to Subtitles',
  'batch-process': 'Batch Process',
  'translate-subtitles': 'Translate Subtitles',
  'fix-subtitles': 'Fix Subtitles',
  'burn-subtitles': 'Burn Subtitles',
  'compress-video': 'Compress Video',
}

interface PersistedState {
  status: WorkflowStatus
  steps: WorkflowStep[]
  startedAt: number | null
  completedAt: number | null
  totalProcessingMs: number
  lastCompletedTool: { toolId: string; pathname: string } | null
}

/** Remove consecutive duplicate steps (same toolId in a row). */
function dedupeConsecutiveSteps(steps: WorkflowStep[]): WorkflowStep[] {
  if (steps.length <= 1) return steps
  const out: WorkflowStep[] = [steps[0]]
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].toolId !== steps[i - 1].toolId) out.push(steps[i])
  }
  return out
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null
    if (!raw) return null
    const parsed = JSON.parse(raw) as { status?: string; steps?: WorkflowStep[]; startedAt?: number | null; completedAt?: number | null; totalProcessingMs?: number; lastCompletedTool?: { toolId: string; pathname: string } | null }
    if (!parsed || !Array.isArray(parsed.steps)) return null
    const status = parsed.status === 'prompt_open' || parsed.status === 'active' || parsed.status === 'completed' ? parsed.status : 'idle'
    if (status === 'idle' && parsed.steps.length === 0) return null
    const steps = parsed.steps.filter((s: unknown) => s && typeof s === 'object' && 'toolId' in s && 'pathname' in s) as WorkflowStep[]
    return {
      status,
      steps: dedupeConsecutiveSteps(steps),
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
      completedAt: typeof parsed.completedAt === 'number' ? parsed.completedAt : null,
      totalProcessingMs: typeof parsed.totalProcessingMs === 'number' && parsed.totalProcessingMs >= 0 ? parsed.totalProcessingMs : 0,
      lastCompletedTool: parsed.lastCompletedTool && typeof parsed.lastCompletedTool === 'object' && 'toolId' in parsed.lastCompletedTool ? parsed.lastCompletedTool : null,
    }
  } catch {
    return null
  }
}

function persist(): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    if (store.status === 'idle' && store.steps.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      status: store.status,
      steps: dedupeConsecutiveSteps(store.steps),
      startedAt: store.startedAt,
      completedAt: store.completedAt,
      totalProcessingMs: store.totalProcessingMs,
      lastCompletedTool: store.lastCompletedTool,
    }))
  } catch {
    // no-op
  }
}

const store: {
  status: WorkflowStatus
  steps: WorkflowStep[]
  startedAt: number | null
  completedAt: number | null
  totalProcessingMs: number
  lastCompletedTool: { toolId: string; pathname: string } | null
} = (() => {
  const initial = {
    status: 'idle' as WorkflowStatus,
    steps: [] as WorkflowStep[],
    startedAt: null as number | null,
    completedAt: null as number | null,
    totalProcessingMs: 0,
    lastCompletedTool: null as { toolId: string; pathname: string } | null,
  }
  const saved = loadPersisted()
  if (saved) {
    if (saved.status != null) initial.status = saved.status
    if (saved.steps?.length) initial.steps = saved.steps
    if (saved.startedAt != null) initial.startedAt = saved.startedAt
    if (saved.completedAt != null) initial.completedAt = saved.completedAt
    if (typeof saved.totalProcessingMs === 'number' && saved.totalProcessingMs >= 0) initial.totalProcessingMs = saved.totalProcessingMs
    if (saved.lastCompletedTool != null) initial.lastCompletedTool = saved.lastCompletedTool
  }
  return initial
})()

type Listener = (snapshot: WorkflowSnapshot) => void
const listeners: Listener[] = []

function emit(): void {
  persist()
  const snapshot: WorkflowSnapshot = {
    status: store.status,
    steps: dedupeConsecutiveSteps(store.steps),
    startedAt: store.startedAt,
    completedAt: store.completedAt,
    totalProcessingMs: store.totalProcessingMs,
    lastCompletedTool: store.lastCompletedTool ? { ...store.lastCompletedTool } : null,
  }
  listeners.forEach((fn) => {
    try {
      fn(snapshot)
    } catch {
      // no-op
    }
  })
}

export function on(event: typeof WORKFLOW_CHANGE, fn: Listener): void {
  if (event !== WORKFLOW_CHANGE) return
  listeners.push(fn)
}

export function off(event: typeof WORKFLOW_CHANGE, fn: Listener): void {
  if (event !== WORKFLOW_CHANGE) return
  const i = listeners.indexOf(fn)
  if (i !== -1) listeners.splice(i, 1)
}

export function handleToolCompleted(payload: { toolId: string; pathname: string; processingMs?: number }): void {
  if (store.status === 'prompt_open' || store.status === 'completed') return

  const step: WorkflowStep = {
    toolId: payload.toolId,
    label: TOOL_LABELS[payload.toolId] ?? payload.toolId,
    pathname: payload.pathname,
  }
  const addMs = payload.processingMs ?? 0

  if (store.status === 'idle') {
    if (store.startedAt === null) store.startedAt = Date.now()
    store.totalProcessingMs = addMs
    store.steps = [step]
    store.status = 'prompt_open'
    store.lastCompletedTool = { toolId: payload.toolId, pathname: payload.pathname }
    emit()
    return
  }

  if (store.status === 'active') {
    store.totalProcessingMs += addMs
    const last = store.steps[store.steps.length - 1]
    if (last?.toolId !== payload.toolId) {
      store.steps = [...store.steps, step]
    }
    store.status = 'prompt_open'
    store.lastCompletedTool = { toolId: payload.toolId, pathname: payload.pathname }
    emit()
  }
}

export function userChoseYes(): void {
  if (store.status !== 'prompt_open') return
  store.status = 'active'
  store.lastCompletedTool = null
  emit()
}

export function userChoseNo(): void {
  if (store.status !== 'prompt_open') return
  store.completedAt = Date.now()
  store.status = 'completed'
  store.lastCompletedTool = null
  emit()
}

/** Call when user picks next tool from dropdown. Does not append to steps; the step is added when that tool completes (handleToolCompleted). */
export function userSelectedNextTool(_payload: { toolId: string; label: string; pathname: string }): void {
  if (store.status !== 'active') return
  // Do not append here — avoid duplicate step when the selected tool later completes.
}

/** Public API for tools. Call once per completion; do not read store. Pass processingMs so workflow "completed in X minutes" uses sum of processing time, not wall-clock. */
export function emitToolCompleted(payload: { toolId: string; pathname: string; processingMs?: number }): void {
  handleToolCompleted(payload)
}

export function getSnapshot(): WorkflowSnapshot {
  return {
    status: store.status,
    steps: dedupeConsecutiveSteps(store.steps),
    startedAt: store.startedAt,
    completedAt: store.completedAt,
    totalProcessingMs: store.totalProcessingMs,
    lastCompletedTool: store.lastCompletedTool ? { ...store.lastCompletedTool } : null,
  }
}

/** For dropdown: next tool options (exclude current step tools if desired). All tools. */
export const WORKFLOW_TOOL_OPTIONS: WorkflowStep[] = [
  { toolId: 'video-to-transcript', label: TOOL_LABELS['video-to-transcript'], pathname: '/video-to-transcript' },
  { toolId: 'video-to-subtitles', label: TOOL_LABELS['video-to-subtitles'], pathname: '/video-to-subtitles' },
  { toolId: 'batch-process', label: TOOL_LABELS['batch-process'], pathname: '/batch-process' },
  { toolId: 'translate-subtitles', label: TOOL_LABELS['translate-subtitles'], pathname: '/translate-subtitles' },
  { toolId: 'fix-subtitles', label: TOOL_LABELS['fix-subtitles'], pathname: '/fix-subtitles' },
  { toolId: 'burn-subtitles', label: TOOL_LABELS['burn-subtitles'], pathname: '/burn-subtitles' },
  { toolId: 'compress-video', label: TOOL_LABELS['compress-video'], pathname: '/compress-video' },
]
