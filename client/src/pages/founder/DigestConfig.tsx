import { useEffect, useState } from 'react'
import {
  fetchAlertConfig,
  saveAlertConfig,
  fetchDigestPreview,
  sendDigestNow,
  type DigestPreview,
} from '../../lib/founderDashboard'

export default function DigestConfig() {
  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestHourUtc, setDigestHourUtc] = useState(7)
  const [preview, setPreview] = useState<DigestPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    fetchAlertConfig().then((data) => {
      if (!data) return
      setDigestEnabled(data.config.digestEnabled)
      setDigestHourUtc(data.config.digestHourUtc)
    })
    loadPreview()
  }, [])

  const loadPreview = () => {
    setLoadingPreview(true)
    fetchDigestPreview()
      .then((data) => { if (data) setPreview(data) })
      .finally(() => setLoadingPreview(false))
  }

  const saveDigestConfig = async () => {
    setSaving(true)
    setStatus(null)
    try {
      // We need full config — fetch first, then merge digest settings
      const existing = await fetchAlertConfig()
      if (!existing) throw new Error('Could not load config')
      await saveAlertConfig({ ...existing.config, digestEnabled, digestHourUtc })
      setStatus('Saved.')
    } catch {
      setStatus('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const sendNow = async () => {
    setSending(true)
    setStatus(null)
    try {
      const result = await sendDigestNow()
      setStatus(result?.message ?? 'Digest sent.')
    } catch {
      setStatus('Failed to send digest.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Config */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Daily email digest</p>
            <p className="text-xs text-zinc-500">Receive a daily summary of key metrics</p>
          </div>
          <Toggle
            checked={digestEnabled}
            onChange={setDigestEnabled}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-zinc-400 w-32 shrink-0">Send hour (UTC)</label>
          <input
            type="number"
            min={0}
            max={23}
            value={digestHourUtc}
            onChange={(e) => setDigestHourUtc(+e.target.value)}
            className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-violet-500"
          />
          <span className="text-xs text-zinc-500">:00 UTC</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveDigestConfig}
            disabled={saving}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm text-white font-medium transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={sendNow}
            disabled={sending}
            className="px-4 py-2 border border-zinc-700 hover:border-zinc-500 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors disabled:opacity-40"
          >
            {sending ? 'Sending…' : 'Send now'}
          </button>
          {status && <span className="text-xs text-zinc-400">{status}</span>}
        </div>
      </div>

      {/* Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Yesterday's numbers (digest preview)</p>
          <button
            onClick={loadPreview}
            disabled={loadingPreview}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-40"
          >
            {loadingPreview ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {!preview ? (
          <p className="text-xs text-zinc-600">{loadingPreview ? 'Loading…' : 'No data.'}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <PreviewStat label="New users" value={String(preview.newUsers)} />
            <PreviewStat label="New paid" value={String(preview.newPaidUsers)} />
            <PreviewStat label="Churned" value={String(preview.churnedUsers)} danger={preview.churnedUsers > 0} />
            <PreviewStat label="Jobs completed" value={String(preview.jobsCompleted)} />
            <PreviewStat label="Jobs failed" value={String(preview.jobsFailed)} danger={preview.jobsFailed > 0} />
            <PreviewStat label="MRR" value={preview.mrrCents != null ? `$${(preview.mrrCents / 100).toFixed(0)}` : '—'} />
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewStat({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-0.5 ${danger && value !== '0' ? 'text-red-400' : 'text-white'}`}>{value}</p>
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
