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
  /** Override the main heading text in the upload zone */
  title?: string;
}

function UploadIconTile({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-600 sm:h-14 sm:w-14 sm:rounded-xl">
      {children}
    </div>
  );
}

export function UploadZone({
  maxSize = '10 GB',
  acceptedFormats = ['MP4', 'MOV', 'MKV', 'AVI', 'WebM', 'MPEG', 'M4V', 'FLV', 'WMV', '3GP', 'MP3', 'WAV', 'M4A', 'FLAC', 'AAC'],
  acceptAttribute = 'video/*,audio/*',
  onFileSelect,
  multiple = false,
  onFilesSelect,
  immediateSelect = false,
  initialFiles = null,
  onRemove,
  fromWorkflowLabel,
  title,
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
        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <UploadIconTile>
                <Check className="h-6 w-6 text-white sm:h-7 sm:w-7" />
              </UploadIconTile>
              <div className="min-w-0">
                {fromWorkflowLabel && (
                  <span className="mb-1 block text-xs font-medium text-blue-600 dark:text-blue-400">{fromWorkflowLabel}</span>
                )}
                <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white sm:text-base">{selectedFile.name}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to configure
                </p>
              </div>
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                className="shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50'
        }`}
      >
        <div className="relative min-w-0 p-4 text-center sm:p-6 md:p-8">
          {uploadStatus === 'idle' && (
            <>
              <div className="mb-2 flex justify-center sm:mb-4">
                <UploadIconTile>
                  <Upload className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                </UploadIconTile>
              </div>
              <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white sm:mb-2 sm:text-xl">
                {title ?? (multiple ? 'Drag and drop your file(s)' : 'Upload a file')}
              </h3>
              <p className="mb-2 text-xs text-gray-600 dark:text-gray-400 sm:mb-3 sm:text-sm">
                or{' '}
                <label className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  click to browse
                  <input type="file" className="hidden" onChange={handleFileInput} accept={acceptAttribute} {...(multiple ? { multiple: true } : {})} />
                </label>
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                <div className="flex items-center gap-1.5">
                  <File className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Max: {maxSize}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:mt-4">
                {acceptedFormats.map((format) => (
                  <span key={format} className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300 sm:px-2.5 sm:py-1">
                    {format}
                  </span>
                ))}
              </div>
            </>
          )}
          {uploadStatus === 'uploading' && (
            <div className="space-y-3">
              <div className="flex justify-center">
                <UploadIconTile>
                  <Loader2 className="h-7 w-7 animate-spin text-white sm:h-8 sm:w-8" />
                </UploadIconTile>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-medium text-gray-900 dark:text-white sm:text-lg">Uploading {fileName}</h3>
                <div className="mx-auto max-w-xs">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{progress}% complete</p>
                </div>
              </div>
            </div>
          )}
          {uploadStatus === 'success' && (
            <div className="space-y-3">
              <div className="flex justify-center">
                <UploadIconTile>
                  <Check className="h-7 w-7 text-white sm:h-8 sm:w-8" />
                </UploadIconTile>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-medium text-gray-900 dark:text-white sm:text-lg">Upload complete</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">Processing {fileName}…</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
