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
    'bg-white rounded-2xl border-2 p-6 sm:p-8 flex flex-col min-h-[420px]'
  const noticeClass =
    'text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-4 border border-gray-100'

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
          {/* Free */}
          <div className={`${cardBase} border-gray-200`}>
            <h3 className="text-xl font-semibold text-gray-900">Free</h3>
            <div className="mt-2 text-3xl font-bold text-gray-900">$0</div>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Try the magic · 1 language · No credit card
            </p>
            <p className="mt-1 text-xs text-gray-500">
              60 min/month · Up to 5 min per video
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 flex-1">
              <li>Watermark on subtitles</li>
              <li>No batch · 1 concurrent job</li>
            </ul>
            <p className={noticeClass}>
              Free jobs may queue longer during peak times.
            </p>
            <button
              disabled
              className="mt-6 w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-medium text-sm cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* Basic */}
          <div className={`${cardBase} border-gray-200`}>
            <h3 className="text-xl font-semibold text-gray-900">Basic</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">$15</span>
              <span className="text-sm text-gray-500">/mo</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">$12/mo billed annually</p>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Subtitle editing · 2 languages · No watermark
            </p>
            <p className="mt-1 text-xs text-gray-500">
              450 min/month · Up to 30 min per video
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 flex-1">
              <li>No batch · 1 concurrent job</li>
            </ul>
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

          {/* Pro */}
          <div
            className={`${cardBase} border-violet-500 relative shadow-lg shadow-violet-500/10`}
          >
            <span className="absolute top-4 right-4 bg-violet-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Most Popular
            </span>
            <h3 className="text-xl font-semibold text-gray-900">Pro</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">$49</span>
              <span className="text-sm text-gray-500">/mo</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">$39/mo billed annually</p>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed font-medium">
              Batch processing · 5 languages · Long-form video
            </p>
            <p className="mt-1 text-xs text-gray-500">
              1,200 min/month · Up to 120 min per video
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 flex-1">
              <li>20 videos / 60 min per batch</li>
              <li>2 concurrent jobs · Priority processing</li>
            </ul>
            <p className={`${noticeClass} border-violet-100 bg-violet-50/50 text-violet-800`}>
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

          {/* Agency */}
          <div className={`${cardBase} border-gray-200`}>
            <h3 className="text-xl font-semibold text-gray-900">Agency</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">$99</span>
              <span className="text-sm text-gray-500">/mo</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">$79/mo billed annually</p>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Heavy batch · ZIP exports · Commercial use
            </p>
            <p className="mt-1 text-xs text-gray-500">
              3,000 min/month · Up to 240 min per video
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 flex-1">
              <li>10 languages</li>
              <li>100 videos / 300 min per batch</li>
              <li>3 concurrent jobs</li>
            </ul>
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

        <p className="mt-12 text-center text-sm text-gray-600">
          Overage: 100 minutes = $5. Visible but not a replacement for upgrading.
        </p>
      </div>
    </div>
  )
}
