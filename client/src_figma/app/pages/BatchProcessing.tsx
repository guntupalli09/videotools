import { FolderOpen, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { ToolLayout } from '../components/ToolLayout';
import { ToolSidebar } from '../components/ToolSidebar';

interface BatchFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'complete';
  progress: number;
}

export default function BatchProcessing() {
  const [files, setFiles] = useState<BatchFile[]>([]);

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const batchFiles: BatchFile[] = Array.from(newFiles).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0
    }));
    
    setFiles([...files, ...batchFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const startBatch = () => {
    setFiles(files.map(f => ({ ...f, status: 'processing', progress: 0 })));
    // Simulate processing
    files.forEach((_, index) => {
      setTimeout(() => {
        setFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, status: 'complete', progress: 100 } : f
        ));
      }, (index + 1) * 2000);
    });
  };

  return (
    <ToolLayout
      breadcrumbs={[
        { label: 'Batch Processing', href: '/tools/batch-processing' }
      ]}
      title="Batch Processing"
      subtitle="Upload multiple videos and process them together"
      icon={<FolderOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
      tags={[
        'Bulk',
        'Multiple files',
        'Batch',
        'Fast',
        'Queue'
      ]}
      sidebar={<ToolSidebar />}
    >
      <div className="space-y-6">
        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center bg-gray-50 dark:bg-gray-900/50 hover:border-purple-400 transition-all"
        >
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="batch-upload"
          />
          <label
            htmlFor="batch-upload"
            className="cursor-pointer"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
                <Plus className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Add files to batch
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click to select multiple videos or drag and drop
                </p>
              </div>
            </div>
          </label>
        </motion.div>

        {/* File List */}
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </h3>
              <button
                onClick={() => setFiles([])}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-3">
              {files.map((batchFile, index) => (
                <motion.div
                  key={batchFile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {batchFile.file.name}
                      </h4>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        batchFile.status === 'pending' 
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : batchFile.status === 'processing'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {batchFile.status === 'pending' ? 'Pending' : batchFile.status === 'processing' ? 'Processing' : 'Complete'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{(batchFile.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      {batchFile.status === 'processing' && (
                        <>
                          <span>•</span>
                          <span>{batchFile.progress}%</span>
                        </>
                      )}
                    </div>
                    {batchFile.status === 'processing' && (
                      <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${batchFile.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(batchFile.id)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Button */}
        {files.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={startBatch}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Start Batch
          </motion.button>
        )}
      </div>
    </ToolLayout>
  );
}
