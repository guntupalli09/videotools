import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  Languages,
  Wrench,
  Flame,
  Package,
  FolderSync,
  Youtube,
  ChevronRight,
  Zap,
  Lock,
} from 'lucide-react';
import { trackEvent } from '../../lib/analytics';

// Spotlight features — larger cards with more detail
const SPOTLIGHT_TOOLS = [
  {
    id: 'video-to-transcript',
    badge: 'Most popular',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
    icon: FileText,
    name: 'Video → Transcript',
    tagline: 'From video to words at machine speed.',
    description: 'Upload any video and get a clean, timestamped transcript. AI-powered with 98.5% accuracy. Export as TXT, PDF, DOCX, or JSON.',
    bullets: ['Speaker detection', 'Auto chapters & summary', '50+ languages'],
    gradient: 'from-purple-500 to-indigo-600',
    glowColor: 'bg-purple-500/10 dark:bg-purple-500/5',
    href: '/video-to-transcript',
    outputPreview: [
      { time: '00:00', text: 'Welcome back to the channel. Today we\'re diving into...' },
      { time: '00:08', text: 'The strategy that changed everything for my workflow was...' },
      { time: '00:21', text: 'Let me walk you through exactly how to set this up...' },
    ],
  },
  {
    id: 'youtube-url',
    badge: 'New',
    badgeColor: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    icon: Youtube,
    name: 'YouTube URL → Transcript',
    tagline: 'Paste a link. Skip the download.',
    description: 'No downloads, no extra steps. Paste any YouTube URL and our worker streams the audio directly — transcript ready in seconds.',
    bullets: ['No file download needed', 'Handles 4-hour videos', 'Works with playlists too'],
    gradient: 'from-red-500 to-rose-600',
    glowColor: 'bg-red-500/10 dark:bg-red-500/5',
    href: '/youtube-to-transcript',
    outputPreview: null,
    urlPreview: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  },
];

// Secondary tools — compact cards
const SECONDARY_TOOLS = [
  {
    icon: MessageSquare,
    name: 'Video → Subtitles',
    description: 'Generate SRT and VTT subtitle files for any video. Timed, formatted, ready to upload.',
    gradient: 'from-blue-500 to-blue-600',
    href: '/video-to-subtitles',
  },
  {
    icon: Languages,
    name: 'Translate Subtitles',
    description: 'Convert existing subtitles to Arabic, Hindi, Spanish, French, and 50+ other languages.',
    gradient: 'from-pink-500 to-purple-600',
    href: '/translate-subtitles',
  },
  {
    icon: Wrench,
    name: 'Fix Subtitles',
    description: 'Auto-correct timing drift, overlapping cues, grammar, and formatting in any SRT/VTT file.',
    gradient: 'from-green-500 to-emerald-600',
    href: '/fix-subtitles',
  },
  {
    icon: Flame,
    name: 'Burn Subtitles',
    description: 'Hardcode captions permanently into your video file. Great for social media.',
    gradient: 'from-orange-500 to-red-500',
    href: '/burn-subtitles',
  },
  {
    icon: Package,
    name: 'Compress Video',
    description: 'Reduce file size by up to 80% while keeping quality high. Web, mobile, archive presets.',
    gradient: 'from-cyan-500 to-blue-600',
    href: '/compress-video',
  },
  {
    icon: FolderSync,
    name: 'Batch Processing',
    description: 'Upload a whole season at once. Process 50+ videos in parallel and download as a ZIP.',
    gradient: 'from-indigo-500 to-purple-600',
    href: '/batch-process',
  },
];

// Why Videotext trust signals
const WHY_US = [
  { icon: Zap, label: 'Fastest video workflow', desc: 'Transcript, subtitles, translate — all in one place' },
  { icon: Package, label: 'All-in-one toolkit', desc: 'No switching tools. One place for your entire caption workflow.' },
  { icon: Lock, label: 'Privacy first', desc: 'Files are processed and immediately deleted' },
];

