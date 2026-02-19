import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getFeedbackList, type FeedbackItem } from '../lib/api'

const FEEDBACK_VIEWER_KEY = 'feedbackViewerSecret'

export default function FeedbackView() {
  const [secret, setSecret] = useState(() =>
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(FEEDBACK_VIEWER_KEY) || '' : ''
  )
  const [inputSecret, setInputSecret] = useState('')
  const [list, setList] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!secret.trim()) return
    setLoading(true)
    setError(null)
    getFeedbackList(secret)
      .then(setList)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
        if (e instanceof Error && e.message.includes('Unauthorized')) {
          sessionStorage.removeItem(FEEDBACK_VIEWER_KEY)
          setSecret('')
        }
      })
      .finally(() => setLoading(false))
  }, [secret])

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    const v = inputSecret.trim()
    if (!v) return
    sessionStorage.setItem(FEEDBACK_VIEWER_KEY, v)
    setSecret(v)
    setInputSecret('')
  }

  function handleLock() {
    sessionStorage.removeItem(FEEDBACK_VIEWER_KEY)
    setSecret('')
    setList([])
    setError(null)
  }

  if (!secret) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="max-w-md mx-auto px-4 py-16">
          <h1 className="text-xl font-semibold mb-4">View feedback</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enter your viewer secret to see feedback submitted from the Tex panel.
          </p>
          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              value={inputSecret}
              onChange={(e) => setInputSecret(e.target.value)}
              placeholder="Viewer secret"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 text-sm"
            >
              Unlock
            </button>
          </form>
          <p className="mt-6 text-xs text-gray-500">
            <Link to="/" className="text-violet-600 hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-xl font-semibold">Feedback</h1>
          <button
            type="button"
            onClick={handleLock}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Lock
          </button>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            {error}
          </p>
        )}
        {!loading && !error && list.length === 0 && (
          <p className="text-sm text-gray-500">No feedback yet.</p>
        )}
        {!loading && list.length > 0 && (
          <ul className="space-y-4">
            {list.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  {item.toolId && (
                    <span className="rounded bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5">
                      {item.toolId}
                    </span>
                  )}
                  {item.planAtSubmit && (
                    <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5">
                      {item.planAtSubmit}
                    </span>
                  )}
                  {item.stars != null && (
                    <span>
                      {'⭐'.repeat(item.stars)}
                      {'☆'.repeat(5 - item.stars)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300 mb-2">
                  {item.userId && <span>User: {item.userId}</span>}
                  {item.userNameOrEmail && (
                    <span>Name/email: {item.userNameOrEmail}</span>
                  )}
                </div>
                {item.comment ? (
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {item.comment}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No comment</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-xs text-gray-500">
          <Link to="/" className="text-violet-600 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
