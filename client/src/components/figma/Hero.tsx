import { useRef, useMemo, useState, useEffect } from 'react';
import { isLoggedIn } from '../../lib/auth';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Play,
  Mic,
  FileText,
  Subtitles,
  Languages,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowDown,
  Youtube,
  Sparkles,
} from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';

function useTypingEffect(text: string, speed = 35, delay = 0) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, started]);
  return displayed;
}

function WaveformBars({ count = 24 }: { count?: number }) {
  const bars = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        h1: 4 + Math.random() * 16,
        h2: 2 + Math.random() * 18,
        h3: 4 + Math.random() * 16,
        dur: 0.7 + Math.random() * 0.5,
      })),
    [count]
  );
  return (
    <div className="flex items-end gap-[2px] h-5">
      {bars.map((b, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full bg-purple-500/60 dark:bg-purple-400/70"
          animate={{ height: [`${b.h1}px`, `${b.h2}px`, `${b.h3}px`] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.025 }}
        />
      ))}
    </div>
  );
}

const CREATOR_AVATARS = [
  'https://i.pravatar.cc/80?img=12',
  'https://i.pravatar.cc/80?img=32',
  'https://i.pravatar.cc/80?img=47',
  'https://i.pravatar.cc/80?img=25',
  'https://i.pravatar.cc/80?img=56',
];

