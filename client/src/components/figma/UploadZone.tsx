import { motion } from 'framer-motion';
import { Upload, File, Check, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';

interface UploadZoneProps {
  maxSize?: string;
  acceptedFormats?: string[];
  /** Native input accept attribute, e.g. ".srt,.vtt" or "video/*" */
  acceptAttribute?: string;
  onFileSelect?: (file: File) => void;
  /** When true, allow selecting multiple files; use with onFilesSelect. */
  multiple?: boolean;
  /** When multiple is true, called with all selected files. */
  onFilesSelect?: (files: File[]) => void;
  /** When true, call onFileSelect immediately and do not show simulated upload (parent controls next step). */
  immediateSelect?: boolean;
  /** Pre-fill file(s); when user removes, onRemove is called. */
  initialFiles?: File[] | null;
  onRemove?: () => void;
  fromWorkflowLabel?: string;
}

export function UploadZone({
  maxSize = '10 GB',
  acceptedFormats = ['MP4', 'MOV', 'AVI', 'WEBM', 'MKV'],
  acceptAttribute = 'video/*,audio/*',
  onFileSelect,
  multiple = false,
  onFilesSelect,
  immediateSelect = false,
  initialFiles = null,
  onRemove,
  fromWorkflowLabel,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFiles?.[0] ?? null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (multiple && onFilesSelect && e.dataTransfer.files?.length) {
      onFilesSelect(Array.from(e.dataTransfer.files));
      return;
    }
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [multiple, onFilesSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    if (multiple && onFilesSelect) {
      onFilesSelect(Array.from(fileList));
      e.target.value = '';
      return;
    }
    const file = fileList[0];
    if (file) handleFile(file);
  }, [multiple, onFilesSelect]);

  const handleFile = useCallback((file: File) => {
    setSelectedFile(file);
    setFileName(file.name);
    onFileSelect?.(file);
    if (immediateSelect) {
      setUploadStatus('idle');
      return;
    }
    setUploadStatus('uploading');
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setUploadStatus('success');
      }
    }, 200);
  }, [immediateSelect, onFileSelect]);

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setFileName('');
    setUploadStatus('idle');
    setProgress(0);
    onRemove?.();
  }, [onRemove]);

  if (selectedFile && immediateSelect && !multiple) {
    return (
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
                <Check className="w-10 h-10 text-white" />
              </div>
              <div className="min-w-0">
                {fromWorkflowLabel && (
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 block mb-1">{fromWorkflowLabel}</span>
                )}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">{selectedFile.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to configure
                </p>
              </div>
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
              >
                Remove
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? 'rgb(168, 85, 247)' : undefined
        }}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
        }`}
      >
        <div className="relative p-12 md:p-16 text-center">
          {uploadStatus === 'idle' && (
            <>
              <motion.div
                animate={{ y: isDragging ? -10 : [0, -10, 0] }}
                transition={{ duration: isDragging ? 0.3 : 2, repeat: isDragging ? 0 : Infinity, ease: 'easeInOut' }}
                className="mb-6 flex justify-center"
              >
                <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <Upload className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Drag and drop your file
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                or{' '}
                <label className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold cursor-pointer">
                  click to browse
                  <input type="file" className="hidden" onChange={handleFileInput} accept={acceptAttribute} {...(multiple ? { multiple: true } : {})} />
                </label>
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4" />
                  <span>Max file size: {maxSize}</span>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {acceptedFormats.map((format) => (
                  <span key={format} className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">
                    {format}
                  </span>
                ))}
              </div>
            </>
          )}
          {uploadStatus === 'uploading' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Uploading {fileName}</h3>
                <div className="max-w-md mx-auto">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{progress}% complete</p>
                </div>
              </div>
            </div>
          )}
          {uploadStatus === 'success' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 300 }} className="space-y-6">
              <div className="flex justify-center">
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <Check className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload complete!</h3>
                <p className="text-gray-600 dark:text-gray-400">Processing {fileName}...</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
