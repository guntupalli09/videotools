/**
 * JobAuthGateModal
 *
 * Gates "download / see full result" behind a quick signup or login.
 * After auth, calls onAuthSuccess() so the parent can resume the download.
 *
 * Flow A (signup): email + password → OTP verify → account created → onAuthSuccess
 * Flow B (login):  email + password → logged in → onAuthSuccess
 * Flow C (Google): one click → onAuthSuccess
 *
 * Framing: "Finish signing up" (TurboScribe-style loss aversion)
 * rather than a wall — feels like saving progress, not a paywall.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, CheckCircle2, ChevronRight, Lock, Zap } from 'lucide-react'
import { sendOtp, verifyOtp, loginWithGoogle } from '../lib/api'
import { completeSignup, login, storeLoginResult } from '../lib/auth'
import { getStoredReferralCode, clearStoredReferralCode } from '../lib/referral'
import { identifyUser } from '../lib/analytics'
import GoogleSignInButton, { GOOGLE_CLIENT_ID } from './GoogleSignInButton'

type Mode = 'choice' | 'signup-combo' | 'signup-otp' | 'login'

interface JobAuthGateModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess: () => void
  jobDescription?: string
  dismissable?: boolean
  initialMode?: 'signup-combo' | 'login'
}

export default function JobAuthGateModal({
  isOpen,
  onClose,
  onAuthSuccess,
  jobDescription = 'Your result is ready',
  dismissable = false,
  initialMode = 'signup-combo',
}: JobAuthGateModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode)

  // Reset mode when modal reopens
  useEffect(() => {
    if (isOpen) setMode(initialMode)
  }, [isOpen])

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleCredential(credential: string) {
    setGoogleLoading(true)
    setError(null)
    try {
      const result = await loginWithGoogle(credential, getStoredReferralCode())
      storeLoginResult(result)
      if (result.isNewUser) clearStoredReferralCode()
      try { localStorage.setItem('videotext:guestJobUsed', '1') } catch { /* ignore */ }
      try { identifyUser(result.userId, { plan: result.plan, email: result.email }) } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent('videotext:plan-updated'))
      reset()
      onAuthSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google login failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  function reset() {
    setMode(initialMode)
    setEmail('')
    setOtp('')
    setPassword('')
    setError(null)
    setLoading(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSignupCombo(e: React.FormEvent) {
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
      const result = await completeSignup(token, password, getStoredReferralCode())
      storeLoginResult(result)
      if (result.referralApplied) clearStoredReferralCode()
      try { localStorage.setItem('videotext:guestJobUsed', '1') } catch { /* ignore */ }
      try { identifyUser(result.userId, { plan: result.plan, email: result.email }) } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent('videotext:plan-updated'))
      reset()
      onAuthSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          onClick={dismissable ? handleClose : undefined}
        />

        {/* Card — slides up from bottom on mobile, scales in on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 sm:p-8 transition-colors duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-gate-title"
        >
          {dismissable && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* ── CHOICE (first view) ── */}
          {mode === 'choice' && (
            <div>
              {/* Status pill */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{jobDescription}</span>
              </div>

              <h2 id="auth-gate-title" className="text-2xl font-medium text-gray-900 dark:text-white mb-2 font-display leading-tight">
                Finish signing up to get your result
              </h2>
              <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Free account — unlock the full version and download.
              </p>

              {/* What you get */}
              <div className="rounded-xl bg-blue-50 dark:bg-blue-600/10 border border-blue-100 dark:border-blue-500/20 p-4 mb-5">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-3">
                  Free account includes
                </p>
                <ul className="space-y-2">
                  {[
                    { icon: Download, text: 'Download full result (TXT, PDF, SRT)' },
                    { icon: Zap, text: '2 free imports left today' },
                    { icon: Lock, text: 'Files deleted after processing — always' },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-2.5 text-sm text-blue-800 dark:text-blue-300">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Google Sign-In */}
              {GOOGLE_CLIENT_ID && (
                <div className="space-y-2 mb-3">
                  <GoogleSignInButton onCredential={handleGoogleCredential} text="continue_with" />
                  {googleLoading && (
                    <p className="text-center text-sm text-gray-500">Signing in with Google…</p>
                  )}
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              )}

              {/* Primary CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setMode('signup-combo'); setError(null) }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 transition-all mb-3"
              >
                Sign up with email — it's free
                <ChevronRight className="w-4 h-4" />
              </motion.button>

              <button
                onClick={() => { setMode('login'); setError(null) }}
                className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                Already have an account? Log in
              </button>

              <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-4">No credit card · Files deleted after processing</p>

              {!dismissable && (
                <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                  Want to start over?{' '}
                  <button
                    type="button"
                    onClick={() => { reset(); window.location.reload() }}
                    className="underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    Process a different file
                  </button>
                </p>
              )}
            </div>
          )}

          {/* ── SIGNUP step 1: email + password ── */}
          {mode === 'signup-combo' && (
            <form onSubmit={handleSignupCombo} className="space-y-4">
              <div>
                <h2 id="auth-gate-title" className="text-2xl font-medium text-gray-900 dark:text-white font-display">
                  Finish signing up
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Free account — takes 30 seconds.
                </p>
              </div>

              {/* Google Sign-In */}
              {GOOGLE_CLIENT_ID && (
                <div className="space-y-2">
                  <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
                  {googleLoading && (
                    <p className="text-center text-sm text-gray-500">Signing in with Google…</p>
                  )}
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400">or continue with email</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Password <span className="font-normal text-gray-400">(min 8 chars)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading
                    ? 'Sending code…'
                    : <><span>Continue</span><ChevronRight className="w-3.5 h-3.5" /></>}
                </motion.button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null) }}
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Log in
                </button>
              </div>
              <p className="text-center text-[11px] text-gray-400">
                We'll email a verification code to confirm your address.
              </p>
            </form>
          )}

          {/* ── SIGNUP step 2: OTP verify ── */}
          {mode === 'signup-otp' && (
            <form onSubmit={handleSignupOtp} className="space-y-4">
              <div>
                <h2 id="auth-gate-title" className="text-2xl font-medium text-gray-900 dark:text-white font-display">
                  Check your email
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  We sent a 6-digit code to{' '}
                  <strong className="text-gray-700 dark:text-gray-300">{email}</strong>
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              />

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  whileHover={{ scale: 1.01 }}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading
                    ? 'Creating account…'
                    : <><span>Create account & unlock</span><ChevronRight className="w-3.5 h-3.5" /></>}
                </motion.button>
                <button
                  type="button"
                  onClick={() => { setMode('signup-combo'); setOtp(''); setError(null) }}
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 id="auth-gate-title" className="text-2xl font-medium text-gray-900 dark:text-white font-display">
                  Welcome back
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Log in to access your result.
                </p>
              </div>

              {/* Google Sign-In */}
              {GOOGLE_CLIENT_ID && (
                <div className="space-y-2">
                  <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />
                  {googleLoading && (
                    <p className="text-center text-sm text-gray-500">Signing in with Google…</p>
                  )}
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400">or continue with email</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
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
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading
                    ? 'Logging in…'
                    : <><span>Log in & unlock</span><ChevronRight className="w-3.5 h-3.5" /></>}
                </motion.button>
                <button
                  type="button"
                  onClick={() => { setMode('signup-combo'); setError(null) }}
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign up
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                No account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup-combo'); setError(null) }}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
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
