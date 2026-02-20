/**
 * Shows "Remaining this month: XX min / 60 min" for Free plan under upload zone.
 * Fetches once on mount; no refetch. Subtle, small muted text.
 */

import { useState, useEffect } from 'react'
import { getCurrentUsage } from '../lib/api'

export default function UsageRemaining() {
  const [remaining, setRemaining] = useState<number | null>(null)
  const [plan, setPlan] = useState<string>('free')
  const [total, setTotal] = useState<number>(60)

  useEffect(() => {
    let cancelled = false
    getCurrentUsage()
      .then((data) => {
        if (cancelled) return
        const p = (data.plan || 'free').toLowerCase()
        setPlan(p)
        if (p === 'free') {
          setRemaining(data.usage?.remaining ?? 0)
          setTotal(data.limits?.minutesPerMonth ?? 60)
        }
      })
      .catch(() => {
        if (!cancelled) setRemaining(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (plan !== 'free' || remaining === null) return null

  return (
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2" aria-live="polite">
      Remaining this month: {remaining} min / {total} min
    </p>
  )
}
