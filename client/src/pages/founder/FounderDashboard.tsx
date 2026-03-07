import { useEffect, useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { isLoggedIn } from '../../lib/auth'
import { fetchFounderDashboard, type DashboardData } from '../../lib/founderDashboard'
import { useFounderStatus } from '../../hooks/useFounderStatus'
import DailyTrendCharts from './DailyTrendCharts'
import PlanDistribution from './PlanDistribution'
import UsersTable from './UsersTable'
import RecentJobsFeed from './RecentJobsFeed'
import FeedbackTable from './FeedbackTable'
import RevenueDetails from './RevenueDetails'
import AcquisitionBreakdown from './AcquisitionBreakdown'
import FeedbackAnalytics from './FeedbackAnalytics'
import ServerHealth from './ServerHealth'
import FailureBreakdown from './FailureBreakdown'
import AlertConfig from './AlertConfig'
import SupportPanel from './SupportPanel'
import DigestConfig from './DigestConfig'

const PLAN_COLORS: Record<string, string> = {
  free: 'text-zinc-400',
  basic: 'text-blue-400',
  pro: 'text-violet-400',
  agency: 'text-amber-400',
  founding_workflow: 'text-emerald-400',
}

const TOOL_COLORS_BAR: Record<string, string> = {
  'video-to-transcript': '#7c3aed',
  'video-to-subtitles': '#2563eb',
  'translate-subtitles': '#db2777',
  'fix-subtitles': '#059669',
  'burn-subtitles': '#d97706',
  'compress-video': '#0891b2',
  'batch-process': '#6366f1',
}

function KpiCard({ label, value, sub, accent = false, danger = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean; danger?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${
      danger ? 'border-red-900/50 bg-red-950/20' :
      accent ? 'border-violet-700/50 bg-violet-950/30' :
      'border-zinc-800 bg-zinc-900'
    }`}>
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${danger ? 'text-red-400' : accent ? 'text-violet-300' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
}

export default function FounderDashboard() {
  const { isFounder, loading: statusLoading } = useFounderStatus()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchStatus, setFetchStatus] = useState<'idle' | 401 | 403 | 'error'>('idle')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const load = useCallback(() => {
    if (!isLoggedIn()) return
    setLoading(true)
    fetchFounderDashboard()
      .then((result) => {
        if (result.ok) {
          setData(result.data)
          setFetchStatus('idle')
          setLastRefreshed(new Date())
        } else {
          setFetchStatus(result.status)
          setData(null)
        }
      })
      .catch(() => setFetchStatus('error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (!isLoggedIn()) return <Navigate to="/login" replace />
  if (statusLoading) return <Spinner />
  if (!isFounder) return <Denied />
  if (fetchStatus === 401) return <Navigate to="/login" replace />
  if (fetchStatus === 403) return <Denied />
  if (fetchStatus === 'error') return (
    <div className="flex min-h-[40vh] items-center justify-center flex-col gap-4">
      <p className="text-red-400 font-medium">Failed to load dashboard</p>
      <button onClick={load} className="text-sm text-zinc-400 border border-zinc-700 rounded-lg px-4 py-2 hover:border-zinc-500 transition-colors">
        Retry
      </button>
    </div>
  )
  if (loading || !data) return <Spinner />

  const snapshot = data.snapshot ?? {}
  const mrr = snapshot.mrrCents != null ? `$${(snapshot.mrrCents / 100).toFixed(0)}` : '—'
  const arpu = snapshot.arpuCents != null ? `$${(snapshot.arpuCents / 100).toFixed(2)}` : '—'
  const failPct = data.performance?.failureRate != null ? `${(data.performance.failureRate * 100).toFixed(1)}%` : '—'
  const avgSec = data.performance?.avgProcessingMs != null ? `${(data.performance.avgProcessingMs / 1000).toFixed(1)}s` : '—'
  const p95Sec = data.performance?.p95ProcessingMs != null ? `${(data.performance.p95ProcessingMs / 1000).toFixed(1)}s` : '—'
  const topToolEntry = (data.usage?.jobsByToolType ?? []).sort((a, b) => b.count - a.count)[0]
  const failureRateNum = data.performance?.failureRate ?? 0

  const totalFeedbackCount = (data.starDistribution ?? []).reduce((s, d) => s + d.count, 0)
  const weightedStars = (data.starDistribution ?? []).reduce((s, d) => s + d.stars * d.count, 0)
  const avgRating = totalFeedbackCount > 0 ? (weightedStars / totalFeedbackCount).toFixed(1) : '—'

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Command Centre</h1>
            <p className="text-xs text-zinc-600 mt-0.5">VideoText.io · Founder view</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-zinc-600">Updated {lastRefreshed.toLocaleTimeString()}</span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="text-xs border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors disabled:opacity-40"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <section>
          <SectionTitle id="kpis">Snapshot</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="MRR" value={mrr} sub="live from Stripe" accent />
            <KpiCard label="ARPU" value={arpu} sub="per paid user" />
            <KpiCard label="Total users" value={snapshot.totalUsers ?? '—'} />
            <KpiCard label="Active today" value={snapshot.activeUsers ?? '—'} />
            <KpiCard label="7d active" value={data.retention?.activeUsersLast7Days ?? '—'} />
            <KpiCard label="30d active" value={data.retention?.activeUsersLast30Days ?? '—'} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
            <KpiCard label="Jobs today" value={snapshot.jobsCompleted ?? '—'} sub="completed" />
            <KpiCard label="New users today" value={snapshot.newUsers ?? '—'} />
            <KpiCard label="New paid today" value={snapshot.newPaidUsers ?? '—'} />
            <KpiCard label="Churned today" value={snapshot.churnedUsers ?? '—'} danger={(snapshot.churnedUsers ?? 0) > 0} />
            <KpiCard label="Failure rate" value={failPct} sub="30d" danger={failureRateNum > 0.05} />
            <KpiCard label="Avg rating" value={avgRating !== '—' ? `${avgRating} ★` : '—'} sub={`${totalFeedbackCount} ratings`} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <KpiCard label="Avg processing" value={avgSec} sub="30d completed" />
            <KpiCard label="P95 processing" value={p95Sec} sub="30d completed" />
            <KpiCard label="Top tool" value={topToolEntry?.toolType ?? '—'} sub={topToolEntry ? `${topToolEntry.count} jobs (30d)` : ''} />
          </div>
        </section>

        {/* Daily trends */}
        <section>
          <SectionTitle id="trends">Trends (30d)</SectionTitle>
          <DailyTrendCharts daily={data.daily ?? []} />
        </section>

        {/* Server health */}
        <section>
          <SectionTitle id="server">Server health</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ServerHealth />
            <FailureBreakdown failureReasons={data.failureReasons ?? []} />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Jobs by tool (30d)</h3>
              <JobsByTool data={data.usage?.jobsByToolType ?? []} />
            </div>
          </div>
        </section>

        {/* Revenue */}
        <section>
          <SectionTitle id="revenue">Revenue</SectionTitle>
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h3 className="text-sm font-semibold text-white mb-1">MRR trend</h3>
                <p className="text-xs text-zinc-500 mb-4">Last 12 months</p>
                <MrrLineChart data={data.revenue?.mrrTrend ?? []} />
              </div>
              <PlanDistribution planDistribution={data.planDistribution ?? []} />
            </div>
            <RevenueDetails revenue={data.revenue} snapshot={snapshot} />
          </div>
        </section>

        {/* Acquisition */}
        <section>
          <SectionTitle id="acquisition">Acquisition</SectionTitle>
          <AcquisitionBreakdown utmBreakdown={data.utmBreakdown ?? []} />
        </section>

        {/* Users */}
        <section>
          <SectionTitle id="users">All users ({data.users?.length ?? 0})</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <TopUsersByJobs users={data.usage?.topUsersByJobCount ?? []} />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">New vs churned (14d)</h3>
              <NewVsChurnedDaily daily={data.daily ?? []} />
            </div>
          </div>
          <UsersTable users={data.users ?? []} />
        </section>

        {/* Jobs */}
        <section>
          <SectionTitle id="jobs">Recent jobs</SectionTitle>
          <RecentJobsFeed jobs={data.recentJobs ?? []} />
        </section>

        {/* Feedback */}
        <section>
          <SectionTitle id="feedback">Feedback</SectionTitle>
          <div className="space-y-4">
            <FeedbackAnalytics
              feedback={data.feedback ?? []}
              feedbackByTool={data.feedbackByTool ?? []}
              starDistribution={data.starDistribution ?? []}
            />
            <FeedbackTable feedback={data.feedback ?? []} />
          </div>
        </section>

        {/* Alerts */}
        <section>
          <SectionTitle id="alerts">Alerts</SectionTitle>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <AlertConfig />
          </div>
        </section>

        {/* Daily digest */}
        <section>
          <SectionTitle id="digest">Daily digest</SectionTitle>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <DigestConfig />
          </div>
        </section>

        {/* Support */}
        <section>
          <SectionTitle id="support">Support</SectionTitle>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <SupportPanel />
          </div>
        </section>

      </div>
    </div>
  )
}

// ── Inline helpers ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-violet-500 font-medium text-sm animate-pulse">Loading…</p>
    </div>
  )
}

function Denied() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-zinc-500 text-sm">Unauthorized</p>
    </div>
  )
}

function MrrLineChart({ data }: { data: { monthStart: string; mrrCents: number }[] }) {
  if (data.length === 0) return <p className="text-zinc-600 text-sm">No data yet.</p>
  const W = 500; const H = 160
  const PL = 48; const PR = 12; const PT = 8; const PB = 28
  const innerW = W - PL - PR; const innerH = H - PT - PB
  const values = data.map((d) => d.mrrCents)
  const min = Math.min(...values, 0); const max = Math.max(...values, 1); const range = max - min || 1
  const sorted = [...data].reverse()
  const toX = (i: number) => PL + (i / Math.max(sorted.length - 1, 1)) * innerW
  const toY = (v: number) => PT + innerH - ((v - min) / range) * innerH
  const pts = sorted.map((d, i) => `${toX(i).toFixed(1)},${toY(d.mrrCents).toFixed(1)}`).join(' L ')
  const pathD = `M ${pts}`
  const areaD = `M ${toX(0)},${PT + innerH} L ${pts} L ${toX(sorted.length - 1)},${PT + innerH} Z`
  const yTicks = [min, (min + max) / 2, max]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="mrr-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={PL - 4} y={toY(v) + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.35)">${(v / 100).toFixed(0)}</text>
        </g>
      ))}
      <path d={areaD} fill="url(#mrr-grad)" />
      <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {sorted.map((d, i) => (
        <g key={d.monthStart}>
          <circle cx={toX(i)} cy={toY(d.mrrCents)} r="3" fill="#7c3aed" />
          {(i === 0 || i === sorted.length - 1 || i === Math.floor(sorted.length / 2)) && (
            <text x={toX(i)} y={H - 8} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)">
              {new Date(d.monthStart).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function JobsByTool({ data }: { data: { toolType: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  if (data.length === 0) return <p className="text-zinc-600 text-sm">No data.</p>
  return (
    <div className="space-y-3">
      {[...data].sort((a, b) => b.count - a.count).map((j) => (
        <div key={j.toolType}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-300">{j.toolType}</span>
            <span className="text-zinc-500 tabular-nums">{j.count}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(j.count / max) * 100}%`, backgroundColor: TOOL_COLORS_BAR[j.toolType] ?? '#7c3aed' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TopUsersByJobs({ users }: { users: { userId: string; email: string; plan: string; jobCount: number }[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Most active users (30d)</h3>
      {users.length === 0 ? (
        <p className="text-zinc-600 text-sm">No data.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
          {users.map((u, i) => (
            <div key={u.userId} className="flex items-center gap-3 py-1.5 border-b border-zinc-800/40">
              <span className="text-xs text-zinc-600 w-4 text-right tabular-nums">{i + 1}</span>
              <span className="flex-1 text-xs font-mono text-zinc-300 truncate">{u.email || u.userId}</span>
              <span className={`text-xs ${PLAN_COLORS[u.plan] ?? 'text-zinc-500'}`}>{u.plan}</span>
              <span className="text-xs text-white font-semibold tabular-nums w-10 text-right">{u.jobCount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NewVsChurnedDaily({ daily }: { daily: { date: string; newUsers: number; churnedUsers: number }[] }) {
  if (daily.length === 0) return <p className="text-zinc-600 text-sm">No data.</p>
  const last14 = daily.slice(-14)
  const maxVal = Math.max(...last14.map((d) => Math.max(d.newUsers, d.churnedUsers ?? 0)), 1)
  return (
    <div className="space-y-1.5">
      {last14.map((d) => {
        const newW = (d.newUsers / maxVal) * 100
        const churnW = ((d.churnedUsers ?? 0) / maxVal) * 100
        const label = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <div key={d.date} className="flex items-center gap-2 text-xs">
            <span className="text-zinc-600 w-12 text-right shrink-0">{label}</span>
            <div className="flex-1 flex flex-col gap-0.5">
              {d.newUsers > 0 && <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${newW}%` }} />}
              {(d.churnedUsers ?? 0) > 0 && <div className="h-1.5 rounded-full bg-red-600" style={{ width: `${churnW}%` }} />}
              {d.newUsers === 0 && (d.churnedUsers ?? 0) === 0 && <div className="h-1.5 rounded-full bg-zinc-800 w-full" />}
            </div>
            <span className="text-emerald-500 tabular-nums w-5 text-right">{d.newUsers > 0 ? `+${d.newUsers}` : ''}</span>
          </div>
        )
      })}
      <div className="flex gap-4 pt-1 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />New</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block" />Churned</span>
      </div>
    </div>
  )
}
