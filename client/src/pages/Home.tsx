import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ToolCard from '../components/ToolCard'
import {
  FileText,
  MessageSquare,
  Languages,
  Wrench,
  Film,
  Minimize2,
  FolderPlus,
  Upload,
  Zap,
  Download,
} from 'lucide-react'

const tools = [
  {
    icon: FileText,
    title: 'Video → Transcript',
    description: 'Extract spoken text from any video in seconds',
    path: '/video-to-transcript',
  },
  {
    icon: MessageSquare,
    title: 'Video → Subtitles',
    description: 'Generate SRT and VTT subtitle files instantly',
    path: '/video-to-subtitles',
  },
  {
    icon: Languages,
    title: 'Translate Subtitles',
    description: 'Convert subtitles to Arabic, Hindi, and more',
    path: '/translate-subtitles',
  },
  {
    icon: Wrench,
    title: 'Fix Subtitles',
    description: 'Auto-correct timing issues and formatting errors',
    path: '/fix-subtitles',
  },
  {
    icon: Film,
    title: 'Burn Subtitles',
    description: 'Hardcode captions directly into your video',
    path: '/burn-subtitles',
  },
  {
    icon: Minimize2,
    title: 'Compress Video',
    description: 'Reduce file size while keeping quality high',
    path: '/compress-video',
  },
  {
    icon: FolderPlus,
    title: 'Batch Processing',
    description: 'Upload multiple videos and process them together',
    path: '/batch-process',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-white to-primary/5 dark:from-gray-800/50 dark:via-gray-900 dark:to-gray-800/50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center w-[90%] sm:w-full max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center justify-center gap-2 mb-6">
              <span className="inline-flex items-center space-x-2 bg-primary/10 text-primary dark:bg-primary/20 px-4 py-2 rounded-full text-sm font-medium">
                <span>✨</span>
                <span>For creators & teams</span>
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-8 tracking-tight max-w-2xl mx-auto">
              Turn speech into text in seconds
            </h1>

            <p className="text-xl font-normal text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-xl mx-auto">
              Transcripts, subtitles, translation, in seconds. Your files are processed and deleted. Just drop and go.
            </p>

            <div className="flex flex-col items-center gap-5">
              <Link
                to="/video-to-transcript"
                className="btn-primary px-8 py-3.5 text-base"
              >
                Try transcription free →
              </Link>
              <Link
                to="#tools"
                onClick={(e) => {
                  const el = document.getElementById('tools')
                  if (el) {
                    e.preventDefault()
                    el.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:opacity-80 transition-motion"
              >
                See all tools
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
              No signup required. We don’t store your data.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tool Grid Section */}
      <section id="tools" className="py-16 md:py-24 bg-white dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
              Seven powerful tools. One simple platform.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.path}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <ToolCard {...tool} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-gray-50 dark:bg-gray-800/80 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">How it works</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Upload, title: 'Upload file', description: 'Drop your video or paste a URL' },
              { icon: Zap, title: 'We process', description: 'Our AI handles the rest in seconds' },
              { icon: Download, title: 'Download', description: 'Get your file and go' },
            ].map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="bg-violet-600 text-white h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-8 w-8" aria-hidden />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white tracking-tight mb-2">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 font-normal leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-relaxed">
              Your videos and files are processed then deleted. We don’t keep copies. Your content stays yours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing on landing — compact */}
      <section id="pricing" className="bg-gradient-to-br from-primary to-purple-700 dark:from-violet-800 dark:to-purple-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
              Start free. Upgrade when you need more.
            </h2>
            <p className="text-lg text-white/90">
              60 min/month free · No credit card required
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            {[
              { name: 'Free', price: '$0', min: '60 min', cta: null },
              { name: 'Basic', price: '$19', min: '450 min', cta: 'Choose' },
              { name: 'Pro', price: '$49', min: '1,200 min', cta: 'Choose', popular: true },
              { name: 'Agency', price: '$129', min: '3,000 min', cta: 'Choose' },
            ].map((plan) => (
              <Link
                key={plan.name}
                to="/pricing"
                className={`rounded-xl p-6 text-left transition-motion ${
                  plan.popular
                    ? 'bg-white text-violet-900 shadow-card-elevated ring-2 ring-white/50'
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                {plan.popular && (
                  <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Most popular</span>
                )}
                <p className="font-semibold text-lg mt-0.5">{plan.name}</p>
                <p className="text-2xl font-bold mt-1">{plan.price}<span className="text-sm font-normal opacity-80">/mo</span></p>
                <p className="text-sm opacity-90 mt-1">{plan.min} / month</p>
                {plan.cta && (
                  <span className={`inline-block mt-4 text-sm font-medium ${plan.popular ? 'text-violet-600' : 'text-white'}`}>
                    {plan.cta} →
                  </span>
                )}
              </Link>
            ))}
          </motion.div>
          <p className="text-center mt-6">
            <Link
              to="/pricing"
              className="text-white/90 hover:text-white font-medium underline underline-offset-2"
            >
              Full pricing & features →
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