function SpotlightCard({ tool, index }: { tool: typeof SPOTLIGHT_TOOLS[0]; index: number }) {
  const Icon = tool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={tool.href}
        onClick={() => trackEvent('tool_selected', { tool: tool.name, path: tool.href })}
        className="block"
      >
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className={`group relative rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-900 overflow-hidden hover:border-purple-300/70 dark:hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/8 transition-all duration-300`}
        >
          {/* Top glow */}
          <div className={`absolute inset-0 ${tool.glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

          <div className="relative p-6 sm:p-8">
            {/* Badge + icon row */}
            <div className="flex items-start justify-between mb-5">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${tool.badgeColor} transition-colors duration-500`}>
                {tool.badge}
              </span>
            </div>

            {/* Copy */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 transition-colors duration-500">
              {tool.name}
            </h3>
            <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-3 transition-colors duration-500">
              {tool.tagline}
            </p>
            <p className="text-sm text-gray-500 dark:text-white/45 leading-relaxed mb-5 transition-colors duration-500">
              {tool.description}
            </p>

            {/* Bullets */}
            <ul className="space-y-1.5 mb-6">
              {tool.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/55 transition-colors duration-500">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${tool.gradient} flex items-center justify-center flex-shrink-0`}>
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {b}
                </li>
              ))}
            </ul>

            {/* Mini preview */}
            {tool.outputPreview && (
              <div className="rounded-xl border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] p-3.5 mb-5 transition-colors duration-500">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400/80 font-medium uppercase tracking-wide">Sample output</span>
                </div>
                <div className="space-y-1.5">
                  {tool.outputPreview.map((line) => (
                    <div key={line.time} className="flex gap-2.5 items-start">
                      <span className="text-[9px] font-mono text-purple-400/60 dark:text-purple-400/40 shrink-0 w-8 pt-0.5">{line.time}</span>
                      <p className="text-[11px] text-gray-600 dark:text-white/50 leading-snug transition-colors duration-500">{line.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tool.urlPreview && (
              <div className="rounded-xl border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] p-3.5 mb-5 transition-colors duration-500">
                <div className="flex items-center gap-2">
                  <Youtube className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <span className="text-[11px] font-mono text-gray-500 dark:text-white/35 truncate transition-colors duration-500">{tool.urlPreview}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-purple-500"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <span className="text-[10px] text-purple-600 dark:text-purple-400/80">Extracting audio → transcribing...</span>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 group-hover:gap-2.5 transition-all">
              Try it free
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function SecondaryCard({ tool, index }: { tool: typeof SECONDARY_TOOLS[0]; index: number }) {
  const Icon = tool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.07, duration: 0.5 }}
    >
      <Link to={tool.href} onClick={() => trackEvent('tool_selected', { tool: tool.name, path: tool.href })}>
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="group h-full rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900 p-5 hover:border-purple-300/60 dark:hover:border-purple-500/25 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-black/30 transition-all duration-300"
        >
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 shadow-md`}>
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {tool.name}
          </h3>
          <p className="text-[13px] text-gray-500 dark:text-white/40 leading-relaxed transition-colors duration-500">
            {tool.description}
          </p>
          <div className="mt-3 flex items-center gap-1 text-[12px] font-medium text-purple-600/70 dark:text-purple-400/60 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            Try now <ChevronRight className="w-3 h-3" />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="tools" className="py-24 bg-gray-50/50 dark:bg-gray-900 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-3 transition-colors duration-500">
            The full toolkit
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-500">
            Everything you need.
            <span className="block text-gray-400 dark:text-white/30 transition-colors duration-500">Nothing you don't.</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/40 max-w-xl mx-auto transition-colors duration-500">
            Seven purpose-built tools that cover every stage of the video captioning workflow. No bloated editor. No learning curve.
          </p>
        </motion.div>

        {/* Why us — 3 trust pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-14"
        >
          {WHY_US.map((w) => {
            const Icon = w.icon;
            return (
              <div
                key={w.label}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] shadow-sm transition-colors duration-500"
              >
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center flex-shrink-0 transition-colors duration-500">
                  <Icon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-gray-800 dark:text-white/80 transition-colors duration-500">{w.label}</span>
                  <span className="hidden sm:inline text-[12px] text-gray-400 dark:text-white/30 ml-1.5 transition-colors duration-500">— {w.desc}</span>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Spotlight tools — 2 large cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {SPOTLIGHT_TOOLS.map((tool, i) => (
            <SpotlightCard key={tool.id} tool={tool} index={i} />
          ))}
        </div>

        {/* Secondary tools — 3-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECONDARY_TOOLS.map((tool, i) => (
            <SecondaryCard key={tool.name} tool={tool} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
