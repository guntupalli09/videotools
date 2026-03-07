import { useState } from 'react'
import {
  lookupSupportUser,
  impersonateUser,
  creditUser,
  extendBilling,
  setSupportPlan,
  type SupportUser,
} from '../../lib/founderDashboard'

const PLANS = ['free', 'basic', 'pro', 'agency', 'founding_workflow']

export default function SupportPanel() {
  const [email, setEmail] = useState('')
  const [user, setUser] = useState<SupportUser | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [creditMinutes, setCreditMinutes] = useState(30)
  const [extendDays, setExtendDays] = useState(7)
  const [newPlan, setNewPlan] = useState('pro')

  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const search = async () => {
    if (!email.trim()) return
    setSearching(true)
    setSearchError(null)
    setUser(null)
    setActionStatus(null)
    setActionError(null)
    try {
      const data = await lookupSupportUser(email.trim())
      if (!data) { setSearchError('User not found.'); return }
      setUser(data)
    } catch {
      setSearchError('Lookup failed.')
    } finally {
      setSearching(false)
    }
  }

  const doAction = async (label: string, fn: () => Promise<void>) => {
    setActionStatus(null)
    setActionError(null)
    try {
      await fn()
      setActionStatus(`${label} — done.`)
      // Refresh user data
      const refreshed = await lookupSupportUser(user!.email)
      if (refreshed) setUser(refreshed)
    } catch (e) {
      setActionError(`${label} failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  const handleImpersonate = async () => {
    if (!user) return
    setActionStatus(null)
    setActionError(null)
    try {
      const { token } = await impersonateUser(user.id)
      // Open new tab with the impersonation token
      const url = `${window.location.origin}/?impersonate=${encodeURIComponent(token)}`
      window.open(url, '_blank', 'noopener')
      setActionStatus('Opened impersonation tab.')
    } catch (e) {
      setActionError(`Impersonate failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

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
            {searching ? 'Looking up…' : 'Search'}
          </button>
        </div>
        {searchError && <p className="text-xs text-red-400 mt-1">{searchError}</p>}
      </div>

      {user && (
        <>
          {/* User card */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="text-white font-medium">{user.email}</p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{user.id}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${planBadgeClass(user.plan)}`}>{user.plan}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Stat label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
              <Stat label="Minutes used" value={String(user.usedMinutes)} />
              <Stat label="Minutes limit" value={String(user.minuteLimit)} />
              <Stat label="Billing ends" value={user.billingPeriodEnd ? new Date(user.billingPeriodEnd).toLocaleDateString() : '—'} />
            </div>
            {user.recentJobs.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-1.5">Recent jobs</p>
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {user.recentJobs.map((j) => (
                    <div key={j.id} className="flex items-center gap-2 text-xs py-1 border-b border-zinc-700/40">
                      <span className={`w-16 shrink-0 ${j.status === 'failed' ? 'text-red-400' : 'text-emerald-400'}`}>{j.status}</span>
                      <span className="text-zinc-400 truncate flex-1">{j.toolType}</span>
                      <span className="text-zinc-600 shrink-0">{new Date(j.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Impersonate */}
            <ActionCard title="Impersonate user" description="Opens a new tab logged in as this user">
              <button
                onClick={handleImpersonate}
                className="w-full mt-3 px-3 py-2 bg-amber-600/20 border border-amber-600/40 text-amber-300 hover:bg-amber-600/30 rounded-lg text-sm transition-colors"
              >
                Impersonate →
              </button>
            </ActionCard>

            {/* Credit minutes */}
            <ActionCard title="Credit minutes" description="Reduce totalMinutes (give back minutes)">
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="number"
                  min={1}
                  value={creditMinutes}
                  onChange={(e) => setCreditMinutes(+e.target.value)}
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
                <span className="text-xs text-zinc-500 flex-1">minutes</span>
                <button
                  onClick={() => doAction('Credit', () => creditUser(user.id, creditMinutes))}
                  className="px-3 py-1.5 bg-violet-600/20 border border-violet-600/40 text-violet-300 hover:bg-violet-600/30 rounded-lg text-sm transition-colors"
                >
                  Apply
                </button>
              </div>
            </ActionCard>

            {/* Extend billing */}
            <ActionCard title="Extend billing" description="Extend billingPeriodEnd and usage resetDate">
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

            {/* Set plan */}
            <ActionCard title="Override plan" description="Force a specific plan (no Stripe change)">
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

          {actionStatus && <p className="text-xs text-emerald-400">{actionStatus}</p>}
          {actionError && <p className="text-xs text-red-400">{actionError}</p>}
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-500">{label}</p>
      <p className="text-white font-medium tabular-nums">{value}</p>
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
