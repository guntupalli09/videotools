/**
 * Lightweight founder status via GET /api/admin/me.
 * Reactive to auth changes; only caches true founder state. No permanent false cache.
 */

import { useState, useEffect } from 'react'
import { getAuthToken } from '../lib/api'
import {
  fetchFounderMe,
  getCachedFounderStatus,
  setCachedFounderStatus,
  clearCachedFounderStatus,
} from '../lib/founderDashboard'

export function invalidateFounderCache(): void {
  clearCachedFounderStatus()
}

export function useFounderStatus(): { isFounder: boolean; loading: boolean } {
  const [state, setState] = useState<{ isFounder: boolean; loading: boolean }>(() => {
    const token = getAuthToken()
    if (!token) return { isFounder: false, loading: false }
    const cached = getCachedFounderStatus()
    if (cached === true) return { isFounder: true, loading: false }
    return { isFounder: false, loading: true }
  })

  useEffect(() => {
    let generation = 0

    const check = async (): Promise<void> => {
      const token = getAuthToken()
      if (!token) {
        clearCachedFounderStatus()
        setState({ isFounder: false, loading: false })
        return
      }

      if (getCachedFounderStatus() === true) {
        setState({ isFounder: true, loading: false })
        return
      }

      const gen = ++generation
      setState((prev) => ({ ...prev, loading: true }))

      try {
        const result = await fetchFounderMe()
        if (gen !== generation) return

        if (result?.isFounder) {
          setCachedFounderStatus(true)
          setState({ isFounder: true, loading: false })
        } else {
          clearCachedFounderStatus()
          setState({ isFounder: false, loading: false })
        }
      } catch {
        if (gen !== generation) return
        setState({ isFounder: false, loading: false })
      }
    }

    check()

    const handlePlanUpdated = (): void => {
      check()
    }

    const handleLogout = (): void => {
      clearCachedFounderStatus()
      generation += 1
      setState({ isFounder: false, loading: false })
    }

    window.addEventListener('videotext:plan-updated', handlePlanUpdated)
    window.addEventListener('videotext:logout', handleLogout)

    return () => {
      generation += 1
      window.removeEventListener('videotext:plan-updated', handlePlanUpdated)
      window.removeEventListener('videotext:logout', handleLogout)
    }
  }, [])

  return state
}