function SocialProof() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.5 }}
      className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-6 mb-8"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex items-center -space-x-2">
          {CREATOR_AVATARS.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 + i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <ImageWithFallback
                src={src}
                alt=""
                width={28}
                height={28}
                className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-950 object-cover transition-colors duration-500"
              />
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.35 }}
            className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-950 bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center transition-colors duration-500"
          >
            <span className="text-[8px] font-bold text-purple-600 dark:text-purple-400">2K+</span>
          </motion.div>
        </div>
        <p className="text-[12px] text-gray-500 dark:text-white/40 transition-colors duration-500">
          <span className="text-gray-700 dark:text-white/70 font-semibold transition-colors duration-500">2,000+ creators</span> trust Videotext
        </p>
      </div>

      <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-white/10" />

      <div className="flex items-center gap-1.5">
        {[1,2,3,4,5].map(i => (
          <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-[12px] text-gray-500 dark:text-white/40 ml-0.5 transition-colors duration-500">4.9/5</span>
      </div>
    </motion.div>
  );
}

function LiveTranscriptPanel() {
  const line1 = useTypingEffect(
    "Hey everyone, welcome back to the channel. Today I want to share something that completely changed my editing workflow...",
    28,
    2200
  );
  const line2 = useTypingEffect(
    "Instead of spending hours manually typing out captions, I just drop my video and the AI handles everything.",
    28,
    6400
  );
  const fullLine1 =
    "Hey everyone, welcome back to the channel. Today I want to share something that completely changed my editing workflow...";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Browser chrome */}
      <div className="rounded-t-2xl border border-b-0 border-gray-200/80 dark:border-white/[0.06] bg-gray-100/80 dark:bg-white/[0.03] px-4 py-2.5 flex items-center gap-3 backdrop-blur-sm transition-colors duration-500">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/80 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.05] transition-colors duration-500">
            <img src="/logo.svg" alt="" width={12} height={12} className="w-3 h-3 opacity-40" />
            <span className="text-[10px] text-gray-400 dark:text-white/25 font-mono">videotext.io/transcript</span>
          </div>
        </div>
      </div>

      {/* Panel body */}
      <div className="rounded-b-2xl border border-gray-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden transition-colors duration-500 shadow-2xl shadow-purple-500/5 dark:shadow-black/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-white/[0.04]">
          {/* Left: video */}
          <div className="p-4 sm:p-5">
            <div className="aspect-video rounded-xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.04] overflow-hidden relative flex items-center justify-center transition-colors duration-500">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1604272986062-67ef7145f0ef?w=400&q=80"
                alt="Creator recording"
                width={400}
                height={225}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <motion.div
                className="absolute bottom-3 left-3 right-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5, duration: 0.5 }}
              >
                <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
                  <span className="text-[11px] text-white/90 leading-snug">
                    ...something that completely changed my workflow
                  </span>
                </div>
              </motion.div>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ opacity: [0.8, 0.4, 0.8] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <Play className="w-4 h-4 text-white ml-0.5" />
                </div>
              </motion.div>
              {/* Processing badge */}
              <motion.div
                className="absolute top-2.5 right-2.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5 }}
              >
                <div className="flex items-center gap-1 bg-purple-600/90 backdrop-blur-sm rounded-md px-2 py-1">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-white"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-[9px] text-white font-medium">Transcribing</span>
                </div>
              </motion.div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <motion.div
                className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0 transition-colors duration-500"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Mic className="w-3 h-3 text-purple-500 dark:text-purple-400" />
              </motion.div>
              <div className="flex-1 overflow-hidden">
                <WaveformBars count={32} />
              </div>
              <span className="text-[9px] font-mono text-gray-400 dark:text-white/20 flex-shrink-0">04:32</span>
            </div>
          </div>

          {/* Right: transcript */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5 text-purple-500/70 dark:text-purple-400/70" />
              <span className="text-[11px] font-semibold text-gray-600 dark:text-white/60">Transcript</span>
              <motion.div
                className="ml-auto flex items-center gap-1.5"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400/90 font-medium">Live</span>
              </motion.div>
            </div>
            <div className="space-y-3 text-[12px] text-gray-700 dark:text-white/70 leading-relaxed min-h-[110px] transition-colors duration-500">
              <div className="flex gap-2">
                <span className="text-[9px] font-mono text-purple-400/50 mt-0.5 shrink-0 w-8">00:00</span>
                <p>
                  {line1}
                  {line1.length < fullLine1.length && (
                    <motion.span
                      className="inline-block w-[1.5px] h-3.5 bg-purple-500 dark:bg-purple-400 ml-0.5 align-middle"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  )}
                </p>
              </div>
              {line1.length >= fullLine1.length && (
                <motion.div className="flex gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <span className="text-[9px] font-mono text-purple-400/50 mt-0.5 shrink-0 w-8">00:08</span>
                  <p>
                    {line2}
                    <motion.span
                      className="inline-block w-[1.5px] h-3.5 bg-purple-500 dark:bg-purple-400 ml-0.5 align-middle"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  </p>
                </motion.div>
              )}
            </div>
            <motion.div
              className="mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.04] transition-colors duration-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.2, duration: 0.5 }}
            >
              <p className="text-[10px] text-gray-400 dark:text-white/25 mb-2 font-medium uppercase tracking-wide">Export as</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'SRT', icon: Subtitles, color: 'text-blue-500' },
                  { label: 'TXT', icon: FileText, color: 'text-gray-500' },
                  { label: 'Translate', icon: Languages, color: 'text-pink-500' },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] text-[9px] font-medium text-gray-500 dark:text-white/40 transition-colors duration-500"
                  >
                    <f.icon className={`w-2.5 h-2.5 ${f.color}`} />
                    {f.label}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatsBar() {
  const stats = [
    { value: '2M+', label: 'minutes transcribed', icon: Clock },
    { value: '98.5%', label: 'accuracy', icon: CheckCircle2 },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.7, duration: 0.6 }}
      className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 mt-10 pt-8 border-t border-gray-100 dark:border-white/[0.04] transition-colors duration-500"
    >
      {stats.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="text-xl font-bold text-gray-800 dark:text-white/80 transition-colors duration-500">{s.value}</span>
          <span className="text-[11px] text-gray-400 dark:text-white/25 transition-colors duration-500">{s.label}</span>
        </div>
      ))}
    </motion.div>
  );
}

