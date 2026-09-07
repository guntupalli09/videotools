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
  onCancel,
}: ProcessingProgressProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  step.status === 'completed'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : step.status === 'active'
                      ? 'bg-blue-600 text-white'
                      : step.status === 'error'
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                }`}
              >
                {step.status === 'completed' ? (
                  <Check className="h-4 w-4" />
                ) : step.status === 'active' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : step.status === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  step.status === 'active'
                    ? 'text-blue-600 dark:text-blue-400'
                    : step.status === 'completed'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 w-12 ${
                  step.status === 'completed' ? 'bg-blue-400 dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-white">{currentMessage}</h3>
        {(statusSubtext || estimatedTime) && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {statusSubtext}
            {statusSubtext && estimatedTime ? ' • ' : ''}
            {estimatedTime && `Estimated time: ${estimatedTime}`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="absolute h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{estimatedTime && `Estimated time: ${estimatedTime}`}</span>
          <span className="font-semibold">{progress}%</span>
        </div>
      </div>

      {liveTranscript != null && liveTranscript.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">{livePreviewLabel}</h4>
          <div className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {liveTranscript}
          </div>
        </div>
      )}

      {onCancel && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
