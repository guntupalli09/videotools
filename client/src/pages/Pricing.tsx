import { useState, useEffect } from 'react'
import { createCheckoutSession, createBillingPortalSession } from '../lib/billing'
import { trackEvent } from '../lib/analytics'
import type { BillingPlan } from '../lib/billing'
import { getCurrentUsage, sendOtp, verifyOtp } from '../lib/api'

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 text-emerald-500 ${className}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

export default function Pricing() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutEmail, setCheckoutEmail] = useState('')
  const [emailPrompt, setEmailPrompt] = useState<{ plan: BillingPlan; annual: boolean } | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [otpModal, setOtpModal] = useState<{ email: string; plan: BillingPlan; annual: boolean } | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUsage()
      .then((data) => setCurrentPlan((data.plan || 'free').toLowerCase()))
      .catch(() => setCurrentPlan((localStorage.getItem('plan') || 'free').toLowerCase()))
  }, [])

  const isPaidPlan = currentPlan === 'basic' || currentPlan === 'pro' || currentPlan === 'agency'

  async function handleManageSubscription() {
    if (!isPaidPlan) return
    setPortalLoading(true)
    try {
      const { url } = await createBillingPortalSession(window.location.origin + '/pricing')
      window.location.href = url
    } catch (err: any) {
      alert(err.message || 'Failed to open billing')
    } finally {
      setPortalLoading(false)
    }
  }

  function handleSubscribe(plan: BillingPlan, annual = false) {
    try {
      trackEvent('plan_clicked', { plan, annual })
    } catch {
      // non-blocking
    }
    setEmailPrompt({ plan, annual })
    setEmailInput(checkoutEmail)
  }

  function handleEmailPromptContinue() {
    const email = emailInput.trim()
    if (!email || !email.includes('@')) {
      return
    }
    if (!emailPrompt) return
    setCheckoutEmail(email)
    setOtpModal({ email, plan: emailPrompt.plan, annual: emailPrompt.annual })
    setEmailPrompt(null)
    setOtpSent(false)
    setOtpCode('')
    setOtpError(null)
  }

  async function handleSendOtp() {
    if (!otpModal) return
    setOtpLoading(true)
    setOtpError(null)
    try {
      await sendOtp(otpModal.email)
      setOtpSent(true)
    } catch (e: any) {
      setOtpError(e.message || 'Failed to send code')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleVerifyAndCheckout() {
    if (!otpModal || !otpCode.trim()) return
    setOtpLoading(true)
    setOtpError(null)
    try {
      const { token } = await verifyOtp(otpModal.email, otpCode.trim())
      const { url } = await createCheckoutSession({
        mode: 'subscription',
        plan: otpModal.plan,
        annual: otpModal.annual,
        returnToPath: '/',
        frontendOrigin: window.location.origin,
        email: otpModal.email,
        emailVerificationToken: token,
      })
      trackEvent('payment_completed', {
        type: 'subscription_checkout_started',
        plan: otpModal.plan,
        annual: otpModal.annual,
      })
      window.location.href = url
    } catch (e: any) {
      setOtpError(e.message || 'Verification failed')
    } finally {
      setOtpLoading(false)
    }
  }

  const bulletRow = 'flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400'

  return (
    <div className="min-h-screen py-16 sm:py-24 bg-gradient-to-b from-gray-50/90 to-gray-50 dark:from-gray-900 dark:to-gray-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 px-3 py-1.5 rounded-full text-sm font-medium border border-emerald-100 dark:border-emerald-800/50 mb-6">
            <span>🔒</span>
            <span>We don’t store your data—your files are processed and deleted.</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Pricing
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Features and outcomes first. Upgrade when you need more.
          </p>
          {isPaidPlan && (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {portalLoading ? 'Opening…' : 'Manage subscription'}
              </button>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch">
          {/* FREE — $0 */}
          <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-600 shadow-sm p-6 sm:p-8 min-h-[420px] hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Free</h3>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">$0</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Try it — 60 min/month</p>
            <ul className="mt-5 space-y-2.5 flex-1">
              <li className={bulletRow}><CheckIcon /><span>Video → Transcript & Subtitles</span></li>
              <li className={bulletRow}><CheckIcon /><span>1 language · Watermarked</span></li>
              <li className={bulletRow}><CheckIcon /><span>Up to 15 min per video</span></li>
            </ul>
            <button
              disabled
              className="mt-6 w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-medium text-sm cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* BASIC — $19 */}
          <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-600 shadow p-6 sm:p-8 min-h-[420px] hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Basic</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">$19</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">/ month</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">For individuals · 450 min/month</p>
            <ul className="mt-5 space-y-2.5 flex-1">
              <li className={bulletRow}><CheckIcon /><span>No watermark · 2 languages</span></li>
              <li className={bulletRow}><CheckIcon /><span>Subtitle editing</span></li>
              <li className={bulletRow}><CheckIcon /><span>Up to 45 min per video</span></li>
            </ul>
            <div className="mt-6 space-y-1">
              <button
                onClick={() => handleSubscribe('basic', false)}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-colors"
              >
                Choose Basic
              </button>
              <button
                onClick={() => handleSubscribe('basic', true)}
                className="w-full py-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
              >
                Save 20% with annual
              </button>
            </div>
          </div>

          {/* PRO — $49 — primary CTA */}
          <div className="relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl border-2 border-violet-500 dark:border-violet-400 shadow-xl shadow-violet-500/20 p-6 sm:p-8 min-h-[420px] lg:scale-[1.03] z-10 hover:shadow-2xl hover:shadow-violet-500/25 transition-all duration-200">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap">
              Most Popular
            </span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-1">Pro</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">$49</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">/ month</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">For creators · 1,200 min · Batch</p>
            <ul className="mt-5 space-y-2.5 flex-1">
              <li className={bulletRow}><CheckIcon /><span>Batch processing · 5 languages</span></li>
              <li className={bulletRow}><CheckIcon /><span>Long-form · Priority queue</span></li>
              <li className={bulletRow}><CheckIcon /><span>Up to 120 min per video</span></li>
            </ul>
            <div className="mt-6 space-y-1">
              <button
                onClick={() => handleSubscribe('pro', false)}
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-lg shadow-primary/25 transition-all duration-200"
              >
                Choose Pro
              </button>
              <button
                onClick={() => handleSubscribe('pro', true)}
                className="w-full py-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
              >
                Save 20% with annual
              </button>
            </div>
          </div>

          {/* AGENCY — $129 */}
          <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-md p-6 sm:p-8 min-h-[420px] hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Agency</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">$129</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">/ month</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">For teams · 3,000 min · Commercial</p>
            <ul className="mt-5 space-y-2.5 flex-1">
              <li className={bulletRow}><CheckIcon /><span>Heavy batch · ZIP exports</span></li>
              <li className={bulletRow}><CheckIcon /><span>10 languages · Commercial use</span></li>
              <li className={bulletRow}><CheckIcon /><span>Up to 240 min per video</span></li>
            </ul>
            <div className="mt-6 space-y-1">
              <button
                onClick={() => handleSubscribe('agency', false)}
                className="w-full py-3.5 rounded-xl bg-primary-hover hover:bg-violet-800 dark:hover:bg-violet-700 text-white font-semibold text-sm border-2 border-primary/50 transition-colors"
              >
                Choose Agency
              </button>
              <button
                onClick={() => handleSubscribe('agency', true)}
                className="w-full py-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
              >
                Save 20% with annual
              </button>
            </div>
          </div>
        </div>

        {/* Overage footer */}
        <div className="mt-14 pt-10 border-t border-gray-200 dark:border-gray-600 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Overage: 100 minutes = $5
          </p>
        </div>
      </div>

      {/* Email prompt modal — shown when user clicks a plan */}
      {emailPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="email-prompt-title">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 id="email-prompt-title" className="text-lg font-semibold text-gray-900 dark:text-white">Enter your email</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              We’ll send a verification code to this email so you can manage your plan and get receipts.
            </p>
            <div className="mt-4">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                aria-label="Email for checkout"
                onKeyDown={(e) => e.key === 'Enter' && handleEmailPromptContinue()}
              />
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleEmailPromptContinue}
                disabled={!emailInput.trim() || !emailInput.includes('@')}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => setEmailPrompt(null)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP verification modal for subscription */}
      {otpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="otp-title">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 id="otp-title" className="text-lg font-semibold text-gray-900 dark:text-white">Verify your email</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              We’ll send a 6-digit code to <strong>{otpModal.email}</strong> so you can manage your plan and get receipts.
            </p>
            {!otpSent ? (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-medium disabled:opacity-60"
                >
                  {otpLoading ? 'Sending…' : 'Send code'}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpModal(null)}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Enter 6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg tracking-widest focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  aria-label="Verification code"
                />
                {otpError && <p className="text-sm text-red-600">{otpError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyAndCheckout}
                    disabled={otpLoading || otpCode.length !== 6}
                    className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-medium disabled:opacity-60"
                  >
                    {otpLoading ? 'Redirecting…' : 'Verify and continue to checkout'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpModal(null)}
                    className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
