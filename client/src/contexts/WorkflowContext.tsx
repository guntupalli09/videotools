/**
 * Workflow context: reuse the last used video (and SRT) across tools so users
 * don't have to re-upload when chaining e.g. Transcript → Burn → Compress.
 * File is kept in memory only (lost on refresh). User can always remove and upload a different file.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export interface WorkflowState {
  /** Last video file used (in memory; lost on refresh) */
  videoFile: File | null
  /** Last video URL if user pasted URL instead of uploading (for tools that support URL) */
  videoUrl: string | null
  /** SRT/VTT content from transcript export or subtitles result (for Burn) */
  srtContent: string | null
  /** Display name when we have URL but no file */
  videoName: string | null
}

const initialState: WorkflowState = {
  videoFile: null,
  videoUrl: null,
  srtContent: null,
  videoName: null,
}

type WorkflowContextValue = WorkflowState & {
  setVideo: (file: File | null) => void
  setVideoUrl: (url: string | null, name?: string | null) => void
  setSrt: (content: string | null) => void
  clearVideo: () => void
  clearSrt: () => void
  clearAll: () => void
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkflowState>(initialState)

  const setVideo = useCallback((file: File | null) => {
    setState((s) => ({
      ...s,
      videoFile: file ?? null,
      videoUrl: file ? null : s.videoUrl,
      videoName: file ? file.name : s.videoName,
    }))
  }, [])

  const setVideoUrl = useCallback((url: string | null, name?: string | null) => {
    setState((s) => ({
      ...s,
      videoUrl: url ?? null,
      videoFile: url ? null : s.videoFile,
      videoName: name ?? url ?? null,
    }))
  }, [])

  const setSrt = useCallback((content: string | null) => {
    setState((s) => ({ ...s, srtContent: content ?? null }))
  }, [])

  const clearVideo = useCallback(() => {
    setState((s) => ({ ...s, videoFile: null, videoUrl: null, videoName: null }))
  }, [])

  const clearSrt = useCallback(() => {
    setState((s) => ({ ...s, srtContent: null }))
  }, [])

  const clearAll = useCallback(() => {
    setState(initialState)
  }, [])

  const value: WorkflowContextValue = {
    ...state,
    setVideo,
    setVideoUrl,
    setSrt,
    clearVideo,
    clearSrt,
    clearAll,
  }

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  )
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext)
  if (!ctx) {
    throw new Error('useWorkflow must be used within WorkflowProvider')
  }
  return ctx
}

/** Safe hook: returns null if outside provider (e.g. SEO wrapper pages). */
export function useWorkflowOptional(): WorkflowContextValue | null {
  return useContext(WorkflowContext)
}
