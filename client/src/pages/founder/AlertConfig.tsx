import { useEffect, useState } from 'react'
import {
  fetchAlertConfig,
  saveAlertConfig,
  sendTestAlert,
  fetchAlertLog,
  type AlertConfig as AlertConfigType,
  type AlertLogEntry,
} from '../../lib/founderDashboard'

const DEFAULT_CONFIG: AlertConfigType = {
  enabled: { failureRate: true, workerStale: true, mrrDrop: false },
  thresholds: { failureRatePct: 5, workerStaleMinutes: 10, mrrDropPct: 20 },
  alertEmail: '',
  digestEnabled: false,
  digestHourUtc: 7,
}

export default function AlertConfig() {
  const [config, setConfig] = useState<AlertConfigType>(DEFAULT_CONFIG)
  const [log, setLog] = useState<AlertLogEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    fetchAlertConfig().then((data) => {
      if (data) setConfig(data.config)
      if (data?.log) setLog(data.log)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      await saveAlertConfig(config)
      setStatus('Saved.')
    } catch {
      setStatus('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async () => {
    setTesting(true)
    setStatus(null)
    try {
      await sendTestAlert(config.alertEmail)
      setStatus('Test email sent.')
    } catch {
      setStatus('Failed to send test.')
    } finally {
      setTesting(false)
    }
  }

  const refreshLog = () => {
    fetchAlertLog().then((data) => { if (data) setLog(data) })
  }

  return (
    <div className="space-y-6">
      {/* Email */}
      <div>
        <label className="text-xs text-zinc-400 block mb-1">Alert email address</label>
        <div className="flex gap-2">
          <input
            type="email"
            value={config.alertEmail}
            onChange={(e) => setConfig((c) => ({ ...c, alertEmail: e.target.value }))}
            placeholder="you@example.com"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={sendTest}
            disabled={testing || !config.alertEmail}
            className="px-3 py-2 text-xs border border-zinc-700 rounded-lg text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors disabled:opacity-40"
          >
            {testing ? 'Sending…' : 'Test'}
          </button>
        </div>
      </div>

      {/* Alert toggles */}
      <div className="space-y-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Alert triggers</p>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white">Failure rate spike</p>
            <p className="text-xs text-zinc-500">Email when job failure rate exceeds threshold</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={100}
              value={config.thresholds.failureRatePct}
              onChange={(e) => setConfig((c) => ({ ...c, thresholds: { ...c.thresholds, failureRatePct: +e.target.value } }))}
              className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-violet-500"
            />
            <span className="text-xs text-zinc-500">%</span>
            <Toggle
              checked={config.enabled.failureRate}
              onChange={(v) => setConfig((c) => ({ ...c, enabled: { ...c.enabled, failureRate: v } }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white">Worker stale</p>
            <p className="text-xs text-zinc-500">Email when worker heartbeat hasn't updated</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={120}
              value={config.thresholds.workerStaleMinutes}
              onChange={(e) => setConfig((c) => ({ ...c, thresholds: { ...c.thresholds, workerStaleMinutes: +e.target.value } }))}
              className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-violet-500"
            />
            <span className="text-xs text-zinc-500">min</span>
            <Toggle
              checked={config.enabled.workerStale}
              onChange={(v) => setConfig((c) => ({ ...c, enabled: { ...c.enabled, workerStale: v } }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white">MRR drop</p>
            <p className="text-xs text-zinc-500">Email when MRR drops by threshold vs prior day</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={100}
              value={config.thresholds.mrrDropPct}
              onChange={(e) => setConfig((c) => ({ ...c, thresholds: { ...c.thresholds, mrrDropPct: +e.target.value } }))}
              className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-violet-500"
            />
            <span className="text-xs text-zinc-500">%</span>
            <Toggle
              checked={config.enabled.mrrDrop}
              onChange={(v) => setConfig((c) => ({ ...c, enabled: { ...c.enabled, mrrDrop: v } }))}
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm text-white font-medium transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save config'}
        </button>
        {status && <span className="text-xs text-zinc-400">{status}</span>}
      </div>

      {/* Alert log */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Recent alerts</p>
          <button onClick={refreshLog} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Refresh</button>
        </div>
        {log.length === 0 ? (
          <p className="text-xs text-zinc-600">No alerts sent yet.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {log.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 text-xs py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-600 shrink-0 tabular-nums">
                  {new Date(entry.sentAt).toLocaleString()}
                </span>
                <span className="text-amber-400 shrink-0">{entry.type}</span>
                <span className="text-zinc-400 truncate">{entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-violet-600' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
