import { Languages } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { UploadZone } from '../components/UploadZone';
import { ProcessingInterface } from '../components/ProcessingInterface';
import { ProcessingProgress } from '../components/ProcessingProgress';
import { GenericResult } from '../components/GenericResult';
import { ToolSidebar } from '../components/ToolSidebar';
import { Select } from '../components/FormControls';

type ProcessingState = 'upload' | 'configure' | 'processing' | 'complete';

export default function TranslateSubtitles() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>('upload');
  const [progress, setProgress] = useState(0);
  const [targetLanguage, setTargetLanguage] = useState('ar');

  useEffect(() => {
    if (processingState === 'processing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setProcessingState('complete');
            return 100;
          }
          return prev + 4;
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

  const languageNames: Record<string, string> = {
    ar: 'Arabic',
    zh: 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    en: 'English',
    fr: 'French',
    de: 'German',
    hi: 'Hindi',
    it: 'Italian',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
    ru: 'Russian',
    es: 'Spanish',
  };

  // Processing state
  if (processingState === 'processing') {
    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Translate Subtitles', href: '/tools/translate-subtitles' }
        ]}
        title="Translate Subtitles"
        subtitle="Convert subtitles to Arabic, Hindi, Spanish, and 50+ languages"
        icon={<Languages className="w-8 h-8 text-pink-600 dark:text-pink-400" />}
        tags={[
          'Translation',
          'Multi-language',
          'Arabic',
          'Hindi',
          'Spanish',
          'French',
          'SRT',
          'VTT'
        ]}
        sidebar={<ToolSidebar />}
      >
        <div className="bg-pink-50 dark:bg-pink-900/10 rounded-2xl p-8 border border-pink-100 dark:border-pink-900/30">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-pink-200 dark:border-pink-900/30">
            <div className="w-16 h-16 bg-pink-200 dark:bg-pink-900/50 rounded-lg flex items-center justify-center">
              <Languages className="w-8 h-8 text-pink-600 dark:text-pink-400" />
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
            currentMessage="Translating subtitles with AI"
            progress={progress}
            estimatedTime="10-20 seconds"
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
          { label: 'Translate Subtitles', href: '/tools/translate-subtitles' }
        ]}
        title="Translate Subtitles"
        subtitle="Convert subtitles to Arabic, Hindi, Spanish, and 50+ languages"
        icon={<Languages className="w-8 h-8 text-pink-600 dark:text-pink-400" />}
        tags={[
          'Translation',
          'Multi-language',
          'Arabic',
          'Hindi',
          'Spanish',
          'French',
          'SRT',
          'VTT'
        ]}
        sidebar={<ToolSidebar />}
      >
        <GenericResult
          title="Translation complete!"
          fileName={`${uploadedFile.name.replace(/\.[^/.]+$/, '')}_${targetLanguage}.srt`}
          processingTime="5.2s"
          fileSize="52 KB"
          icon={Languages}
          iconColor="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
          downloadLabel={`Download ${languageNames[targetLanguage]} Subtitles`}
          onDownload={() => console.log('Download')}
          onProcessAnother={handleReset}
          relatedTools={[
            {
              toolId: 'fix-subtitles',
              description: 'Auto-correct timing'
            },
            {
              toolId: 'burn-subtitles',
              description: 'Hardcode into video'
            },
            {
              toolId: 'video-to-subtitles',
              description: 'Generate new subtitles'
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
          { label: 'Translate Subtitles', href: '/tools/translate-subtitles' }
        ]}
        title="Translate Subtitles"
        subtitle="Convert subtitles to Arabic, Hindi, Spanish, and 50+ languages"
        icon={<Languages className="w-8 h-8 text-pink-600 dark:text-pink-400" />}
        tags={[
          'Translation',
          'Multi-language',
          'Arabic',
          'Hindi',
          'Spanish',
          'French',
          'SRT',
          'VTT'
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
          actionLabel="Translate Subtitles"
          onAction={handleAction}
          showVideoPlayer={false}
        >
          <div className="space-y-6">
            <Select
              label="Translate to"
              options={[
                { value: 'ar', label: 'Arabic' },
                { value: 'zh', label: 'Chinese (Simplified)' },
                { value: 'zh-TW', label: 'Chinese (Traditional)' },
                { value: 'en', label: 'English' },
                { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' },
                { value: 'hi', label: 'Hindi' },
                { value: 'it', label: 'Italian' },
                { value: 'ja', label: 'Japanese' },
                { value: 'ko', label: 'Korean' },
                { value: 'pt', label: 'Portuguese' },
                { value: 'ru', label: 'Russian' },
                { value: 'es', label: 'Spanish' },
              ]}
              value={targetLanguage}
              onChange={setTargetLanguage}
            />

            <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-pink-200 dark:border-pink-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-lg">
                  <Languages className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-pink-900 dark:text-pink-100 mb-1">
                    High-quality AI translation
                  </h4>
                  <p className="text-xs text-pink-700 dark:text-pink-300">
                    Our AI preserves timing, formatting, and context for natural-sounding translations in 50+ languages.
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
        { label: 'Translate Subtitles', href: '/tools/translate-subtitles' }
      ]}
      title="Translate Subtitles"
      subtitle="Convert subtitles to Arabic, Hindi, Spanish, and 50+ languages"
      icon={<Languages className="w-8 h-8 text-pink-600 dark:text-pink-400" />}
      tags={[
        'Translation',
        'Multi-language',
        'Arabic',
        'Hindi',
        'Spanish',
        'French',
        'SRT',
        'VTT'
      ]}
      sidebar={<ToolSidebar />}
    >
      <UploadZone 
        acceptedFormats={['SRT', 'VTT', 'ASS', 'SSA']}
        maxSize="10 MB"
        onFileSelect={(file) => {
          setUploadedFile(file);
          setProcessingState('configure');
        }}
      />
    </ToolLayout>
  );
}