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

  return (
    <div className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Pricing</h1>
          <p className="text-lg text-gray-600">
            Features and outcomes first. Upgrade when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Free */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Free</h3>
            <div className="text-4xl font-bold text-gray-800 mb-4">$0</div>
            <p className="text-gray-600 mb-2 text-sm">
              Try the magic • 1 language • No credit card
            </p>
            <p className="text-xs text-gray-500 mb-4">60 min/month • Up to 5 min per video</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li>• Watermark on subtitles</li>
              <li>• No batch</li>
              <li>• 1 concurrent job</li>
            </ul>
            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mb-4">
              Free jobs may queue longer during peak times.
            </p>
            <button
              disabled
              className="w-full bg-gray-100 text-gray-400 py-3 rounded-lg font-medium cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* Basic */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Basic</h3>
            <div className="text-4xl font-bold text-gray-800 mb-1">$15</div>
            <p className="text-xs text-gray-500 mb-1">per month</p>
            <p className="text-xs text-gray-600 mb-2">or $12/mo billed annually</p>
            <p className="text-gray-600 mb-2 text-sm">
              Subtitle editing • 2 languages (user choice) • No watermark
            </p>
            <p className="text-xs text-gray-500 mb-4">450 min/month • Up to 30 min per video</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li>• No batch</li>
              <li>• 1 concurrent job</li>
            </ul>
            <button
              onClick={() => handleSubscribe('basic', false)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-medium transition-colors mb-2"
            >
              Choose Basic
            </button>
            <button
              onClick={() => handleSubscribe('basic', true)}
              className="w-full border border-violet-600 text-violet-600 hover:bg-violet-50 py-2 rounded-lg text-sm"
            >
              Save 20% annually
            </button>
          </div>

          {/* Pro - Most Popular */}
          <div className="bg-white border-2 border-violet-600 rounded-xl p-8 relative">
            <div className="absolute top-4 right-4 bg-violet-600 text-white text-xs font-medium px-3 py-1 rounded-full">
              Most Popular
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Pro</h3>
            <div className="text-4xl font-bold text-gray-800 mb-1">$49</div>
            <p className="text-xs text-gray-500 mb-1">per month</p>
            <p className="text-xs text-gray-600 mb-2">or $39/mo billed annually</p>
            <p className="text-gray-600 mb-2 text-sm font-medium">
              Batch processing • 5 languages • Long-form video support
            </p>
            <p className="text-xs text-gray-500 mb-2">1,200 min/month • Up to 120 min per video</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li>• 20 videos / 60 min per batch</li>
              <li>• 2 concurrent jobs</li>
              <li>• Priority processing</li>
            </ul>
            <p className="text-xs text-violet-700 bg-violet-50 rounded p-2 mb-4">
              Pro jobs are prioritized during high demand.
            </p>
            <button
              onClick={() => handleSubscribe('pro', false)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-medium transition-colors mb-2"
            >
              Choose Pro
            </button>
            <button
              onClick={() => handleSubscribe('pro', true)}
              className="w-full border border-violet-600 text-violet-600 hover:bg-violet-50 py-2 rounded-lg text-sm"
            >
              Save 20% annually
            </button>
          </div>

          {/* Agency */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Agency</h3>
            <div className="text-4xl font-bold text-gray-800 mb-1">$99</div>
            <p className="text-xs text-gray-500 mb-1">per month</p>
            <p className="text-xs text-gray-600 mb-2">or $79/mo billed annually</p>
            <p className="text-gray-600 mb-2 text-sm">
              Heavy batch • ZIP exports • Commercial usage allowed
            </p>
            <p className="text-xs text-gray-500 mb-2">3,000 min/month • Up to 240 min per video</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li>• 10 languages</li>
              <li>• 100 videos / 300 min per batch</li>
              <li>• 3 concurrent jobs</li>
            </ul>
            <button
              onClick={() => handleSubscribe('agency', false)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-medium transition-colors mb-2"
            >
              Choose Agency
            </button>
            <button
              onClick={() => handleSubscribe('agency', true)}
              className="w-full border border-violet-600 text-violet-600 hover:bg-violet-50 py-2 rounded-lg text-sm"
            >
              Save 20% annually
            </button>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Overage: 100 minutes = $5. Visible but not a replacement for upgrading.
        </p>
      </div>
    </div>
  )
}
