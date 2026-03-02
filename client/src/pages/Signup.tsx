import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sendOtp, verifyOtp } from '../lib/api'
import { completeSignup, storeLoginResult } from '../lib/auth'
import { identifyUser } from '../lib/analytics'

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
      try {
        identifyUser(result.userId, { plan: result.plan, email: result.email })
      } catch {
        // non-blocking
      }
      navigate('/', { replace: true })
      window.dispatchEvent(new CustomEvent('videotext:plan-updated'))
      window.location.reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const normalizedEmail = email.trim().toLowerCase()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Try Free</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 text-center">
          {step === 'email' && 'Enter your email to get a verification code. We’ll send a 6-digit code to verify it.'}
          {step === 'otp' && `Enter the 6-digit code we sent to ${normalizedEmail || 'your email'}.`}
          {step === 'password' && 'Choose a password to finish creating your account (3 free imports).'}
        </p>

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
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
              {loading ? 'Sending…' : 'Send verification code'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Verification code</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-center text-lg tracking-widest text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                aria-label="6-digit code"
              />
            </label>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-medium transition-colors"
            >
              {loading ? 'Verifying…' : 'Verify email'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setOtpCode(''); setError(null); }}
              className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400"
            >
              Use a different email
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleCreateAccount} className="mt-6 space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Signed up as <span className="font-medium text-gray-700 dark:text-gray-300">{normalizedEmail}</span>
            </p>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="At least 8 characters"
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-600 dark:text-violet-400 hover:underline">
            Log in
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
