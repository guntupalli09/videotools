import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File } from 'lucide-react'
import { formatFileSize } from '../lib/utils'

interface FileUploadZoneProps {
  onFileSelect?: (file: File) => void
  onFilesSelect?: (files: File[]) => void
  accept?: Record<string, string[]>
  maxSize?: number
  disabled?: boolean
  multiple?: boolean
  /** Pre-fill from workflow (same file, no re-upload). When user clicks Remove, onRemove is called. */
  initialFiles?: File[] | null
  /** Called when user removes initial/workflow file so parent can clear workflow. */
  onRemove?: () => void
  /** Short label when file is from previous step (e.g. "From previous step") */
  fromWorkflowLabel?: string
}

export default function FileUploadZone({
  onFileSelect,
  onFilesSelect,
  accept = { 'video/*': ['.mp4', '.mov', '.avi', '.webm'] },
  maxSize = 100 * 1024 * 1024, // 100MB
  disabled = false,
  multiple = false,
  initialFiles = null,
  onRemove,
  fromWorkflowLabel,
}: FileUploadZoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (initialFiles?.length) {
      setSelectedFiles(initialFiles)
    } else {
      setSelectedFiles([])
    }
  }, [initialFiles])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        if (multiple) {
          setSelectedFiles(acceptedFiles)
          onFilesSelect?.(acceptedFiles)
        } else {
          const file = acceptedFiles[0]
          setSelectedFiles([file])
          onFileSelect?.(file)
          onFilesSelect?.([file])
        }
      }
    },
    [multiple, onFileSelect, onFilesSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    disabled,
    multiple,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  const handleRemove = () => {
    setSelectedFiles([])
    onRemove?.()
  }

  if (selectedFiles.length > 0) {
    return (
      <div className="bg-gray-50/80 rounded-2xl p-6 shadow-sm border border-gray-100/80">
        {fromWorkflowLabel && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              {fromWorkflowLabel}
            </span>
            <span className="text-xs text-gray-500">Remove to use a different file.</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="bg-violet-100/80 rounded-xl p-3 shrink-0">
              <File className="h-6 w-6 text-violet-600" />
            </div>
            <div className="min-w-0">
              {selectedFiles.length === 1 ? (
                <>
                  <p className="font-medium text-gray-800 truncate">{selectedFiles[0].name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFiles[0].size)}</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-800">
                    {selectedFiles.length} files selected
                  </p>
                  <p className="text-sm text-gray-500">
                    Total: {formatFileSize(selectedFiles.reduce((s, f) => s + f.size, 0))}
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
          >
            Remove
          </button>
        </div>
        {selectedFiles.length > 1 && (
          <div className="mt-4 max-h-40 overflow-y-auto rounded-lg bg-white p-3 text-sm text-gray-700">
            <ul className="space-y-1">
              {selectedFiles.map((f) => (
                <li key={`${f.name}-${f.size}`} className="flex justify-between">
                  <span className="truncate pr-4">{f.name}</span>
                  <span className="text-gray-500">{formatFileSize(f.size)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
        ${
          isDragActive || isDragging
            ? 'border-violet-500 bg-violet-50/80'
            : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50/80'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {isDragActive
          ? multiple
            ? 'Drop your files here'
            : 'Drop your file here'
          : multiple
          ? 'Drag and drop your files'
          : 'Drag and drop your file'}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        or click to browse
      </p>
      <p className="text-xs text-gray-400">
        Max file size: {formatFileSize(maxSize)}
      </p>
    </div>
  )
}
