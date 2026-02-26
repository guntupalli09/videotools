import { motion } from 'motion/react';
import { X, FileVideo, Clock, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

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
  onAction?: () => void;
  showVideoPlayer?: boolean;
}

export function ProcessingInterface({
  file,
  onRemove,
  children,
  actionLabel,
  onAction,
  showVideoPlayer = true
}: ProcessingInterfaceProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  const handleAction = () => {
    setIsProcessing(true);
    onAction?.();
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* File Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {/* File Icon */}
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <FileVideo className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>

            {/* File Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                {file.name}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{file.size}</span>
                {file.duration && (
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

          {/* Remove Button */}
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

      {/* Video Player with Trim Controls */}
      {showVideoPlayer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Trim video before processing
          </h3>

          {/* Video Preview */}
          <div className="bg-black rounded-xl overflow-hidden mb-4 aspect-video flex items-center justify-center">
            <video 
              className="w-full h-full"
              controls
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            />
          </div>

          {/* Trim Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Start: 0:00</span>
              <span>End: {file.duration || '14:58'}</span>
              <span>Duration: {file.duration || '14:58 (899s)'}</span>
            </div>

            {/* Dual Range Slider */}
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
              <motion.div
                className="absolute h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                style={{
                  left: `${trimStart}%`,
                  right: `${100 - trimEnd}%`
                }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={trimStart}
                onChange={(e) => setTrimStart(Number(e.target.value))}
                className="absolute w-full h-2 opacity-0 cursor-pointer"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={trimEnd}
                onChange={(e) => setTrimEnd(Number(e.target.value))}
                className="absolute w-full h-2 opacity-0 cursor-pointer"
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Drag the left or right handle to trim this segment. Minimum 1 second.
            </p>
          </div>
        </motion.div>
      )}

      {/* Processing Options */}
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

      {/* Action Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleAction}
        disabled={isProcessing}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <span>{actionLabel}</span>
        )}
      </motion.button>

      {/* Processing Result (when complete) */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100">
                Processing complete!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your file is ready to download
              </p>
            </div>
          </div>
          <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors">
            Download Result
          </button>
        </motion.div>
      )}
    </div>
  );
}
