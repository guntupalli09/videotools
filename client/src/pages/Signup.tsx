import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { sendOtp, verifyOtp, loginWithGoogle } from '../lib/api'
import { completeSignup, storeLoginResult } from '../lib/auth'
import { identifyUser, trackEvent } from '../lib/analytics'
import { getSamplesModuleAttribution } from '../lib/samplesAttribution'
import { captureReferralFromUrl, getStoredReferralCode, clearStoredReferralCode } from '../lib/referral'
import { celebrateReferralReward } from '../lib/referralReward'
import ReferralSignupBanner from '../components/ReferralSignupBanner'
import { FileText, Youtube, Shield, ChevronRight, CheckCircle2 } from 'lucide-react'
import GoogleSignInButton, { GOOGLE_CLIENT_ID } from '../components/GoogleSignInButton'

type Step = 'email' | 'otp' | 'password'
const SIGNUP_STARTED_AT_KEY = 'videotext:signup_started_at'

export default function Signup() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const returnTo = params.get('returnTo') || '/'
  const fromGuestJob = params.get('guestJob') === '1'
  const samplesAttribution = getSamplesModuleAttribution()

  useEffect(() => {
    captureReferralFromUrl(location.search)
  }, [location.search])

  async function handleGoogleCredential(credential: string) {
    setGoogleLoading(true)
    setError(null)
    try {
      const result = await loginWithGoogle(credential, getStoredReferralCode())
      storeLoginResult(result)
      if (fromGuestJob) {
        try { localStorage.setItem('videotext:guestJobUsed', '1') } catch { /* ignore */ }
      }
      try { identifyUser(result.userId, { plan: result.plan, email: result.email }) } catch { /* non-blocking */ }
      try {
        const event = result.isNewUser ? 'google_signup_completed' : 'google_login_completed'
        trackEvent(event, { plan: result.plan })
      if (result.isNewUser) {
          if (result.referralApplied) {
            clearStoredReferralCode()
            celebrateReferralReward()
          } else {
            clearStoredReferralCode()
          }
          const nowIso = new Date().toISOString()
          try { localStorage.setItem(SIGNUP_STARTED_AT_KEY, nowIso) } catch { /* non-blocking */ }
          trackEvent('signup_completed', {
            plan: result.plan,
            source: 'google_signup',
            hours_since_signup: 0,
            job_count: 0,
            cohort_date: nowIso.slice(0, 10),
          })
        }
      } catch { /* non-blocking */ }
      window.dispatchEvent(new CustomEvent('videotext:plan-updated'))
      navigate(returnTo, { replace: true })
      window.location.reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-up failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      trackEvent('signup_started', {
        from_guest_job: fromGuestJob,
        ...(samplesAttribution
          ? {
              samples_module_clickthrough: true,
              samples_module_source_path: samplesAttribution.sourcePath,
              samples_module_target_path: samplesAttribution.samplesHref,
              samples_module_clicked_at: samplesAttribution.clickedAt,
            }
          : {}),
      })
    } catch { /* non-blocking */ }
    try {
      await sendOtp(email)
      setStep('otp')
      try { trackEvent('otp_requested', { method: 'email' }) } catch { /* non-blocking */ }
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
      try { trackEvent('otp_verified') } catch { /* non-blocking */ }
    } catch (err: unknown) {
      try { trackEvent('otp_failed', { reason: 'invalid_code' }) } catch { /* non-blocking */ }
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
      const result = await completeSignup(verificationToken, password, getStoredReferralCode())
      storeLoginResult(result)
      if (result.referralApplied) {
        clearStoredReferralCode()
        celebrateReferralReward()
      }
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
        const nowIso = new Date().toISOString()
        try { localStorage.setItem(SIGNUP_STARTED_AT_KEY, nowIso) } catch { /* non-blocking */ }
        trackEvent('signup_completed', {
          plan: result.plan,
          source: fromGuestJob ? 'guest_job' : 'signup_page',
          hours_since_signup: 0,
          job_count: 0,
          cohort_date: nowIso.slice(0, 10),
          from_guest_job: fromGuestJob,
          ...(samplesAttribution
            ? {
                samples_module_clickthrough: true,
                samples_module_source_path: samplesAttribution.sourcePath,
                samples_module_target_path: samplesAttribution.samplesHref,
                samples_module_clicked_at: samplesAttribution.clickedAt,
              }
            : {}),
        })
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
        { icon: CheckCircle2, text: '2 free imports left today', highlight: true },
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
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between border-r border-white/[0.08] bg-gray-950 p-10 xl:p-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="VideoText" width={28} height={28} className="w-7 h-7" />
          <span className="font-bold text-white text-lg">VideoText</span>
        </div>

        {/* Headline */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-medium text-white leading-tight mb-3">
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
                  <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${p.highlight ? 'bg-blue-600/30' : 'bg-white/15'}`}>
                    <Icon className={`h-3.5 w-3.5 ${p.highlight ? 'text-blue-200' : 'text-white/80'}`} />
                  </div>
                  <span className={`text-sm ${p.highlight ? 'font-semibold text-blue-200' : 'text-white/65'}`}>{p.text}</span>
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

        <div />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <img src="/logo.svg" alt="VideoText" width={24} height={24} className="w-6 h-6" />
            <span className="font-bold text-gray-900 dark:text-white text-lg">VideoText</span>
          </div>

          {/* Step indicator */}
          <ReferralSignupBanner search={location.search} />
          <div className="flex items-center gap-1.5 mb-6">
            {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  s === step ? 'bg-blue-600' : i < ['email', 'otp', 'password'].indexOf(step) ? 'bg-blue-600 dark:bg-blue-700' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          <h1 className="text-2xl font-medium text-gray-900 dark:text-white mb-1">
            {stepTitles[step]}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-7">
            {stepDescriptions[step]}
          </p>

          {step === 'email' && GOOGLE_CLIENT_ID && (
            <div className="mb-6 space-y-3">
              <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
              {googleLoading && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">Signing up with Google…</p>
              )}
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 dark:text-gray-500">or continue with email</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          )}

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
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-[15px]"
                  placeholder="you@example.com"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Sending…' : (
                  <>Send verification code <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
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
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-4 text-center text-2xl tracking-[0.5em] text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
                  aria-label="6-digit code"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Verifying…' : (
                  <>Verify email <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtpCode(''); setError(null); }}
                className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    2 free imports remaining
                  </p>
                  <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
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
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-[15px]"
                  placeholder="At least 8 characters"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Creating account…' : (
                  <>
                    {fromGuestJob ? 'Create account & download' : 'Create my free account'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to={`/login${returnTo !== '/' || fromGuestJob ? `?returnTo=${encodeURIComponent(returnTo)}${fromGuestJob ? '&guestJob=1' : ''}` : ''}`}
                className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
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
        </div>
      </div>
    </div>
  )
}
