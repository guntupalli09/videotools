/**
 * Lightweight founder status via GET /api/admin/me.
 * Caches result in sessionStorage for session lifetime. No dashboard probe.
 */

import { useState, useEffect } from 'react'
import { isLoggedIn } from '../lib/auth'
import { fetchFounderMe, getCachedFounderStatus, setCachedFounderStatus, clearCachedFounderStatus } from '../lib/founderDashboard'

export function invalidateFounderCache(): void {
  clearCachedFounderStatus()
}

export function useFounderStatus(): { isFounder: boolean; loading: boolean } {
  const [state, setState] = useState<{ isFounder: boolean; loading: boolean }>(() => {
    if (!isLoggedIn()) return { isFounder: false, loading: false }
    const cached = getCachedFounderStatus()
    if (cached !== null) return { isFounder: cached, loading: false }
    return { isFounder: false, loading: true }
  })

  useEffect(() => {
    if (!isLoggedIn()) {
      clearCachedFounderStatus()
      setState({ isFounder: false, loading: false })
      return
    }

    const cached = getCachedFounderStatus()
    if (cached !== null) {
      setState({ isFounder: cached, loading: false })
      return
    }

    setState((s) => ({ ...s, loading: true }))
    fetchFounderMe()
      .then((result) => {
        const isFounder = result !== null
        setCachedFounderStatus(isFounder)
        setState({ isFounder, loading: false })
      })
      .catch(() => {
        setCachedFounderStatus(false)
        setState({ isFounder: false, loading: false })
      })
  }, [])

  useEffect(() => {
    const onLogout = () => {
      clearCachedFounderStatus()
      setState({ isFounder: false, loading: false })
    }
    window.addEventListener('videotext:logout', onLogout)
    return () => window.removeEventListener('videotext:logout', onLogout)
  }, [])

  return state
}
