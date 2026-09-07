/**
 * SEO landing page: /microsoft-teams-alternative
 * Targets: "microsoft teams transcription alternative", "teams alternative transcription",
 *          "teams copilot alternative", "transcribe teams meeting without copilot"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: '$30/user/mo (Copilot add-on)' },
  { label: 'Works without Microsoft 365 Copilot', videotext: true, competitor: false },
  { label: 'Works on any Microsoft 365 plan', videotext: true, competitor: false },
  { label: 'Works on downloaded MP4 offline', videotext: true, competitor: false },
  { label: 'Works on Windows, Mac, Linux', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'No Microsoft account required', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: false },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'Transcribe any video file (not just Teams)', videotext: true, competitor: false },
  { label: 'Keyword index + chapter generation', videotext: true, competitor: false },
  { label: 'Speaker detection', videotext: true, competitor: true },
  { label: 'Whisper accuracy on recorded audio', videotext: '~98.5%', competitor: '~87%' },
]

const FAQ = [
  {
    q: 'Do I need Microsoft 365 Copilot to transcribe Teams meetings?',
    a: 'Yes — Teams Intelligent Recap and in-meeting transcription require a Microsoft 365 Copilot licence at $30/user/month on top of your existing 365 plan. VideoText is the free alternative: download your Teams recording as MP4 and upload it here. No Microsoft account or Copilot licence needed.',
  },
  {
    q: 'How do I download a Teams meeting recording to transcribe?',
    a: 'In Microsoft Teams: open the Chat or Channel where the meeting recording was saved → three-dot menu on the recording → Download. The file downloads as MP4. For recordings stored in OneDrive or SharePoint: go to OneDrive, find the recording under Recordings, and download it as MP4. Then upload the MP4 to VideoText.',
  },
  {
    q: 'Is VideoText more accurate than Teams\' built-in transcription?',
    a: 'VideoText uses Whisper large-v3 (~98.5% word accuracy on clear speech). Teams transcription uses Microsoft\'s Azure Cognitive Services speech model, which scores approximately 87% on mixed-quality meeting audio. VideoText also generates chapters, a keyword index, and SRT subtitle files — none of which Teams provides.',
  },
  {
    q: 'Does VideoText store my Teams meeting recordings?',
    a: 'No. Files are deleted immediately after transcription. Microsoft Teams stores recordings in OneDrive or SharePoint with retention policies set by your IT administrator. VideoText has zero data retention — nothing is kept after processing.',
  },
  {
    q: 'Can I get SRT caption files from a Teams recording?',
    a: 'Teams does not export transcripts as SRT or VTT files — output is a DOCX file inside the Teams interface. VideoText exports proper SRT and VTT files you can upload to YouTube, Vimeo, or any other platform.',
  },
  {
    q: 'Does VideoText work for Teams meetings with external guests?',
    a: 'Yes. Once you have the MP4 recording, VideoText transcribes it regardless of who was in the meeting. Speaker labels separate each voice automatically — no meeting roster needed.',
  },
]

function Cell({ val, isUs = false }: { val: boolean | string; isUs?: boolean }) {
  if (typeof val === 'string') {
    return <span className={`text-sm font-semibold ${isUs ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{val}</span>
  }
  return val
    ? <CheckCircle2 className={`w-5 h-5 mx-auto ${isUs ? 'text-blue-500' : 'text-blue-400/80'}`} />
    : <XCircle className="w-5 h-5 mx-auto text-gray-300 dark:text-gray-700" />
}

export default function MicrosoftTeamsAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gray-50 py-20 dark:border-white/[0.08] dark:bg-gray-900/50 sm:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Microsoft Teams Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            Transcribe{' '}
            <span className="text-blue-600 dark:text-blue-400">
              Teams meetings
            </span>{' '}
            without a Copilot licence
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Microsoft 365 Copilot transcription costs $30/user/month extra. VideoText transcribes any Teams recording for free — download the MP4, upload it here, get speaker-labelled text in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · No Microsoft account needed</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for an alternative */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why users search for a Microsoft Teams transcription alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Teams added AI meeting notes and transcription in 2023, but the features are gated behind Microsoft 365 Copilot — an expensive add-on that most organisations have not deployed:
          </p>
          <ul className="space-y-3">
            {[
              'Microsoft 365 Copilot costs $30/user/month on top of existing Microsoft 365 subscription.',
              'Intelligent Recap and AI meeting notes require Copilot — not included in any base 365 plan.',
              'Transcripts are stored in OneDrive and controlled by IT policies — not user-controlled.',
              'No SRT or VTT export — outputs a DOCX file inside the Teams interface only.',
              'Cannot transcribe recordings from outside Teams (other platforms, local video files).',
              'No subtitle translation — output is in the meeting language only.',
              'Only available in enterprise environments — not accessible without a work Microsoft 365 account.',
            ].map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* Comparison table */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Microsoft Teams Copilot — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Teams + Copilot</div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/[0.03] bg-white dark:bg-gray-900/50">
              {COMPARE_ROWS.map((row) => (
                <div key={row.label} className="grid grid-cols-3 px-5 py-3.5 items-center">
                  <span className="text-sm text-gray-700 dark:text-white/60">{row.label}</span>
                  <div className="text-center"><Cell val={row.videotext} isUs /></div>
                  <div className="text-center"><Cell val={row.competitor} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* When Teams Copilot is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When Microsoft Teams Copilot is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Microsoft 365 Copilot is the right tool if your organisation has already deployed it and you need <strong>live AI meeting notes during the call</strong>, deep integration with Microsoft 365 apps (Word, Outlook, Loop), and a company-wide searchable meeting archive. It is also better for <strong>regulated industries</strong> where data must stay within Microsoft's compliance boundary. VideoText is better when you just need to transcribe a downloaded recording quickly — without enterprise IT setup or per-seat licensing.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: DollarSign, title: 'No Copilot licence needed', body: 'Teams transcription requires $30/user/month Copilot add-on. VideoText is free to start — download your Teams MP4 and process it here without any Microsoft licence.' },
            { icon: Shield, title: 'Files deleted immediately', body: 'Teams keeps meeting transcripts in OneDrive under IT-controlled policies. VideoText deletes your file immediately after transcription — zero retention.' },
            { icon: Zap, title: 'SRT export + 70+ language translation', body: 'Export SRT or VTT subtitle files and translate to 70+ languages. Teams Copilot outputs DOCX files inside Teams only — no subtitle export, no translation.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-600/15 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{body}</p>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">{q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl border border-white/[0.08] bg-gray-950 p-8 text-center sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Transcribe your Teams recording now</h2>
          <p className="text-white/55 mb-8 max-w-xl mx-auto">Download the MP4 from OneDrive or Teams, upload it here. Full speaker-labelled transcript in minutes — no Copilot licence needed.</p>
          <Link to="/video-to-transcript">
            <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-blue-700">
              Try VideoText free
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
