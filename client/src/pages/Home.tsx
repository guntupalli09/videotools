import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { isLoggedIn } from '../lib/auth';
import { Hero } from '../components/figma/Hero';
import { Features } from '../components/figma/Features';
import { HowItWorks } from '../components/figma/HowItWorks';
import { Testimonials } from '../components/landing/Testimonials';
import { UseCases } from '../components/landing/UseCases';
import { FAQ } from '../components/landing/FAQ';
import { FinalCTA } from '../components/landing/FinalCTA';
import { FoundingTeamCTA } from '../components/landing/FoundingTeamCTA';
import { CompetitorSection } from '../components/landing/CompetitorSection';
import { useProPricing } from '../contexts/PricingContext';
import { startCheckout } from '../lib/startCheckout';
import { trackEvent } from '../lib/analytics';
import { ArrowRight } from 'lucide-react';

const HIGH_INTENT_GUIDES = [
  { label: 'Video to Transcript (Primary)', path: '/video-to-transcript', desc: 'Main page for broad video-to-text and transcript intent' },
  { label: 'Best Transcription Tool', path: '/best-transcription-tool', desc: 'Decision support by speed, outputs, and workflow fit' },
  { label: 'YouTube Transcript Generator (Primary)', path: '/youtube-transcript-generator', desc: 'Paste a YouTube link and generate transcript-ready output in minutes' },
  { label: 'Podcast Transcription Tool', path: '/podcast-transcription-tool', desc: 'Create show notes, clips, and searchable transcript assets' },
  { label: 'Meeting Transcription Tool', path: '/meeting-transcription-tool', desc: 'Turn calls into summaries, transcripts, and follow-ups' },
  { label: 'Google Meet Transcript', path: '/google-meet-transcript', desc: 'Download the Meet recording, upload, and get transcript outputs fast' },
  { label: 'Zoom Meeting Transcript', path: '/zoom-meeting-transcript', desc: 'Download Zoom recording, upload once, and get structured transcript output' },
  { label: 'Meeting Recording to Transcript', path: '/meeting-recording-to-transcript', desc: 'Hub workflow for Zoom, Meet, Teams, and webinar recordings' },
  { label: 'Interview Transcription Tool', path: '/interview-transcription-tool', desc: 'Speaker-structured transcripts for newsroom and research' },
  { label: 'Client transcription style guide formatter', path: '/guideline-format', desc: 'Prep transcript text against Rev-, GoTranscript-, and related marketplace rule cards before QA' },
];

const MORE_GUIDES = [
  { label: 'Fastest transcription software', path: '/fastest-transcription-software' },
  { label: 'Fastest transcription tool', path: '/fastest-transcription-tool' },
  { label: 'Otter vs VideoText', path: '/otter-vs-videotext' },
  { label: 'Descript vs VideoText', path: '/descript-vs-videotext' },
  { label: 'AI transcription tools', path: '/ai-transcription-tools' },
  { label: 'VideoText vs TurboScribe', path: '/videotext-vs-turboscribe' },
  { label: 'VideoText vs Rev', path: '/videotext-vs-rev' },
  { label: 'Best Otter alternatives', path: '/best-otter-alternatives' },
  { label: 'Best Descript alternatives', path: '/best-descript-alternatives' },
  { label: 'AI transcription workflow', path: '/ai-transcription-workflow' },
  { label: 'YouTube video to transcript', path: '/youtube-video-to-transcript' },
  { label: 'Transcription benchmark', path: '/transcription-benchmark' },
];

const ALL_FEATURES = [
  { label: 'Video to Transcript', path: '/video-to-transcript' },
  { label: 'Video to Subtitles', path: '/video-to-subtitles' },
  { label: 'SRT File Generator', path: '/srt-generator' },
  { label: 'Video to SRT', path: '/video-to-srt' },
  { label: 'Translate Subtitles', path: '/translate-subtitles' },
  { label: 'Subtitle Tools', path: '/subtitle-tools' },
  { label: 'Fix Subtitles', path: '/fix-subtitles' },
  { label: 'Burn Subtitles', path: '/burn-subtitles' },
  { label: 'Compress Video', path: '/compress-video' },
  { label: 'Voice Recorder', path: '/voice-recorder' },
  { label: 'YouTube Transcripts', path: '/youtube-transcript-generator' },
];

