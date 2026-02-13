import { useEffect, useState } from 'react'
import { getCurrentUsage } from '../lib/api'

/** When refreshTrigger changes (e.g. status becomes 'completed'), usage is refetched so remaining minutes stay accurate. */
export default function UsageCounter({ refreshTrigger }: { refreshTrigger?: string | number }) {
  const [usage, setUsage] = useState<{
    remaining: number
    totalPlanMinutes: number
    usedPercent: number
  } | null>(null)

  useEffect(() => {
    async function fetchUsage() {
      try {
        // After a job completes, skip cache so balance updates immediately
        const data = await getCurrentUsage({ skipCache: refreshTrigger === 'completed' })
        const totalPlanMinutes =
          data.limits.minutesPerMonth + data.overages.minutes
        const remaining = data.usage.remaining
        const usedPercent =
          totalPlanMinutes === 0
            ? 0
            : Math.min(
                100,
                Math.round(
                  (data.usage.totalMinutes / totalPlanMinutes) * 100
                )
              )
        setUsage({
          remaining,
          totalPlanMinutes,
          usedPercent,
        })
      } catch {
        // Silent failure – usage display is non-critical
      }
    }

    fetchUsage()
  }, [refreshTrigger])

  if (!usage) return null

  const { remaining, totalPlanMinutes, usedPercent } = usage

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1.5 inline-flex items-center space-x-3">
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {remaining} min remaining this month
      </span>
      {totalPlanMinutes > 0 && (
        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-violet-600 rounded-full h-2 transition-all"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      )}
    </div>
  )
}
