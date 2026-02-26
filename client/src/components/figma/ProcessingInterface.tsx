import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileVideo, Clock, Loader2 } from 'lucide-react';

interface UploadedFile {
  name: string;
  size: string;
  duration?: string;
  thumbnail?: string;
}

interface ProcessingInterfaceProps {
  file: UploadedFile;
  onRemove?: () => void;
  children?: React.ReactNode;
  actionLabel: string;
  /** Called when user clicks primary action; receives current trim range 0–100 so parent can convert to seconds. */
  onAction?: (trimStartPercent: number, trimEndPercent: number) => void;
  showVideoPlayer?: boolean;
  /** When true, show loading state on button (parent controls processing). */
  actionLoading?: boolean;
  /** Optional video src (e.g. object URL) for trim preview. */
  videoSrc?: string | null;
  /** Trim range 0–100 (controlled). */
  trimStartPercent?: number;
  trimEndPercent?: number;
  onTrimChange?: (startPercent: number, endPercent: number) => void;
}

export function ProcessingInterface({
  file,
  onRemove,
  children,
  actionLabel,
  onAction,
  showVideoPlayer = true,
  actionLoading = false,
  videoSrc,
  trimStartPercent = 0,
  trimEndPercent = 100,
  onTrimChange,
}: ProcessingInterfaceProps) {
  const [internalStart, setInternalStart] = useState(trimStartPercent ?? 0);
  const [internalEnd, setInternalEnd] = useState(trimEndPercent ?? 100);
  const start = trimStartPercent ?? internalStart;
  const end = trimEndPercent ?? internalEnd;

  const handleAction = () => {
    onTrimChange?.(start, end);
    onAction?.(start, end);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <FileVideo className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">{file.name}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{file.size}</span>
                {file.duration != null && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{file.duration}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {onRemove && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRemove}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {showVideoPlayer && (videoSrc || file.duration) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Trim video before processing</h3>
          {videoSrc && (
            <div className="bg-black rounded-xl overflow-hidden mb-4 aspect-video flex items-center justify-center">
              <video className="w-full h-full" controls src={videoSrc} />
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Start: {start}%</span>
              <span>End: {end}%</span>
              {file.duration && <span>Duration: {file.duration}</span>}
            </div>
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
              <input
                type="range"
                min="0"
                max="100"
                value={start}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setInternalStart(v);
                  onTrimChange?.(v, end);
                }}
                className="absolute w-full h-2 opacity-0 cursor-pointer"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={end}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setInternalEnd(v);
                  onTrimChange?.(start, v);
                }}
                className="absolute w-full h-2 opacity-0 cursor-pointer"
              />
              <motion.div
                className="absolute h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                style={{ left: `${start}%`, right: `${100 - end}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {children && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
        >
          {children}
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleAction}
        disabled={actionLoading}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {actionLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <span>{actionLabel}</span>
        )}
      </motion.button>
    </div>
  );
}
