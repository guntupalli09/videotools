import { Check, Download, File } from 'lucide-react'
import { formatFileSize } from '../lib/utils'
import { trackEvent } from '../lib/analytics'
import { motion } from 'framer-motion'

interface SuccessStateProps {
  fileName?: string
  fileSize?: number
  downloadUrl?: string
  onProcessAnother?: () => void
  /** Optional: for result_downloaded analytics */
  toolType?: string
  jobId?: string
  /** When set, download uses this handler instead of direct link (e.g. free plan: fetch + watermark + download). */
  onDownloadClick?: (e: React.MouseEvent) => void
  /** Label for the download button when using onDownloadClick (e.g. "Download with watermark"). */
  downloadLabel?: string
}

export default function SuccessState({
  fileName,
  fileSize,
  downloadUrl,
  onProcessAnother,
  toolType,
  jobId,
  onDownloadClick,
  downloadLabel = 'Download',
}: SuccessStateProps) {
  const trackDownload = () => {
    try {
      trackEvent('result_downloaded', {
        ...(toolType && { tool_type: toolType }),
        ...(jobId && { job_id: jobId }),
      })
    } catch {
      // non-blocking
    }
  }
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

      <h3 className="font-display text-2xl font-bold text-gray-800 dark:text-white mb-2">Your file is ready!</h3>

      {fileName && (
        <div className="surface-card p-6 mb-6 max-w-md mx-auto">
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 rounded-xl p-3">
              <File className="h-6 w-6 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-gray-800">{fileName}</p>
              {fileSize && <p className="text-sm text-gray-500">{formatFileSize(fileSize)}</p>}
            </div>
          </div>
        </div>
      )}

      {(downloadUrl || onDownloadClick) && (
        onDownloadClick ? (
          <button
            type="button"
            onClick={(e) => {
              trackDownload()
              onDownloadClick(e)
            }}
            className="btn-primary w-full py-4 px-6 mb-4"
          >
            <Download className="h-5 w-5 inline-block mr-2" />
            {downloadLabel}
          </button>
        ) : (
          <a
            href={downloadUrl!}
            download
            onClick={trackDownload}
            className="btn-primary w-full py-4 px-6 mb-4"
          >
            <Download className="h-5 w-5 inline-block mr-2" />
            {downloadLabel}
          </a>
        )
      )}

      {onProcessAnother && (
        <button
          onClick={onProcessAnother}
          className="text-primary hover:text-primary-hover font-medium text-sm transition-colors"
        >
          Process another file
        </button>
      )}
    </motion.div>
  )
}
