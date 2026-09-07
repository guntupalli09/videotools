import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Youtube, Mic, Building2 } from 'lucide-react'
import { createBillingPortalSession } from '../lib/billing'
import { startCheckout } from '../lib/startCheckout'
import { trackEvent } from '../lib/analytics'
import type { BillingPlan } from '../lib/billing'
import type { BillingInterval } from '../lib/billing'
import { getCurrentUsage } from '../lib/api'
import { logout, isLoggedIn } from '../lib/auth'
import { trackAppEvent } from '../lib/feedbackEvents'
import { getJobCompletedCount } from '../lib/jobCount'
import CancellationReasonModal from '../components/CancellationReasonModal'
import { hasSubmittedCancellationReason } from '../lib/cancellationFeedback'
import { useProPricing } from '../contexts/PricingContext'

function Check() {
  return (
    <svg
      className="w-4 h-4 shrink-0 mt-0.5 text-blue-600"
      fill="currentColor" viewBox="0 0 20 20" aria-hidden
    >
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function X() {
  return (
    <svg className="w-4 h-4 shrink-0 mt-0.5 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  )
}

export default function Pricing() {
  const { pricing } = useProPricing()
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [usageResetDate, setUsageResetDate] = useState<string | null>(null)
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<BillingPlan | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [cancelReasonOpen, setCancelReasonOpen] = useState(false)
  const [pendingPortalRedirect, setPendingPortalRedirect] = useState(false)

  const refreshCurrentPlan = useCallback(() => {
    getCurrentUsage({ skipCache: true })
      .then((data) => {
        setCurrentPlan((data.plan || 'free').toLowerCase())
        setUsageResetDate(data.resetDate ?? data.billingPeriodEnd ?? null)
        setCancelAtPeriodEnd(Boolean(data.cancelAtPeriodEnd && data.billingPeriodEnd))
      })
      .catch(() => {
        setCurrentPlan((localStorage.getItem('plan') || 'free').toLowerCase())
        setUsageResetDate(null)
      })
  }, [])

  useEffect(() => { refreshCurrentPlan() }, [refreshCurrentPlan])

  useEffect(() => {
    try {
      trackEvent('pricing_page_view', { source: 'pricing_page' })
      if (isLoggedIn()) trackAppEvent('pricing_page_view', { source: 'pricing_page' })
    } catch { /* non-blocking */ }
  }, [])

  useEffect(() => {
    const onPlanUpdated = () => refreshCurrentPlan()
    window.addEventListener('videotext:plan-updated', onPlanUpdated)
    return () => window.removeEventListener('videotext:plan-updated', onPlanUpdated)
  }, [refreshCurrentPlan])

  const isPaidPlan = currentPlan === 'basic' || currentPlan === 'pro' || currentPlan === 'agency' || currentPlan === 'founding_workflow' || currentPlan === 'business'
  const isCurrentPlan = (plan: string) => (currentPlan || 'free').toLowerCase() === plan.toLowerCase()
  const signupStartedAt = (() => {
    try { return localStorage.getItem('videotext:signup_started_at') } catch { return null }
  })()
  const hoursSinceSignup = signupStartedAt ? Math.max(0, Math.round((Date.now() - new Date(signupStartedAt).getTime()) / 36e5)) : null
  const jobCount = getJobCompletedCount()

  async function openBillingPortal() {
    setPortalLoading(true)
    try {
      const { url } = await createBillingPortalSession(window.location.origin + '/pricing')
      window.location.href = url
    } catch (err: any) {
      alert(err.message || 'Failed to open billing')
      setPortalLoading(false)
    }
  }

  async function handleManageSubscription() {
    if (!isPaidPlan) return
    if (hasSubmittedCancellationReason('pre_portal')) {
      await openBillingPortal()
      return
    }
    setPendingPortalRedirect(true)
    setCancelReasonOpen(true)
  }

  async function finishManageSubscriptionFlow() {
    setCancelReasonOpen(false)
    if (pendingPortalRedirect) {
      setPendingPortalRedirect(false)
      await openBillingPortal()
    }
  }

  function changeBillingInterval(interval: BillingInterval) {
    setBillingInterval(interval)
    try { trackEvent('pricing_billing_interval_changed', { billing_interval: interval }) } catch { /* non-blocking */ }
  }

  async function handleSubscribe(plan: BillingPlan) {
    try { trackEvent('plan_clicked', { plan }) } catch { /* non-blocking */ }
    if (plan === 'pro') {
      try { trackEvent('pro_cta_clicked', { source: 'pricing_page', billing_interval: billingInterval }) } catch { /* non-blocking */ }
    }

    setCheckoutLoading(plan)
    try {
      try { localStorage.setItem('videotext:checkout_billing_interval', billingInterval) } catch { /* non-blocking */ }
      await startCheckout({
        plan,
        billingInterval,
        returnToPath: '/pricing',
        attribution: {
          source: 'pricing_page',
          job_count: jobCount,
          ...(hoursSinceSignup != null ? { hours_since_signup: hoursSinceSignup, cohort_date: signupStartedAt?.slice(0, 10) } : {}),
          displayed_price: billingInterval === 'annual' ? pricing.annual.effectiveMonthly : pricing.monthly.amount,
          pricing_tier: pricing.tier,
          ...(pricing.country ? { pricing_country: pricing.country } : {}),
        },
      })
    } catch (e: any) {
      const msg: string = e.message || ''
      if (msg.includes('session has expired') || msg.includes('log out and log back in')) {
        logout(); window.location.reload(); return
      }
      alert(msg || 'Failed to start checkout. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3 tracking-wide uppercase">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white tracking-tight">
            One plan. Your complete audio &amp; video workflow.
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Transcribe · Subtitle · Translate · Format · QA · Process · Deliver
          </p>
          {pricing.enabled && pricing.tier !== 'standard' && (
            <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Regional pricing for your area — same full Pro workflow
            </p>
          )}

          {isPaidPlan && (
            <div className="mt-8 flex flex-col items-center gap-2">
              {cancelAtPeriodEnd && usageResetDate && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 max-w-sm text-center">
                  Canceling on{' '}
                  <strong>{new Date(usageResetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>.
                  Reactivate below to keep your plan.
                </div>
              )}
              {!cancelAtPeriodEnd && usageResetDate && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Renews {new Date(usageResetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
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
        </div>

        <div className="mb-10 flex justify-center">
          <div className="inline-flex max-w-full rounded-xl border border-gray-700 bg-gray-900 p-1 shadow-sm" role="group" aria-label="Pro billing interval">
            <button
              type="button"
              aria-pressed={billingInterval === 'monthly'}
              onClick={() => changeBillingInterval('monthly')}
              className={`min-h-11 rounded-lg px-4 sm:px-6 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${billingInterval === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={billingInterval === 'annual'}
              onClick={() => changeBillingInterval('annual')}
              className={`min-h-11 rounded-lg px-3 sm:px-5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${billingInterval === 'annual' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white'}`}
            >
              <span>Annual</span>
              <span className="ml-2 inline-flex rounded-full bg-emerald-400 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-emerald-950 shadow-sm">Save 27%</span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto">

          {/* FREE */}
          <div className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-xl border p-7 transition-shadow hover:shadow-md ${isCurrentPlan('free') ? 'border-blue-300 dark:border-blue-600 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'}`}>
            {isCurrentPlan('free') && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow">
                Current Plan
              </span>
            )}

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Free</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-snug">
                Try the full workflow — no card needed.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {[
                { label: '3 uploads per month', ok: true },
                { label: 'Files up to 30 minutes', ok: true },
                { label: 'Transcript & subtitle exports', ok: true },
                { label: 'AI summaries & chapters', ok: true },
                { label: 'Speaker labels', ok: true },
                { label: 'Watermark-free exports', ok: false },
                { label: 'Formatting & QA workflows', ok: false },
                { label: 'Client-ready delivery', ok: false },
              ].map(({ label, ok }) => (
                <li key={label} className="flex items-start gap-2.5 text-sm">
                  {ok ? <Check /> : <X />}
                  <span className={ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
                    {label}
                  </span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-medium text-sm cursor-not-allowed"
            >
              {isCurrentPlan('free') ? 'Current plan' : 'Free — no sign-up'}
            </button>
          </div>

          {/* PRO */}
          <div className="relative flex flex-col bg-gray-950 dark:bg-gray-900 rounded-xl border border-blue-400/70 p-7 shadow-2xl shadow-blue-900/20 ring-2 ring-blue-500/40">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow">
              {isCurrentPlan('pro') ? 'Current Plan' : billingInterval === 'annual' ? 'Best Value' : 'Most Popular'}
            </span>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">
                  {billingInterval === 'annual'
                    ? pricing.annual.effectiveMonthlyDisplay
                    : pricing.monthly.displayAmount}
                </span>
                <span className="text-sm text-gray-400">/mo</span>
              </div>
              <div className="min-h-[44px] pt-1 text-sm" aria-live="polite">
                {billingInterval === 'annual' ? (
                  <>
                    <p className="font-medium text-gray-200">{pricing.annual.billedLabel} billed annually</p>
                    <p className="text-emerald-400">Save {pricing.annual.savePercent}% vs monthly</p>
                  </>
                ) : <span className="sr-only">Billed monthly</span>}
              </div>
              <p className="mt-2 text-base font-semibold text-white">Your complete audio &amp; video workflow.</p>
              <p className="mt-2 text-sm text-gray-300 leading-relaxed">
                Transcribe, subtitle, translate, format, process, and deliver — all in one place.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {[
                'Longer audio & video uploads',
                'Transcription + speaker detection',
                'Subtitles + automatic SRT fixing',
                'Translation in 70+ languages',
                'AI summaries & chapters',
                'Client-ready formatting & QA',
                'Batch processing for multiple files',
                'Burn subtitles & compress video',
                'Watermark-free exports',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-200">
                  <Check />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => isCurrentPlan('pro') ? handleManageSubscription() : handleSubscribe('pro')}
              disabled={(isCurrentPlan('pro') && portalLoading) || checkoutLoading !== null}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-900/20 transition-colors disabled:opacity-60"
            >
              {isCurrentPlan('pro')
                ? (portalLoading ? 'Opening…' : 'Manage subscription')
                : checkoutLoading === 'pro' ? 'Redirecting…'
                : billingInterval === 'annual'
                  ? `Unlock Pro — ${pricing.annual.label}`
                  : `Unlock Pro — ${pricing.monthly.label}`}
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">Cancel anytime · All Pro tools included</p>
          </div>

        </div>

        {/* Testimonials */}
        <div className="mt-20">
          <p className="text-center text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-10">
            What people are saying
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote: 'I used to spend 3 hours per video on captions. Now I drop the file, grab a coffee, and the transcript is waiting. Accuracy with accented speech is genuinely better than anything else I\'ve tried.',
                name: 'Marcus Chen', role: 'YouTube Creator', meta: '480K subscribers',
                avatar: 'https://i.pravatar.cc/80?img=11',
                Platform: Youtube, platformColor: 'text-red-500',
                result: 'Saves 3 hrs/video', resultBg: 'bg-red-500/10 text-red-500 border border-red-500/20',
              },
              {
                quote: 'We produce 24 episodes a month across three shows. Batch processing handles the entire queue at once — transcripts, show notes, chapters, everything automated. It replaced a part-time contractor.',
                name: 'Sarah Okonkwo', role: 'Podcast Producer', meta: 'The Growth Lab Network',
                avatar: 'https://i.pravatar.cc/80?img=47',
                Platform: Mic, platformColor: 'text-blue-600',
                result: 'Replaced a contractor', resultBg: 'bg-blue-600/10 text-blue-600 border border-blue-500/20',
              },
              {
                quote: 'We caption video ads for 12 clients every week. Drop the file, captions done, sent to client. No downloads, no drama, no back-and-forth.',
                name: 'James Rivera', role: 'Founder', meta: 'Apex Media Agency',
                avatar: 'https://i.pravatar.cc/80?img=33',
                Platform: Building2, platformColor: 'text-blue-500',
                result: '12 clients served', resultBg: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
              },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">
                    {[0,1,2,3,4].map((s) => (
                      <svg key={s} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <t.Platform className={`w-4 h-4 ${t.platformColor}`} />
                </div>
                <blockquote className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1 mb-4">
                  "{t.quote}"
                </blockquote>
                <span className={`inline-flex self-start text-[11px] font-bold px-2.5 py-1 rounded-full mb-4 ${t.resultBg}`}>
                  {t.result}
                </span>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t.role} · {t.meta}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
          One subscription brings transcription, subtitles, translation, formatting, QA, processing, and client-ready delivery together.
        </p>

        {/* Trust signals */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-400 dark:text-gray-500">
          {['Cancel any time', 'We don\'t store your files'].map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {s}
            </span>
          ))}
        </div>

        {(isCurrentPlan('basic') || isCurrentPlan('agency')) && (
          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            On a legacy plan?{' '}
            <button type="button" onClick={handleManageSubscription} className="underline hover:text-gray-600 dark:hover:text-gray-300">
              Manage your plan →
            </button>
          </p>
        )}
      </div>

      <CancellationReasonModal
        open={cancelReasonOpen}
        timing="pre_portal"
        plan={currentPlan ?? 'pro'}
        onClose={() => {
          setCancelReasonOpen(false)
          setPendingPortalRedirect(false)
        }}
        onComplete={finishManageSubscriptionFlow}
      />
    </div>
  )
}
