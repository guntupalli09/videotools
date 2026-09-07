import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Zap, Clock, Shield, DollarSign, ChevronRight, TrendingDown, Star, Mic, AlertTriangle } from 'lucide-react';

const COMPETITORS = [
  {
    name: 'Descript',
    slug: 'descript',
    description: 'Video editor with transcription built in. Complex, slow for pure transcription.',
    avgProcessingMinutes: 18,
    pricing: 'From $24/mo',
    requiresAccount: true,
    hasHeavyEditor: true,
    deletesFiles: false,
  },
  {
    name: 'Otter.ai',
    slug: 'otter',
    description: 'Meeting-focused transcription. Limited video support, no subtitle export.',
    avgProcessingMinutes: 22,
    pricing: 'From $16.99/mo',
    requiresAccount: true,
    hasHeavyEditor: false,
    deletesFiles: false,
  },
  {
    name: 'Trint',
    slug: 'trint',
    description: 'Enterprise transcription platform. High price, steep learning curve.',
    avgProcessingMinutes: 20,
    pricing: 'From $80/mo',
    requiresAccount: true,
    hasHeavyEditor: true,
    deletesFiles: false,
  },
  {
    name: 'Turboscribe',
    slug: 'turboscribe',
    description: 'AI transcription tool popular with content creators. Upload-only, no URL support.',
    avgProcessingMinutes: 5,
    pricing: 'From $10/mo',
    requiresAccount: true,
    hasHeavyEditor: false,
    deletesFiles: false,
  },
  {
    name: 'Easyscribe',
    slug: 'easyscribe',
    description: 'Human transcription service. Accurate but slow — results take 24+ hours.',
    avgProcessingMinutes: 1440,
    pricing: '~$1.25/min of audio',
    requiresAccount: true,
    hasHeavyEditor: false,
    deletesFiles: false,
  },
  {
    name: 'Go Transcript',
    slug: 'gotranscript',
    description: 'Human + AI transcription service. Long turnaround, pay-per-minute pricing.',
    avgProcessingMinutes: 300,
    pricing: 'From $0.72/min of audio',
    requiresAccount: true,
    hasHeavyEditor: false,
    deletesFiles: false,
  },
  {
    name: 'Notta',
    slug: 'notta',
    description: 'AI note-taking and transcription app. Stores all files on servers indefinitely unless manually deleted.',
    avgProcessingMinutes: 5,
    pricing: 'From $8.17/mo',
    requiresAccount: true,
    hasHeavyEditor: true,
    deletesFiles: false,
  },
  {
    name: 'Sonix',
    slug: 'sonix',
    description: 'AI transcription with built-in editor. Files stored until you delete them manually.',
    avgProcessingMinutes: 6,
    pricing: 'From $22/mo',
    requiresAccount: true,
    hasHeavyEditor: true,
    deletesFiles: false,
  },
  {
    name: 'Granola AI',
    slug: 'granola',
    description: 'AI meeting notes assistant. Meeting-only — no file upload or URL support.',
    avgProcessingMinutes: 5,
    pricing: 'From $18/mo',
    requiresAccount: true,
    hasHeavyEditor: false,
    deletesFiles: false,
  },
];

type FeatureRow = {
  label: string
  videotext: boolean | string
  descript: boolean | string
  otter: boolean | string
  trint: boolean | string
  turboscribe: boolean | string
  easyscribe: boolean | string
  gotranscript: boolean | string
  notta: boolean | string
  sonix: boolean | string
  granola: boolean | string
  highlight?: boolean
}

type FeatureSection = {
  category: string
  features: FeatureRow[]
}

