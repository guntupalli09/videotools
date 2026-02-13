import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, storeLoginResult } from '../lib/auth'
import { identifyUser } from '../lib/analytics'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(email, password)
      storeLoginResult(result)
      try {
        identifyUser(result.userId, { plan: result.plan, email: result.email })
      } catch {
        // non-blocking
      }
      navigate('/', { replace: true })
      window.location.reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Log in</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 text-center">
          Use the email and password you set after subscribing.
        </p>
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
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
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
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          Don’t have an account? After you subscribe on the{' '}
          <Link to="/pricing" className="text-violet-600 dark:text-violet-400 hover:underline">
            Pricing
          </Link>{' '}
          page, you can set a password to log in anytime.
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
