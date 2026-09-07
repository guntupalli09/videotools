/**
 * Brand-specific transcription guideline pages.
 * Renders a rich, SEO-optimized style guide for each supported transcription service.
 * Used by SeoToolPage via toolKey: 'brand-guideline'.
 */
import { useLocation, Link } from 'react-router-dom'
import {
  CheckCircle2,
  ArrowRight,
  BookOpen,
  FileText,
  Zap,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  AlertCircle,
  Star,
} from 'lucide-react'
import { useState } from 'react'
import { getBrandDataForPath, type BrandData } from '../data/brandGuidelineData'
import type { FaqItem, SeoDeepContent } from '../lib/seoRegistry'

interface BrandGuidelinePageProps {
  seoH1?: string
  seoIntro?: string
  faq?: FaqItem[]
  seoDeepContent?: SeoDeepContent
}

function VerbatimBadge({ style }: { style: BrandData['verbatimStyle'] }) {
  const labels = {
    clean: { label: 'Clean Verbatim', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    intelligent: { label: 'Intelligent Verbatim', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    strict: { label: 'Strict / Full Verbatim', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  }
  const { label, color } = labels[style]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  )
}

function DifficultyBadge({ level }: { level: BrandData['difficultyLevel'] }) {
  const labels = {
    beginner: { label: 'Beginner Friendly', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    intermediate: { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    advanced: { label: 'Advanced', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  }
  const { label, color } = labels[level]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-gray-900 dark:text-white pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-[15px] leading-relaxed">
          {a}
        </div>
      )}
    </div>
  )
}

const BRAND_PAGE_LINKS: { label: string; path: string; brand: string }[] = [
  { label: 'Rev Guidelines', path: '/rev-transcript-guidelines', brand: 'Rev' },
  { label: 'Rev Format Guide', path: '/rev-transcription-format', brand: 'Rev' },
  { label: 'Rev Style Guide', path: '/rev-style-guide', brand: 'Rev' },
  { label: 'Rev Captioning', path: '/rev-captioning-guidelines', brand: 'Rev' },
  { label: 'Rev Requirements', path: '/rev-transcription-requirements', brand: 'Rev' },
  { label: 'Rev AI Guide', path: '/rev-ai-transcription-guide', brand: 'Rev' },
  { label: 'GoTranscript Guidelines', path: '/gotranscript-guidelines', brand: 'GoTranscript' },
  { label: 'GoTranscript Format', path: '/gotranscript-transcription-format', brand: 'GoTranscript' },
  { label: 'GoTranscript Style Guide', path: '/gotranscript-style-guide', brand: 'GoTranscript' },
  { label: 'GoTranscript Rules', path: '/gotranscript-transcription-rules', brand: 'GoTranscript' },
  { label: 'GoTranscript Test Guide', path: '/gotranscript-test-guide', brand: 'GoTranscript' },
  { label: 'TranscribeMe Guidelines', path: '/transcribeme-guidelines', brand: 'TranscribeMe' },
  { label: 'TranscribeMe Style', path: '/transcribeme-transcription-style', brand: 'TranscribeMe' },
  { label: 'TranscribeMe Format', path: '/transcribeme-format-guide', brand: 'TranscribeMe' },
  { label: 'TranscribeMe Style Guide', path: '/transcribeme-style-guide', brand: 'TranscribeMe' },
  { label: 'TranscribeMe Exam', path: '/transcribeme-exam-guide', brand: 'TranscribeMe' },
  { label: 'Scribie Guidelines', path: '/scribie-transcription-guidelines', brand: 'Scribie' },
  { label: 'Scribie Format Guide', path: '/scribie-format-guide', brand: 'Scribie' },
  { label: 'Scribie Rules', path: '/scribie-transcription-rules', brand: 'Scribie' },
  { label: 'Scribie Style Guide', path: '/scribie-style-guide', brand: 'Scribie' },
  { label: 'Daily Transcripts Guidelines', path: '/daily-transcripts-guidelines', brand: 'Daily Transcripts' },
  { label: 'Daily Transcripts Format', path: '/daily-transcripts-format-guide', brand: 'Daily Transcripts' },
  { label: 'Daily Transcripts Style', path: '/daily-transcripts-style-guide', brand: 'Daily Transcripts' },
  { label: 'Transcribio Guidelines', path: '/transcribio-guidelines', brand: 'Transcribio' },
  { label: 'Transcribio Format', path: '/transcribio-format-guide', brand: 'Transcribio' },
  { label: 'Transcribio Style', path: '/transcribio-style-guide', brand: 'Transcribio' },
  { label: 'Verbit Guidelines', path: '/verbit-transcription-guidelines', brand: 'Verbit' },
  { label: 'Verbit Format Guide', path: '/verbit-format-guide', brand: 'Verbit' },
  { label: 'Speechpad Guidelines', path: '/speechpad-transcription-guidelines', brand: 'Speechpad' },
  { label: 'Speechpad Format', path: '/speechpad-format-guide', brand: 'Speechpad' },
  { label: 'Happy Scribe Guidelines', path: '/happy-scribe-transcription-guidelines', brand: 'Happy Scribe' },
  { label: 'Happy Scribe Format', path: '/happy-scribe-format-guide', brand: 'Happy Scribe' },
  { label: '3Play Media Guidelines', path: '/3play-media-transcription-guidelines', brand: '3Play Media' },
  { label: '3Play Media Format', path: '/3play-media-format-guide', brand: '3Play Media' },
  { label: 'GMR Transcription Guidelines', path: '/gmr-transcription-guidelines', brand: 'GMR Transcription' },
  { label: 'GMR Format Guide', path: '/gmr-transcript-format-guide', brand: 'GMR Transcription' },
]

export default function BrandGuidelinePage({ seoH1, seoIntro, faq }: BrandGuidelinePageProps) {
  const { pathname } = useLocation()
  const brand = getBrandDataForPath(pathname)

  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Brand guideline data not found.</p>
      </div>
    )
  }

  const h1 = seoH1 ?? `${brand.brandName} Transcription Guidelines`
  const intro =
    seoIntro ??
    `Complete formatting and style guide for ${brand.brandName} transcribers. Understand verbatim requirements, speaker labeling, timestamps, and every formatting rule you need to pass QA and earn top ratings.`
  const faqs = faq ?? []

  const otherBrandLinks = BRAND_PAGE_LINKS.filter((l) => l.path !== pathname).slice(0, 8)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Breadcrumb */}
      <nav className="max-w-5xl mx-auto px-6 pt-6 pb-2" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
          <li>
            <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Home
            </Link>
          </li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li>
            <Link to="/guideline-format" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Guideline Format
            </Link>
          </li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li className="text-gray-900 dark:text-white font-medium truncate">{h1}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="relative pt-10 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-blue-950/20" />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase tracking-wide">
              {brand.brandName} Style Guide
            </span>
            <VerbatimBadge style={brand.verbatimStyle} />
            <DifficultyBadge level={brand.difficultyLevel} />
          </div>

          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-4 leading-tight">
            {h1}
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/50 max-w-3xl mb-6">{intro}</p>

          <div className="mb-6 rounded-2xl border-2 border-blue-400 dark:border-blue-600 bg-white/90 dark:bg-gray-900/80 p-5 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300">
              Skip the manual reformat
            </p>
            <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">
              Format your file to these guidelines in one click
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Paste the transcript on Guideline Format and apply a {brand.shortName} preset. Free: 3 imports/mo, no card. Files deleted after processing.
            </p>
            <Link
              to="/guideline-format"
              className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all"
            >
              <Zap className="w-4 h-4" />
              Format your file to these guidelines in one click
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link
              to="/guideline-format"
              className="inline-flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-sm hover:underline"
            >
              Open Guideline Format
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#quick-rules"
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline"
            >
              <ClipboardList className="w-4 h-4" />
              Jump to Quick Reference
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 pb-24 space-y-16">

        {/* Brand Overview */}
        <section aria-labelledby="overview-heading">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 border border-gray-100 dark:border-gray-800">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="overview-heading" className="text-xl font-medium text-gray-900 dark:text-white mb-1">
                  About {brand.brandName} Transcription
                </h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{brand.description}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Verbatim Style</p>
                <div className="flex items-center gap-2">
                  <VerbatimBadge style={brand.verbatimStyle} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{brand.verbatimDescription}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Key Formatting Facts</p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
                    <span><strong className="text-gray-900 dark:text-white">Speaker labels:</strong> {brand.speakerLabelFormat}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
                    <span><strong className="text-gray-900 dark:text-white">Timestamps:</strong> {brand.timestampRequired ? 'Required' : 'Optional'} — {brand.timestampFormat}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
                    <span><strong className="text-gray-900 dark:text-white">Inaudible:</strong> {brand.inaudibleNotation}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
                    <span><strong className="text-gray-900 dark:text-white">Fillers:</strong> {brand.fillerWordsPolicy.substring(0, 80)}{brand.fillerWordsPolicy.length > 80 ? '…' : ''}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Speaker Label Example */}
        <section aria-labelledby="speaker-label-heading">
          <h2 id="speaker-label-heading" className="text-2xl font-medium text-gray-900 dark:text-white mb-3">
            {brand.brandName} Speaker Label Format
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {brand.brandName} uses the following speaker label convention. Using the wrong format is one of the most common reasons transcripts fail QA.
          </p>
          <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-6 border border-gray-700 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Example: Correct {brand.brandName} Speaker Label Format</p>
            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
              {brand.speakerLabelExample}
            </pre>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Format: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{brand.speakerLabelFormat}</code>
          </p>
        </section>

        {/* Quick Rules Table */}
        <section id="quick-rules" aria-labelledby="quick-rules-heading">
          <h2 id="quick-rules-heading" className="text-2xl font-medium text-gray-900 dark:text-white mb-3">
            {brand.brandName} Formatting Quick Reference
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-5">
            Use this table as a desktop reference while transcribing for {brand.brandName}. Bookmark it for instant lookups.
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 dark:text-gray-300 w-40">Category</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 dark:text-gray-300">Rule</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">Example</th>
                </tr>
              </thead>
              <tbody>
                {brand.quickRules.map((rule, i) => (
                  <tr
                    key={rule.category}
                    className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${i % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50/50 dark:bg-gray-900/50'}`}
                  >
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white align-top">{rule.category}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 align-top leading-relaxed">{rule.rule}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 align-top font-mono text-xs leading-relaxed hidden md:table-cell">
                      {rule.example ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Key Differences */}
        <section aria-labelledby="key-diff-heading">
          <h2 id="key-diff-heading" className="text-2xl font-medium text-gray-900 dark:text-white mb-3">
            What Makes {brand.brandName} Guidelines Unique
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-5">
            Transcribers who work across multiple services often make format errors when switching platforms. Here are the rules that distinguish {brand.brandName} from other services:
          </p>
          <ul className="space-y-3">
            {brand.keyDifferences.map((diff, i) => (
              <li key={i} className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl px-5 py-4 border border-blue-100 dark:border-blue-900/30">
                <Star className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-800 dark:text-gray-200 text-[15px]">{diff}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Filler Words Deep Dive */}
        <section aria-labelledby="filler-heading">
          <h2 id="filler-heading" className="text-2xl font-medium text-gray-900 dark:text-white mb-3">
            {brand.brandName} Filler Words Policy
          </h2>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="font-semibold text-amber-800 dark:text-amber-200">Filler word handling is the #1 QA failure point</p>
            </div>
            <p className="text-amber-700 dark:text-amber-300 leading-relaxed">{brand.fillerWordsPolicy}</p>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-5 border border-red-100 dark:border-red-900/30">
              <p className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                <span className="text-lg">✗</span> Words to remove
              </p>
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 font-mono">
                {brand.verbatimStyle === 'strict' ? (
                  <li className="italic">None — strict verbatim keeps everything</li>
                ) : (
                  <>
                    <li>"um", "uh", "hmm"</li>
                    <li>"you know" (when filler)</li>
                    <li>"like" (when filler)</li>
                    <li>"basically", "literally" (when filler)</li>
                    {brand.verbatimStyle === 'clean' && <li>false starts and repetitions</li>}
                  </>
                )}
              </ul>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-5 border border-green-100 dark:border-green-900/30">
              <p className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                <span className="text-lg">✓</span> Words to keep
              </p>
              <ul className="text-sm text-green-600 dark:text-green-400 space-y-1 font-mono">
                {brand.verbatimStyle === 'strict' ? (
                  <>
                    <li>"um", "uh", "hmm" — all fillers</li>
                    <li>all false starts and repetitions</li>
                    <li>every word as spoken</li>
                  </>
                ) : brand.verbatimStyle === 'intelligent' ? (
                  <>
                    <li>"um" when showing hesitation/nerves</li>
                    <li>false starts showing reconsideration</li>
                    <li>fillers that change meaning</li>
                    <li>emotional fillers ("um... I can't believe")</li>
                  </>
                ) : (
                  <>
                    <li>all content words</li>
                    <li>contractions as spoken</li>
                    <li>meaningful hesitations</li>
                    <li>repeated words that change meaning</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* Inaudible and Special Notations */}
        <section aria-labelledby="notations-heading">
          <h2 id="notations-heading" className="text-2xl font-medium text-gray-900 dark:text-white mb-5">
            {brand.brandName} Special Notation Reference
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Inaudible audio', notation: brand.inaudibleNotation, desc: 'When audio is unclear or cannot be transcribed' },
              { label: 'Crosstalk / overtalk', notation: brand.crossTalkNotation, desc: 'When two speakers talk simultaneously' },
              { label: 'Music / sound effects', notation: brand.musicSoundNotation, desc: 'For non-speech audio content' },
              { label: 'Timestamps', notation: brand.timestampFormat, desc: brand.timestampRequired ? 'Required at specified intervals' : 'Optional — used when client requests' },
            ].map((item) => (
              <div key={item.label} className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                <code className="text-sm font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded block mb-2">
                  {item.notation}
                </code>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow: How to use the GuidelineFormat tool */}
        <section aria-labelledby="workflow-heading" className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/20 dark:to-blue-950/20 rounded-xl p-8 border border-blue-100 dark:border-blue-900/30">
          <h2 id="workflow-heading" className="text-2xl font-medium text-gray-900 dark:text-white mb-3">
            Format Your Transcript to {brand.brandName} Standards Automatically
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            VideoText's Guideline Format tool lets you apply {brand.brandName} formatting rules to your transcript in seconds. Select the {brand.brandName} preset, paste your text, and see it formatted correctly — with QA validation to catch errors before submission.
          </p>
          <ol className="space-y-4 mb-7">
            {[
              { step: '1', title: `Open the Guideline Format tool`, detail: 'Go to /guideline-format to access the style guide formatter.' },
              { step: '2', title: `Select the ${brand.brandName} preset`, detail: `Choose "${brand.brandName}" from the preset selector to load all formatting rules automatically.` },
              { step: '3', title: 'Paste your transcript text', detail: 'Drop in your raw transcription text — fillers, formatting issues, and all.' },
              { step: '4', title: 'Review the live diff output', detail: 'See exactly what changed: filler words removed, speaker labels corrected, timestamps added where required.' },
              { step: '5', title: 'Export the corrected transcript', detail: 'Copy the QA-validated output ready to submit to ' + brand.brandName + '.' },
            ].map(({ step, title, detail }) => (
              <li key={step} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {step}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link
            to="/guideline-format"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all"
          >
            <FileText className="w-4 h-4" />
            Open {brand.brandName} Guideline Formatter
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* Comparison to other services */}
        <section aria-labelledby="compare-heading">
          <h2 id="compare-heading" className="text-2xl font-medium text-gray-900 dark:text-white mb-3">
            {brand.brandName} vs. Other Transcription Service Guidelines
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-5">
            Each platform has unique formatting requirements. Here's how {brand.brandName}'s style guide compares on the most critical formatting decisions:
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 dark:text-gray-300">Platform</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 dark:text-gray-300">Verbatim Level</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 dark:text-gray-300">Timestamps</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 dark:text-gray-300">Speaker Format</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { platform: 'Rev', verbatim: 'Clean verbatim', timestamps: 'Optional', speaker: '[Name]:' },
                  { platform: 'GoTranscript', verbatim: 'Clean verbatim', timestamps: 'Required (every segment)', speaker: 'Speaker 1:' },
                  { platform: 'TranscribeMe', verbatim: 'Intelligent verbatim', timestamps: 'Optional', speaker: '[Name]:' },
                  { platform: 'Scribie', verbatim: 'Full / strict verbatim', timestamps: 'Required (every paragraph)', speaker: 'Speaker 1:' },
                  { platform: 'Daily Transcripts', verbatim: 'Clean verbatim', timestamps: 'Optional', speaker: 'Name:' },
                  { platform: 'Verbit', verbatim: 'Contextual (legal/media)', timestamps: 'Required', speaker: 'Name: or [Speaker N]:' },
                  { platform: 'Speechpad', verbatim: 'Broadcast clean', timestamps: 'Required (per line)', speaker: 'NAME: (all caps)' },
                  { platform: 'GMR Transcription', verbatim: 'Strict verbatim', timestamps: 'Optional', speaker: 'Name:' },
                ].map((row, i) => (
                  <tr
                    key={row.platform}
                    className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${row.platform === brand.brandName ? 'bg-blue-50 dark:bg-blue-950/20 font-semibold' : i % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50/50 dark:bg-gray-900/50'}`}
                  >
                    <td className="px-5 py-4 text-gray-900 dark:text-white align-top flex items-center gap-2">
                      {row.platform === brand.brandName && <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      {row.platform}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 align-top">{row.verbatim}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 align-top">{row.timestamps}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 align-top font-mono text-xs">{row.speaker}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl font-medium text-gray-900 dark:text-white mb-5">
              Frequently Asked Questions: {brand.brandName} Transcription Guidelines
            </h2>
            <div className="space-y-3">
              {faqs.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </section>
        )}

        {/* Other Brand Guideline Pages */}
        <section aria-labelledby="other-brands-heading">
          <h2 id="other-brands-heading" className="text-2xl font-medium text-gray-900 dark:text-white mb-3">
            Transcription Style Guides for Other Services
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-5">
            Working across multiple transcription platforms? Browse format guides for other major services.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {otherBrandLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span className="truncate">{link.label}</span>
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              to="/guideline-format"
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline"
            >
              View all transcription style guides
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
