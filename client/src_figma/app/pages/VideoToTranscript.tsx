import { FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { UploadZone } from '../components/UploadZone';
import { ProcessingInterface } from '../components/ProcessingInterface';
import { ProcessingProgress } from '../components/ProcessingProgress';
import { TranscriptResult } from '../components/TranscriptResult';
import { ToolSidebar } from '../components/ToolSidebar';
import { Checkbox, ExportFormat, Input } from '../components/FormControls';

type ProcessingState = 'upload' | 'configure' | 'processing' | 'complete';

export default function VideoToTranscript() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>('upload');
  const [progress, setProgress] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [options, setOptions] = useState({
    includeSummary: true,
    autoGenerateChapters: true,
    speakerLabels: false,
    glossary: ''
  });
  const [exportFormats, setExportFormats] = useState(['TXT']);

  const fullTranscript = `Did you grab a new cushion yesterday?
Today's version is even better.
Go check it out.
With Eversupport Cushion, remote workers are finding a smarter way to beat that 3 p.m. backache for good.
This memory foam seat cushion gives you proper hip and waist support that prevents afternoon slump.
I used to get so uncomfortable by mid-afternoon that I couldn't focus.
Now I sit comfortably all day without shifting around constantly.
The adaptive foam molds perfectly to your body and the washable cover keeps it hygienic for daily use.
It works on any chair, office, dining, car seats.
Stop letting back pain kill your productivity every afternoon.`;

  useEffect(() => {
    if (processingState === 'processing') {
      // Simulate processing progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setProcessingState('complete');
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      // Simulate live transcript generation
      const words = fullTranscript.split(' ');
      let currentIndex = 0;
      const transcriptInterval = setInterval(() => {
        if (currentIndex < words.length) {
          setLiveTranscript(prev => prev + (prev ? ' ' : '') + words[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(transcriptInterval);
        }
      }, 150);

      return () => {
        clearInterval(interval);
        clearInterval(transcriptInterval);
      };
    }
  }, [processingState]);

  const handleAction = () => {
    setProcessingState('processing');
    setProgress(0);
    setLiveTranscript('');
  };

  const handleReset = () => {
    setUploadedFile(null);
    setProcessingState('upload');
    setProgress(0);
    setLiveTranscript('');
  };

  // Processing state
  if (processingState === 'processing') {
    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Video to Transcript', href: '/tools/video-to-transcript' }
        ]}
        title="Video → Transcript"
        subtitle="Extract spoken text from any video in seconds"
        icon={<FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
        tags={[
          'Transcript',
          'Speakers',
          'Summary',
          'Chapters',
          'Highlights',
          'Keywords',
          'Clean',
          'Translate',
          'Editor',
          'YouTube'
        ]}
        sidebar={<ToolSidebar />}
      >
        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-8 border border-purple-100 dark:border-purple-900/30">
          {/* File Info */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-purple-200 dark:border-purple-900/30">
            <div className="w-16 h-16 bg-purple-200 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
              <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
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
            currentMessage="Processing audio and generating transcript"
            progress={progress}
            estimatedTime="30-60 seconds"
            liveTranscript={liveTranscript}
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
          { label: 'Video to Transcript', href: '/tools/video-to-transcript' }
        ]}
        title="Video → Transcript"
        subtitle="Extract spoken text from any video in seconds"
        icon={<FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
        tags={[
          'Transcript',
          'Speakers',
          'Summary',
          'Chapters',
          'Highlights',
          'Keywords',
          'Clean',
          'Translate',
          'Editor',
          'YouTube'
        ]}
        sidebar={<ToolSidebar />}
      >
        <TranscriptResult
          fileName={`${uploadedFile.name.replace(/\.[^/.]+$/, '')}_transcript.txt`}
          processingTime="10.9s"
          fileSize="2.91 MB"
          transcript={fullTranscript}
          onDownload={() => console.log('Download')}
          onProcessAnother={handleReset}
          onGenerateSubtitles={() => console.log('Generate subtitles')}
        />
      </ToolLayout>
    );
  }

  // Configuration state
  if (processingState === 'configure' && uploadedFile) {
    return (
      <ToolLayout
        breadcrumbs={[
          { label: 'Video to Transcript', href: '/tools/video-to-transcript' }
        ]}
        title="Video → Transcript"
        subtitle="Extract spoken text from any video in seconds"
        icon={<FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
        tags={[
          'Transcript',
          'Speakers',
          'Summary',
          'Chapters',
          'Highlights',
          'Keywords',
          'Clean',
          'Translate',
          'Editor',
          'YouTube'
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
          actionLabel="Transcribe Video"
          onAction={handleAction}
        >
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Options
            </h3>

            <div className="space-y-4">
              <Checkbox
                label="Include AI summary & bullets"
                checked={options.includeSummary}
                onChange={(checked) => setOptions({ ...options, includeSummary: checked })}
              />

              <Checkbox
                label="Auto-generate chapters"
                checked={options.autoGenerateChapters}
                onChange={(checked) => setOptions({ ...options, autoGenerateChapters: checked })}
              />

              <Checkbox
                label="Speaker labels (who said what)"
                description="Identify and label different speakers in the transcript"
                checked={options.speakerLabels}
                onChange={(checked) => setOptions({ ...options, speakerLabels: checked })}
              />
            </div>

            <Input
              label="Glossary (names, terms, trademarks accuracy)"
              placeholder="e.g. Acme Corp, Dr Smith, API, SaaS..."
              value={options.glossary}
              onChange={(value) => setOptions({ ...options, glossary: value })}
            />

            <ExportFormat
              formats={[
                { value: 'TXT', label: 'TXT' },
                { value: 'JSON', label: 'JSON' },
                { value: 'DOCX', label: 'DOCX' },
                { value: 'PDF', label: 'PDF' }
              ]}
              selected={exportFormats}
              onChange={setExportFormats}
            />
          </div>
        </ProcessingInterface>
      </ToolLayout>
    );
  }

  // Upload state
  return (
    <ToolLayout
      breadcrumbs={[
        { label: 'Video to Transcript', href: '/tools/video-to-transcript' }
      ]}
      title="Video → Transcript"
      subtitle="Extract spoken text from any video in seconds"
      icon={<FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
      tags={[
        'Transcript',
        'Speakers',
        'Summary',
        'Chapters',
        'Highlights',
        'Keywords',
        'Clean',
        'Translate',
        'Editor',
        'YouTube'
      ]}
      sidebar={<ToolSidebar />}
    >
      <UploadZone 
        onFileSelect={(file) => {
          setUploadedFile(file);
          setProcessingState('configure');
        }} 
      />
    </ToolLayout>
  );
}