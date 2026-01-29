import { useState } from 'react'
import FileUploadZone from '../components/FileUploadZone'
import UsageDisplay from '../components/UsageDisplay'
import ProgressBar from '../components/ProgressBar'
import { Loader2, FolderPlus } from 'lucide-react'
import { getBatchDownloadUrl, getBatchStatus, uploadBatch } from '../lib/api'

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

export default function BatchProcess() {
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
      }, 2000)
    } catch (e) {
      console.error(e)
      setStatus('failed')
    }
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-violet-100">
            <FolderPlus className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-800">
            Batch Processing
          </h1>
          <p className="mb-3 text-lg text-gray-600">
            Upload multiple videos and process them together.
          </p>
          <UsageDisplay />
        </div>

        {status === 'idle' && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8">
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
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8 text-center">
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
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8 text-center">
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
        )}

        {status === 'failed' && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="mb-2 text-lg font-semibold text-red-700">
              Batch failed
            </p>
            <p className="mb-4 text-sm text-red-600">
              Something went wrong while starting your batch. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

