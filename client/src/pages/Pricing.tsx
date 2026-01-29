import { createCheckoutSession } from '../lib/billing'
import { trackEvent } from '../lib/analytics'
import type { BillingPlan } from '../lib/billing'

export default function Pricing() {
  async function handleSubscribe(plan: BillingPlan) {
    try {
      const { url } = await createCheckoutSession({
        mode: 'subscription',
        plan,
        returnToPath: '/',
      })
      trackEvent('payment_completed', {
        type: 'subscription_checkout_started',
        plan,
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
            Simple plans with fair limits. Upgrade when you need more minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Free */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Free</h3>
            <div className="text-4xl font-bold text-gray-800 mb-4">$0</div>
            <p className="text-gray-600 mb-6">Perfect for trying things out</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-8">
              <li>• 200 minutes / month</li>
              <li>• Up to 10 min per video</li>
              <li>• 100MB file size limit</li>
              <li>• 1 language</li>
              <li>• No batch processing</li>
              <li>• No credit card required</li>
            </ul>
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
            <div className="text-4xl font-bold text-gray-800 mb-1">$19</div>
            <p className="text-xs text-gray-500 mb-4">per month</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-8">
              <li>• 600 minutes / month</li>
              <li>• Up to 30 min per video</li>
              <li>• 500MB file size limit</li>
              <li>• 1 language</li>
              <li>• Subtitle editing unlocked</li>
              <li>• No batch processing</li>
            </ul>
            <button
              onClick={() => handleSubscribe('basic')}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Choose Basic
            </button>
          </div>

          {/* Pro */}
          <div className="bg-white border-2 border-violet-600 rounded-xl p-8 relative">
            <div className="absolute top-4 right-4 bg-violet-600 text-white text-xs font-medium px-3 py-1 rounded-full">
              Most popular
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Pro</h3>
            <div className="text-4xl font-bold text-gray-800 mb-1">$49</div>
            <p className="text-xs text-gray-500 mb-4">per month</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-8">
              <li>• 1,500 minutes / month</li>
              <li>• Up to 120 min per video</li>
              <li>• 2GB file size limit</li>
              <li>• Up to 5 languages per video</li>
              <li>• Batch: 20 videos / 60 min per batch</li>
            </ul>
            <button
              onClick={() => handleSubscribe('pro')}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Choose Pro
            </button>
          </div>

          {/* Agency */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Agency</h3>
            <div className="text-4xl font-bold text-gray-800 mb-1">$149</div>
            <p className="text-xs text-gray-500 mb-4">per month</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-8">
              <li>• 5,000 minutes / month</li>
              <li>• Up to 240 min per video</li>
              <li>• 10GB file size limit</li>
              <li>• Up to 10 languages per video</li>
              <li>• Batch: 100 videos / 300 min per batch</li>
            </ul>
            <button
              onClick={() => handleSubscribe('agency')}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Choose Agency
            </button>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Need more minutes? You can always buy 100 extra minutes for $3 from inside the app when
          you hit your monthly limit.
        </p>
      </div>
    </div>
  )
}
