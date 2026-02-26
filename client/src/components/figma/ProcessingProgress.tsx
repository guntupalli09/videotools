import { motion } from 'framer-motion';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface ProcessingStep {
  label: string;
  status: 'completed' | 'active' | 'pending' | 'error';
}

interface ProcessingProgressProps {
  steps: ProcessingStep[];
  currentMessage: string;
  progress: number;
  estimatedTime?: string;
  liveTranscript?: string;
  /** Label for the live preview box (e.g. "Live transcript" or "Live subtitles with timestamps"). */
  livePreviewLabel?: string;
  /** Optional secondary status (e.g. queue position). */
  statusSubtext?: string;
  onCancel?: () => void;
}

export function ProcessingProgress({
  steps,
  currentMessage,
  progress,
  estimatedTime,
  liveTranscript,
  livePreviewLabel = 'Live transcript',
  statusSubtext,
  onCancel
}: ProcessingProgressProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : step.status === 'active'
                    ? 'bg-purple-600 text-white'
                    : step.status === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}
              >
                {step.status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : step.status === 'active' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step.status === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </motion.div>
              <span
                className={`text-xs font-medium ${
                  step.status === 'active'
                    ? 'text-purple-600 dark:text-purple-400'
                    : step.status === 'completed'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 ${
                  step.status === 'completed' ? 'bg-green-400 dark:bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{currentMessage}</h3>
        {(statusSubtext || estimatedTime) && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {statusSubtext}
            {statusSubtext && estimatedTime ? ' • ' : ''}
            {estimatedTime && `Estimated time: ${estimatedTime}`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="absolute h-full bg-gradient-to-r from-purple-600 to-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{estimatedTime && `Estimated time: ${estimatedTime}`}</span>
          <span className="font-semibold">{progress}%</span>
        </div>
      </div>

      {liveTranscript != null && liveTranscript.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800"
        >
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{livePreviewLabel}</h4>
          <div className="max-h-48 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {liveTranscript}
          </div>
        </motion.div>
      )}

      {onCancel && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