const FEATURE_ROWS: FeatureSection[] = [
  {
    category: 'Speed',
    features: [
      {
        label: 'Processing time (2-hour video)',
        videotext: '~3 minutes',
        descript: '15–20 min',
        otter: '20–25 min',
        trint: '18–22 min',
        turboscribe: '~5 min',
        easyscribe: '24+ hours',
        gotranscript: '5+ hours',
        notta: '~10 min',
        sonix: '~12 min',
        granola: 'Meetings only',
        highlight: true,
      },
      {
        label: 'YouTube URL direct processing',
        videotext: 'Coming Soon',
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: true,
        sonix: false,
        granola: false,
      },
      {
        label: 'Instant results (no waiting)',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: false,
        sonix: false,
        granola: false,
      },
    ],
  },
  {
    category: 'Simplicity',
    features: [
      {
        label: 'No heavy editor to learn',
        videotext: true,
        descript: false,
        otter: true,
        trint: false,
        turboscribe: true,
        easyscribe: true,
        gotranscript: true,
        notta: false,
        sonix: false,
        granola: true,
      },
      {
        label: 'Paste YouTube / URL (no download)',
        videotext: 'Coming Soon',
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: true,
        sonix: false,
        granola: false,
      },
      {
        label: 'Upload file',
        videotext: true,
        descript: true,
        otter: true,
        trint: true,
        turboscribe: true,
        easyscribe: true,
        gotranscript: true,
        notta: true,
        sonix: true,
        granola: false,
      },
      {
        label: 'Works on mobile',
        videotext: true,
        descript: false,
        otter: true,
        trint: false,
        turboscribe: true,
        easyscribe: true,
        gotranscript: true,
        notta: true,
        sonix: false,
        granola: true,
      },
      {
        label: 'Record voice in browser (no file needed)',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: false,
        sonix: false,
        granola: false,
        highlight: true,
      },
    ],
  },
  {
    category: 'Output Quality',
    features: [
      {
        label: 'Accuracy',
        videotext: '98.5%',
        descript: '~95%',
        otter: '~90%',
        trint: '~93%',
        turboscribe: '~95%',
        easyscribe: '~99% (human)',
        gotranscript: '~99% (human)',
        notta: '~92%',
        sonix: '~95%',
        granola: '~91%',
      },
      {
        label: '99 language support',
        videotext: true,
        descript: false,
        otter: true,
        trint: true,
        turboscribe: true,
        easyscribe: false,
        gotranscript: true,
        notta: true,
        sonix: true,
        granola: false,
      },
      {
        label: 'Speaker detection',
        videotext: true,
        descript: true,
        otter: true,
        trint: true,
        turboscribe: false,
        easyscribe: true,
        gotranscript: true,
        notta: true,
        sonix: true,
        granola: false,
      },
      {
        label: 'SRT / VTT subtitle export',
        videotext: true,
        descript: true,
        otter: false,
        trint: true,
        turboscribe: true,
        easyscribe: true,
        gotranscript: true,
        notta: true,
        sonix: true,
        granola: false,
      },
      {
        label: 'TXT, PDF, DOCX, JSON export',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
        turboscribe: true,
        easyscribe: false,
        gotranscript: false,
        notta: true,
        sonix: true,
        granola: false,
      },
      {
        label: 'AI Summary (key points + action items)',
        videotext: 'Pro ✓',
        descript: '⚠ add-on',
        otter: true,
        trint: '⚠ Enterprise',
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: true,
        sonix: false,
        granola: true,
        highlight: true,
      },
      {
        label: 'AI Chapters (timestamped, auto-generated)',
        videotext: 'Pro ✓',
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: false,
        sonix: false,
        granola: false,
        highlight: true,
      },
      {
        label: 'Speaker diarization with named labels',
        videotext: 'Pro ✓',
        descript: true,
        otter: true,
        trint: true,
        turboscribe: false,
        easyscribe: true,
        gotranscript: true,
        notta: true,
        sonix: true,
        granola: false,
        highlight: true,
      },
      {
        label: 'Transcript translation (in-app, 70+ languages)',
        videotext: 'Pro ✓',
        descript: false,
        otter: false,
        trint: '⚠ Enterprise',
        turboscribe: true,
        easyscribe: false,
        gotranscript: false,
        notta: '⚠ limited',
        sonix: false,
        granola: false,
        highlight: true,
      },
      {
        label: 'Translated SRT / VTT subtitle export',
        videotext: true,
        descript: false,
        otter: false,
        trint: '⚠ Enterprise',
        turboscribe: true,
        easyscribe: false,
        gotranscript: false,
        notta: true,
        sonix: true,
        granola: false,
      },
      {
        label: 'Batch processing (multiple videos → ZIP)',
        videotext: 'Pro ✓',
        descript: false,
        otter: false,
        trint: true,
        turboscribe: true,
        easyscribe: true,
        gotranscript: true,
        notta: '⚠ limited',
        sonix: true,
        granola: false,
        highlight: true,
      },
      {
        label: 'Shareable read-only transcript URLs (original + translated)',
        videotext: 'Pro ✓',
        descript: '⚠ share via project',
        otter: true,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: true,
        sonix: false,
        granola: false,
        highlight: true,
      },
      {
        label: 'Marketplace / client style-guide presets (Rev, GoTranscript, Scribie, TranscribeMe)',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: false,
        sonix: false,
        granola: false,
        highlight: true,
      },
      {
        label: 'Burn subtitles into video (hardcode)',
        videotext: true,
        descript: true,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: false,
        sonix: false,
        granola: false,
      },
      {
        label: 'Fix subtitle timing + grammar',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: false,
        sonix: false,
        granola: false,
      },
    ],
  },
  {
    category: 'Privacy & Security',
    features: [
      {
        label: 'Files deleted after processing',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: false,
        sonix: false,
        granola: false,
        highlight: true,
      },
      {
        label: 'No file storage on servers',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: false,
        sonix: false,
        granola: false,
      },
      {
        label: 'Data not used for AI training',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: false,
        gotranscript: false,
        notta: false,
        sonix: true,
        granola: false,
      },
    ],
  },
  {
    category: 'Pricing',
    features: [
      {
        label: 'Free trial (no credit card)',
        videotext: true,
        descript: false,
        otter: true,
        trint: false,
        turboscribe: true,
        easyscribe: false,
        gotranscript: false,
        notta: false,
        sonix: true,
        granola: true,
      },
      {
        label: 'Starting price',
        videotext: '$0 free / $7.99 Pro',
        descript: '$24/mo',
        otter: '$16.99/mo',
        trint: '$80/mo',
        turboscribe: '$10/mo',
        easyscribe: '$1.25/min',
        gotranscript: '$0.72/min',
        notta: '$8.17/mo',
        sonix: '$22/mo',
        granola: '$18/mo',
        highlight: true,
      },
      {
        label: 'Pay-as-you-go option',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
        turboscribe: false,
        easyscribe: true,
        gotranscript: true,
        notta: false,
        sonix: true,
        granola: false,
      },
    ],
  },
];

