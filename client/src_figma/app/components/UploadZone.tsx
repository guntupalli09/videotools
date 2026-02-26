import { motion } from 'motion/react';
import { Upload, File, Check, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';

interface UploadZoneProps {
  maxSize?: string;
  acceptedFormats?: string[];
  onFileSelect?: (file: File) => void;
}

export function UploadZone({ 
  maxSize = '2 GB', 
  acceptedFormats = ['MP4', 'MOV', 'AVI', 'MKV'],
  onFileSelect 
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [fileName, setFileName] = useState<string>('');
  const [progress, setProgress] = useState(0);

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
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setUploadStatus('uploading');
    onFileSelect?.(file);

    // Simulate upload progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setUploadStatus('success');
      }
    }, 200);
  };

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
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-pink-500/5"
          animate={{
            opacity: isDragging ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
        />

        <div className="relative p-12 md:p-16 text-center">
          {uploadStatus === 'idle' && (
            <>
              {/* Upload icon with animation */}
              <motion.div
                animate={{ 
                  y: isDragging ? -10 : [0, -10, 0],
                }}
                transition={{ 
                  duration: isDragging ? 0.3 : 2,
                  repeat: isDragging ? 0 : Infinity,
                  ease: "easeInOut"
                }}
                className="mb-6 flex justify-center"
              >
                <div className="relative">
                  {/* Glow effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full blur-2xl opacity-30"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  
                  <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                </div>
              </motion.div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Drag and drop your file
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                or{' '}
                <label className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold cursor-pointer transition-colors">
                  click to browse
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileInput}
                    accept="video/*,audio/*"
                  />
                </label>
              </p>

              <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4" />
                  <span>Max file size: {maxSize}</span>
                </div>
              </div>

              {/* Supported formats */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {acceptedFormats.map((format) => (
                  <span
                    key={format}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    {format}
                  </span>
                ))}
              </div>
            </>
          )}

          {uploadStatus === 'uploading' && (
            <div className="space-y-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="flex justify-center"
              >
                <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
              </motion.div>

              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Uploading {fileName}
                </h3>
                
                <div className="max-w-md mx-auto">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {progress}% complete
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <Check className="w-10 h-10 text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Upload complete!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Processing {fileName}...
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