// Hardcoded spots remaining for Creator Pro FOMO (update manually as spots are claimed)
const CREATOR_PRO_SPOTS_LEFT = 4;

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const [showFreeMicrocopy, setShowFreeMicrocopy] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isLoggedIn()) {
      setShowFreeMicrocopy(true);
      return;
    }
    const plan = (localStorage.getItem('plan') || 'free').toLowerCase();
    const isPaid = ['basic', 'pro', 'agency', 'founding_workflow'].includes(plan);
    setShowFreeMicrocopy(!isPaid);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.94]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -40]);
  const heroOpacity = useTransform(scrollYProgress, [0.05, 0.45], [1, 0]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div ref={ref} className="relative">
      <motion.section
        style={{ scale: heroScale, y: heroY, opacity: heroOpacity }}
        className="relative flex flex-col items-center overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-500 min-h-[100vh]"
      >
        {/* Background */}
        <motion.div style={{ y: bgY }} className="absolute inset-0 z-0 min-h-[100vh]">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1514471157964-06459a4b9241?w=800&q=80"
            alt=""
            width={800}
            height={450}
            className="w-full h-full object-cover opacity-[0.03] dark:opacity-[0.10] scale-110 transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/90 to-white dark:from-gray-950/40 dark:via-gray-950/90 dark:to-gray-950 transition-colors duration-500" />
        </motion.div>

        {/* Ambient glow */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <div className="absolute top-[15%] left-[10%] w-[600px] h-[600px] bg-purple-400/[0.07] dark:bg-purple-600/[0.08] rounded-full blur-[140px]" />
          <div className="absolute top-[25%] right-[5%] w-[450px] h-[450px] bg-indigo-400/[0.05] dark:bg-blue-600/[0.06] rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] left-[30%] w-[400px] h-[300px] bg-pink-400/[0.03] dark:bg-pink-600/[0.04] rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pt-24 sm:pt-28 pb-6">

          {/* FOMO: Creator Pro spot counter */}
          {!isLoggedIn() && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex justify-center mb-4"
            >
              <Link to="/pricing">
                <div className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-300/70 dark:border-amber-500/25 hover:border-amber-400 dark:hover:border-amber-400/40 transition-all cursor-pointer">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-amber-500"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    {CREATOR_PRO_SPOTS_LEFT} spots left
                  </span>
                  <span className="text-[11px] text-amber-600/80 dark:text-amber-400/60">· $10/month Creator Pro — locked forever</span>
                  <ChevronRight className="w-3 h-3 text-amber-500/60 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </motion.div>
          )}

          {/* YouTube badge — NEW feature announcement */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <Link to="/video-to-transcript">
              <div className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-50 to-red-50 dark:from-purple-500/10 dark:to-red-500/10 border border-purple-200/60 dark:border-purple-500/20 hover:border-purple-300 dark:hover:border-purple-400/30 transition-all cursor-pointer">
                <Sparkles className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold tracking-wide">New</span>
                <span className="w-px h-3 bg-purple-200 dark:bg-purple-500/30" />
                <Youtube className="w-3 h-3 text-red-500" />
                <span className="text-[11px] text-gray-500 dark:text-white/40 transition-colors duration-500">Paste any YouTube URL → instant transcript</span>
                <ChevronRight className="w-3 h-3 text-gray-400 dark:text-white/25 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center text-4xl sm:text-5xl md:text-[3.75rem] lg:text-[4.5rem] font-bold tracking-tight text-gray-900 dark:text-white leading-[1.08] mb-5 transition-colors duration-500"
          >
            From Video to Transcript{' '}
            <span className="relative">
              <span className="relative z-10 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                in Minutes — Not Hours.
              </span>
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'left' }}
              />
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-center text-[16px] sm:text-[17px] text-gray-500 dark:text-white/45 max-w-xl mx-auto leading-relaxed mb-8 transition-colors duration-500"
          >
            Paste a YouTube link or upload a file. Get a clean, accurate transcript ready to download — no waiting, no hassle.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-3"
          >
            <Link to="/video-to-transcript">
              <motion.span
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="group relative inline-flex bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-purple-500/25 dark:shadow-purple-600/25 hover:shadow-xl hover:shadow-purple-500/35 transition-all overflow-hidden text-[15px]"
              >
                <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  Transcribe My Video Now
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </motion.span>
            </Link>
            <Link
              to="/guide"
              className="text-gray-500 dark:text-white/35 hover:text-gray-700 dark:hover:text-white/65 transition-colors text-sm font-medium flex items-center gap-1.5 px-4 py-3.5"
            >
              <Play className="w-3.5 h-3.5" />
              See how it works
            </Link>
          </motion.div>

          {/* Microcopy — hide for paid users (Basic, Pro, Agency, Founding) */}
          {showFreeMicrocopy === true && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-center text-[11px] text-gray-400 dark:text-white/20 tracking-wide transition-colors duration-500"
            >
              Try free · No credit card · Files deleted after processing
            </motion.p>
          )}

          {/* Social proof */}
          <SocialProof />

          {/* Product demo */}
          <LiveTranscriptPanel />

          {/* Stats */}
          <StatsBar />

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4, duration: 0.8 }}
            className="flex justify-center mt-10"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-white/25 transition-colors duration-500">Scroll</span>
              <ArrowDown className="w-3.5 h-3.5 text-gray-400 dark:text-white/25 transition-colors duration-500" />
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white dark:from-gray-950 to-transparent z-[8] transition-colors duration-500" />
      </motion.section>
    </div>
  );
}
