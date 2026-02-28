import { useState, useRef } from 'react'
import FailedState from '../components/FailedState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import { FolderPlus, Film, Minimize2, FileText } from 'lucide-react'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { TranslateResult } from '../components/figma/TranslateResult'
import { getBatchDownloadUrl, getBatchStatus, uploadBatch } from '../lib/api'
import { JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import { emitToolCompleted } from '../workflow/workflowStore'

interface BatchStatus {
  batchId: string
  status: 'queued' | 'processing' | 'completed' | 'partial' | 'failed'
  progress: {
    total: number
    completed: number
    failed: number
    percentage: number
  }
}

/** Optional SEO overrides for alternate entry points. Do NOT duplicate logic. */
export type BatchProcessSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function BatchProcess(props: BatchProcessSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const [files, setFiles] = useState<File[]>([])
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'failed'>(
    'idle'
  )
  const [batchInfo, setBatchInfo] = useState<BatchStatus | null>(null)
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  const batchStartedAtRef = useRef<number | null>(null)

  const handleFilesSelected = (selected: File[]) => {
    setFiles(selected)
  }

  const handleStartBatch = async () => {
    if (!files.length) return

    try {
      setStatus('processing')
      batchStartedAtRef.current = Date.now()
      texJobStarted()

      const json = await uploadBatch(files, 'en', [])
      const batchId = json.batchId
      // Poll basic status
      const poll = setInterval(async () => {
        try {
          const statusJson = await getBatchStatus(batchId)
          setBatchInfo(statusJson)
          if (
            statusJson.status === 'completed' ||
            statusJson.status === 'partial' ||
            statusJson.status === 'failed'
          ) {
            clearInterval(poll)
            setStatus(statusJson.status === 'failed' ? 'failed' : 'done')
            if (statusJson.status === 'failed') {
              texJobFailed()
            } else {
              const started = batchStartedAtRef.current ?? Date.now()
              const processingMs = Date.now() - started
              setLastProcessingMs(processingMs)
              emitToolCompleted({ toolId: 'batch-process', pathname: '/batch-process', processingMs })
              texJobCompleted(processingMs, 'batch-process')
            }
          }
        } catch {
          clearInterval(poll)
          setStatus('failed')
          texJobFailed()
        }
      }, JOB_POLL_INTERVAL_MS)
    } catch (e) {
      console.error(e)
      setStatus('failed')
      texJobFailed()
    }
  }

  const handleProcessAnother = () => {
    setStatus('idle')
    setFiles([])
    setBatchInfo(null)
  }

  const breadcrumbs = [{ label: 'Batch Processing', href: '/batch-process' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Batch Processing',
    subtitle: seoIntro ?? 'Upload multiple videos and process them together.',
    icon: <FolderPlus className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
    tags: ['Bulk', 'Multiple files', 'Batch', 'Queue'],
    sidebar: null,
  }

  return (
    <>
      <ToolLayout {...layoutProps}>
        {status === 'idle' && files.length === 0 && (
          <UploadZone
            multiple
            onFilesSelect={handleFilesSelected}
            acceptedFormats={['MP4', 'MOV', 'AVI', 'WEBM', 'MKV']}
            maxSize="10 GB"
          />
        )}

        {status === 'idle' && files.length > 0 && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2 sm:mb-3">
                <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </p>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-xs sm:text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Clear all
                </button>
              </div>
              <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-0.5 max-h-28 sm:max-h-32 overflow-y-auto mb-3">
                {files.slice(0, 20).map((f, i) => (
                  <li key={i} className="truncate">{f.name}</li>
                ))}
                {files.length > 20 && <li>… and {files.length - 20} more</li>}
              </ul>
              <button
                type="button"
                onClick={handleStartBatch}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 sm:py-3.5 text-white font-semibold hover:opacity-95 transition-opacity text-sm sm:text-base"
              >
                Start Batch
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
              Clear all to choose different files.
            </p>
          </div>
        )}

        {status === 'processing' && (
          <div className="rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-4 sm:p-6">
            <div className="mb-2 sm:mb-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {files.length} file{files.length !== 1 ? 's' : ''} in batch
            </div>
            <ProcessingProgress
              steps={[
                { label: 'Uploading', status: 'completed' },
                { label: 'Processing', status: 'active' },
                { label: 'Completed', status: (batchInfo?.progress?.percentage ?? 0) >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage="Processing your batch..."
              progress={batchInfo?.progress?.percentage ?? 10}
              estimatedTime="Varies by batch size"
              onCancel={handleProcessAnother}
            />
          </div>
        )}

        {status === 'done' && batchInfo && (
          <div className="space-y-6">
            <TranslateResult
              title="Batch complete!"
              fileName={`${batchInfo.progress.completed} completed, ${batchInfo.progress.failed} failed`}
              processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
              downloadLabel="Download ZIP"
              onDownload={() => {
                window.open(getBatchDownloadUrl(batchInfo.batchId), '_blank')
              }}
              onProcessAnother={handleProcessAnother}
              relatedTools={[
                { path: '/burn-subtitles', name: 'Burn Subtitles', description: 'Burn SRT into videos' },
                { path: '/compress-video', name: 'Compress Video', description: 'Reduce file size' },
                { path: '/video-to-transcript', name: 'Video → Transcript', description: 'Transcript & chapters' },
              ]}
            />
            <CrossToolSuggestions
              workflowHint="Next steps for your files."
              suggestions={[
                { icon: Film, title: 'Burn Subtitles', path: '/burn-subtitles', description: 'Burn SRT into videos' },
                { icon: Minimize2, title: 'Compress Video', path: '/compress-video', description: 'Reduce file size' },
                { icon: FileText, title: 'Video → Transcript', path: '/video-to-transcript', description: 'Transcript & chapters' },
              ]}
            />
          </div>
        )}

        {status === 'failed' && (
          <FailedState
            onTryAgain={handleProcessAnother}
            message="Something went wrong while starting your batch. Your files weren't changed. Try again; it usually works."
          />
        )}
      </ToolLayout>

      {faq.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gray-100/70 max-w-4xl mx-auto px-4" aria-label="FAQ">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Frequently asked questions</h2>
          <dl className="space-y-4">
            {faq.map((item, i) => (
              <div key={i}>
                <dt className="font-medium text-gray-800">{item.q}</dt>
                <dd className="mt-1 text-gray-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  )
}

