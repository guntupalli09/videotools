/**
 * Shows remaining quota for Free plan under upload zone (imports or minutes).
 * Fetches once on mount; no refetch. Subtle, small muted text.
 */

import { useState, useEffect } from 'react'
import { getCurrentUsage } from '../lib/api'

export default function UsageRemaining() {
  const [remaining, setRemaining] = useState<number | null>(null)
  const [plan, setPlan] = useState<string>('free')
  const [quotaType, setQuotaType] = useState<'imports' | 'minutes'>('imports')
  const [limit, setLimit] = useState<number>(3)

  useEffect(() => {
    let cancelled = false
    getCurrentUsage()
      .then((data) => {
        if (cancelled) return
        const p = (data.plan || 'free').toLowerCase()
        setPlan(p)
        if (p === 'free') {
          const isImports = data.quotaType === 'imports'
          setQuotaType(isImports ? 'imports' : 'minutes')
          if (isImports) {
            setRemaining(data.remaining ?? Math.max(0, 3 - (data.used ?? 0)))
            setLimit(data.limit ?? 3)
          } else {
            setRemaining(data.usage?.remaining ?? 0)
            setLimit(data.limits?.minutesPerMonth ?? 3)
          }
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
      {quotaType === 'imports'
        ? remaining === 0
          ? "You've used all 3 imports. Upgrade to use the tool."
          : `${remaining} of ${limit} imports remaining`
        : `Remaining this month: ${remaining} min / ${limit} min`}
    </p>
  )
}
