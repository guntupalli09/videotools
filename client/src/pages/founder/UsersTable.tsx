import { useState, useMemo } from 'react'
import type { DashboardUser } from '../../lib/founderDashboard'

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-zinc-700 text-zinc-300',
  basic: 'bg-blue-900 text-blue-300',
  pro: 'bg-violet-900 text-violet-300',
  agency: 'bg-amber-900 text-amber-300',
  founding_workflow: 'bg-emerald-900 text-emerald-300',
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

type SortKey = 'createdAt' | 'lastActiveAt' | 'totalJobs' | 'jobCount30d'

export default function UsersTable({ users }: { users: DashboardUser[] }) {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const plans = useMemo(() => {
    const seen = new Set<string>()
    users.forEach((u) => seen.add(u.plan))
    return Array.from(seen).sort()
  }, [users])

  const filtered = useMemo(() => {
    let list = users
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((u) => u.email.toLowerCase().includes(q) || (u.utmSource ?? '').toLowerCase().includes(q))
    }
    if (planFilter !== 'all') {
      list = list.filter((u) => u.plan === planFilter)
    }
    list = [...list].sort((a, b) => {
      let av: number | string
      let bv: number | string
      if (sortKey === 'createdAt') { av = a.createdAt; bv = b.createdAt }
      else if (sortKey === 'lastActiveAt') { av = a.lastActiveAt ?? ''; bv = b.lastActiveAt ?? '' }
      else if (sortKey === 'totalJobs') { av = a.totalJobs; bv = b.totalJobs }
      else { av = a.jobCount30d; bv = b.jobCount30d }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [users, search, planFilter, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-zinc-600 ml-1">↕</span>
    return <span className="text-violet-400 ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 p-4 border-b border-zinc-800">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or UTM source…"
          className="flex-1 min-w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="all">All plans</option>
          {plans.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span className="text-sm text-zinc-500 self-center">{filtered.length} users</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="sticky top-0 bg-zinc-900 z-10">
            <tr className="border-b border-zinc-800 text-left">
              <th className="py-3 px-4 text-zinc-400 font-medium">Email</th>
              <th className="py-3 px-4 text-zinc-400 font-medium">Plan</th>
              <th
                className="py-3 px-4 text-zinc-400 font-medium cursor-pointer hover:text-white select-none"
                onClick={() => toggleSort('jobCount30d')}
              >Jobs 30d<SortIcon k="jobCount30d" /></th>
              <th
                className="py-3 px-4 text-zinc-400 font-medium cursor-pointer hover:text-white select-none"
                onClick={() => toggleSort('totalJobs')}
              >Total jobs<SortIcon k="totalJobs" /></th>
              <th
                className="py-3 px-4 text-zinc-400 font-medium cursor-pointer hover:text-white select-none"
                onClick={() => toggleSort('lastActiveAt')}
              >Last active<SortIcon k="lastActiveAt" /></th>
              <th
                className="py-3 px-4 text-zinc-400 font-medium cursor-pointer hover:text-white select-none"
                onClick={() => toggleSort('createdAt')}
              >Signed up<SortIcon k="createdAt" /></th>
              <th className="py-3 px-4 text-zinc-400 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-600 text-sm">No users match.</td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors">
                <td className="py-2.5 px-4 text-white font-mono text-xs">{u.email}</td>
                <td className="py-2.5 px-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[u.plan] ?? 'bg-zinc-700 text-zinc-300'}`}>
                    {u.plan}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  <span className={u.jobCount30d > 0 ? 'text-violet-300 font-medium' : 'text-zinc-600'}>
                    {u.jobCount30d}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums text-zinc-300">{u.totalJobs}</td>
                <td className="py-2.5 px-4 text-zinc-400 text-xs">{timeAgo(u.lastActiveAt)}</td>
                <td className="py-2.5 px-4 text-zinc-500 text-xs">{fmtDate(u.createdAt)}</td>
                <td className="py-2.5 px-4 text-zinc-500 text-xs truncate max-w-[120px]">
                  {u.utmSource ?? (u.firstReferrer ? (() => { try { return new URL(u.firstReferrer!).hostname } catch { return u.firstReferrer } })() : '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
