/**
 * Shows remaining quota for Free plan under upload zone (imports or minutes).
 * Fetches once on mount; no refetch. Subtle, small muted text.
 */

import { useState, useEffect } from 'react'
import { getCurrentUsage } from '../lib/api'
import { isDemo } from '../lib/auth'
import { formatImportQuotaLabel } from '../lib/referralReward'

export default function UsageRemaining() {
  const [remaining, setRemaining] = useState<number | null>(null)
  const [plan, setPlan] = useState<string>('free')
  const [quotaType, setQuotaType] = useState<'imports' | 'minutes'>('imports')
  const [limit, setLimit] = useState<number>(3)
  const [dailyRemaining, setDailyRemaining] = useState<number>(0)
  const [bonusImportCredits, setBonusImportCredits] = useState<number>(0)

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
            const daily = data.dailyRemaining ?? Math.max(0, (data.limit ?? 3) - (data.used ?? 0))
            const bonus = data.bonusImportCredits ?? 0
            setDailyRemaining(daily)
            setBonusImportCredits(bonus)
            setRemaining(data.remaining ?? daily + bonus)
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

  if (plan !== 'free' || remaining === null || isDemo()) return null

  const importLabel =
    quotaType === 'imports'
      ? formatImportQuotaLabel({
          dailyRemaining,
          dailyLimit: limit,
          bonusImportCredits,
        })
      : null

  return (
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2" aria-live="polite">
      {quotaType === 'imports'
        ? remaining === 0
          ? "You've used all imports for today. Upgrade to use the tool."
          : importLabel
        : `Remaining this month: ${remaining} min / ${limit} min`}
    </p>
  )
}
