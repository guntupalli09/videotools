import { Captions } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { UploadZone } from '../components/UploadZone';
import { ProcessingInterface } from '../components/ProcessingInterface';
import { ProcessingProgress } from '../components/ProcessingProgress';
import { SubtitleResult } from '../components/SubtitleResult';
import { ToolSidebar } from '../components/ToolSidebar';
import { RadioGroup, Select } from '../components/FormControls';

type ProcessingState = 'upload' | 'configure' | 'processing' | 'complete';

export default function VideoToSubtitles() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>('upload');
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState('SRT');
  const [language, setLanguage] = useState('auto-detect');
  const [additionalLanguages, setAdditionalLanguages] = useState<string[]>([]);

  useEffect(() => {
    if (processingState === 'processing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setProcessingState('complete');
            return 100;
          }
          return prev + 3;
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
          { label: 'Video to Subtitles', href: '/tools/video-to-subtitles' }
        ]}
        title="Video → Subtitles"
        subtitle="Generate SRT and VTT subtitle files instantly"
        icon={<Captions className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
        tags={[
          'SRT',
          'VTT',
          'Subtitles',
          'Captions',
          'Timestamps',
          'Multi-format',
          'Speakers',
          'Clean'
        ]}
        sidebar={<ToolSidebar />}
      >
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-8 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-blue-200 dark:border-blue-900/30">
            <div className="w-16 h-16 bg-blue-200 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <Captions className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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
            currentMessage="Generating subtitles with timestamps"
            progress={progress}
            estimatedTime="20-40 seconds"
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
          { label: 'Video to Subtitles', href: '/tools/video-to-subtitles' }
        ]}
        title="Video → Subtitles"
        subtitle="Generate SRT and VTT subtitle files instantly"
        icon={<Captions className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
        tags={[
          'SRT',
          'VTT',
          'Subtitles',
          'Captions',
          'Timestamps',
          'Multi-format',
          'Speakers',
          'Clean'
        ]}
        sidebar={<ToolSidebar />}
      >
        <SubtitleResult
          fileName={`${uploadedFile.name.replace(/\.[^/.]+$/, '')}_subtitles.${format.toLowerCase()}`}
          processingTime="8.3s"
          fileSize="45 KB"
          format={format as 'SRT' | 'VTT'}
          onDownload={() => console.log('Download')}
          onProcessAnother={handleReset}
        />
      </ToolLayout>
    );
  }

  // Configuration state
  if (processingState === 'configure' && uploadedFile) {
    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Video to Subtitles', href: '/tools/video-to-subtitles' }
        ]}
        title="Video → Subtitles"
        subtitle="Generate SRT and VTT subtitle files instantly"
        icon={<Captions className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
        tags={[
          'SRT',
          'VTT',
          'Subtitles',
          'Captions',
          'Timestamps',
          'Multi-format',
          'Speakers',
          'Clean'
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
          actionLabel="Generate Subtitles"
          onAction={handleAction}
        >
          <div className="space-y-6">
            <RadioGroup
              label="Subtitle Format"
              options={[
                { 
                  value: 'SRT', 
                  label: 'SRT (Recommended for YouTube)',
                  description: 'You can use SRT for most platforms'
                },
                { 
                  value: 'VTT', 
                  label: 'VTT (Recommended for web)',
                  description: 'Web Video Text Tracks format'
                }
              ]}
              value={format}
              onChange={setFormat}
            />

            <Select
              label="Language (optional)"
              options={[
                { value: 'auto-detect', label: 'Auto-detect' },
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' },
                { value: 'ar', label: 'Arabic' },
                { value: 'hi', label: 'Hindi' },
                { value: 'zh', label: 'Chinese (Simplified)' },
              ]}
              value={language}
              onChange={setLanguage}
            />

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Additional languages
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                Each extra language uses 4x more minutes. You can add up to 4 more based on your plan.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['English', 'Spanish', 'French', 'German', 'Arabic', 'Hindi', 'Portuguese', 'Japanese', 'Chinese (Simplified)', 'Italian', 'Russian', 'Korean'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      if (additionalLanguages.includes(lang)) {
                        setAdditionalLanguages(additionalLanguages.filter(l => l !== lang));
                      } else {
                        setAdditionalLanguages([...additionalLanguages, lang]);
                      }
                    }}
                    className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                      additionalLanguages.includes(lang)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
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
        { label: 'Video to Subtitles', href: '/tools/video-to-subtitles' }
      ]}
      title="Video → Subtitles"
      subtitle="Generate SRT and VTT subtitle files instantly"
      icon={<Captions className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
      tags={[
        'SRT',
        'VTT',
        'Subtitles',
        'Captions',
        'Timestamps',
        'Multi-format',
        'Speakers',
        'Clean'
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