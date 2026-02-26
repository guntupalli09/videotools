import { motion } from 'motion/react';
import { Check, Download, ChevronRight } from 'lucide-react';
import { TOOL_CONFIGS } from '../config/tools';
import { ToolIcon } from './ToolIcon';

interface SubtitleResultProps {
  fileName: string;
  processingTime: string;
  fileSize: string;
  format: 'SRT' | 'VTT';
  onDownload?: () => void;
  onProcessAnother?: () => void;
}

export function SubtitleResult({
  fileName,
  processingTime,
  fileSize,
  format,
  onDownload,
  onProcessAnother
}: SubtitleResultProps) {
  const relatedTools = [
    {
      toolId: 'translate-subtitles',
      description: 'Convert to 50+ languages'
    },
    {
      toolId: 'fix-subtitles',
      description: 'Auto-correct timing'
    },
    {
      toolId: 'burn-subtitles',
      description: 'Hardcode into video'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4"
        >
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Your subtitles are ready!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-1">{fileName}</p>
        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
          Processed in {processingTime} ⚡
        </p>
      </motion.div>

      {/* File Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              {format} File
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {fileSize}
            </p>
          </div>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
            {format}
          </span>
        </div>
      </motion.div>

      {/* Download Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onDownload}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
      >
        <Download className="w-5 h-5" />
        Download {format}
      </motion.button>

      {/* Process Another File Link */}
      {onProcessAnother && (
        <div className="text-center">
          <button
            onClick={onProcessAnother}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium transition-colors"
          >
            Process another file
          </button>
        </div>
      )}

      {/* Next Step Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Next step
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {relatedTools.map((relatedTool, index) => {
            const toolConfig = TOOL_CONFIGS[relatedTool.toolId];
            if (!toolConfig) return null;

            return (
              <motion.button
                key={toolConfig.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <ToolIcon 
                  icon={toolConfig.icon}
                  gradientFrom={toolConfig.gradientFrom}
                  gradientTo={toolConfig.gradientTo}
                  size="md"
                  className="mb-3"
                />
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {toolConfig.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {relatedTool.description}
                </p>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 mt-2 transition-colors" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}