const FREE_TOOLS = [
  { label: 'SRT → VTT Converter', path: '/tools/srt-to-vtt', desc: 'For HTML5 video players & web apps', icon: '⇄' },
  { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Catch timing overlaps & format errors', icon: '✓' },
  { label: 'Reading Speed Checker', path: '/tools/subtitle-reading-speed', desc: 'Verify Netflix & EBU CPS limits', icon: '⏱' },
  { label: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing', desc: 'Fix out-of-sync subtitles instantly', icon: '↔' },
  { label: 'Character Limit Checker', path: '/tools/subtitle-character-checker', desc: 'Check 42-char Netflix line limits', icon: '≤' },
  { label: 'Merge SRT Files', path: '/tools/merge-srt-files', desc: 'Combine multiple subtitle files', icon: '⊕' },
];

function PricingSection() {
  const { pricing } = useProPricing();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    try {
      trackEvent('pricing_page_view', { source: 'home_pricing_section' });
    } catch {
      /* non-blocking */
    }
  }, []);

  async function handleProCheckout() {
    try {
      trackEvent('pro_cta_clicked', { source: 'home_pricing_section', billing_interval: 'monthly' });
    } catch {
      /* non-blocking */
    }
    setCheckoutLoading(true);
    try {
      await startCheckout({
        plan: 'pro',
        billingInterval: 'monthly',
        returnToPath: '/',
        attribution: {
          source: 'home_pricing_section',
          tool: 'home',
          plan: 'free',
          billing_interval: 'monthly',
        },
      });
    } catch {
      setCheckoutLoading(false);
    }
  }

  return (
    <section id="pricing" className="relative overflow-hidden bg-gray-950 py-section transition-colors duration-500">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/[0.08] blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-component text-center"
        >
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-400">Pricing</p>
          <h2 className="tool-title mb-3 text-4xl md:text-5xl text-white">
            Start free. Scale when ready.
          </h2>
          {!isLoggedIn() && (
            <p className="text-base text-white/50">No credit card required to try.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2"
        >
          <Link
            to="/video-to-transcript"
            className="group relative rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 text-left text-white transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.07]"
          >
            <p className="mb-1 text-lg font-bold">Free</p>
            <p className="mb-1 text-3xl font-extrabold">$0</p>
            <p className="mb-4 text-sm text-white/45">3 imports per month · files up to 30 minutes</p>
            <p className="text-xs font-medium opacity-50">No card needed</p>
          </Link>

          <div className="relative rounded-xl bg-gray-900 p-6 text-left text-white shadow-2xl shadow-blue-500/20 ring-2 ring-blue-400/60">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
                Most Popular
              </span>
            </div>
            <p className="mb-1 text-lg font-bold">Pro</p>
            <p className="mb-1 text-3xl font-extrabold">
              {pricing.monthly.displayAmount}
              <span className="text-sm font-normal opacity-60">/mo</span>
            </p>
            <p className="mb-4 text-sm text-blue-100/80">1,200 min · full transcription and delivery workflows</p>
            <button
              type="button"
              onClick={() => void handleProCheckout()}
              disabled={checkoutLoading}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-300 transition-all hover:gap-2.5 disabled:opacity-60"
            >
              {checkoutLoading ? 'Opening checkout…' : `Unlock Pro — ${pricing.priceLabel}`}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>

        <p className="mt-8 text-center">
          <Link
            to="/pricing"
            className="text-sm font-medium text-white/50 underline underline-offset-2 transition-colors hover:text-white/80"
          >
            See full pricing & feature comparison →
          </Link>
        </p>
      </div>
    </section>
  );
}

function LinkGrid({ items, compact = false }: { items: { label: string; path: string; desc?: string }[]; compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
      {items.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={
            compact
              ? 'rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-gray-700 dark:text-gray-200 dark:hover:text-blue-400'
              : 'group rounded-xl border border-gray-200 bg-gray-50 p-4 transition-all duration-200 hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600'
          }
        >
          <p className={`font-bold ${compact ? '' : 'text-sm text-gray-900 transition-colors group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400'}`}>
            {item.label}{compact ? ' →' : ''}
          </p>
          {item.desc && (
            <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">{item.desc}</p>
          )}
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <UseCases />
      <HowItWorks />
      <Testimonials />
      <CompetitorSection />
      <PricingSection />
      <FAQ />

      <section className="border-t border-gray-100 bg-white py-section transition-colors duration-500 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-component-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              High-intent guides
            </p>
            <h2 className="tool-title text-2xl text-gray-900 md:text-3xl dark:text-white">
              Choose your workflow path
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
              Core entry points are Video to Transcript, Voice to Text, and YouTube Transcript Generator. These pages handle specific contexts like comparisons and meeting workflows.
            </p>
          </div>
          <LinkGrid items={HIGH_INTENT_GUIDES} />
        </div>
      </section>

      <section className="border-y border-gray-100 bg-gray-50 py-section transition-colors duration-500 dark:border-gray-800 dark:bg-gray-900/60">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-component-sm flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Free — no account needed
              </p>
              <h2 className="tool-title text-2xl text-gray-900 md:text-3xl dark:text-white">
                Free subtitle &amp; video tools
              </h2>
              <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
                Convert, validate, fix, and analyse subtitle files instantly in your browser. Nothing uploaded, nothing stored.
              </p>
            </div>
            <Link
              to="/subtitle-tools"
              className="hidden items-center gap-1 whitespace-nowrap text-sm font-bold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 sm:flex"
            >
              View all 19 tools <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FREE_TOOLS.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
              >
                <span className="mt-0.5 select-none text-xl leading-none">{tool.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900 transition-colors group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">
                    {tool.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-gray-400 dark:text-gray-500">{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-component-sm flex flex-col items-center justify-between gap-3 sm:flex-row">
            <Link
              to="/subtitle-tools"
              className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 sm:hidden"
            >
              View all 19 free tools <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Need AI-powered subtitles?{' '}
              <Link to="/video-to-subtitles" className="font-bold text-blue-600 hover:underline dark:text-blue-400">
                Generate them automatically →
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 py-section dark:border-gray-800">
        <div className="mx-auto max-w-5xl px-6">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:content-none [&::-webkit-details-marker]:hidden">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Explore more</p>
                <h2 className="tool-title text-2xl text-gray-900 dark:text-white">Comparisons, benchmarks &amp; all features</h2>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="group-open:hidden">Show more</span>
                <span className="hidden group-open:inline">Show less</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="mt-component space-y-section">
              <div>
                <h3 className="tool-label mb-component-sm">Answer hubs</h3>
                <LinkGrid items={MORE_GUIDES} compact />
              </div>
              <div>
                <h3 className="tool-label mb-component-sm">All VideoText features</h3>
                <LinkGrid items={ALL_FEATURES} compact />
              </div>
            </div>
          </details>
        </div>
      </section>

      <FoundingTeamCTA />
      <FinalCTA />
    </div>
  );
}
