import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-violet-600 hover:text-violet-700 font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-gray max-w-none space-y-6 text-sm text-gray-700">
          <p>
            By using VideoText (“the service”), you agree to these terms. If you do not agree, do not use the service.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Use of the service</h2>
            <p>
              You may use the service to transcribe video, generate and translate subtitles, fix timing, burn captions, compress video, and related tasks, in accordance with your plan and our acceptable-use policies. You are responsible for ensuring that your use and your content comply with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Privacy and data</h2>
            <p>
              We do not store your uploaded files or generated outputs beyond what is needed to deliver the service. For details, see our <Link to="/privacy" className="text-violet-600 hover:text-violet-700 font-medium">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Billing and subscriptions</h2>
            <p>
              Paid plans are billed via Stripe. By subscribing, you agree to Stripe’s terms and our pricing. You can cancel or change your plan through the Stripe customer portal (Manage subscription on the Pricing page).
            </p>
            <p className="mt-3">
              <strong>Refund policy:</strong> If you are not satisfied with your subscription, you may request a full refund within 7 days of your initial purchase by emailing support. After 7 days, refunds are at our discretion. If a processing job fails due to a server error, the minutes consumed by that job are returned to your account automatically. Overage charges ($5 per 100 minutes) are non-refundable once the processing has completed successfully.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Disclaimer</h2>
            <p>
              The service is provided “as is.” We do not guarantee uninterrupted or error-free operation. We are not liable for indirect or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Changes</h2>
            <p>
              We may update these terms from time to time. Continued use after changes constitutes acceptance. The “Last updated” date above reflects the latest version.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact</h2>
            <p>
              For questions about these terms, use the Contact link in the footer or the support channel provided in the app.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