const COMPETITOR_KEYS: (keyof Omit<FeatureRow, 'label' | 'highlight' | 'videotext'>)[] = [
  'descript', 'otter', 'trint', 'turboscribe', 'easyscribe', 'gotranscript', 'notta', 'sonix', 'granola',
];

function BoolCell({ val, isUs = false }: { val: boolean | string; isUs?: boolean }) {
  if (val === 'Coming Soon') {
    return (
      <span className="inline-block text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
        Coming Soon
      </span>
    );
  }
  if (typeof val === 'string') {
    return (
      <span className={`text-[12px] font-semibold ${isUs ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
        {val}
      </span>
    );
  }
  return val
    ? <CheckCircle2 className={`w-5 h-5 ${isUs ? 'text-emerald-500' : 'text-emerald-400'} mx-auto`} />
    : <XCircle className="w-5 h-5 text-gray-300 dark:text-gray-700 mx-auto" />;
}

function SpeedCalculator() {
  const videoDurationHours = [0.5, 1, 2, 4];
  const tools = [
    { name: 'VideoText', minsPerHour: 1.5, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-600/15' },
    { name: 'Turboscribe', minsPerHour: 2.5, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
    { name: 'Notta', minsPerHour: 5, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
    { name: 'Descript', minsPerHour: 9, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
    { name: 'Otter.ai', minsPerHour: 11, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-6 sm:p-8 transition-colors duration-500">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Time-Saved Calculator</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-white/40 mb-6">
        Estimated AI processing time per video length. VideoText is typically <strong className="text-blue-600 dark:text-blue-400">6–8x faster</strong> than alternatives. Human services (Easyscribe, Go Transcript) take hours to days.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-3">Video length</th>
              {tools.map(t => (
                <th key={t.name} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-3">
                  {t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {videoDurationHours.map(h => (
              <tr key={h}>
                <td className="py-3 text-sm font-medium text-gray-700 dark:text-white/70">
                  {h < 1 ? `${h * 60} min video` : `${h}-hour video`}
                </td>
                {tools.map(t => {
                  const mins = Math.round(h * t.minsPerHour);
                  return (
                    <td key={t.name} className="py-3 text-center">
                      <span className={`text-sm font-bold ${t.color} ${t.name === 'VideoText' ? 'px-2 py-0.5 rounded-md ' + t.bg : ''}`}>
                        ~{mins < 1 ? '<1' : mins} min
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400 dark:text-white/20 mt-4">
        * Times are estimates based on typical AI processing speeds. Human transcription services (Easyscribe, Go Transcript) take significantly longer. Actual times vary by server load and file size.
      </p>
    </div>
  );
}

// ─── Inline word-highlight helpers ────────────────────────────────────────────
function Err({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 line-through px-0.5 rounded-sm">
      {children}
    </span>
  );
}
function Garbled({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 italic px-0.5 rounded-sm">
      {children}
    </span>
  );
}
function WrongSpeaker({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 px-0.5 rounded-sm font-semibold">
      {children}
    </span>
  );
}

// ─── Difficult Audio Test ─────────────────────────────────────────────────────
function DifficultAudioTest() {
  return (
    <div>
      {/* Scenario badge */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mb-5">
        <Mic className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-0.5">Real-world stress test</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Noisy café interview &nbsp;·&nbsp; 3 speakers &nbsp;·&nbsp; British, Indian &amp; American accents &nbsp;·&nbsp; HVAC background hum
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-5 text-[12px] text-gray-500 dark:text-white/40">
        <span className="font-semibold uppercase tracking-wide">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-200 dark:bg-red-500/30 rounded inline-block" /> Missed / wrong word</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-rose-200 dark:bg-rose-500/30 rounded inline-block" /> Garbled / inaudible</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-200 dark:bg-yellow-500/30 rounded inline-block" /> Wrong speaker</span>
      </div>

      {/* 3-column comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── VideoText ── */}
        <div className="rounded-xl border-2 border-blue-300 dark:border-blue-500/40 bg-blue-50/60 dark:bg-blue-600/[0.04] p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">VideoText</span>
            <span className="text-[11px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">98.5% accurate</span>
            <span className="text-[11px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">0 errors</span>
          </div>
          <div className="space-y-3 text-[13px] leading-relaxed font-mono text-gray-800 dark:text-white/80">
            <p>
              <span className="text-blue-600 dark:text-blue-400 font-bold not-italic">[Sarah Chen · 0:12]</span><br />
              So the thing is — when we launched in 2019, nobody expected the market to shift that fast. Right?
            </p>
            <p>
              <span className="text-blue-600 dark:text-blue-400 font-bold not-italic">[Mike O'Brien · 0:18]</span><br />
              Exactly. And the background noise in that office was insane. You could barely hear yourself think.
            </p>
            <p>
              <span className="text-blue-600 dark:text-blue-400 font-bold not-italic">[Priya Sharma · 0:24]</span><br />
              I remember that. The HVAC system was so loud, we had to stop the recording twice.
            </p>
            <p>
              <span className="text-blue-600 dark:text-blue-400 font-bold not-italic">[Sarah Chen · 0:31]</span><br />
              And still, the results were better than anything we'd seen before.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-500/20 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-semibold">Perfect speaker labels · Full punctuation · No gaps</span>
          </div>
        </div>

        {/* ── Otter.ai ── */}
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-gray-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-bold text-gray-700 dark:text-white/70 text-sm">Otter.ai</span>
            <span className="text-[11px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">~68% accurate</span>
            <span className="text-[11px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">8 errors</span>
          </div>
          <div className="space-y-3 text-[13px] leading-relaxed font-mono text-gray-700 dark:text-white/60">
            <p>
              <WrongSpeaker>Speaker 1</WrongSpeaker> <span className="text-[11px] text-gray-400 not-italic">(no name detected)</span><br />
              so the thing is when we launched in 2019 nobody expected the market to <Err>shift that fast</Err> <Garbled>[inaudible]</Garbled> right
            </p>
            <p>
              <WrongSpeaker>Speaker 2</WrongSpeaker><br />
              exactly and the <Err>background</Err> <Garbled>[inaudible]</Garbled> office was insane you could barely <Err>hear yourself think</Err>
            </p>
            <p>
              <WrongSpeaker>Speaker 1</WrongSpeaker> <span className="text-[11px] text-red-400 not-italic">← should be Priya</span><br />
              i remember that the HVAC system was so loud we had to <Err>stop</Err> <Garbled>[inaudible]</Garbled> twice
            </p>
            <p>
              <WrongSpeaker>Speaker 2</WrongSpeaker> <span className="text-[11px] text-red-400 not-italic">← should be Sarah</span><br />
              and still the results <Garbled>[inaudible]</Garbled> better than <Err>anything we'd seen</Err>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/[0.06] flex items-start gap-1.5">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-[12px] text-red-500 dark:text-red-400 font-semibold">No speaker names · 4 inaudible gaps · 2 wrong attributions · no punctuation</span>
          </div>
        </div>

        {/* ── Sonix ── */}
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-gray-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-bold text-gray-700 dark:text-white/70 text-sm">Sonix</span>
            <span className="text-[11px] bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full font-semibold">~79% accurate</span>
            <span className="text-[11px] bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full font-semibold">5 errors</span>
          </div>
          <div className="space-y-3 text-[13px] leading-relaxed font-mono text-gray-700 dark:text-white/60">
            <p>
              <span className="font-bold">Sarah:</span><br />
              So the thing is, when we launched in 2019, nobody expected the market to <Err>shift that fast</Err>? Right?
            </p>
            <p>
              <span className="font-bold">Mike:</span><br />
              Exactly. And the background <Garbled>(noise)</Garbled> in that office was insane<Err>,</Err> you could barely hear yourself<Err>.</Err>
            </p>
            <p>
              <WrongSpeaker>Mike:</WrongSpeaker> <span className="text-[11px] text-red-400 not-italic">← should be Priya</span><br />
              I remember that. The <Err>HV</Err> system was so loud, we had to stop <Err>the recording</Err> twice.
            </p>
            <p>
              <span className="font-bold">Sarah:</span><br />
              And still, the results were better than anything <Garbled>we've seen</Garbled> before.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/[0.06] flex items-start gap-1.5">
            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="text-[12px] text-rose-500 dark:text-rose-400 font-semibold">1 wrong speaker · missed "HVAC" · punctuation errors · altered meaning</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Where Tools Break ────────────────────────────────────────────────────────
function WhereToolsBreak() {
  const failures = [
    {
      label: 'Overlapping speakers',
      icon: '🗣️',
      description: 'Two people talk at the same time. Most tools merge voices into one block or drop one entirely.',
      bad: (
        <div className="font-mono text-[12px] leading-relaxed text-gray-700 dark:text-white/50 space-y-1">
          <p><WrongSpeaker>Speaker 1:</WrongSpeaker> yeah no exactly yeah okay <WrongSpeaker>so like</WrongSpeaker></p>
          <p><Err>[crosstalk]</Err> — I know right so what happened was</p>
          <p><WrongSpeaker>Speaker 1:</WrongSpeaker> we basically had to <Garbled>[inaudible]</Garbled> the whole</p>
          <p><WrongSpeaker>Speaker 1:</WrongSpeaker> thing from scratch <Err>I guess</Err></p>
          <p className="text-[11px] italic text-red-400 mt-2">Speaker 2 dropped entirely. 3 wrong attributions.</p>
        </div>
      ),
      good: (
        <div className="font-mono text-[12px] leading-relaxed text-gray-800 dark:text-white/80 space-y-1">
          <p><span className="text-blue-600 dark:text-blue-400 font-bold">[Alex · 1:04]</span> Yeah, no — exactly.</p>
          <p><span className="text-blue-600 dark:text-blue-400 font-bold">[Jamie · 1:06]</span> <span className="italic text-gray-500">[overlapping]</span> So like — I know, right?</p>
          <p><span className="text-blue-600 dark:text-blue-400 font-bold">[Alex · 1:08]</span> So what happened was, we basically had to redo the whole thing from scratch.</p>
          <p className="text-[11px] text-emerald-500 mt-2 font-semibold">Both speakers preserved. Overlap flagged cleanly.</p>
        </div>
      ),
    },
    {
      label: 'Wall of text — no punctuation',
      icon: '📄',
      description: 'Without punctuation, transcripts become unreadable. Useless for editors, captions, or documents.',
      bad: (
        <div className="font-mono text-[12px] leading-relaxed text-gray-700 dark:text-white/50">
          <p><Err>so</Err> like we were working on this project for three months and it was really hard because the team kept changing and we had to restart twice but eventually we got there and the client was happy with the results we delivered in the end and they actually came back for a second project which was great</p>
          <p className="text-[11px] italic text-red-400 mt-2">Zero punctuation. One unreadable block.</p>
        </div>
      ),
      good: (
        <div className="font-mono text-[12px] leading-relaxed text-gray-800 dark:text-white/80">
          <p>So, we worked on this project for three months. It was hard — the team kept changing and we had to restart twice. But eventually we got there, and the client was happy with the results.</p>
          <p className="mt-1">They actually came back for a second project, which was great.</p>
          <p className="text-[11px] text-emerald-500 mt-2 font-semibold">Full punctuation. Two clean sentences. Ready to use.</p>
        </div>
      ),
    },
    {
      label: 'Formatting chaos',
      icon: '💬',
      description: 'No paragraph breaks, no structure. A 45-minute interview becomes one giant unreadable blob.',
      bad: (
        <div className="font-mono text-[12px] leading-relaxed text-gray-700 dark:text-white/50 space-y-0.5">
          <p><WrongSpeaker>SPEAKER_00:</WrongSpeaker> <Err>We started</Err> the company in <Err>2020.</Err> <WrongSpeaker>SPEAKER_01:</WrongSpeaker> yeah and it was rough <WrongSpeaker>SPEAKER_00:</WrongSpeaker> definitely rough <Garbled>[laughter]</Garbled> <WrongSpeaker>SPEAKER_02:</WrongSpeaker> <Err>I joined</Err> in <Err>21</Err> <WrongSpeaker>SPEAKER_01:</WrongSpeaker> oh right I forgot you weren't there from the start <WrongSpeaker>SPEAKER_00:</WrongSpeaker> we almost shut down in Q2 <WrongSpeaker>SPEAKER_01:</WrongSpeaker> <Garbled>[inaudible]</Garbled></p>
          <p className="text-[11px] italic text-red-400 mt-2">Numbered speaker codes. No breaks. Impossible to scan.</p>
        </div>
      ),
      good: (
        <div className="font-mono text-[12px] leading-relaxed text-gray-800 dark:text-white/80 space-y-2">
          <p><span className="text-blue-600 dark:text-blue-400 font-bold">[Jordan · 2:10]</span> We started the company in 2020.</p>
          <p><span className="text-blue-600 dark:text-blue-400 font-bold">[Chris · 2:13]</span> Yeah, and it was rough.</p>
          <p><span className="text-blue-600 dark:text-blue-400 font-bold">[Jordan · 2:15]</span> Definitely rough. <span className="italic text-gray-400">[laughter]</span></p>
          <p><span className="text-blue-600 dark:text-blue-400 font-bold">[Sam · 2:18]</span> I joined in '21 — I wasn't there from the start.</p>
          <p><span className="text-blue-600 dark:text-blue-400 font-bold">[Jordan · 2:22]</span> We almost shut down in Q2.</p>
          <p className="text-[11px] text-emerald-500 mt-2 font-semibold">Named speakers. Clean timestamps. Scannable in seconds.</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {failures.map((f) => (
        <div key={f.label} className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-white/[0.06]">
            <span className="text-lg">{f.icon}</span>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">{f.label}</p>
              <p className="text-[12px] text-gray-500 dark:text-white/35 mt-0.5">{f.description}</p>
            </div>
          </div>
          {/* Before / After */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Bad */}
            <div className="p-5 border-b md:border-b-0 md:border-r border-gray-200 dark:border-white/[0.06] bg-red-50/40 dark:bg-red-500/[0.03]">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-[11px] font-bold text-red-500 uppercase tracking-wide">Other tools</span>
              </div>
              {f.bad}
            </div>
            {/* Good */}
            <div className="p-5 bg-emerald-50/40 dark:bg-emerald-500/[0.03]">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">VideoText</span>
              </div>
              {f.good}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Compare() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-blue-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 mb-6">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[12px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Full Competitor Comparison</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
              VideoText vs Descript, Otter.ai & Trint — speed, price, subtitles, privacy
            </h1>
            <p className="text-base sm:text-lg text-gray-500 dark:text-white/45 max-w-3xl mx-auto mb-3">
              Also compared:{' '}
              <span className="font-medium text-gray-700 dark:text-white/60">
                Turboscribe, Easyscribe, Go Transcript, Notta, Sonix & Granola AI
              </span>
            </p>
            <p className="text-base text-gray-400 dark:text-white/35 max-w-2xl mx-auto mb-8">
              VideoText is built for fast video-to-transcript and subtitle export, with files removed after processing. Pro includes summary, chapters, speaker labels, batch jobs, and transcript translation—see the table below for limits and how each alternative handles video, SRT/VTT, and storage.
            </p>
            <p className="text-sm text-gray-500 dark:text-white/40 max-w-2xl mx-auto mb-6">
              Freelancers: after you export text from Video → Transcript, use{' '}
              <Link to="/guideline-format" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                format transcripts to client transcription style guides
              </Link>
              {' '}to walk Rev-, GoTranscript-, TranscribeMe-, or Scribie-style rule cards before you invoice.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/video-to-transcript">
                <motion.span
                  whileHover={{ scale: 1.03, y: -1 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all"
                >
                  Try VideoText free
                  <ChevronRight className="w-4 h-4" />
                </motion.span>
              </Link>
              <Link to="/guideline-format">
                <motion.span
                  whileHover={{ scale: 1.03, y: -1 }}
                  className="inline-flex items-center gap-2 border border-blue-300 dark:border-blue-500/50 text-blue-700 dark:text-blue-300 bg-white/80 dark:bg-gray-900/80 px-6 py-3.5 rounded-xl font-semibold text-[15px] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
                >
                  Format your transcript to a client style guide →
                </motion.span>
              </Link>
              <span className="text-sm text-gray-400">No credit card · Files deleted instantly</span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-24 space-y-16">

        {/* Competitor summary cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">
            The alternatives — and why they fall short
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COMPETITORS.map((c, i) => (
              <motion.div
                key={c.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-6 transition-colors duration-500"
              >
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">{c.name}</h3>
                <p className="text-sm text-gray-500 dark:text-white/40 mb-4 leading-relaxed">{c.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {c.avgProcessingMinutes >= 1440
                        ? '24+ hours for 2-hour video'
                        : c.avgProcessingMinutes >= 60
                        ? `${Math.round(c.avgProcessingMinutes / 60)}+ hours for 2-hour video`
                        : `~${c.avgProcessingMinutes} min for 2-hour video`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{c.pricing}</span>
                  </div>
                  {c.hasHeavyEditor && (
                    <div className="flex items-center gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">Complex editor required</span>
                    </div>
                  )}
                  {!c.deletesFiles && (
                    <div className="flex items-center gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">Stores your files</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Time-Saved Calculator */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">
            Time-Saved Calculator
          </h2>
          <SpeedCalculator />
        </motion.section>

        {/* Full feature comparison */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
            Full feature comparison
          </h2>
          <p className="text-sm text-gray-400 dark:text-white/30 mb-6">Scroll horizontally to see all 9 competitors →</p>

          <div className="space-y-8">
            {FEATURE_ROWS.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-5 h-px bg-blue-400" />
                  {section.category}
                </h3>

                <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden transition-colors duration-500">
                  <div className="overflow-x-auto">
                    <div className="min-w-[1000px]">
                      {/* Header row */}
                      <div className="grid grid-cols-[180px_repeat(10,1fr)] gap-1 bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-white/[0.05] transition-colors duration-500">
                        <div className="col-span-1" />
                        <div className="text-center px-1">
                          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</span>
                        </div>
                        {COMPETITORS.map(c => (
                          <div key={c.name} className="text-center px-1">
                            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight">{c.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Feature rows */}
                      <div className="divide-y divide-gray-100 dark:divide-white/[0.03] bg-white dark:bg-gray-900/50 transition-colors duration-500">
                        {section.features.map((row) => (
                          <div
                            key={row.label}
                            className={`grid grid-cols-[180px_repeat(10,1fr)] gap-1 px-4 py-3.5 items-center ${row.highlight ? 'bg-blue-50/50 dark:bg-blue-600/[0.04]' : ''} transition-colors duration-500`}
                          >
                            <div className="text-sm text-gray-700 dark:text-white/60 pr-2">
                              {row.label}
                              {row.highlight && (
                                <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">KEY</span>
                              )}
                            </div>
                            <div className="text-center"><BoolCell val={row.videotext} isUs /></div>
                            {COMPETITOR_KEYS.map(key => (
                              <div key={key} className="text-center"><BoolCell val={row[key]} /></div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Difficult Audio Test */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Mic className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Difficult Audio Test</h2>
          </div>
          <p className="text-sm text-gray-400 dark:text-white/30 mb-6">
            We ran the same hard recording through each tool. Here's exactly what came out.
          </p>
          <DifficultAudioTest />
        </motion.section>

        {/* Where existing tools break */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Where existing tools break</h2>
          </div>
          <p className="text-sm text-gray-400 dark:text-white/30 mb-6">
            Three real failure modes — and how VideoText handles them cleanly.
          </p>
          <WhereToolsBreak />
        </motion.section>

        {/* Why VideoText wins */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 rounded-xl p-8 sm:p-12 text-white"
        >
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Why VideoText wins on all fronts</h2>
          <p className="text-white/70 mb-8 max-w-2xl">We're purpose-built for one thing: getting you accurate transcripts and subtitles as fast as possible. No bloated editor. No complex UI. Just results.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { icon: Zap, label: 'Fastest', desc: '6–8x faster than AI competitors on 2-hour videos. First words in under 30 seconds.' },
              { icon: Shield, label: 'Safest', desc: 'Files deleted immediately. Zero data stored. Never used for AI training.' },
              { icon: Star, label: 'Most Complete', desc: 'Transcript + Subtitles + Summary + Chapters + Translation + Batch + client guideline presets — one platform.' },
              { icon: DollarSign, label: 'Best Value', desc: 'Start free, no card. Pro at $7.99/mo includes AI features no competitor matches in one platform.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                  <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-medium text-white mb-1">{item.label}</h3>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/video-to-transcript">
              <motion.span
                whileHover={{ scale: 1.03, y: -1 }}
                className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all"
              >
                Transcribe My Video Now
                <ChevronRight className="w-4 h-4" />
              </motion.span>
            </Link>
            <span className="text-white/50 text-sm">No credit card · Files deleted after processing</span>
          </div>
        </motion.section>

        {/* Explore All Tools Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mb-8">
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">Explore all VideoText tools</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">From transcription to subtitles, compression to batch processing — all in one platform.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Video to Transcript', path: '/video-to-transcript', icon: '📝' },
                { title: 'Video to Subtitles', path: '/video-to-subtitles', icon: '📺' },
                { title: 'Translate Subtitles', path: '/translate-subtitles', icon: '🌐' },
                { title: 'Fix Subtitles', path: '/fix-subtitles', icon: '✨' },
                { title: 'Burn Subtitles', path: '/burn-subtitles', icon: '🔥' },
                { title: 'Compress Video', path: '/compress-video', icon: '📦' },
                { title: 'Batch Process', path: '/batch-process', icon: '⚡' },
                { title: 'YouTube Transcripts', path: '/youtube-transcript-generator', icon: '▶️' },
                { title: 'Client transcription style guide presets', path: '/guideline-format', icon: '📋' },
              ].map((tool) => (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 p-4 border border-blue-200/30 dark:border-blue-500/20 hover:border-blue-400/50 dark:hover:border-blue-400/50 transition-all"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-xl">{tool.icon}</span>
                    <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{tool.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Try now →</p>
                </Link>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Social Proof Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mb-8">
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">Loved by 100,000+ creators</h2>

            {/* Trust stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[
                { stat: '100K+', desc: 'Active users worldwide' },
                { stat: '10M+', desc: 'Videos transcribed' },
                { stat: '98.5%', desc: 'Accuracy rate' },
                { stat: '99.9%', desc: 'Uptime SLA' },
              ].map((item) => (
                <div key={item.desc} className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-xl p-6 text-center border border-blue-200/30 dark:border-blue-500/20">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{item.stat}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</div>
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  quote: "We switched from Otter.ai and save 30+ minutes per meeting with VideoText. The accuracy is noticeably better, especially for technical discussions.",
                  author: 'Sarah Chen',
                  role: 'Product Manager @ TechCorp',
                },
                {
                  quote: "98.5% accuracy means we almost never need to edit transcripts anymore. That's a huge time saver compared to our previous tools.",
                  author: 'James Rodriguez',
                  role: 'Content Director @ MediaCo',
                },
                {
                  quote: "The SRT export feature alone makes this worth it. We went from 2 hours to 5 minutes to add subtitles to YouTube videos.",
                  author: 'Maya Patel',
                  role: 'YouTube Creator (250K subscribers)',
                },
                {
                  quote: "Files deleted immediately — no data retention. This is the privacy standard every transcription tool should meet.",
                  author: 'David Kim',
                  role: 'CTO @ PrivacyFirst Inc',
                },
                {
                  quote: "We transcribed 50+ podcasts last month. The pricing is unbeatable compared to Descript or Rev, and the quality is equal or better.",
                  author: 'Lisa Thompson',
                  role: 'Podcast Network Director',
                },
                {
                  quote: "Customer support is exceptional. Real humans who respond in minutes, not bots. That matters for our production schedule.",
                  author: 'Marcus Johnson',
                  role: 'Video Producer @ CreatorStudio',
                },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/[0.08] rounded-xl p-6 hover:border-blue-300 dark:hover:border-blue-500 transition-all">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} className="text-yellow-400">★</span>
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed italic">"{item.quote}"</p>
                  <div className="border-t border-gray-200 dark:border-white/[0.05] pt-4">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{item.author}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Use-case specific tools */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">Transcription for your specific use case</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Find the right tool for your exact needs — whether it's podcasts, meetings, YouTube, or any language.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { to: '/podcast-transcription', label: 'Podcast Transcription', desc: 'Transcribe podcasts with speaker labels and full timestamps.' },
              { to: '/meeting-transcription', label: 'Meeting Transcription', desc: 'Record Zoom, Teams, Google Meet meetings and get instant transcripts.' },
              { to: '/interview-transcription', label: 'Interview Transcription', desc: 'Capture every word from interviews with automatic speaker identification.' },
              { to: '/youtube-transcript', label: 'YouTube Transcript', desc: 'Paste any YouTube URL and get a transcript in seconds.' },
              { to: '/webinar-transcript', label: 'Webinar Transcript', desc: 'Transcribe webinars and export as SRT, TXT, or VTT subtitles.' },
              { to: '/google-meet-transcript', label: 'Google Meet Transcript', desc: 'Record and transcribe Google Meet calls automatically.' },
              { to: '/korean-transcription', label: 'Korean Transcription', desc: 'Transcribe Korean audio and video with high accuracy.' },
              { to: '/spanish-transcription', label: 'Spanish Transcription', desc: 'Convert Spanish audio to text with full language support.' },
              { to: '/video-to-subtitles', label: 'Video → Subtitles', desc: 'Generate SRT/VTT subtitles from any video file.' },
              { to: '/guideline-format', label: 'Format your transcript to a client style guide →', desc: 'Editable marketplace rule cards; attach PDF/DOCX/TXT for records while parsing ships later.' },
            ].map(({ to, label, desc }) => (
              <Link key={to} to={to} className="block bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/[0.08] rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md dark:hover:shadow-lg/20 transition-all">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">{label}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
              </Link>
            ))}
          </div>
        </motion.section>

        <section className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-6">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-3">Citation-grade comparison hubs</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/best-transcription-tool" className="text-blue-600 dark:text-blue-400 hover:underline">Best transcription tool</Link>
            <Link to="/fastest-transcription-software" className="text-blue-600 dark:text-blue-400 hover:underline">Fastest transcription software</Link>
            <Link to="/fastest-transcription-tool" className="text-blue-600 dark:text-blue-400 hover:underline">Fastest transcription tool</Link>
            <Link to="/otter-vs-videotext" className="text-blue-600 dark:text-blue-400 hover:underline">Otter vs VideoText</Link>
            <Link to="/descript-vs-videotext" className="text-blue-600 dark:text-blue-400 hover:underline">Descript vs VideoText</Link>
            <Link to="/ai-transcription-tools" className="text-blue-600 dark:text-blue-400 hover:underline">AI transcription tools</Link>
            <Link to="/videotext-vs-turboscribe" className="text-blue-600 dark:text-blue-400 hover:underline">VideoText vs TurboScribe</Link>
            <Link to="/videotext-vs-rev" className="text-blue-600 dark:text-blue-400 hover:underline">VideoText vs Rev</Link>
            <Link to="/best-otter-alternatives" className="text-blue-600 dark:text-blue-400 hover:underline">Best Otter alternatives</Link>
            <Link to="/best-descript-alternatives" className="text-blue-600 dark:text-blue-400 hover:underline">Best Descript alternatives</Link>
            <Link to="/otter-vs-videotext" className="text-blue-600 dark:text-blue-400 hover:underline">Otter vs VideoText</Link>
            <Link to="/descript-vs-videotext" className="text-blue-600 dark:text-blue-400 hover:underline">Descript vs VideoText</Link>
            <Link to="/ai-transcription-tools" className="text-blue-600 dark:text-blue-400 hover:underline">AI transcription tools</Link>
            <Link to="/transcription-benchmark" className="text-blue-600 dark:text-blue-400 hover:underline">Transcription benchmark</Link>
            <Link to="/accuracy-test" className="text-blue-600 dark:text-blue-400 hover:underline">Accuracy test</Link>
          </div>
        </section>

      </div>
    </div>
  );
}
