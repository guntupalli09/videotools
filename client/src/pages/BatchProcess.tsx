import { useState } from 'react'
import FileUploadZone from '../components/FileUploadZone'
import PlanBadge from '../components/PlanBadge'
import UsageCounter from '../components/UsageCounter'
import UsageDisplay from '../components/UsageDisplay'
import ProgressBar from '../components/ProgressBar'
import FailedState from '../components/FailedState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import { Loader2, FolderPlus, Film, Minimize2, FileText } from 'lucide-react'
import { getBatchDownloadUrl, getBatchStatus, uploadBatch } from '../lib/api'
import { JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'

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

  const handleFilesSelected = (selected: File[]) => {
    setFiles(selected)
  }

  const handleStartBatch = async () => {
    if (!files.length) return

    try {
      setStatus('processing')

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
          }
        } catch {
          clearInterval(poll)
        }
      }, JOB_POLL_INTERVAL_MS)
    } catch (e) {
      console.error(e)
      setStatus('failed')
    }
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="mb-4">
            <PlanBadge />
          </div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100/80 shadow-sm">
            <FolderPlus className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-800">
            {seoH1 ?? 'Batch Processing'}
          </h1>
          <p className="mb-3 text-lg text-gray-600">
            {seoIntro ?? 'Upload multiple videos and process them together.'}
          </p>
          <UsageCounter refreshTrigger={status} />
          <UsageDisplay refreshTrigger={status} />
        </div>

        {status === 'idle' && (
          <div className="mb-6 rounded-2xl shadow-sm bg-white p-8">
            <FileUploadZone
              onFilesSelect={handleFilesSelected}
              accept={{ 'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'] }}
              maxSize={10 * 1024 * 1024 * 1024}
              multiple
            />
            {files.length > 0 && (
              <div className="mt-4 text-sm text-gray-700">
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </div>
            )}
            <button
              onClick={handleStartBatch}
              disabled={!files.length}
              className="mt-6 w-full rounded-lg bg-violet-600 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Start Batch
            </button>
          </div>
        )}

        {status === 'processing' && (
          <div className="mb-6 rounded-2xl shadow-sm bg-white p-8 text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-violet-600" />
            <p className="mb-2 text-lg font-medium text-gray-800">
              Processing your batch...
            </p>
            <ProgressBar
              progress={batchInfo?.progress?.percentage ?? 10}
              status="Processing videos in batch"
            />
          </div>
        )}

        {status === 'done' && batchInfo && (
          <>
            <div className="mb-6 rounded-2xl shadow-sm bg-white p-8 text-center">
              <p className="mb-2 text-lg font-semibold text-gray-800">
                Batch complete
              </p>
              <p className="mb-4 text-sm text-gray-600">
                {batchInfo.progress.completed} completed,{' '}
                {batchInfo.progress.failed} failed.
              </p>
              <a
                href={getBatchDownloadUrl(batchInfo.batchId)}
                className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-700"
              >
                Download ZIP
              </a>
            </div>
            <CrossToolSuggestions
              workflowHint="Next steps for your files."
              suggestions={[
                { icon: Film, title: 'Burn Subtitles', path: '/burn-subtitles', description: 'Burn SRT into videos' },
                { icon: Minimize2, title: 'Compress Video', path: '/compress-video', description: 'Reduce file size' },
                { icon: FileText, title: 'Video → Transcript', path: '/video-to-transcript', description: 'Transcript & chapters' },
              ]}
            />
          </>
        )}

        {status === 'failed' && (
          <FailedState
            onTryAgain={() => {
              setStatus('idle')
              setBatchInfo(null)
            }}
            message="Something went wrong while starting your batch. Your files weren't changed — try again; it usually works."
          />
        )}

        {faq.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-100" aria-label="FAQ">
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
      </div>
    </div>
  )
}

