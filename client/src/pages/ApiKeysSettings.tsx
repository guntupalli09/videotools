import { useEffect, useState, useCallback } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, Copy, Check, Trash2, Plus, X, Crown, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { isLoggedIn } from '../lib/auth'
import { isPaidPlan } from '../lib/plans'
import { getCurrentUsage } from '../lib/api'
import { listApiKeys, createApiKey, revokeApiKey, type ApiKeySummary, type ApiKeyClientType, type CreatedApiKey } from '../lib/apiKeys'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ApiKeysSettings() {
  const [planLoading, setPlanLoading] = useState(true)
  const [isPaid, setIsPaid] = useState(false)
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [clientType, setClientType] = useState<ApiKeyClientType>('zapier')
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null)
  const [copied, setCopied] = useState(false)

  const [revokeTarget, setRevokeTarget] = useState<ApiKeySummary | null>(null)
  const [revoking, setRevoking] = useState(false)

  const refreshKeys = useCallback(async () => {
    try {
      setListError(null)
      const data = await listApiKeys()
      setKeys(data)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load API keys')
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn()) return
    let cancelled = false
    ;(async () => {
      try {
        const usage = await getCurrentUsage()
        if (!cancelled) setIsPaid(isPaidPlan(usage.plan))
      } catch {
        // Leave isPaid false; the backend still enforces the real gate on every call.
      } finally {
        if (!cancelled) setPlanLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!planLoading && isPaid) {
      refreshKeys()
    }
  }, [planLoading, isPaid, refreshKeys])

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      const result = await createApiKey(name.trim(), clientType)
      setCreatedKey(result)
      setName('')
      await refreshKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy() {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey.key)
      setCopied(true)
      toast.success('API key copied')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy — select and copy the key manually')
    }
  }

  function closeCreatedKeyModal() {
    // Drop the raw secret from state entirely once the user is done — it is
    // never persisted anywhere on the client beyond this single view.
    setCreatedKey(null)
    setCreateOpen(false)
    setCopied(false)
  }

  async function handleRevoke() {
    if (!revokeTarget || revoking) return
    setRevoking(true)
    try {
      await revokeApiKey(revokeTarget.id)
      toast.success(`"${revokeTarget.name}" revoked`)
      setRevokeTarget(null)
      await refreshKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke API key')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-16 sm:py-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white">API Keys</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Use an API key to connect VideoText to Zapier or your own scripts. Keys authenticate as
          your account and can transcribe, generate subtitles, translate, fix, burn, and compress —
          the same operations as the web app.{' '}
          <Link to="/docs/api" className="text-blue-600 dark:text-blue-400 hover:underline">
            View API docs
          </Link>
          .
        </p>

        {planLoading ? (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : !isPaid ? (
          <div className="rounded-xl border border-blue-200/80 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/90 to-white dark:from-blue-950/30 dark:to-gray-900/60 p-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-600/15 flex items-center justify-center">
                <Crown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  API access
                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                    Pro
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  API keys and the Zapier integration are available on Pro plans. Upgrade to create a
                  key and automate transcription, subtitles, translation, and video workflows.
                </p>
                <Link to="/pricing" className="inline-flex mt-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  Upgrade to Pro →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> New API key
              </button>
            </div>

            {listError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
            ) : keys === null ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading keys…
              </div>
            ) : keys.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No API keys yet. Create one to connect Zapier or call the API directly.
              </div>
            ) : (
              <ul className="space-y-3">
                {keys.map((k) => {
                  const isRevoked = !!k.revokedAt
                  return (
                    <li
                      key={k.id}
                      className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
                        isRevoked
                          ? 'border-gray-200 dark:border-gray-800 bg-gray-100/60 dark:bg-gray-800/40 opacity-70'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{k.name}</p>
                          {k.clientType === 'zapier' && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                              Zapier
                            </span>
                          )}
                          {isRevoked && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                              Revoked
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-mono text-sm text-gray-500 dark:text-gray-400">{k.keyPrefix}••••••••</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                          Created {formatDate(k.createdAt)}
                          {' · '}
                          Last used {formatDate(k.lastUsedAt)}
                        </p>
                      </div>
                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => setRevokeTarget(k)}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Revoke
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Create key modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => !createdKey && closeCreatedKeyModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {createdKey ? 'API key created' : 'New API key'}
                </h2>
                <button
                  type="button"
                  onClick={closeCreatedKeyModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!createdKey ? (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label htmlFor="key-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                      id="key-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Zapier Production"
                      maxLength={100}
                      required
                      autoFocus
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['zapier', 'generic'] as ApiKeyClientType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setClientType(type)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            clientType === type
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {type === 'zapier' ? 'Zapier' : 'API'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 font-medium transition-colors"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create key
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 text-sm text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Copy this key now — for your security, VideoText cannot show it again. If you lose it,
                      revoke it and create a new one.
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Secret key</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 min-w-0 truncate rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white">
                        {createdKey.key}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-sm text-gray-600 dark:text-gray-400">
                    In Zapier, paste this key into the VideoText connection's <strong>API Key</strong> field.
                  </div>
                  <button
                    type="button"
                    onClick={closeCreatedKeyModal}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revoke confirmation modal */}
      <AnimatePresence>
        {revokeTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => !revoking && setRevokeTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-xl"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Revoke this API key?</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Applications using <strong>"{revokeTarget.name}"</strong> will immediately stop working. This
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRevokeTarget(null)}
                  disabled={revoking}
                  className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2.5 font-medium transition-colors"
                >
                  {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Revoke
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
