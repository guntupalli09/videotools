import { Link } from 'react-router-dom'
import { Shield, Lock, Trash2, Server, Mail } from 'lucide-react'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-violet-600 hover:text-violet-700 font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        {/* Key selling point: we don't store your data */}
        <section className="mb-10 p-6 rounded-2xl bg-violet-50 border border-violet-100">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-violet-600" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">We don’t store your data</h2>
              <p className="text-gray-700 text-sm leading-relaxed">
                Your videos and files are processed and then deleted. We do not keep copies of your uploads, transcripts, or outputs on our servers after your session. What you create stays with you. We’re not in the business of holding your content.
              </p>
            </div>
          </div>
        </section>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Server className="w-5 h-5 text-violet-600" />
              Processing and retention
            </h2>
            <p>
              When you upload a file or paste a URL, we process it on our infrastructure to generate transcripts, subtitles, or other outputs. Temporary files created during processing are removed by our automated cleanup. We do not retain your source files or generated outputs for longer than needed to deliver your result (e.g., until you download or your session ends). Job metadata (e.g., job ID, status) may be kept for a short period for debugging and then removed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-violet-600" />
              Account and usage data
            </h2>
            <p>
              If you sign up or subscribe, we store account information (e.g., email, plan) and usage data (e.g., minutes used per month) necessary for billing and product limits. We do not use your content for training models or for any purpose other than providing the service you requested.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-violet-600" />
              Your control
            </h2>
            <p>
              You can use many features without creating an account. For paid users, you can manage your subscription and billing through our pricing page and the Stripe customer portal. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Cookies and analytics</h2>
            <p>
              We may use essential cookies and analytics to operate the site and improve the product. We do not use your uploaded content for advertising or profiling.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-violet-600" />
              Contact
            </h2>
            <p>
              For privacy-related questions or requests, use the Contact link in the footer or reach out via the support channel provided in the app.
            </p>
          </section>
        </div>

        <p className="mt-10 text-xs text-gray-500">
          This policy may be updated from time to time. The “Last updated” date at the top reflects the latest change.
        </p>
      </div>
    </div>
  )
}
