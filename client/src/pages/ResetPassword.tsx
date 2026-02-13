import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../lib/auth'
import { toast } from 'react-hot-toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) setError('Invalid or missing reset link. Request a new one from the login page.')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
      toast.success('Password updated. You can now log in.')
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid reset link</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            This link is invalid or has expired. Request a new password reset from the login page.
          </p>
          <p className="mt-6">
            <Link to="/forgot-password" className="text-violet-600 dark:text-violet-400 hover:underline">
              Forgot password
            </Link>
          </p>
          <p className="mt-4">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              ← Back to log in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password updated</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Redirecting you to log in…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Set new password</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 text-center">
          Enter your new password below. Use at least 8 characters.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="••••••••"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="••••••••"
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
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
        <p className="mt-6 text-center">
          <Link to="/login" className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
            ← Back to log in
          </Link>
        </p>
      </div>
    </div>
  )
}
