/**
 * JobAuthGateModal
 *
 * Shown after a job completes for a non-authenticated user.
 * Gates "download / see full result" behind a quick email+OTP signup or login.
 * After auth, calls onAuthSuccess() so the parent can resume the download or show results.
 *
 * Flow A (signup): email → OTP → password → account created → onAuthSuccess
 * Flow B (login):  email → password → logged in → onAuthSuccess
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, CheckCircle2, ChevronRight } from 'lucide-react'
import { sendOtp, verifyOtp } from '../lib/api'
import { completeSignup, login, storeLoginResult } from '../lib/auth'
import { identifyUser } from '../lib/analytics'

type Mode = 'choice' | 'signup-email' | 'signup-otp' | 'signup-password' | 'login'

interface JobAuthGateModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called after successful authentication so the parent can resume the download. */
  onAuthSuccess: () => void
  /** Short description of what was processed, e.g. "Your transcript is ready" */
  jobDescription?: string
}

export default function JobAuthGateModal({ isOpen, onClose, onAuthSuccess, jobDescription = 'Your transcript is ready' }: JobAuthGateModalProps) {
  const [mode, setMode] = useState<Mode>('choice')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setMode('choice')
    setEmail('')
    setOtp('')
    setVerificationToken(null)
    setPassword('')
    setError(null)
    setLoading(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  // ── SIGNUP flow ─────────────────────────────────────────────────────────────

  async function handleSignupEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await sendOtp(email.trim().toLowerCase())
      setMode('signup-otp')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignupOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { token } = await verifyOtp(email.trim().toLowerCase(), otp)
      setVerificationToken(token)
      setMode('signup-password')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignupPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!verificationToken) return
    setError(null)
    setLoading(true)
    try {
      const result = await completeSignup(verificationToken, password)
      storeLoginResult(result)
      // Mark 1 import as "used" for the guest trial
      try { localStorage.setItem('videotext:guestJobUsed', '1') } catch { /* ignore */ }
      try { identifyUser(result.userId, { plan: result.plan, email: result.email }) } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent('videotext:plan-updated'))
      reset()
      onAuthSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  // ── LOGIN flow ───────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(email.trim().toLowerCase(), password)
      storeLoginResult(result)
      try { identifyUser(result.userId, { plan: result.plan, email: result.email }) } catch { /* ignore */ }
      reset()
      onAuthSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 transition-colors duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-gate-title"
        >
          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Success badge */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-[15px]" id="auth-gate-title">{jobDescription}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sign up or log in to download the full file</p>
            </div>
          </div>

          {/* CHOICE */}
          {mode === 'choice' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200/60 dark:border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">Create a free account to:</span>
                </div>
                <ul className="space-y-1 text-sm text-purple-700 dark:text-purple-400/80 ml-6">
                  <li>• Download your full transcript (TXT, PDF, SRT)</li>
                  <li>• Get 2 more free imports this month</li>
                  <li>• Access all VideoText tools</li>
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setMode('signup-email'); setError(null); }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 hover:shadow-xl transition-all"
              >
                Create free account
                <ChevronRight className="w-4 h-4" />
              </motion.button>

              <button
                onClick={() => { setMode('login'); setError(null); }}
                className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
              >
                Already have an account? Log in
              </button>

              <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
                No credit card · Files deleted after processing
              </p>
            </div>
          )}

          {/* SIGNUP: email */}
          {mode === 'signup-email' && (
            <form onSubmit={handleSignupEmail} className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Create your free account</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading ? 'Sending…' : <><span>Send code</span><ChevronRight className="w-3.5 h-3.5" /></>}
                </motion.button>
                <button type="button" onClick={() => { setMode('choice'); setError(null); }} className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Back
                </button>
              </div>
            </form>
          )}

          {/* SIGNUP: OTP */}
          {mode === 'signup-otp' && (
            <form onSubmit={handleSignupOtp} className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Check your email</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">We sent a 6-digit code to <strong className="text-gray-700 dark:text-gray-300">{email}</strong></p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 transition-colors"
              />
              {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  whileHover={{ scale: 1.01 }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading ? 'Verifying…' : <><span>Verify</span><ChevronRight className="w-3.5 h-3.5" /></>}
                </motion.button>
                <button type="button" onClick={() => { setMode('signup-email'); setOtp(''); setError(null); }} className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Back
                </button>
              </div>
            </form>
          )}

          {/* SIGNUP: password */}
          {mode === 'signup-password' && (
            <form onSubmit={handleSignupPassword} className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Set your password</h3>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">2 free imports ready</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">1 used for this trial. 2 more after signup.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Password <span className="font-normal text-gray-400">(min 8 chars)</span></label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
              >
                {loading ? 'Creating account…' : <><span>Create account & download</span><ChevronRight className="w-3.5 h-3.5" /></>}
              </motion.button>
            </form>
          )}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Log in to download</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading ? 'Logging in…' : <><span>Log in & download</span><ChevronRight className="w-3.5 h-3.5" /></>}
                </motion.button>
                <button type="button" onClick={() => { setMode('choice'); setError(null); }} className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Back
                </button>
              </div>
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                No account?{' '}
                <button type="button" onClick={() => { setMode('signup-email'); setError(null); }} className="text-violet-600 dark:text-violet-400 font-medium hover:underline">
                  Sign up free
                </button>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
