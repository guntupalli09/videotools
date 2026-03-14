import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login, storeLoginResult } from '../lib/auth'
import { identifyUser } from '../lib/analytics'
import { motion } from 'framer-motion'
import { FileText, Youtube, Zap, ChevronRight } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Support ?returnTo=/video-to-transcript or ?guestJob=1 params
  const params = new URLSearchParams(location.search)
  const returnTo = params.get('returnTo') || '/'
  const fromGuestJob = params.get('guestJob') === '1'

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
      navigate(returnTo, { replace: true })
      window.location.reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      {/* Left panel — context / social proof (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] bg-gradient-to-br from-purple-700 via-violet-700 to-indigo-800 flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-white/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <img src="/logo.svg" alt="VideoText" width={28} height={28} className="w-7 h-7" />
          <span className="font-bold text-white text-lg">VideoText</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Welcome back.
              <span className="block text-white/60 text-2xl xl:text-3xl mt-1">Your transcripts are waiting.</span>
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed">
              Log in to access your transcripts, manage your plan, and continue where you left off.
            </p>
          </div>

          {/* Mini feature bullets */}
          <div className="space-y-3">
            {[
              { icon: Zap, text: '6–8x faster than Descript or Otter.ai' },
              { icon: FileText, text: 'Accurate transcripts in minutes' },
              { icon: Youtube, text: 'YouTube URL → transcript in one click' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white/80" />
                  </div>
                  <span className="text-white/65 text-sm">{item.text}</span>
                </div>
              );
            })}
          </div>

          {/* Trust signal */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-white/40 text-xs">
              Joined by 2,000+ creators, YouTubers, and agencies worldwide.
            </p>
          </div>
        </div>

        <div className="relative z-10" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <img src="/logo.svg" alt="VideoText" width={24} height={24} className="w-6 h-6" />
            <span className="font-bold text-gray-900 dark:text-white text-lg">VideoText</span>
          </div>

          {/* Context banner for users coming from a completed job */}
          {fromGuestJob && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
            >
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-0.5">Your transcript is ready!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Log in to download it. Your remaining imports will be adjusted.</p>
            </motion.div>
          )}

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {fromGuestJob ? 'Log in to download your transcript' : 'Log in to VideoText'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-7">
            {fromGuestJob
              ? 'One quick step to access your result.'
              : "Don't have an account? "}
            {!fromGuestJob && (
              <Link to={`/signup${returnTo !== '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="text-violet-600 dark:text-violet-400 font-medium hover:underline">
                Sign up free
              </Link>
            )}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors text-[15px]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-violet-600 dark:text-violet-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors text-[15px]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg"
                role="alert"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 text-white font-semibold transition-all text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Logging in…
                </>
              ) : (
                <>
                  {fromGuestJob ? 'Log in & download' : 'Log in'}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {!fromGuestJob && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                New to VideoText?{' '}
                <Link
                  to={`/signup${returnTo !== '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                  className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                >
                  Start free — no credit card
                </Link>
              </p>
            </div>
          )}

          <p className="mt-4 text-center">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              ← Back to home
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
