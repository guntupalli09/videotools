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
      <section className="bg-gradient-to-br from-violet-50 via-white to-purple-50 py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center space-x-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full mb-6">
              <span>✨</span>
              <span className="text-sm font-medium">No signup required • Free tools</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
              Video utilities that just work
            </h1>

            <p className="text-xl text-gray-600 mb-8">
              Professional video tools for creators. No bloat. No signup. Just drop your file and go.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="#tools"
                className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Choose a tool →
              </Link>
              <Link
                to="/pricing"
                className="bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-800 px-8 py-3 rounded-lg font-medium transition-colors"
              >
                See pricing
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tool Grid Section */}
      <section id="tools" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
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
      <section id="how-it-works" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-4">How it works</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { number: 1, title: 'Upload file', description: 'Drop your video or paste a URL' },
              { number: 2, title: 'We process', description: 'Our AI handles the rest in seconds' },
              { number: 3, title: 'Download', description: 'Get your file and go' },
            ].map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="bg-violet-600 text-white h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center space-x-4 text-gray-600 text-sm font-medium">
              <span>100K+ videos processed</span>
              <span className="text-gray-300">•</span>
              <span>4.9★ rating</span>
              <span className="text-gray-300">•</span>
              <span>Free tier</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="bg-gradient-to-br from-primary to-purple-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Start free. Upgrade when you need more.
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Free tier includes 5-10 uses per month. No credit card required.
            </p>
            <Link
              to="/pricing"
              className="bg-white text-violet-600 hover:bg-gray-50 px-8 py-3 rounded-lg font-medium transition-colors inline-block"
            >
              View pricing →
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
