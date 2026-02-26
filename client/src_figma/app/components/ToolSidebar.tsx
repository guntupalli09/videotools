import { motion } from 'motion/react';
import { Crown, Clock, CheckCircle2 } from 'lucide-react';

interface PlanInfo {
  type: 'free' | 'basic' | 'pro';
  minutesRemaining: number;
  minutesTotal: number;
  resetDate: string;
  features: string[];
}

interface ToolSidebarProps {
  planInfo?: PlanInfo;
}

export function ToolSidebar({ planInfo }: ToolSidebarProps) {
  const defaultPlan: PlanInfo = {
    type: 'pro',
    minutesRemaining: 463,
    minutesTotal: 500,
    resetDate: '28/2/2026',
    features: [
      'Transcript',
      'Speakers',
      'Summary',
      'Chapters',
      'Highlights',
      'Keywords',
      'Clean',
      'Translate',
      'Editor',
      'YouTube'
    ]
  };

  const plan = planInfo || defaultPlan;
  const percentage = (plan.minutesRemaining / plan.minutesTotal) * 100;

  return (
    <div className="space-y-6">
      {/* Plan Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white shadow-lg">
          <Crown className="w-4 h-4" />
          <span className="text-sm font-bold uppercase">{plan.type} plan</span>
        </div>
      </motion.div>

      {/* Minutes Remaining Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-purple-700 dark:text-purple-300 font-medium mb-1">
              Minutes remaining this month
            </p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {plan.minutesRemaining}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 bg-purple-200 dark:bg-purple-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            {plan.type} plan • Resets {plan.resetDate}
          </p>
        </div>
      </motion.div>

      {/* Plan Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
      >
        <div className="space-y-4">
          {/* Plan Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Plan
            </h3>
            <div className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-xs font-bold uppercase">
              {plan.type}
            </div>
          </div>

          {/* Features List */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              What you get
            </h4>
            <div className="space-y-2">
              {plan.features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (index * 0.05) }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {feature}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Upgrade CTA (for non-pro users) */}
      {plan.type !== 'pro' && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          Upgrade to Pro
        </motion.button>
      )}
    </div>
  );
}
