import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/api'

interface LogEntry {
  ts: string
  level: 'error' | 'warn' | 'info'
  service: 'api' | 'worker'
  msg: string
  jobId?: string
  requestId?: string
  module?: string
  extra?: string
}

const LEVEL_STYLES: Record<string, string> = {
  error: 'text-red-400 bg-red-950/30',
  warn: 'text-amber-400 bg-amber-950/20',
  info: 'text-zinc-400 bg-transparent',
}

const LEVEL_DOT: Record<string, string> = {
  error: 'bg-red-500',
  warn: 'bg-amber-500',
  info: 'bg-zinc-600',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function LogViewer() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = levelFilter === 'all' ? '/api/admin/logs?limit=300' : `/api/admin/logs?limit=300&level=${levelFilter}`
      const res = await api(url)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries ?? [])
        setLastFetched(new Date())
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [levelFilter])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 15s
  useEffect(() => {
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [load])

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const errorCount = entries.filter((e) => e.level === 'error').length
  const warnCount = entries.filter((e) => e.level === 'warn').length

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Server logs</h3>
          <span className="text-xs text-zinc-500">(last 300 entries, newest first)</span>
          {errorCount > 0 && (
            <span className="text-xs text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
          )}
          {warnCount > 0 && (
            <span className="text-xs text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full">{warnCount} warn{warnCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastFetched && <span className="text-xs text-zinc-600">{lastFetched.toLocaleTimeString()}</span>}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 focus:outline-none"
          >
            <option value="all">All levels</option>
            <option value="error">Errors only</option>
            <option value="warn">Warnings only</option>
            <option value="info">Info only</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs border border-zinc-700 rounded px-2 py-1 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-40"
          >
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="overflow-y-auto max-h-[520px] font-mono text-xs">
        {entries.length === 0 && (
          <div className="py-10 text-center text-zinc-600">
            {loading ? 'Loading…' : 'No log entries yet. Logs will appear here as the server processes jobs.'}
          </div>
        )}
        {entries.map((e, i) => (
          <div
            key={i}
            className={`border-b border-zinc-800/40 px-3 py-1.5 ${LEVEL_STYLES[e.level] ?? ''} cursor-pointer hover:bg-zinc-800/20`}
            onClick={() => e.extra ? toggleExpand(i) : undefined}
          >
            <div className="flex items-start gap-2 min-w-0">
              <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${LEVEL_DOT[e.level]}`} />
              <span className="shrink-0 text-zinc-600 tabular-nums w-[62px]">{timeAgo(e.ts)}</span>
              <span className={`shrink-0 w-12 ${e.service === 'worker' ? 'text-blue-500' : 'text-violet-500'}`}>{e.service}</span>
              <span className="break-all leading-relaxed">{e.msg}</span>
              {e.jobId && <span className="shrink-0 text-zinc-600 hidden sm:inline">· job:{e.jobId.slice(0, 8)}</span>}
              {e.extra && <span className="shrink-0 text-zinc-700 ml-auto">▼</span>}
            </div>
            {expanded.has(i) && e.extra && (
              <div className="mt-1 ml-[calc(0.375rem+0.5rem+62px+48px+0.5rem)] text-zinc-500 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                {e.extra}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
