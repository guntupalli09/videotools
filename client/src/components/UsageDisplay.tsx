import { useEffect, useState } from 'react'
import { getCurrentUsage } from '../lib/api'

interface UsageInfo {
  plan: string
  limits: {
    minutesPerMonth: number
    maxLanguages: number
    batchEnabled: boolean
  }
  usage: {
    totalMinutes: number
    remaining: number
    videoCount: number
    batchCount: number
  }
  overages: {
    minutes: number
    charge: number
  }
  resetDate: string
}

/** When refreshTrigger changes (e.g. status becomes 'completed'), usage is refetched so remaining minutes stay accurate. */
export default function UsageDisplay({ refreshTrigger }: { refreshTrigger?: string | number }) {
  const [data, setData] = useState<UsageInfo | null>(null)

  useEffect(() => {
    async function fetchUsage(skipCache = false) {
      try {
        const usage = await getCurrentUsage({ skipCache: skipCache || refreshTrigger === 'completed' })
        setData(usage)
      } catch {
        // Silent failure – usage display is non-critical
      }
    }

    fetchUsage()
  }, [refreshTrigger])

  useEffect(() => {
    const onPlanUpdated = () => {
      getCurrentUsage({ skipCache: true })
        .then(setData)
        .catch(() => {})
    }
    window.addEventListener('videotext:plan-updated', onPlanUpdated)
    return () => window.removeEventListener('videotext:plan-updated', onPlanUpdated)
  }, [])

  if (!data) return null

  const plan = (data.plan || 'free').toLowerCase()
  const isFree = plan === 'free'

  // Free plan: no separate block (PlanBadge + UsageCounter already show plan and minutes); no "Resets" for free.
  if (isFree) return null

  const totalAvailableMinutes = data.limits.minutesPerMonth + data.overages.minutes
  const usedPercent =
    totalAvailableMinutes === 0
      ? 0
      : Math.min(
          100,
          Math.round((data.usage.totalMinutes / totalAvailableMinutes) * 100)
        )
  const showWarning = usedPercent >= 80 && usedPercent < 100

  return (
    <div className="mt-4 flex flex-col space-y-1 text-xs text-gray-700 dark:text-gray-300">
      <div className="inline-flex items-center space-x-3 rounded-lg bg-violet-50 dark:bg-violet-900/30 px-3 py-2">
        <span className="font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          Plan: {data.plan.toUpperCase()}
        </span>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-800">
          <div
            className="h-1 rounded-full bg-violet-600 transition-all"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <span className="text-gray-500 dark:text-gray-400">
          Resets {new Date(data.resetDate).toLocaleDateString()}
        </span>
      </div>
      {showWarning && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/30 px-3 py-1 text-[11px] text-amber-800 dark:text-amber-200">
          You&apos;ve used over 80% of your available minutes for this billing cycle.
          New jobs may be blocked soon unless you upgrade or buy overage minutes.
        </div>
      )}
    </div>
  )
}

