import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { sendOtp, verifyOtp } from '../lib/api'
import { completeSignup, storeLoginResult } from '../lib/auth'
import { identifyUser } from '../lib/analytics'
import { motion } from 'framer-motion'
import { FileText, Youtube, Shield, ChevronRight, CheckCircle2 } from 'lucide-react'

type Step = 'email' | 'otp' | 'password'

export default function Signup() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const returnTo = params.get('returnTo') || '/'
  const fromGuestJob = params.get('guestJob') === '1'

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await sendOtp(email)
      setStep('otp')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { token } = await verifyOtp(email, otpCode)
      setVerificationToken(token)
      setStep('password')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!verificationToken) return
    setError(null)
    setLoading(true)
    try {
      const result = await completeSignup(verificationToken, password)
      storeLoginResult(result)
      // If they came from a guest job, mark 1 import as "used" in localStorage for display purposes
      if (fromGuestJob) {
        try {
          localStorage.setItem('videotext:guestJobUsed', '1')
        } catch {
          // ignore
        }
      }
      try {
        identifyUser(result.userId, { plan: result.plan, email: result.email })
      } catch {
        // non-blocking
      }
      navigate(returnTo, { replace: true })
      window.dispatchEvent(new CustomEvent('videotext:plan-updated'))
      window.location.reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const normalizedEmail = email.trim().toLowerCase()

  const stepTitles: Record<Step, string> = {
    email: fromGuestJob ? 'Create account to download your transcript' : 'Start transcribing free',
    otp: 'Check your email',
    password: 'Set your password',
  }

  const stepDescriptions: Record<Step, string> = {
    email: fromGuestJob
      ? 'One quick step — your transcript is ready to download.'
      : 'Enter your email to get a verification code. No credit card needed.',
    otp: `We sent a 6-digit code to ${normalizedEmail || 'your email'}.`,
    password: fromGuestJob
      ? `You have 2 free imports remaining (1 used for your trial). Create your password to continue.`
      : 'Choose a password to secure your account.',
  }

  const PERKS = fromGuestJob
    ? [
        { icon: CheckCircle2, text: '2 free imports left this month', highlight: true },
        { icon: FileText, text: 'Download your transcript now' },
        { icon: Shield, text: 'Files deleted after processing' },
      ]
    : [
        { icon: FileText, text: 'Try free — no credit card needed' },
        { icon: Youtube, text: 'YouTube URL → transcript instantly' },
        { icon: Shield, text: 'Files deleted right after processing' },
      ]

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] bg-gradient-to-br from-purple-700 via-violet-700 to-indigo-800 flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-white/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <img src="/logo.svg" alt="VideoText" width={28} height={28} className="w-7 h-7" />
          <span className="font-bold text-white text-lg">VideoText</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-3">
              {fromGuestJob ? 'Your transcript is ready!' : 'Video to transcript.'}
              <span className="block text-white/60 text-2xl xl:text-3xl mt-1">
                {fromGuestJob ? 'One step to download.' : 'In minutes, not hours.'}
              </span>
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed">
              {fromGuestJob
                ? 'Create a free account to download your full transcript and access 2 more free imports.'
                : 'Paste a YouTube link or upload a video and get a clean, accurate transcript fast.'}
            </p>
          </div>

          <div className="space-y-3">
            {PERKS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.text} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${p.highlight ? 'bg-emerald-500/30' : 'bg-white/15'}`}>
                    <Icon className={`w-3.5 h-3.5 ${p.highlight ? 'text-emerald-300' : 'text-white/80'}`} />
                  </div>
                  <span className={`text-sm ${p.highlight ? 'text-emerald-200 font-semibold' : 'text-white/65'}`}>{p.text}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-white/40 text-xs">
              Joined by 2,000+ creators, podcasters, and agencies.
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

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-6">
            {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  s === step ? 'bg-violet-600' : i < ['email', 'otp', 'password'].indexOf(step) ? 'bg-violet-300 dark:bg-violet-700' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {stepTitles[step]}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-7">
            {stepDescriptions[step]}
          </p>

          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
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
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg" role="alert">
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
                {loading ? 'Sending…' : (
                  <>Send verification code <ChevronRight className="w-4 h-4" /></>
                )}
              </motion.button>
              <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
                We'll email you a 6-digit code. No password required yet.
              </p>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-4 text-center text-2xl tracking-[0.5em] text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors font-mono"
                  aria-label="6-digit code"
                />
              </div>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg" role="alert">
                  {error}
                </motion.p>
              )}
              <motion.button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 text-white font-semibold transition-all text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                {loading ? 'Verifying…' : (
                  <>Verify email <ChevronRight className="w-4 h-4" /></>
                )}
              </motion.button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtpCode(''); setError(null); }}
                className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                Use a different email
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800/60 text-center mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Creating account for{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{normalizedEmail}</span>
                </p>
              </div>

              {fromGuestJob && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    2 free imports remaining
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    1 was used for your trial job. 2 more are ready after signup.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Password <span className="text-gray-400 font-normal">(min 8 characters)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors text-[15px]"
                  placeholder="At least 8 characters"
                />
              </div>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg" role="alert">
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
                {loading ? 'Creating account…' : (
                  <>
                    {fromGuestJob ? 'Create account & download' : 'Create my free account'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          )}

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to={`/login${returnTo !== '/' || fromGuestJob ? `?returnTo=${encodeURIComponent(returnTo)}${fromGuestJob ? '&guestJob=1' : ''}` : ''}`}
                className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
              >
                Log in
              </Link>
            </p>
            <p>
              <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                ← Back to home
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
