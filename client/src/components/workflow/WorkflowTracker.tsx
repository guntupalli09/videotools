import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  on,
  off,
  getSnapshot,
  userChoseYes,
  userChoseNo,
  userSelectedNextTool,
  WORKFLOW_TOOL_OPTIONS,
  type WorkflowSnapshot,
  type WorkflowStatus,
} from '../../workflow/workflowStore'

const TRACKER_HEIGHT_PX = 56
const EVENT = 'workflow:change' as const

/** Minutes from total processing time (ms). Used so "completed in X minutes" reflects only processing, not idle/wall-clock time. */
function processingMinutes(totalProcessingMs: number): number {
  return Math.round(totalProcessingMs / 60000)
}

export function WorkflowTracker() {
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot>(getSnapshot)
  const listenerRef = useRef((s: WorkflowSnapshot) => setSnapshot(s))

  useEffect(() => {
    on(EVENT, listenerRef.current)
    return () => off(EVENT, listenerRef.current)
  }, [])

  const status: WorkflowStatus = snapshot.status

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[40] flex items-center justify-center border-t border-gray-200 bg-white/95 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] backdrop-blur dark:border-white/10 dark:bg-gray-900/95 transition-colors duration-500"
      style={{ height: TRACKER_HEIGHT_PX }}
      role="region"
      aria-label="Workflow tracker"
    >
      {status === 'idle' && <div className="h-full w-full" aria-hidden />}

      {status === 'prompt_open' && (
        <div className="flex flex-wrap items-center justify-center gap-3 px-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Do you want to continue to the next tool in your workflow?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => userChoseYes()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 transition-colors"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => userChoseNo()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              No
            </button>
          </div>
        </div>
      )}

      {status === 'active' && (
        <div className="flex flex-wrap items-center justify-center gap-3 px-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            {snapshot.steps.map((s, i) => (
              <span key={`${s.toolId}-${i}`}>
                {i > 0 && <span className="mx-1">→</span>}
                <span>{s.label}</span>
              </span>
            ))}
          </div>
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 transition-colors"
            defaultValue=""
            onChange={(e) => {
              const value = e.target.value
              e.target.value = ''
              if (!value) return
              const option = WORKFLOW_TOOL_OPTIONS.find((o) => o.pathname === value)
              if (!option) return
              userSelectedNextTool(option)
              navigate(option.pathname)
            }}
            aria-label="Select next tool"
          >
            <option value="">Next tool…</option>
            {WORKFLOW_TOOL_OPTIONS.map((opt) => (
              <option key={opt.toolId} value={opt.pathname}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {status === 'completed' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Workflow completed in {processingMinutes(snapshot.totalProcessingMs)} minute
          {processingMinutes(snapshot.totalProcessingMs) === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}
