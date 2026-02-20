import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Shield, HelpCircle, CreditCard, FileVideo, Languages } from 'lucide-react'

const FAQ_ITEMS = [
  {
    category: 'Privacy & data',
    icon: Shield,
    q: 'Do you store my videos or files?',
    a: 'No. We process your files and then delete them. We don’t keep your uploads, transcripts, or generated outputs. Your content stays yours. We don’t retain it on our servers.',
  },
  {
    category: 'Privacy & data',
    icon: Shield,
    q: 'Is my content used for AI training?',
    a: 'No. Your content is used only to deliver the service you requested (e.g., transcription, subtitles). We do not use it for training models or any other purpose.',
  },
  {
    category: 'General',
    icon: HelpCircle,
    q: 'Do I need to sign up?',
    a: 'No. You can use the free tier without creating an account. Sign up or log in when you want to track usage, subscribe to a plan, or manage billing.',
  },
  {
    category: 'General',
    icon: HelpCircle,
    q: 'What file formats are supported?',
    a: 'Videos: MP4, MOV, AVI, WebM (and optionally MKV where noted). Subtitles: SRT and VTT. You can also paste a video URL for transcript and subtitle tools.',
  },
  {
    category: 'General',
    icon: FileVideo,
    q: 'What can I do with the transcript?',
    a: 'View it, copy it, or download it. On the transcript page you can also switch to Summary, Chapters, Speakers, and Keywords. Use the Translate button to view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian.',
  },
  {
    category: 'Billing',
    icon: CreditCard,
    q: 'How does the free tier work?',
    a: 'Free tier includes 60 minutes per month, single language, and a watermark on subtitle exports. No credit card required. Upgrade when you need more minutes, multiple languages, or batch processing.',
  },
  {
    category: 'Billing',
    icon: CreditCard,
    q: 'How do I cancel or change my plan?',
    a: 'Paid users can open “Manage subscription” on the Pricing page to upgrade, downgrade, or cancel via the Stripe customer portal. Access continues until the end of your billing period.',
  },
  {
    category: 'Tools',
    icon: Languages,
    q: 'Can I translate subtitles or transcripts?',
    a: 'Yes. For subtitles: use the Translate Subtitles tool (SRT/VTT to another language). For transcripts: after generating a transcript, use the Translate button to view it in English, Hindi, Telugu, Spanish, Chinese, or Russian.',
  },
  {
    category: 'General',
    icon: HelpCircle,
    q: 'Upload fails on my phone (e.g. after a minute or two). Why?',
    a: 'On mobile Safari and some phones, long uploads can be cut off by the browser or network after about 1–2 minutes. For large files: use Wi‑Fi (not cellular), keep the tab in the foreground and avoid locking the screen until the upload finishes. If it still fails, try from a laptop or a smaller file first.',
  },
]

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-gray-50 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-violet-600 hover:text-violet-700 font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently asked questions</h1>
        <p className="text-gray-600 mb-10">
          Quick answers about privacy, usage, and features. For a full guide to each tool (how to use, what we expect, what you get), see our <Link to="/guide" className="text-violet-600 hover:text-violet-700 font-medium">Guide</Link>. For data handling, see our <Link to="/privacy" className="text-violet-600 hover:text-violet-700 font-medium">Privacy Policy</Link>.
        </p>

        {/* Trust highlight */}
        <div className="mb-10 p-4 rounded-xl bg-violet-50 border border-violet-100 text-center">
          <p className="text-sm font-medium text-gray-800">
            Your files are processed and deleted. We don’t store your data.
          </p>
          <Link to="/privacy" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-1 inline-block">
            Read our privacy policy →
          </Link>
        </div>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item, index) => {
            const Icon = item.icon
            const isOpen = openIndex === index
            return (
              <div
                key={index}
                className="border border-gray-200 rounded-xl bg-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <Icon className="w-5 h-5 shrink-0 text-violet-600" aria-hidden />
                  <span className="font-medium text-gray-900 flex-1">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-sm text-gray-600 pl-8">{item.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
