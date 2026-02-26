import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LANDING_TOOLS } from '../../config/landingTools';
import { ToolIcon } from './ToolIcon';
import { trackEvent } from '../../lib/analytics';

export function Features() {
  return (
    <section id="tools" className="pt-4 pb-24 bg-white dark:bg-gray-900 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful tools for your videos
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to transcribe, translate, and manage your video content
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LANDING_TOOLS.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={tool.href}
                onClick={() => trackEvent('tool_selected', { tool: tool.name, path: tool.href })}
              >
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="relative group h-full bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all shadow-sm hover:shadow-xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradientFrom} ${tool.gradientTo} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`} />

                  <div className="relative z-10">
                    <ToolIcon
                      icon={tool.icon}
                      gradientFrom={tool.gradientFrom}
                      gradientTo={tool.gradientTo}
                      size="lg"
                      animate
                      className="mb-6"
                    />

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {tool.name}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {tool.description}
                    </p>

                    <motion.div
                      className="mt-4 flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium"
                      initial={{ x: 0 }}
                      whileHover={{ x: 4 }}
                    >
                      <span>Try it now</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
