import { useEffect, useState } from 'react'
import { fetchServerHealth, type DashboardServerHealth } from '../../lib/founderDashboard'

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      <span className={`text-sm ${ok ? 'text-zinc-300' : 'text-red-400'}`}>{label}</span>
      <span className={`text-xs ml-auto ${ok ? 'text-emerald-500' : 'text-red-500'}`}>{ok ? 'OK' : 'DOWN'}</span>
    </div>
  )
}

function WorkerStatus({ status, ageMs }: { status: string; ageMs: number | null }) {
  const healthy = status === 'healthy'
  const stale = status === 'stale'
  const color = healthy ? 'text-emerald-400' : stale ? 'text-amber-400' : 'text-zinc-500'
  const dot = healthy ? 'bg-emerald-400 animate-pulse' : stale ? 'bg-amber-400' : 'bg-zinc-600'

  let ageLabel = 'unknown'
  if (ageMs != null) {
    if (ageMs < 60_000) ageLabel = `${Math.round(ageMs / 1000)}s ago`
    else if (ageMs < 3_600_000) ageLabel = `${Math.round(ageMs / 60_000)}m ago`
    else ageLabel = `${Math.round(ageMs / 3_600_000)}h ago`
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className={`text-sm ${color}`}>Worker</span>
      <span className={`text-xs ml-auto ${color}`}>{status === 'unknown' ? 'unknown' : ageLabel}</span>
    </div>
  )
}

function QueueStat({ label, value, warn = false, danger = false }: {
  label: string; value: number; warn?: boolean; danger?: boolean
}) {
  const color = danger && value > 0 ? 'text-red-400' : warn && value > 0 ? 'text-amber-400' : 'text-white'
  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-zinc-800/60">
      <span className={`text-xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-zinc-500 mt-0.5">{label}</span>
    </div>
  )
}

export default function ServerHealth() {
  const [health, setHealth] = useState<DashboardServerHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  async function check() {
    setLoading(true)
    const result = await fetchServerHealth()
    if (result) {
      setHealth(result)
      setError(false)
      setLastChecked(new Date())
    } else {
      setError(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Server health</h3>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-xs text-zinc-600">{lastChecked.toLocaleTimeString()}</span>
          )}
          <button
            onClick={check}
            disabled={loading}
            className="text-xs text-zinc-500 border border-zinc-700 rounded px-2 py-0.5 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-40"
          >
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && !health && (
        <p className="text-red-400 text-sm">Could not reach server.</p>
      )}

      {health && (
        <div className="space-y-5">
          {/* Infra status */}
          <div className="space-y-2">
            <StatusDot ok={health.dbOk} label="PostgreSQL" />
            <StatusDot ok={health.redisOk} label="Redis" />
            <WorkerStatus status={health.workerStatus} ageMs={health.workerLastHeartbeatAgeMs} />
          </div>

          {/* Queue depth */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Job queue</p>
            <div className="grid grid-cols-3 gap-2">
              <QueueStat label="Waiting" value={health.queueWaiting} warn />
              <QueueStat label="Active" value={health.queueActive} />
              <QueueStat label="Failed" value={health.queueFailed} danger />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <QueueStat label="Delayed" value={health.queueDelayed} />
              <QueueStat label="Completed" value={health.queueCompleted} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
