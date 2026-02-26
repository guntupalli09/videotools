import { Video } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { UploadZone } from '../components/UploadZone';
import { ProcessingInterface } from '../components/ProcessingInterface';
import { ProcessingProgress } from '../components/ProcessingProgress';
import { GenericResult } from '../components/GenericResult';
import { ToolSidebar } from '../components/ToolSidebar';
import { Select } from '../components/FormControls';

type ProcessingState = 'upload' | 'configure' | 'processing' | 'complete';

export default function BurnSubtitles() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>('upload');
  const [progress, setProgress] = useState(0);
  const [uploadedSubtitles, setUploadedSubtitles] = useState<File | null>(null);
  const [settings, setSettings] = useState({
    fontStyle: 'Medium',
    position: 'Bottom',
    background: 'Low'
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
    setUploadedSubtitles(null);
  };

  // Processing state
  if (processingState === 'processing') {
    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Burn Subtitles', href: '/tools/burn-subtitles' }
        ]}
        title="Burn Subtitles"
        subtitle="Hardcode captions directly into your video"
        icon={<Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
        tags={[
          'Hardcode',
          'Burn-in',
          'Permanent',
          'Styling',
          'Custom fonts',
          'Position'
        ]}
        sidebar={<ToolSidebar />}
      >
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-8 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-blue-200 dark:border-blue-900/30">
            <div className="w-16 h-16 bg-blue-200 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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
            currentMessage="Burning subtitles into video"
            progress={progress}
            estimatedTime="45-90 seconds"
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
          { label: 'Burn Subtitles', href: '/tools/burn-subtitles' }
        ]}
        title="Burn Subtitles"
        subtitle="Hardcode captions directly into your video"
        icon={<Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
        tags={[
          'Hardcode',
          'Burn-in',
          'Permanent',
          'Styling',
          'Custom fonts',
          'Position'
        ]}
        sidebar={<ToolSidebar />}
      >
        <GenericResult
          title="Video with burned subtitles ready!"
          fileName={`${uploadedFile.name.replace(/\.[^/.]+$/, '')}_subtitled.mp4`}
          processingTime="42.1s"
          fileSize={`${((uploadedFile.size / (1024 * 1024)) * 1.1).toFixed(2)} MB`}
          icon={Video}
          iconColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          downloadLabel="Download Video"
          onDownload={() => console.log('Download')}
          onProcessAnother={handleReset}
          relatedTools={[
            {
              title: 'Compress Video',
              description: 'Reduce file size',
              icon: '📦',
              color: 'from-pink-500 to-red-500'
            },
            {
              title: 'Video → Transcript',
              description: 'Extract text',
              icon: '📝',
              color: 'from-purple-500 to-blue-500'
            },
            {
              title: 'Translate Subtitles',
              description: 'Convert to other languages',
              icon: '🌍',
              color: 'from-green-500 to-cyan-500'
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
          { label: 'Burn Subtitles', href: '/tools/burn-subtitles' }
        ]}
        title="Burn Subtitles"
        subtitle="Hardcode captions directly into your video"
        icon={<Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
        tags={[
          'Hardcode',
          'Burn-in',
          'Permanent',
          'Styling',
          'Custom fonts',
          'Position'
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
          actionLabel="Process Video"
          onAction={handleAction}
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                Caption style (preset)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:border-purple-400 transition-all text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Font size
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Medium
                  </div>
                </button>
                <button className="p-4 rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:border-purple-400 transition-all text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Position
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Bottom
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Select
                label="Font style"
                options={[
                  { value: 'Light', label: 'Light' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Bold', label: 'Bold' },
                ]}
                value={settings.fontStyle}
                onChange={(value) => setSettings({ ...settings, fontStyle: value })}
              />

              <Select
                label="Position"
                options={[
                  { value: 'Top', label: 'Top' },
                  { value: 'Middle', label: 'Middle' },
                  { value: 'Bottom', label: 'Bottom' },
                ]}
                value={settings.position}
                onChange={(value) => setSettings({ ...settings, position: value })}
              />

              <Select
                label="Background"
                options={[
                  { value: 'None', label: 'None' },
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                ]}
                value={settings.background}
                onChange={(value) => setSettings({ ...settings, background: value })}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                Upload subtitles
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center">
                <input
                  type="file"
                  accept=".srt,.vtt"
                  onChange={(e) => setUploadedSubtitles(e.target.files?.[0] || null)}
                  className="hidden"
                  id="subtitle-upload"
                />
                <label
                  htmlFor="subtitle-upload"
                  className="cursor-pointer"
                >
                  {uploadedSubtitles ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                      <span>{uploadedSubtitles.name}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setUploadedSubtitles(null);
                        }}
                        className="text-gray-500 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload subtitle file (SRT/VTT)
                    </div>
                  )}
                </label>
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
        { label: 'Burn Subtitles', href: '/tools/burn-subtitles' }
      ]}
      title="Burn Subtitles"
      subtitle="Hardcode captions directly into your video"
      icon={<Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
      tags={[
        'Hardcode',
        'Burn-in',
        'Permanent',
        'Styling',
        'Custom fonts',
        'Position'
      ]}
      sidebar={<ToolSidebar />}
    >
      <UploadZone 
        acceptedFormats={['MP4', 'MOV', 'AVI', 'MKV']}
        onFileSelect={(file) => {
          setUploadedFile(file);
          setProcessingState('configure');
        }}
      />
    </ToolLayout>
  );
}