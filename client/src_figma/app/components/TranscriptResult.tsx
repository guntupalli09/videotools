import { motion } from 'motion/react';
import { 
  Check, 
  Download, 
  Search, 
  Edit, 
  FileText, 
  Copy,
  Languages,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { TOOL_CONFIGS } from '../config/tools';
import { ToolIcon } from './ToolIcon';

interface TranscriptResultProps {
  fileName: string;
  processingTime: string;
  fileSize: string;
  transcript: string;
  onDownload?: () => void;
  onProcessAnother?: () => void;
  onGenerateSubtitles?: () => void;
}

export function TranscriptResult({
  fileName,
  processingTime,
  fileSize,
  transcript,
  onDownload,
  onProcessAnother,
  onGenerateSubtitles
}: TranscriptResultProps) {
  const [activeTab, setActiveTab] = useState('transcript');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'transcript', label: 'Transcript', icon: FileText },
    { id: 'speakers', label: 'Speakers' },
    { id: 'summary', label: 'Summary' },
    { id: 'chapters', label: 'Chapters' },
    { id: 'highlights', label: 'Highlights' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'clean', label: 'Clean' },
    { id: 'exports', label: 'Exports' }
  ];

  const relatedTools = [
    {
      toolId: 'video-to-subtitles',
      description: 'Generate SRT/VTT'
    },
    {
      toolId: 'burn-subtitles',
      description: 'Burn video + SRT files'
    },
    {
      toolId: 'compress-video',
      description: 'Reduce file size'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          <div className="flex items-center gap-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Processed in <span className="font-semibold text-purple-600 dark:text-purple-400">{processingTime}</span>
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-400">{fileSize}</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-purple-600 dark:text-purple-400">463 min</span> remaining this month
          </div>
        </div>
      </div>

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
          Your file is ready!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-1">{fileName}</p>
        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
          Processed in {processingTime} ⚡
        </p>
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
        Download
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

      {/* Generate Subtitles Section */}
      {onGenerateSubtitles && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
          <button
            onClick={onGenerateSubtitles}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium mb-4 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generate Subtitles →
          </button>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Bonus (Speakers): no re-upload
          </p>
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download SRT
            </button>
            <button className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download VTT
            </button>
          </div>
        </div>
      )}

      {/* Transcript Viewer */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Transcript
          </h3>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search in transcript"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors">
              SRT
            </button>
            <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors">
              VTT
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Translate
            </button>
            <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-2">
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>

          {/* Transcript Text */}
          <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {transcript}
          </div>
        </div>
      </div>

      {/* Next Step Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Next step
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your next file is pre-filled on the next tool.
        </p>
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