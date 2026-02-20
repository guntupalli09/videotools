/**
 * Instant file preview card: filename, duration, thumbnail (video) or placeholder (audio).
 * Persists through upload + processing. Browser APIs only.
 */

import { File, Music } from 'lucide-react'
import { formatFileSize } from '../lib/utils'
import { formatDuration, type FilePreviewData } from '../lib/filePreview'

export interface FilePreviewCardProps {
  preview: FilePreviewData
  /** Optional: show compact variant during processing */
  compact?: boolean
}

export default function FilePreviewCard({ preview, compact = false }: FilePreviewCardProps) {
  const { fileName, fileSize, durationSeconds, thumbnailDataUrl, isVideo } = preview

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-gray-50/80 px-4 py-3">
        {thumbnailDataUrl ? (
          <img src={thumbnailDataUrl} alt="" className="h-12 w-20 rounded object-cover shrink-0" />
        ) : (
          <div className="h-12 w-20 rounded bg-violet-100 flex items-center justify-center shrink-0">
            {isVideo ? <File className="h-6 w-6 text-violet-600" /> : <Music className="h-6 w-6 text-violet-600" />}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-gray-800 truncate">{fileName}</p>
          <p className="text-xs text-gray-500">
            {formatFileSize(fileSize)}
            {durationSeconds != null && ` · ${formatDuration(durationSeconds)}`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gray-50/80 p-4 shadow-card ring-1 ring-gray-100/80">
      <div className="flex gap-4 items-start">
        {thumbnailDataUrl ? (
          <img
            src={thumbnailDataUrl}
            alt=""
            className="w-32 h-[72px] rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-32 h-[72px] rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            {isVideo ? <File className="h-8 w-8 text-violet-600" /> : <Music className="h-8 w-8 text-violet-600" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-800 truncate">{fileName}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatFileSize(fileSize)}
            {durationSeconds != null && ` · ${formatDuration(durationSeconds)}`}
          </p>
        </div>
      </div>
    </div>
  )
}
