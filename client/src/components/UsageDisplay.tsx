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

export default function UsageDisplay() {
  const [data, setData] = useState<UsageInfo | null>(null)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const usage = await getCurrentUsage()
        setData(usage)
      } catch {
        // Silent failure – usage display is non-critical
      }
    }

    fetchUsage()
  }, [])

  if (!data) return null

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
    <div className="mt-4 flex flex-col space-y-1 text-xs text-gray-700">
      <div className="inline-flex items-center space-x-3 rounded-lg bg-violet-50 px-3 py-2">
        <span className="font-semibold uppercase tracking-wide text-violet-700">
          Plan: {data.plan.toUpperCase()}
        </span>
        <span>
          {data.usage.totalMinutes}/{totalAvailableMinutes} min used
        </span>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-1 rounded-full bg-violet-600"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <span className="text-gray-500">
          Resets {new Date(data.resetDate).toLocaleDateString()}
        </span>
      </div>
      {showWarning && (
        <div className="rounded-md bg-amber-50 px-3 py-1 text-[11px] text-amber-800">
          You&apos;ve used over 80% of your available minutes for this billing cycle.
          New jobs may be blocked soon unless you upgrade or buy overage minutes.
        </div>
      )}
    </div>
  )
}

