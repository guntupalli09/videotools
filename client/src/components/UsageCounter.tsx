import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUsage } from '../lib/api'
import { isDemo } from '../lib/auth'
import { trackEvent } from '../lib/analytics'
import { Zap } from 'lucide-react'

function useUsage(refreshTrigger?: string | number) {
  const [usage, setUsage] = useState<{
    quotaType: 'imports' | 'minutes' | 'unlimited'
    softCapActive?: boolean
    remaining: number
    dailyRemaining: number
    bonusImportCredits: number
    totalPlanMinutes: number
    usedPercent: number
    limit: number
    used: number
    resetDate?: string
  } | null>(null)

  const fetchUsage = useCallback((skipCache = false) => {
    getCurrentUsage({ skipCache: skipCache || refreshTrigger === 'completed' })
      .then((data) => {
        const quotaType = data.quotaType === 'imports' ? 'imports' : data.quotaType === 'unlimited' ? 'unlimited' : 'minutes'
        if (quotaType === 'unlimited') {
          setUsage({
            quotaType: 'unlimited',
            softCapActive: data.softCapActive ?? false,
            remaining: 0,
            dailyRemaining: 0,
            bonusImportCredits: 0,
            totalPlanMinutes: 0,
            usedPercent: 0,
            limit: 0,
            used: 0,
          })
        } else if (quotaType === 'imports') {
          const used = data.used ?? data.usage?.importCountToday ?? data.usage?.importCount ?? 0
          const limit = data.limit ?? 3
          const dailyRemaining = data.dailyRemaining ?? Math.max(0, limit - used)
          const bonusImportCredits = data.bonusImportCredits ?? 0
          const remaining = Math.max(0, data.remaining ?? dailyRemaining + bonusImportCredits)
          const usedPercent = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
          setUsage({
            quotaType,
            remaining,
            dailyRemaining,
            bonusImportCredits,
            totalPlanMinutes: limit,
            usedPercent,
            limit,
            used,
            resetDate: data.resetDate,
          })
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
            dailyRemaining: 0,
            bonusImportCredits: 0,
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

/**
 * Usage bar for the tool page header.
 * - Free: shows "X of 3 daily imports used" with progress dots and View plans CTA.
 * - Pro (not degraded): returns null (no bar).
 * - Pro (soft cap active): shows quiet inline upgrade banner.
 * - Business: returns null.
 * - Grandfathered (minutes): shows compact minutes bar.
 */
export default function UsageCounter({ refreshTrigger }: { refreshTrigger?: string | number }) {
  const { usage, refetchFresh } = useUsage(refreshTrigger)
  const [softCapDismissed, setSoftCapDismissed] = useState(
    () => sessionStorage.getItem('softCapDismissed') === '1'
  )

  useEffect(() => {
    window.addEventListener('videotext:plan-updated', refetchFresh)
    return () => window.removeEventListener('videotext:plan-updated', refetchFresh)
  }, [refetchFresh])

  useEffect(() => {
    if (usage?.quotaType === 'unlimited' && usage.softCapActive && !softCapDismissed) {
      trackEvent('soft_cap_shown')
    }
  }, [usage?.quotaType, usage?.softCapActive, softCapDismissed])

  useEffect(() => {
    if (usage?.quotaType === 'imports' && usage.remaining === 0) {
      trackEvent('daily_cap_hit')
    }
  }, [usage?.quotaType, usage?.remaining])

  if (!usage || isDemo()) return null

  const { quotaType, remaining, dailyRemaining, bonusImportCredits, used, limit, usedPercent } = usage

  // Pro/Business without a daily import cap — no bar unless degraded
  if (quotaType === 'unlimited') {
    if (!usage.softCapActive || softCapDismissed) return null
    return (
      <div className="rounded-xl px-4 py-2.5 flex items-center gap-3 border bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20">
        <span className="text-sm text-amber-700 dark:text-amber-400 flex-1">
          You're processing at high volume today. Business gives consistently faster processing.
        </span>
        <Link
          to="/pricing"
          className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline whitespace-nowrap"
        >
          Learn more →
        </Link>
        <button
          type="button"
          onClick={() => { sessionStorage.setItem('softCapDismissed', '1'); setSoftCapDismissed(true) }}
          className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 text-xs ml-1"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    )
  }

  // Grandfathered minutes quota — compact display
  if (quotaType === 'minutes') {
    const isLow = usedPercent >= 80
    return (
      <div className={`rounded-xl px-4 py-2.5 flex items-center gap-3 border transition-colors ${
        isLow
          ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
          : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <span className={`text-sm font-medium ${isLow ? 'text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>
          {remaining} min remaining
        </span>
        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 flex-shrink-0">
          <div
            className={`rounded-full h-1.5 transition-all duration-500 ${isLow ? 'bg-amber-500' : 'bg-blue-600'}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        {isLow && (
          <Link
            to="/pricing"
            className="ml-auto text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline whitespace-nowrap"
          >
            Upgrade →
          </Link>
        )}
      </div>
    )
  }

  // Free tier — daily imports bar
  const dailyExhausted = dailyRemaining === 0
  const totalExhausted = remaining === 0
  const filledDots = Math.min(used, limit)
  const resetLabel = usage.resetDate
    ? new Date(usage.resetDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : 'midnight'

  const statusLine = totalExhausted
    ? `All imports used — daily resets at ${resetLabel}`
    : dailyExhausted && bonusImportCredits > 0
      ? `Daily imports used — ${bonusImportCredits} bonus upload${bonusImportCredits === 1 ? '' : 's'} left`
      : `${used} of ${limit} daily imports used`

  return (
    <div className={`rounded-xl border transition-colors overflow-hidden ${
      totalExhausted
        ? 'bg-red-50 dark:bg-red-500/[0.08] border-red-200 dark:border-red-500/20'
        : 'bg-gray-900 dark:bg-gray-900 border-gray-700 dark:border-gray-700'
    }`}>
      <div className="px-4 pt-3.5 pb-2">
        <div className="flex items-center justify-between mb-2.5">
          <p className={`text-sm font-semibold ${
            totalExhausted ? 'text-red-700 dark:text-red-400' : 'text-gray-300'
          }`}>
            {statusLine}
          </p>
          <div className="flex gap-1.5">
            {Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i < filledDots
                    ? totalExhausted ? 'bg-red-400' : 'bg-blue-600'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              totalExhausted ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'
            }`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>

        {bonusImportCredits > 0 && (
          <p className="text-xs text-emerald-400/90 mt-2">
            + {bonusImportCredits} referral bonus upload{bonusImportCredits === 1 ? '' : 's'} (used after daily imports)
          </p>
        )}
      </div>

      <Link
        to="/pricing"
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-600 transition-colors group"
      >
        <Zap className="w-3.5 h-3.5 text-white" />
        <span className="text-sm font-bold text-white tracking-wide uppercase">
          View plans
        </span>
      </Link>
    </div>
  )
}
