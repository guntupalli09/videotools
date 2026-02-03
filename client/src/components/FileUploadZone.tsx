import { useCallback, useState } from 'react'
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
}

export default function FileUploadZone({
  onFileSelect,
  onFilesSelect,
  accept = { 'video/*': ['.mp4', '.mov', '.avi', '.webm'] },
  maxSize = 100 * 1024 * 1024, // 100MB
  disabled = false,
  multiple = false,
}: FileUploadZoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

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
  }

  if (selectedFiles.length > 0) {
    return (
      <div className="bg-gray-50/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-violet-100/80 rounded-xl p-3">
              <File className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              {selectedFiles.length === 1 ? (
                <>
                  <p className="font-medium text-gray-800">{selectedFiles[0].name}</p>
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
            onClick={handleRemove}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            disabled={disabled}
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
