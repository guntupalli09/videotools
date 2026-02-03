import { createCheckoutSession } from '../lib/billing'
import { trackEvent } from '../lib/analytics'
import type { BillingPlan } from '../lib/billing'

export default function Pricing() {
  async function handleSubscribe(plan: BillingPlan, annual = false) {
    try {
      const { url } = await createCheckoutSession({
        mode: 'subscription',
        plan,
        annual,
        returnToPath: '/',
        frontendOrigin: window.location.origin,
      })
      trackEvent('payment_completed', {
        type: 'subscription_checkout_started',
        plan,
        annual,
      })
      window.location.href = url
    } catch (error: any) {
      // eslint-disable-next-line no-alert
      alert(error.message || 'Failed to start checkout')
    }
  }

  const cardBase =
    'bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col'
  const subhead = 'text-sm text-gray-600 leading-relaxed'
  const limits = 'text-xs text-gray-500 mt-1'
  const bullets = 'mt-4 space-y-2 text-sm text-gray-600 flex-1'
  const noteBox =
    'text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5 mt-4 border border-gray-100 italic'
  const noteBoxPro =
    'text-xs text-violet-800 bg-violet-50/50 rounded-lg px-3 py-2.5 mt-4 border border-violet-100'

  return (
    <div className="min-h-screen py-16 sm:py-20 bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Pricing
          </h1>
          <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">
            Features and outcomes first. Upgrade when you need more.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* FREE — $0 */}
          <div className={`${cardBase} border-gray-100 min-h-[420px]`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Free</h3>
              <span className="text-2xl font-bold text-gray-900">$0</span>
            </div>
            <p className="mt-3 text-base font-medium text-gray-900">
              Try the magic
            </p>
            <p className={`mt-1 ${subhead}`}>
              Short clips · Single language · Watermarked
            </p>
            <ul className={bullets}>
              <li>Video → Transcript</li>
              <li>Video → Subtitles</li>
              <li>1 language</li>
              <li>Watermark on subtitles</li>
              <li>No batch processing</li>
            </ul>
            <p className={limits}>60 min / month</p>
            <p className={limits}>Up to 5 min per video</p>
            <p className={noteBox}>
              Free jobs may queue longer during peak times.
            </p>
            <button
              disabled
              className="mt-6 w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-medium text-sm cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* BASIC — $19 / month (450 min) */}
          <div className={`${cardBase} border-gray-100 min-h-[420px]`}>
            <h3 className="text-xl font-semibold text-gray-900">Basic</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">$19</span>
              <span className="text-sm text-gray-500">/ month</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              $15 / month billed annually
            </p>
            <p className="mt-3 text-base font-medium text-gray-900">
              For light, occasional use
            </p>
            <p className={`mt-1 ${subhead}`}>
              Clean subtitles without watermarks
            </p>
            <ul className={bullets}>
              <li>Subtitle editing unlocked</li>
              <li>2 languages (your choice)</li>
              <li>No watermark</li>
              <li>No batch processing</li>
            </ul>
            <p className={limits}>450 min / month</p>
            <p className={limits}>Up to 30 min per video</p>
            <p className={noteBox}>
              Usable — but designed to push Pro for real workflows.
            </p>
            <div className="mt-6 space-y-2">
              <button
                onClick={() => handleSubscribe('basic', false)}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors"
              >
                Choose Basic
              </button>
              <button
                onClick={() => handleSubscribe('basic', true)}
                className="w-full py-2 text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                Save 20% with annual billing
              </button>
            </div>
          </div>

          {/* PRO — $29 / month 🏆 */}
          <div
            className={`${cardBase} border-violet-500 relative min-h-[420px] shadow-lg shadow-violet-500/10`}
          >
            <span className="absolute top-4 right-4 bg-violet-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Most Popular
            </span>
            <h3 className="text-xl font-semibold text-gray-900">Pro</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">$49</span>
              <span className="text-sm text-gray-500">/ month</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              $39 / month billed annually
            </p>
            <p className="mt-3 text-base font-medium text-gray-900">
              Finish real video workflows
            </p>
            <p className={`mt-1 ${subhead}`}>
              Batch processing · Long-form videos · Priority queue
            </p>
            <ul className={bullets}>
              <li>Batch processing</li>
              <li>Up to 5 languages</li>
              <li>Long-form video support</li>
            </ul>
            <p className="text-xs text-gray-500 mt-1">20 videos per batch · 60 min per batch</p>
            <p className={limits}>1,200 min / month</p>
            <p className={limits}>Up to 120 min per video</p>
            <p className={noteBoxPro}>
              Pro jobs are prioritized during high demand.
            </p>
            <div className="mt-6 space-y-2">
              <button
                onClick={() => handleSubscribe('pro', false)}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors"
              >
                Choose Pro
              </button>
              <button
                onClick={() => handleSubscribe('pro', true)}
                className="w-full py-2 text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                Save 20% with annual billing
              </button>
            </div>
          </div>

          {/* AGENCY — $129 / month (3,000 min) */}
          <div className={`${cardBase} border-gray-100 min-h-[420px]`}>
            <h3 className="text-xl font-semibold text-gray-900">Agency</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">$129</span>
              <span className="text-sm text-gray-500">/ month</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              $103 / month billed annually
            </p>
            <p className="mt-3 text-base font-medium text-gray-900">
              Scale without breaking your pipeline
            </p>
            <p className={`mt-1 ${subhead}`}>
              Heavy batch · ZIP exports · Commercial use
            </p>
            <ul className={bullets}>
              <li>Heavy batch processing</li>
              <li>ZIP batch exports</li>
              <li>Commercial usage allowed</li>
              <li>Up to 10 languages</li>
            </ul>
            <p className="text-xs text-gray-500 mt-1">100 videos per batch · 300 min per batch</p>
            <p className={limits}>3,000 min / month</p>
            <p className={limits}>Up to 240 min per video</p>
            <p className={noteBox}>
              Designed for sustained high-volume workloads.
            </p>
            <div className="mt-6 space-y-2">
              <button
                onClick={() => handleSubscribe('agency', false)}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors"
              >
                Choose Agency
              </button>
              <button
                onClick={() => handleSubscribe('agency', true)}
                className="w-full py-2 text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                Save 20% with annual billing
              </button>
            </div>
          </div>
        </div>

        {/* Overage footer */}
        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600 font-medium">
            Overage: 100 minutes = $5
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Visible, but not a replacement for upgrading.
          </p>
        </div>
      </div>
    </div>
  )
}
