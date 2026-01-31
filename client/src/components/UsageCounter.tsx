import { useEffect, useState } from 'react'
import { getCurrentUsage } from '../lib/api'

export default function UsageCounter() {
  const [usage, setUsage] = useState<{
    remaining: number
    totalPlanMinutes: number
    usedPercent: number
  } | null>(null)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const data = await getCurrentUsage()
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
  }, [])

  if (!usage) return null

  const { remaining, totalPlanMinutes, usedPercent } = usage

  return (
    <div className="bg-gray-100 rounded-full px-4 py-1.5 inline-flex items-center space-x-3">
      <span className="text-sm text-gray-500">
        {remaining} min of {totalPlanMinutes} min (as per plan) remaining this
        month
      </span>
      {totalPlanMinutes > 0 && (
        <div className="w-24 bg-gray-200 rounded-full h-2">
          <div
            className="bg-violet-600 rounded-full h-2 transition-all"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      )}
    </div>
  )
}
