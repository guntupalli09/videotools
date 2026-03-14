import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, Shield, HelpCircle, CreditCard, FileVideo, Languages, Zap, BarChart2 } from "lucide-react"

const FAQ_ITEMS = [
  // Privacy & data
  {
    category: "Privacy & data",
    icon: Shield,
    q: "Do you store my videos or files?",
    a: "No. We process your files and then delete them immediately after the job completes. We don\"t keep your uploads, transcripts, or generated outputs. Your content stays yours.",
  },
  {
    category: "Privacy & data",
    icon: Shield,
    q: "Is my content used for AI training?",
    a: "No. Your content is used only to deliver the service you requested. We do not use it for training AI models or any other secondary purpose.",
  },
  {
    category: "Privacy & data",
    icon: Shield,
    q: "How is VideoText different from Otter.ai or Descript on privacy?",
    a: "Otter.ai and Descript store your audio and video files in their cloud — indefinitely, by default. VideoText deletes your file the moment processing finishes. We store only job metadata (duration, tool type) for billing. If you handle sensitive meetings, legal content, or confidential client material, VideoText\"s file-deletion model is safer.",
  },
  {
    category: "Privacy & data",
    icon: Shield,
    q: "Where are my files processed?",
    a: "Files are processed on our servers (EU/US depending on region). We use encrypted transit (HTTPS). Files are written to a temporary directory, processed, and deleted. We do not use third-party cloud storage for your content.",
  },
  // General
  {
    category: "General",
    icon: HelpCircle,
    q: "Do I need to sign up?",
    a: "Sign up for a free account to try. No credit card required. You get 3 free imports per month. Upgrade when you need more imports, languages, or batch processing.",
  },
  {
    category: "General",
    icon: HelpCircle,
    q: "Can I transcribe a YouTube video without downloading it?",
    a: "Yes. Paste any public YouTube URL (youtube.com or youtu.be) into the Video to Transcript tool. We stream the audio and transcribe it directly — no download, no file upload. Works with public videos, Shorts, and age-restricted content (with optional cookies). Same features: speakers, summary, chapters, translate to 6 languages.",
  },
  {
    category: "General",
    icon: HelpCircle,
    q: "What file formats are supported?",
    a: "Videos: MP4, MOV, AVI, WebM (MKV where noted). Subtitles: SRT and VTT. For transcript, you can also paste a YouTube URL — no file needed.",
  },
  {
    category: "General",
    icon: FileVideo,
    q: "What can I do with the transcript?",
    a: "View, copy, or download it. The transcript page also offers: Summary (key points, action items), Chapters (timestamped sections), Speakers (who said what), Highlights, Keywords, and Clean view (filler words removed). Use Translate to view in English, Hindi, Telugu, Spanish, Chinese, or Russian. Export formats include TXT, SRT, VTT; JSON/CSV/Markdown/DOCX/PDF on paid plans.",
  },
  {
    category: "General",
    icon: HelpCircle,
    q: "How do I transcribe a video for free?",
    a: "Sign up for free (no credit card). You get 3 imports per month. Go to Video to Transcript, upload your video or paste a YouTube URL, set the language, and click Start. Your transcript is ready in 1–8 minutes depending on video length. Copy it or download as TXT.",
  },
  {
    category: "General",
    icon: HelpCircle,
    q: "Can I transcribe a Zoom or Teams recording?",
    a: "Yes. Zoom saves recordings as MP4. Download the recording from your Zoom portal or local Zoom folder, then upload to Video to Transcript. Set “Speakers” in the result to label who said what. For a full step-by-step, see our blog guide on transcribing Zoom recordings.",
  },
  {
    category: "General",
    icon: HelpCircle,
    q: "What is the difference between transcription and subtitles?",
    a: "A transcript is plain text — the spoken words, optionally with timestamps. Subtitles (SRT/VTT) are time-coded text files where each line is mapped to a specific moment in the video. Transcripts are for reading and search. Subtitles are for adding captions to video players, YouTube, or burning into the video for social media.",
  },
  {
    category: "General",
    icon: HelpCircle,
    q: "Upload fails on my phone. Why?",
    a: "On mobile Safari and some phones, long uploads can be cut off by the browser after 1–2 minutes. Use Wi-Fi (not cellular), keep the tab in the foreground, and avoid locking the screen during upload. For large files, a laptop is more reliable.",
  },
  // Accuracy & quality
  {
    category: "Accuracy & quality",
    icon: BarChart2,
    q: "How accurate is VideoText\"s transcription?",
    a: "VideoText uses OpenAI Whisper large-v3. On clear speech with minimal background noise, accuracy is approximately 98.5% word accuracy. Accuracy is lower for: heavy accents, fast speech, overlapping speakers, or poor microphone quality. Setting the spoken language manually (rather than auto-detect) improves results for non-English content.",
  },
  {
    category: "Accuracy & quality",
    icon: BarChart2,
    q: "Is VideoText more accurate than Otter.ai or Descript?",
    a: "VideoText uses Whisper large-v3 (98.5% on clean audio). Otter.ai uses its own model, strong for live meetings but typically ~90% on pre-recorded video. Descript uses a Whisper derivative (~95%). For pre-recorded video content — lectures, YouTube, podcasts, interviews — VideoText is generally more accurate than Otter and comparable to Descript, at a lower price.",
  },
  {
    category: "Accuracy & quality",
    icon: BarChart2,
    q: "What languages are supported?",
    a: "Transcription: 50+ languages via Whisper, including English, Spanish, French, German, Arabic, Hindi, Japanese, Chinese, Portuguese, Russian, Italian, Dutch, and more. Subtitle translation: 50+ target languages. In-app transcript translation: English, Hindi, Telugu, Spanish, Chinese, Russian.",
  },
  {
    category: "Accuracy & quality",
    icon: BarChart2,
    q: "How long does transcription take?",
    a: "Processing starts immediately and streams results in real time — you see the first words within 15–30 seconds. Median total times: 5-minute video in ~30–60 seconds; 30-minute video in 2–4 minutes; 60-minute video in 5–8 minutes; 2-hour video in ~12–15 minutes. Times vary with server load. Paid plans have queue priority.",
  },
  {
    category: "Accuracy & quality",
    icon: BarChart2,
    q: "Why is the transcript sometimes inaccurate for names or technical terms?",
    a: "Whisper AI transcribes speech phonetically. Uncommon proper nouns, brand names, and technical jargon may be misheard. Use the Clean tab to manually edit segments, or use the Exports → DOCX option (paid) and do a find-replace in Word. Setting the spoken language manually helps Whisper apply the correct phoneme set.",
  },
  // Tools
  {
    category: "Tools",
    icon: Languages,
    q: "Can I translate subtitles or transcripts?",
    a: "Yes. For subtitle files: use Translate Subtitles — upload SRT or VTT, pick a target language, download the translated file with original timestamps intact. For transcripts: after generating, click Translate to view in English, Hindi, Telugu, Spanish, Chinese, or Russian.",
  },
  {
    category: "Tools",
    icon: Languages,
    q: "How do I add subtitles to a video permanently (burn in)?",
    a: "Use Burn Subtitles: upload your video and your SRT or VTT file. Choose position and font size. Click Start. Download the output — a single MP4 with captions permanently embedded. No player subtitle support needed. This is the correct format for Instagram Reels, TikTok, and any platform where video plays silently by default.",
  },
  {
    category: "Tools",
    icon: Languages,
    q: "How do I fix subtitle timing issues?",
    a: "Use Fix Subtitles: upload your SRT or VTT file. The tool detects overlapping timestamps, lines that are too long (over 42 characters, YouTube limit), and gaps. Click Start to apply fixes. Download the corrected file. For manual edits, paid plans include an in-app subtitle editor.",
  },
  {
    category: "Tools",
    icon: Languages,
    q: "What export formats are available?",
    a: "Transcript exports: TXT (all plans), SRT, VTT (all plans); JSON, CSV, Markdown, Notion, DOCX, PDF (paid plans). Subtitle exports: SRT, VTT. Batch exports: ZIP containing one SRT per video. Translated subtitle exports: SRT or VTT in the target language.",
  },
  {
    category: "Tools",
    icon: FileVideo,
    q: "Can I process multiple videos at once?",
    a: "Yes, with Batch Processing (Pro and Agency plans). Upload up to 20 videos (Pro) or 100 videos (Agency). Each video is processed in parallel. When all jobs complete, download a single ZIP with one SRT per video. Failed videos are listed in an error log included in the ZIP.",
  },
  // Billing
  {
    category: "Billing",
    icon: CreditCard,
    q: "How does the free tier work?",
    a: "Sign up for free to get 3 imports per month (resets on the 1st of each month). Single language, watermark on subtitle exports. No credit card required. Upgrade when you need more imports, multiple languages, or batch processing.",
  },
  {
    category: "Billing",
    icon: CreditCard,
    q: "What does “Creator Pro locked” mean?",
    a: "Creator Pro is an early-user pricing tier at $10/month, locked forever for users who subscribed early. It is equivalent to the Pro plan in features but at the introductory price. New subscribers see the current Creator Pro price on the Pricing page.",
  },
  {
    category: "Billing",
    icon: CreditCard,
    q: "How do I cancel or change my plan?",
    a: "Paid users: open “Manage subscription” on the Pricing page to upgrade, downgrade, or cancel via the Stripe portal. Access continues until the end of your billing period. No partial refunds for mid-cycle cancellations.",
  },
  {
    category: "Billing",
    icon: CreditCard,
    q: "Do you offer refunds?",
    a: "Yes. 7-day money-back guarantee — email us within 7 days of subscribing for a full refund, no questions asked. If a processing job fails due to a server error, the minutes are automatically returned to your account.",
  },
  // Speed
  {
    category: "Speed",
    icon: Zap,
    q: "Why is VideoText faster than Descript or Otter.ai?",
    a: "VideoText is built for one purpose: fast transcription. We skip the video editor, cloud storage round-trips, and unnecessary processing overhead. Our pipeline is: upload → audio extraction (FFmpeg) → Whisper transcription → stream results. No object storage reads, no editor rendering. A 2-hour video processes in ~3 minutes vs 15–20 minutes in Descript.",
  },
  {
    category: "Speed",
    icon: Zap,
    q: "What is the maximum video duration?",
    a: "Free: 30 minutes per video. Basic: 45 minutes. Pro: 2 hours. Agency: 4 hours. Longer videos are rejected at upload. To transcribe a longer video, trim it first or split it into segments before uploading.",
  },
]

