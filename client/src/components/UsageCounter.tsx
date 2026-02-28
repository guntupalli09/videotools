import { useCallback, useEffect, useState } from 'react'
import { getCurrentUsage } from '../lib/api'

function useUsage(refreshTrigger?: string | number) {
  const [usage, setUsage] = useState<{
    quotaType: 'imports' | 'minutes'
    remaining: number
    totalPlanMinutes: number
    usedPercent: number
    limit: number
    used: number
  } | null>(null)

  const fetchUsage = useCallback((skipCache = false) => {
    getCurrentUsage({ skipCache: skipCache || refreshTrigger === 'completed' })
      .then((data) => {
        const quotaType = data.quotaType === 'imports' ? 'imports' : 'minutes'
        if (quotaType === 'imports') {
          const used = data.used ?? data.usage?.importCount ?? 0
          const limit = data.limit ?? 3
          const remaining = Math.max(0, (data.remaining ?? limit - used))
          const usedPercent = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
          setUsage({ quotaType, remaining, totalPlanMinutes: limit, usedPercent, limit, used })
        } else {
          const totalPlanMinutes = data.limits.minutesPerMonth + data.overages.minutes
          const remaining = data.usage.remaining
          const usedPercent =
            totalPlanMinutes === 0
              ? 0
              : Math.min(100, Math.round((data.usage.totalMinutes / totalPlanMinutes) * 100))
          setUsage({
            quotaType: 'minutes',
            remaining,
            totalPlanMinutes,
            usedPercent,
            limit: totalPlanMinutes,
            used: data.usage.totalMinutes,
          })
        }
      })
      .catch(() => {})
  }, [refreshTrigger])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  const refetchFresh = useCallback(() => fetchUsage(true), [fetchUsage])
  return { usage, refetchFresh }
}

/** When refreshTrigger changes (e.g. status becomes 'completed'), usage is refetched so remaining quota stays accurate. */
export default function UsageCounter({ refreshTrigger }: { refreshTrigger?: string | number }) {
  const { usage, refetchFresh } = useUsage(refreshTrigger)

  useEffect(() => {
    window.addEventListener('videotext:plan-updated', refetchFresh)
    return () => window.removeEventListener('videotext:plan-updated', refetchFresh)
  }, [refetchFresh])

  if (!usage) return null

  const { quotaType, remaining, totalPlanMinutes, usedPercent } = usage

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1.5 inline-flex items-center space-x-3">
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {quotaType === 'imports'
          ? remaining === 0
            ? "You've used all 3 imports. Upgrade to use the tool."
            : `${remaining} of 3 imports remaining`
          : `${remaining} min remaining this month`}
      </span>
      {totalPlanMinutes > 0 && (
        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-300"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      )}
    </div>
  )
}
