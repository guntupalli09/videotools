import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'Is my video data safe?',
    a: 'Yes. Your files are processed and immediately deleted after transcription is complete. We never store your content, share it with third parties, or use it to train AI models. Your work stays yours.',
  },
  {
    q: 'How accurate is the transcription?',
    a: "We use OpenAI's Whisper model — one of the most accurate AI transcription systems available. Expect 95–98.5% accuracy on clear audio. Accuracy varies with audio quality, accents, and background noise, but Whisper handles diverse accents better than most alternatives.",
  },
  {
    q: 'Can I transcribe a YouTube video directly?',
    a: 'Yes — paste any public YouTube URL into the transcript tool and we extract and transcribe the audio directly. No download needed, no extra software. Works for any public video up to the duration limit on your plan.',
  },
  {
    q: 'What video and audio formats do you support?',
    a: 'We accept MP4, MOV, AVI, MKV, WebM, and most common video formats. Audio-only uploads also work: MP3, WAV, M4A, and more. There is no re-encoding required on your end.',
  },
  {
    q: 'How fast is processing?',
    a: 'Most videos are transcribed in under 60 seconds. A 60-minute podcast typically completes in 2–4 minutes. Batch jobs and very long videos may take longer but all run in the background — you receive a download link when done.',
  },
  {
    q: 'What languages do you support?',
    a: 'Transcription works in 50+ languages including English, Spanish, French, German, Japanese, Portuguese, Arabic, Hindi, Korean, Chinese, and many more. Translation to additional languages is available via the Translate Subtitles tool.',
  },
  {
    q: "What's included in the free plan?",
    a: '3 free imports per month with no credit card required. Each import can be a video, audio file, or YouTube URL. Perfect for trying the tool before committing to a paid plan.',
  },
  {
    q: 'Can I export to different formats?',
    a: 'Yes. Transcripts export as TXT, JSON, DOCX, and PDF. Subtitles export as SRT and VTT. You can also burn subtitles directly into your video file using the Burn Subtitles tool.',
  },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: index * 0.05, duration: 0.45 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left group"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-4 py-5 border-b border-gray-100 dark:border-white/[0.06] transition-colors duration-500">
          <span className="text-[15px] font-semibold text-gray-800 dark:text-white/85 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-snug">
            {q}
          </span>
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-500/15 transition-colors duration-200">
            {open
              ? <Minus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              : <Plus className="w-3.5 h-3.5 text-gray-500 dark:text-white/40 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
            }
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pt-3 pb-5 text-[14px] text-gray-500 dark:text-white/45 leading-relaxed transition-colors duration-500">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ() {
  return (
    <section className="py-24 bg-white dark:bg-gray-950 transition-colors duration-500">
      <div className="max-w-3xl mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-3 transition-colors duration-500">
            Questions
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-500">
            Everything you want to know.
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/40 transition-colors duration-500">
            Still have questions?{' '}
            <Link to="/feedback" className="text-purple-600 dark:text-purple-400 hover:underline underline-offset-2 transition-colors">
              Ask us anything →
            </Link>
          </p>
        </motion.div>

        <div>
          {FAQS.map((faq, i) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
