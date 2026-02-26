import { Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { UploadZone } from '../components/UploadZone';
import { ProcessingInterface } from '../components/ProcessingInterface';
import { ProcessingProgress } from '../components/ProcessingProgress';
import { GenericResult } from '../components/GenericResult';
import { ToolSidebar } from '../components/ToolSidebar';
import { RadioGroup } from '../components/FormControls';

type ProcessingState = 'upload' | 'configure' | 'processing' | 'complete';

export default function CompressVideo() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>('upload');
  const [progress, setProgress] = useState(0);
  const [profile, setProfile] = useState('Web');
  const [compressionLevel, setCompressionLevel] = useState('Medium');

  useEffect(() => {
    if (processingState === 'processing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setProcessingState('complete');
            return 100;
          }
          return prev + 1.5;
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

  const getSizeReduction = () => {
    if (compressionLevel === 'Light') return 0.7;
    if (compressionLevel === 'Medium') return 0.5;
    return 0.3;
  };

  // Processing state
  if (processingState === 'processing') {
    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Compress Video', href: '/tools/compress-video' }
        ]}
        title="Compress Video"
        subtitle="Reduce file size while keeping quality high"
        icon={<Layers className="w-8 h-8 text-pink-600 dark:text-pink-400" />}
        tags={[
          'Compression',
          'Reduce size',
          'Quality',
          'Optimize',
          'Fast'
        ]}
        sidebar={<ToolSidebar />}
      >
        <div className="bg-pink-50 dark:bg-pink-900/10 rounded-2xl p-8 border border-pink-100 dark:border-pink-900/30">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-pink-200 dark:border-pink-900/30">
            <div className="w-16 h-16 bg-pink-200 dark:bg-pink-900/50 rounded-lg flex items-center justify-center">
              <Layers className="w-8 h-8 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {uploadedFile?.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {uploadedFile && `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`} • 0:32
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
            currentMessage="Compressing video with smart optimization"
            progress={progress}
            estimatedTime="40-80 seconds"
            onCancel={handleReset}
          />
        </div>
      </ToolLayout>
    );
  }

  // Results state
  if (processingState === 'complete' && uploadedFile) {
    const originalSize = uploadedFile.size / (1024 * 1024);
    const compressedSize = originalSize * getSizeReduction();
    const savings = ((1 - getSizeReduction()) * 100).toFixed(0);

    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Compress Video', href: '/tools/compress-video' }
        ]}
        title="Compress Video"
        subtitle="Reduce file size while keeping quality high"
        icon={<Layers className="w-8 h-8 text-pink-600 dark:text-pink-400" />}
        tags={[
          'Compression',
          'Reduce size',
          'Quality',
          'Optimize',
          'Fast'
        ]}
        sidebar={<ToolSidebar />}
      >
        <div className="space-y-6">
          <GenericResult
            title="Video compressed successfully!"
            fileName={`${uploadedFile.name.replace(/\.[^/.]+$/, '')}_compressed.mp4`}
            processingTime="38.7s"
            fileSize={`${compressedSize.toFixed(2)} MB`}
            icon={Layers}
            iconColor="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
            downloadLabel="Download Compressed Video"
            onDownload={() => console.log('Download')}
            onProcessAnother={handleReset}
            relatedTools={[
              {
                title: 'Burn Subtitles',
                description: 'Add hardcoded captions',
                icon: '🔥',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                title: 'Video → Transcript',
                description: 'Extract text',
                icon: '📝',
                color: 'from-purple-500 to-blue-500'
              },
              {
                title: 'Batch Processing',
                description: 'Process multiple files',
                icon: '📦',
                color: 'from-green-500 to-emerald-500'
              }
            ]}
          />

          {/* Compression Stats */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">
              Compression Results
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300 mb-1">Original</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {originalSize.toFixed(2)} MB
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-300 mb-1">Compressed</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {compressedSize.toFixed(2)} MB
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-300 mb-1">Saved</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {savings}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </ToolLayout>
    );
  }

  // Configuration state
  if (processingState === 'configure' && uploadedFile) {
    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Compress Video', href: '/tools/compress-video' }
        ]}
        title="Compress Video"
        subtitle="Reduce file size while keeping quality high"
        icon={<Layers className="w-8 h-8 text-pink-600 dark:text-pink-400" />}
        tags={[
          'Compression',
          'Reduce size',
          'Quality',
          'Optimize',
          'Fast'
        ]}
        sidebar={<ToolSidebar />}
      >
        <ProcessingInterface
          file={{
            name: uploadedFile.name,
            size: `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`,
            duration: '14:58'
          }}
          onRemove={() => {
            setUploadedFile(null);
            setProcessingState('upload');
          }}
          actionLabel="Compress Video"
          onAction={handleAction}
        >
          <div className="space-y-6">
            <RadioGroup
              label="Profile (recommended)"
              options={[
                { value: 'Web', label: 'Web', description: 'Optimized for web streaming' },
                { value: 'Mobile', label: 'Mobile', description: 'Smaller files for mobile devices' },
                { value: 'Archive', label: 'Archive', description: 'Balance of size and quality' },
                { value: 'Custom', label: 'Custom level', description: 'Choose your own settings' }
              ]}
              value={profile}
              onChange={setProfile}
            />

            <RadioGroup
              label="Compression Level"
              options={[
                { 
                  value: 'Light', 
                  label: 'Light (best quality, ~30% smaller)',
                  description: 'Minimal compression, highest quality'
                },
                { 
                  value: 'Medium', 
                  label: 'Medium (recommended, ~50% smaller)',
                  description: 'Good balance of size and quality'
                },
                { 
                  value: 'Heavy', 
                  label: 'Heavy (smallest size, ~70% smaller)',
                  description: 'Maximum compression, acceptable quality'
                }
              ]}
              value={compressionLevel}
              onChange={setCompressionLevel}
            />

            <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-pink-200 dark:border-pink-800">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-pink-900 dark:text-pink-100">
                    File size estimate
                  </h4>
                  <p className="text-xs text-pink-700 dark:text-pink-300">
                    Your {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB file will be approximately{' '}
                    <span className="font-bold">
                      {((uploadedFile.size / (1024 * 1024)) * (compressionLevel === 'Light' ? 0.7 : compressionLevel === 'Medium' ? 0.5 : 0.3)).toFixed(2)} MB
                    </span>
                  </p>
                </div>
              </div>
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
        { label: 'Compress Video', href: '/tools/compress-video' }
      ]}
      title="Compress Video"
      subtitle="Reduce file size while keeping quality high"
      icon={<Layers className="w-8 h-8 text-pink-600 dark:text-pink-400" />}
      tags={[
        'Compression',
        'Reduce size',
        'Quality',
        'Optimize',
        'Fast'
      ]}
      sidebar={<ToolSidebar />}
    >
      <UploadZone 
        acceptedFormats={['MP4', 'MOV', 'AVI', 'MKV', 'WebM']}
        onFileSelect={(file) => {
          setUploadedFile(file);
          setProcessingState('configure');
        }}
      />
    </ToolLayout>
  );
}