import { useState } from 'react'
import {
  lookupSupportUser,
  impersonateUser,
  creditUser,
  extendBilling,
  setSupportPlan,
  restrictUser,
  revokeUserAccess,
  type SupportUser,
  type SupportJob,
} from '../../lib/founderDashboard'

const PLANS = ['free', 'basic', 'pro', 'agency', 'founding_workflow']

type JobFilter = 'all' | 'failed' | 'completed'

export default function SupportPanel() {
  const [email, setEmail] = useState('')
  const [user, setUser] = useState<SupportUser | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [jobFilter, setJobFilter] = useState<JobFilter>('all')
  const [selectedJob, setSelectedJob] = useState<SupportJob | null>(null)

  const [creditMinutes, setCreditMinutes] = useState(30)
  const [extendDays, setExtendDays] = useState(7)
  const [newPlan, setNewPlan] = useState('pro')
  const [restrictNote, setRestrictNote] = useState('')

  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const search = async () => {
    if (!email.trim()) return
    setSearching(true)
    setSearchError(null)
    setUser(null)
    setSelectedJob(null)
    setActionStatus(null)
    setActionError(null)
    try {
      const data = await lookupSupportUser(email.trim())
      if (!data) { setSearchError('User not found.'); return }
      setUser(data)
      setNewPlan(data.plan)
    } catch {
      setSearchError('Lookup failed.')
    } finally {
      setSearching(false)
    }
  }

  const refreshUser = async () => {
    if (!user) return
    const data = await lookupSupportUser(user.email)
    if (data) setUser(data)
  }

  const doAction = async (label: string, fn: () => Promise<void>) => {
    setActionStatus(null)
    setActionError(null)
    try {
      await fn()
      setActionStatus(`${label} — done.`)
      await refreshUser()
    } catch (e) {
      setActionError(`${label} failed: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  const handleImpersonate = async () => {
    if (!user) return
    setActionStatus(null)
    setActionError(null)
    try {
      const { token } = await impersonateUser(user.id)
      window.open(`${window.location.origin}/?impersonate=${encodeURIComponent(token)}`, '_blank', 'noopener')
      setActionStatus('Opened impersonation tab.')
    } catch (e) {
      setActionError(`Impersonate failed: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  const filteredJobs = (user?.jobs ?? []).filter((j) => {
    if (jobFilter === 'failed') return j.status === 'failed'
    if (jobFilter === 'completed') return j.status === 'completed'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="text-xs text-zinc-400 block mb-1">Look up user by email</label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="user@example.com"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={search}
            disabled={searching || !email.trim()}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors disabled:opacity-40"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {searchError && <p className="text-xs text-red-400 mt-1">{searchError}</p>}
      </div>

      {user && (
        <>
          {/* User card */}
          <div className={`rounded-xl border p-4 space-y-4 ${user.suspended ? 'border-red-800/60 bg-red-950/20' : 'border-zinc-700 bg-zinc-800/60'}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium">{user.email}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${planBadgeClass(user.plan)}`}>{user.plan}</span>
                  {user.suspended && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-red-700/60 text-red-400 bg-red-950/40">SUSPENDED</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{user.id}</p>
                {user.restrictionNote && (
                  <p className="text-xs text-amber-400 mt-1">Note: {user.restrictionNote}</p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {user.stripeCustomerId && (
                  <span className="text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded">Stripe customer</span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Stat label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
              <Stat label="Last active" value={user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'} />
              <Stat label="Total jobs" value={String(user.totalJobs)} />
              <Stat
                label="Failed jobs"
                value={String(user.failedJobCount)}
                danger={user.failedJobCount > 0}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Stat label="Minutes used" value={String(user.usageThisMonth.totalMinutes)} />
              <Stat label="Minutes limit" value={String(user.limits.minutesPerMonth)} />
              <Stat label="Imports (month)" value={String(user.usageThisMonth.importCount)} />
              <Stat label="Billing ends" value={user.billingPeriodEnd ? new Date(user.billingPeriodEnd).toLocaleDateString() : '—'} />
            </div>
          </div>

          {/* Job activity */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Job activity (last 100)</p>
              <div className="flex gap-1">
                {(['all', 'failed', 'completed'] as JobFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setJobFilter(f); setSelectedJob(null) }}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                      jobFilter === f
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-500 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {f === 'all' ? `All (${user.jobs.length})` : f === 'failed' ? `Failed (${user.failedJobCount})` : 'Completed'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              {filteredJobs.length === 0 ? (
                <p className="text-xs text-zinc-600 p-4">No jobs.</p>
              ) : (
                <div className="divide-y divide-zinc-800/60 max-h-72 overflow-y-auto">
                  {filteredJobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => setSelectedJob(selectedJob?.id === j.id ? null : j)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs text-left transition-colors hover:bg-zinc-800/60 ${
                        selectedJob?.id === j.id ? 'bg-zinc-800' : ''
                      }`}
                    >
                      <StatusDot status={j.status} />
                      <span className="text-zinc-300 w-36 shrink-0">{j.toolType}</span>
                      <span className={`w-20 shrink-0 font-medium ${j.status === 'failed' ? 'text-red-400' : j.status === 'completed' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {j.status}
                      </span>
                      <span className="text-zinc-600 flex-1 text-right">
                        {new Date(j.createdAt).toLocaleDateString()} {new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {j.failureReason && (
                        <span className="text-red-400/70 truncate max-w-[180px]" title={j.failureReason}>⚠ {j.failureReason}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Job detail panel */}
            {selectedJob && (
              <div className="mt-2 rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white uppercase tracking-wider">Job detail</p>
                  <button onClick={() => setSelectedJob(null)} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <Stat label="Job ID" value={selectedJob.id.slice(0, 12) + '…'} />
                  <Stat label="Tool" value={selectedJob.toolType} />
                  <Stat label="Status" value={selectedJob.status} danger={selectedJob.status === 'failed'} />
                  <Stat label="Plan at run" value={selectedJob.planAtRun ?? '—'} />
                  <Stat label="Duration" value={selectedJob.videoDurationSec != null ? `${selectedJob.videoDurationSec}s` : '—'} />
                  <Stat label="Processing" value={selectedJob.processingMs != null ? `${(selectedJob.processingMs / 1000).toFixed(1)}s` : '—'} />
                </div>
                {selectedJob.failureReason ? (
                  <div className="rounded-lg bg-red-950/40 border border-red-800/50 px-3 py-2.5">
                    <p className="text-xs text-red-400 font-semibold mb-1">Error reason</p>
                    <p className="text-xs text-red-300 font-mono break-all">{selectedJob.failureReason}</p>
                  </div>
                ) : (
                  selectedJob.status === 'failed' && (
                    <p className="text-xs text-zinc-600">No failure reason recorded.</p>
                  )
                )}
              </div>
            )}
          </div>

          {/* Actions grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Impersonate */}
            <ActionCard title="Impersonate" description="Open new tab logged in as this user">
              <button
                onClick={handleImpersonate}
                className="w-full mt-3 px-3 py-2 bg-amber-600/20 border border-amber-600/40 text-amber-300 hover:bg-amber-600/30 rounded-lg text-sm transition-colors"
              >
                Impersonate →
              </button>
            </ActionCard>

            {/* Credit minutes */}
            <ActionCard title="Credit minutes" description="Give back minutes (reduce usage)">
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="number"
                  min={1}
                  value={creditMinutes}
                  onChange={(e) => setCreditMinutes(+e.target.value)}
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
                <span className="text-xs text-zinc-500 flex-1">min</span>
                <button
                  onClick={() => doAction('Credit', () => creditUser(user.id, creditMinutes))}
                  className="px-3 py-1.5 bg-violet-600/20 border border-violet-600/40 text-violet-300 hover:bg-violet-600/30 rounded-lg text-sm transition-colors"
                >
                  Apply
                </button>
              </div>
            </ActionCard>

            {/* Extend billing */}
            <ActionCard title="Extend billing" description="Extend billing period + usage reset">
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="number"
                  min={1}
                  value={extendDays}
                  onChange={(e) => setExtendDays(+e.target.value)}
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
                <span className="text-xs text-zinc-500 flex-1">days</span>
                <button
                  onClick={() => doAction('Extend', () => extendBilling(user.id, extendDays))}
                  className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-600/30 rounded-lg text-sm transition-colors"
                >
                  Extend
                </button>
              </div>
            </ActionCard>

            {/* Override plan */}
            <ActionCard title="Override plan" description="Change plan without Stripe">
              <div className="flex items-center gap-2 mt-3">
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <button
                  onClick={() => doAction('Set plan', () => setSupportPlan(user.id, newPlan))}
                  className="px-3 py-1.5 bg-zinc-600/30 border border-zinc-600/50 text-zinc-300 hover:bg-zinc-600/50 rounded-lg text-sm transition-colors"
                >
                  Set
                </button>
              </div>
            </ActionCard>
          </div>

          {/* Abuse controls */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Access controls</p>

            <div className="flex items-start gap-3 flex-col">
              <label className="text-xs text-zinc-400">Restriction note (shown internally)</label>
              <input
                type="text"
                value={restrictNote}
                onChange={(e) => setRestrictNote(e.target.value)}
                placeholder="Reason for action…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {user.suspended ? (
                <button
                  onClick={() => doAction('Unsuspend', () => restrictUser(user.id, false, restrictNote || undefined))}
                  className="px-3 py-2.5 bg-emerald-600/20 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-600/30 rounded-lg text-sm font-medium transition-colors"
                >
                  ✓ Unsuspend
                </button>
              ) : (
                <button
                  onClick={() => doAction('Suspend', () => restrictUser(user.id, true, restrictNote || undefined))}
                  className="px-3 py-2.5 bg-amber-600/20 border border-amber-600/40 text-amber-300 hover:bg-amber-600/30 rounded-lg text-sm font-medium transition-colors"
                >
                  ⏸ Suspend
                </button>
              )}
              <button
                onClick={() => {
                  if (!confirm(`Revoke access for ${user.email}? This suspends them and downgrades to free.`)) return
                  doAction('Revoke', () => revokeUserAccess(user.id, restrictNote || undefined))
                }}
                className="px-3 py-2.5 bg-red-900/20 border border-red-800/50 text-red-400 hover:bg-red-900/40 rounded-lg text-sm font-medium transition-colors"
              >
                ✕ Revoke access
              </button>
              <button
                onClick={() => handleImpersonate()}
                className="px-3 py-2.5 bg-zinc-700/40 border border-zinc-700 text-zinc-300 hover:bg-zinc-700/70 rounded-lg text-sm font-medium transition-colors"
              >
                👁 View as user
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              Suspend: blocks uploads/processing, account still exists. Revoke: suspend + downgrade to free + clear subscription.
            </p>
          </div>

          {actionStatus && <p className="text-xs text-emerald-400">{actionStatus}</p>}
          {actionError && <p className="text-xs text-red-400">{actionError}</p>}
        </>
      )}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'failed' ? 'bg-red-500' : status === 'completed' ? 'bg-emerald-500' : status === 'processing' ? 'bg-blue-500' : 'bg-zinc-500'
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
}

function Stat({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-zinc-500">{label}</p>
      <p className={`font-medium tabular-nums ${danger && value !== '0' ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function ActionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      {children}
    </div>
  )
}

function planBadgeClass(plan: string) {
  const map: Record<string, string> = {
    free: 'border-zinc-600 text-zinc-400',
    basic: 'border-blue-600/50 text-blue-400',
    pro: 'border-violet-600/50 text-violet-400',
    agency: 'border-amber-600/50 text-amber-400',
    founding_workflow: 'border-emerald-600/50 text-emerald-400',
  }
  return map[plan] ?? 'border-zinc-600 text-zinc-400'
}
