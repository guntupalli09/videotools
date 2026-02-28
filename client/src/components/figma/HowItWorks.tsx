import { motion } from 'framer-motion';
import { Upload, Zap, Download } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'Upload file',
    description: 'Drop your video or paste a URL',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Zap,
    title: 'We process',
    description: 'Our AI handles the rest in seconds',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Download,
    title: 'Download',
    description: 'Get your file and go',
    color: 'from-pink-500 to-pink-600',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 px-6 bg-gradient-to-b from-gray-100 to-white dark:from-gray-950 dark:to-gray-900 transition-colors duration-500">
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-600/30 dark:bg-purple-600/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-600/30 dark:bg-blue-600/30 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            How it works
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.7, delay: index * 0.2 }}
                className="relative flex flex-col items-center text-center"
              >
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-20 left-1/2 w-full h-0.5 bg-gradient-to-r from-purple-500/50 to-transparent" />
                )}

                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative z-10 mb-6">
                  <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-full blur-xl opacity-50`} />
                  <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-2xl`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                </motion.div>

                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-xs">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 p-6 sm:p-8 rounded-2xl bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center"
        >
          <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-2">
            What you get
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
            Transcript, Speakers, Summary, Chapters, Highlights, Keywords, Clean, Exports: all after one upload.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Your videos and files are processed then deleted. We don't keep copies. Your content stays yours.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
