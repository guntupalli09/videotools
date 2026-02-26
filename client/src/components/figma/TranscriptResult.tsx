import { motion } from 'framer-motion';
import {
  Check,
  Download,
  Search,
  Edit,
  Copy,
  Languages,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TranscriptResultProps {
  fileName: string;
  processingTime: string;
  fileSize?: string;
  transcript: string;
  /** Minutes remaining this month (optional). */
  minutesRemaining?: number | null;
  onDownload?: () => void;
  onProcessAnother?: () => void;
  onGenerateSubtitles?: () => void;
  onExportSrt?: () => void;
  onExportVtt?: () => void;
  onCopy?: () => void;
  onTranslate?: () => void;
  onEditToggle?: () => void;
  editLabel?: string;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  /** When false, hides the built-in Transcript card (use external layout instead). */
  showTranscriptCard?: boolean;
  /** Next-step tools: { path, name, description } */
  relatedTools?: Array<{ path: string; name: string; description: string }>;
  /** When false, hides the built-in Next step cards (use external workflow UI instead). */
  showNextSteps?: boolean;
}

export function TranscriptResult({
  fileName,
  processingTime,
  fileSize,
  transcript,
  minutesRemaining,
  onDownload,
  onProcessAnother,
  onGenerateSubtitles,
  onExportSrt,
  onExportVtt,
  onCopy,
  onTranslate,
  onEditToggle,
  editLabel = 'Edit',
  searchQuery = '',
  onSearchQueryChange,
  showTranscriptCard = true,
  relatedTools = [],
  showNextSteps = true,
}: TranscriptResultProps) {
  const defaultRelatedTools: Array<{ path: string; name: string; description: string }> = [
    { path: '/video-to-subtitles', name: 'Video → Subtitles', description: 'Generate SRT/VTT' },
    { path: '/burn-subtitles', name: 'Burn Subtitles', description: 'Burn video + SRT files' },
    { path: '/compress-video', name: 'Compress Video', description: 'Reduce file size' },
  ];
  const tools = relatedTools.length > 0 ? relatedTools : defaultRelatedTools;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4"
        >
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your file is ready!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-1">{fileName}</p>
        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Processed in {processingTime} ⚡</p>
        {(fileSize || minutesRemaining != null) && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {fileSize && <span>{fileSize}</span>}
            {fileSize && minutesRemaining != null && <span className="mx-1">•</span>}
            {minutesRemaining != null && <span>{minutesRemaining} min remaining this month</span>}
          </p>
        )}
      </motion.div>

      {onDownload && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onDownload}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download
        </motion.button>
      )}

      {onGenerateSubtitles != null && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onGenerateSubtitles}
            className="w-full py-3.5 bg-white dark:bg-gray-800 border-2 border-purple-500 dark:border-purple-500 text-purple-600 dark:text-purple-400 font-semibold rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-5 h-5" />
            Continue Workflow
          </button>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">Generate subtitles — same video pre-filled, no re-upload</p>
        </motion.div>
      )}

      {onProcessAnother && (
        <div className="text-center">
          <button
            type="button"
            onClick={onProcessAnother}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium transition-colors"
          >
            Process another file
          </button>
        </div>
      )}

      {onGenerateSubtitles != null && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">Same timestamps, no re-upload. Or continue workflow above.</p>
          <div className="flex gap-3">
            {onExportSrt && (
              <button
                type="button"
                onClick={onExportSrt}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download SRT
              </button>
            )}
            {onExportVtt && (
              <button
                type="button"
                onClick={onExportVtt}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download VTT
              </button>
            )}
          </div>
        </div>
      )}

      {showTranscriptCard && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transcript</h3>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {onSearchQueryChange && (
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search in transcript"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              )}
              {onEditToggle && (
                <button
                  type="button"
                  onClick={onEditToggle}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  {editLabel}
                </button>
              )}
              {onExportSrt && (
                <button
                  type="button"
                  onClick={onExportSrt}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                >
                  SRT
                </button>
              )}
              {onExportVtt && (
                <button
                  type="button"
                  onClick={onExportVtt}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                >
                  VTT
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mb-4">
              {onTranslate && (
                <button
                  type="button"
                  onClick={onTranslate}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-2"
                >
                  <Languages className="w-4 h-4" />
                  Translate
                </button>
              )}
              {onCopy && (
                <button
                  type="button"
                  onClick={onCopy}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {transcript}
            </div>
          </div>
        </div>
      )}

      {showNextSteps && tools.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Next step</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Your next file is pre-filled on the next tool.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                state={{ useWorkflowVideo: true }}
                className="block p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  {tool.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tool.description}</p>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:hover:text-purple-400 mt-2 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