const CATEGORY_ORDER = ["Privacy & data", "General", "Accuracy & quality", "Tools", "Billing", "Speed"]

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  // Group items by category in the defined order
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: FAQ_ITEMS.map((item, i) => ({ ...item, index: i })).filter((item) => item.category === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="min-h-screen bg-gray-50 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-violet-600 hover:text-violet-700 font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently asked questions</h1>
        <p className="text-gray-600 mb-6">
          Quick answers about privacy, accuracy, tools, and billing. For a step-by-step guide to each tool, see our{" "}
          <Link to="/guide" className="text-violet-600 hover:text-violet-700 font-medium">Guide</Link>.
          For comparisons, see <Link to="/compare" className="text-violet-600 hover:text-violet-700 font-medium">VideoText vs competitors</Link>.
        </p>

        {/* Trust highlight */}
        <div className="mb-8 p-4 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm font-medium text-gray-800">
            Your files are processed and deleted. We don"t store your data.
          </p>
          <Link to="/privacy" className="text-xs text-violet-600 hover:text-violet-700 font-medium whitespace-nowrap">
            Read our privacy policy →
          </Link>
        </div>

        {/* Category-grouped FAQ */}
        <div className="space-y-8">
          {grouped.map(({ category, items }) => (
            <section key={category}>
              <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-5 h-px bg-violet-300" />
                {category}
              </h2>
              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = item.icon
                  const isOpen = openIndex === item.index
                  return (
                    <div key={item.index} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenIndex(isOpen ? null : item.index)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <Icon className="w-5 h-5 shrink-0 text-violet-600" aria-hidden />
                        <span className="font-medium text-gray-900 flex-1 text-sm">{item.q}</span>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          aria-hidden
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-0">
                          <p className="text-sm text-gray-600 pl-8 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Cross-links */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { to: "/guide", label: "Full tool guide →", desc: "Step-by-step for every tool." },
            { to: "/compare", label: "Compare competitors →", desc: "VideoText vs Descript, Otter, Trint." },
            { to: "/blog", label: "Blog & how-tos →", desc: "Zoom transcription, SRT vs VTT, more." },
          ].map(({ to, label, desc }) => (
            <Link key={to} to={to} className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-sm transition-all">
              <span className="text-sm font-semibold text-violet-600">{label}</span>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
