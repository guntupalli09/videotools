import { Check, Download, File } from 'lucide-react'
import { formatFileSize } from '../lib/utils'
import { motion } from 'framer-motion'

interface SuccessStateProps {
  fileName?: string
  fileSize?: number
  downloadUrl?: string
  onProcessAnother?: () => void
}

export default function SuccessState({
  fileName,
  fileSize,
  downloadUrl,
  onProcessAnother,
}: SuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="bg-success/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <Check className="h-8 w-8 text-success" />
      </motion.div>

      <h3 className="text-2xl font-bold text-gray-800 mb-2">Your file is ready!</h3>

      {fileName && (
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-6 max-w-md mx-auto">
          <div className="flex items-center space-x-4">
            <div className="bg-violet-100 rounded-lg p-3">
              <File className="h-6 w-6 text-violet-600" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-gray-800">{fileName}</p>
              {fileSize && <p className="text-sm text-gray-500">{formatFileSize(fileSize)}</p>}
            </div>
          </div>
        </div>
      )}

      {downloadUrl && (
        <a
          href={downloadUrl}
          download
          className="block w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-4 px-6 rounded-lg transition-colors mb-4"
        >
          <Download className="h-5 w-5 inline-block mr-2" />
          Download
        </a>
      )}

      {onProcessAnother && (
        <button
          onClick={onProcessAnother}
          className="text-violet-600 hover:text-violet-700 font-medium text-sm transition-colors"
        >
          Process another file
        </button>
      )}
    </motion.div>
  )
}
