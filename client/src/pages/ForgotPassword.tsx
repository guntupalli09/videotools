import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../lib/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Forgot password?</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 text-center">
          Enter your account email and we’ll send you a link to reset your password.
        </p>
        {sent ? (
          <div className="mt-6 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              If an account exists with that email, we’ve sent a password reset link. Check your inbox (and spam).
            </p>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              <Link to="/login" className="text-violet-600 dark:text-violet-400 hover:underline">
                ← Back to log in
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="you@example.com"
              />
            </label>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-medium transition-colors"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="mt-6 text-center">
          <Link to="/login" className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
            ← Back to log in
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
