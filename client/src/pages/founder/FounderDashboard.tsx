import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { isLoggedIn } from '../../lib/auth'
import { fetchFounderDashboard, type DashboardData } from '../../lib/founderDashboard'
import { useFounderStatus } from '../../hooks/useFounderStatus'
import SnapshotCards from './SnapshotCards'
import RevenueChart from './RevenueChart'
import UsageSection from './UsageSection'
import PerformanceSection from './PerformanceSection'
import FeedbackTable from './FeedbackTable'

export default function FounderDashboard() {
  const { isFounder, loading: statusLoading } = useFounderStatus()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchStatus, setFetchStatus] = useState<'idle' | 401 | 403 | 'error'>('idle')

  useEffect(() => {
    if (!isLoggedIn()) return
    setLoading(true)
    setFetchStatus('idle')
    fetchFounderDashboard()
      .then((result) => {
        if (result.ok) {
          setData(result.data)
          setFetchStatus('idle')
        } else {
          setFetchStatus(result.status)
          setData(null)
        }
      })
      .catch(() => {
        setFetchStatus('error')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [])

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  if (statusLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-violet-600 font-medium">Loading…</p>
      </div>
    )
  }

  if (!isFounder) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <p className="text-gray-600 dark:text-gray-400">Unauthorized</p>
      </div>
    )
  }

  if (fetchStatus === 401) {
    return <Navigate to="/login" replace />
  }

  if (fetchStatus === 403) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <p className="text-gray-600 dark:text-gray-400">Unauthorized</p>
      </div>
    )
  }

  if (fetchStatus === 'error') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-red-600 dark:text-red-400 font-medium">Unable to load dashboard</p>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-violet-600 font-medium">Loading…</p>
      </div>
    )
  }

  const snapshot = data.snapshot ?? {}
  const revenue = data.revenue ?? { mrrTrend: [], newMrrTrend: [], churnedMrrTrend: [], churnRateTrend: [] }
  const usage = data.usage ?? { topUsersByJobCount: [], jobsByToolType: [] }
  const performance = data.performance ?? { avgProcessingMs: 0, p95ProcessingMs: 0, failureRate: 0 }
  const retention = data.retention ?? { activeUsersLast7Days: 0, activeUsersLast30Days: 0 }
  const feedback = data.feedback ?? []

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Founder Dashboard</h1>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Snapshot</h2>
        <SnapshotCards snapshot={snapshot} />
      </section>

      <section>
        <RevenueChart revenue={revenue} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Usage</h2>
        <UsageSection usage={usage} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Performance (30d)</h2>
        <PerformanceSection performance={performance} />
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Retention</h2>
          <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
            <span>7d active: {retention.activeUsersLast7Days}</span>
            <span>30d active: {retention.activeUsersLast30Days}</span>
          </div>
        </div>
      </section>

      <section>
        <FeedbackTable feedback={feedback} />
      </section>
    </div>
  )
}
