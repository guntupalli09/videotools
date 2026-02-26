import { Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { UploadZone } from '../components/UploadZone';
import { ProcessingInterface } from '../components/ProcessingInterface';
import { ProcessingProgress } from '../components/ProcessingProgress';
import { GenericResult } from '../components/GenericResult';
import { ToolSidebar } from '../components/ToolSidebar';
import { Checkbox } from '../components/FormControls';

type ProcessingState = 'upload' | 'configure' | 'processing' | 'complete';

export default function FixSubtitles() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>('upload');
  const [progress, setProgress] = useState(0);
  const [options, setOptions] = useState({
    fixTiming: true,
    fixFormatting: true,
    removeErrors: true,
    mergeSplitLines: false
  });

  useEffect(() => {
    if (processingState === 'processing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setProcessingState('complete');
            return 100;
          }
          return prev + 5;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [processingState]);

  const handleAction = () => {
    setProcessingState('processing');
    setProgress(0);
  };

  const handleReset = () => {
    setUploadedFile(null);
    setProcessingState('upload');
    setProgress(0);
  };

  // Processing state
  if (processingState === 'processing') {
    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Fix Subtitles', href: '/tools/fix-subtitles' }
        ]}
        title="Fix Subtitles"
        subtitle="Auto-correct timing issues and formatting errors"
        icon={<Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
        tags={[
          'Timing',
          'Sync',
          'Format',
          'Clean',
          'Repair',
          'Auto-fix'
        ]}
        sidebar={<ToolSidebar />}
      >
        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-8 border border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-purple-200 dark:border-purple-900/30">
            <div className="w-16 h-16 bg-purple-200 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
              <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {uploadedFile?.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {uploadedFile && `${(uploadedFile.size / 1024).toFixed(2)} KB`}
              </p>
            </div>
          </div>

          <ProcessingProgress
            steps={[
              { label: 'Preparing', status: 'completed' },
              { label: 'Uploading', status: 'completed' },
              { label: 'Processing', status: 'active' },
              { label: 'Completed', status: 'pending' },
              { label: 'Error', status: 'pending' }
            ]}
            currentMessage="Fixing subtitle issues with AI"
            progress={progress}
            estimatedTime="5-15 seconds"
            onCancel={handleReset}
          />
        </div>
      </ToolLayout>
    );
  }

  // Results state
  if (processingState === 'complete' && uploadedFile) {
    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Fix Subtitles', href: '/tools/fix-subtitles' }
        ]}
        title="Fix Subtitles"
        subtitle="Auto-correct timing issues and formatting errors"
        icon={<Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
        tags={[
          'Timing',
          'Sync',
          'Format',
          'Clean',
          'Repair',
          'Auto-fix'
        ]}
        sidebar={<ToolSidebar />}
      >
        <GenericResult
          title="Subtitles fixed successfully!"
          fileName={`${uploadedFile.name.replace(/\.[^/.]+$/, '')}_fixed.srt`}
          processingTime="3.8s"
          fileSize="48 KB"
          icon={Clock}
          iconColor="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          downloadLabel="Download Fixed Subtitles"
          onDownload={() => console.log('Download')}
          onProcessAnother={handleReset}
          relatedTools={[
            {
              title: 'Translate Subtitles',
              description: 'Convert to 50+ languages',
              icon: '🌍',
              color: 'from-pink-500 to-purple-500'
            },
            {
              title: 'Burn Subtitles',
              description: 'Hardcode into video',
              icon: '🔥',
              color: 'from-orange-500 to-red-500'
            },
            {
              title: 'Video → Subtitles',
              description: 'Generate new subtitles',
              icon: '📝',
              color: 'from-blue-500 to-cyan-500'
            }
          ]}
        />
      </ToolLayout>
    );
  }

  // Configuration state
  if (processingState === 'configure' && uploadedFile) {
    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Fix Subtitles', href: '/tools/fix-subtitles' }
        ]}
        title="Fix Subtitles"
        subtitle="Auto-correct timing issues and formatting errors"
        icon={<Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
        tags={[
          'Timing',
          'Sync',
          'Format',
          'Clean',
          'Repair',
          'Auto-fix'
        ]}
        sidebar={<ToolSidebar />}
      >
        <ProcessingInterface
          file={{
            name: uploadedFile.name,
            size: `${(uploadedFile.size / 1024).toFixed(2)} KB`
          }}
          onRemove={() => {
            setUploadedFile(null);
            setProcessingState('upload');
          }}
          actionLabel="Fix Subtitles"
          onAction={handleAction}
          showVideoPlayer={false}
        >
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              What to fix
            </h3>

            <div className="space-y-4">
              <Checkbox
                label="Fix timing & sync issues"
                description="Adjust subtitle timing to match audio"
                checked={options.fixTiming}
                onChange={(checked) => setOptions({ ...options, fixTiming: checked })}
              />

              <Checkbox
                label="Fix formatting errors"
                description="Clean up encoding issues and special characters"
                checked={options.fixFormatting}
                onChange={(checked) => setOptions({ ...options, fixFormatting: checked })}
              />

              <Checkbox
                label="Remove duplicate & empty lines"
                description="Clean up redundant subtitle entries"
                checked={options.removeErrors}
                onChange={(checked) => setOptions({ ...options, removeErrors: checked })}
              />

              <Checkbox
                label="Merge split lines"
                description="Combine broken sentences into complete lines"
                checked={options.mergeSplitLines}
                onChange={(checked) => setOptions({ ...options, mergeSplitLines: checked })}
              />
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                AI-powered subtitle repair
              </h4>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Our AI analyzes your subtitles and automatically fixes common issues while preserving meaning and context.
              </p>
            </div>
          </div>
        </ProcessingInterface>
      </ToolLayout>
    );
  }

  // Upload state
  return (
    <ToolLayout
      breadcrumbs={[
        { label: 'Fix Subtitles', href: '/tools/fix-subtitles' }
      ]}
      title="Fix Subtitles"
      subtitle="Auto-correct timing issues and formatting errors"
      icon={<Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
      tags={[
        'Timing',
        'Sync',
        'Format',
        'Clean',
        'Repair',
        'Auto-fix'
      ]}
      sidebar={<ToolSidebar />}
    >
      <UploadZone 
        acceptedFormats={['SRT', 'VTT', 'ASS']}
        maxSize="10 MB"
        onFileSelect={(file) => {
          setUploadedFile(file);
          setProcessingState('configure');
        }}
      />
    </ToolLayout>
  );
}