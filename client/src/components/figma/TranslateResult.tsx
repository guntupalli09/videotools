import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Download, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ResultHeader from '../ResultHeader';

interface TranslateResultProps {
  /** Content rendered immediately after the primary download button. */
  afterDownloadContent?: ReactNode;
  title?: string;
  fileName: string;
  processingTime: string;
  fileSize?: string;
  /** Button label, e.g. "Download translated subtitles" */
  downloadLabel?: string;
  onDownload?: () => void;
  onProcessAnother?: () => void;
  processAnotherLabel?: string;
  relatedTools?: Array<{ path: string; name: string; description: string }>;
  /** When true, download CTA is expected in a right-rail ExportsPanel instead. */
  hideDownload?: boolean;
}

const defaultRelatedTools = [
  { path: '/fix-subtitles', name: 'Fix Subtitles', description: 'Auto-correct timing' },
  { path: '/burn-subtitles', name: 'Burn Subtitles', description: 'Hardcode into video' },
  { path: '/video-to-subtitles', name: 'Video → Subtitles', description: 'Generate SRT/VTT from video' },
];

export function TranslateResult({
  title = 'Translation complete!',
  fileName,
  processingTime,
  fileSize,
  downloadLabel = 'Download translated subtitles',
  onDownload,
  afterDownloadContent,
  onProcessAnother,
  processAnotherLabel = 'Process another file',
  relatedTools = defaultRelatedTools,
  hideDownload = false,
}: TranslateResultProps) {
  return (
    <div className="tool-stack">
      <ResultHeader
        title={title.replace(/!$/, '')}
        processingTime={processingTime}
        fileName={fileName}
        actionLabel={processAnotherLabel}
        onAction={onProcessAnother}
      />

      {fileSize != null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-xl p-component border border-gray-200 dark:border-gray-800 shadow-sm"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">{fileSize}</p>
        </motion.div>
      )}

      {onDownload && !hideDownload && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onDownload}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          {downloadLabel}
        </motion.button>
      )}

      {afterDownloadContent}

      {relatedTools.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-component-sm">Next step</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-component-sm">
            {relatedTools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                state={tool.path === '/burn-subtitles' ? { useWorkflowVideo: true } : undefined}
                className="block p-component bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <h4 className="font-medium text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {tool.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tool.description}</p>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mt-2 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
