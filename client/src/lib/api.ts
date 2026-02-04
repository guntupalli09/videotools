import { API_ORIGIN } from './apiBase'

/**
 * Single entry point for all API requests. Enforces /api/* contract so no request
 * can hit /upload, /usage, etc. (missing /api) or /api/api/* (double prefix).
 * VITE_API_URL must be ORIGIN ONLY (e.g. https://api.videotext.io), NOT .../api.
 */
export function api(path: string, init?: RequestInit): Promise<Response> {
  if (!path.startsWith('/api/')) {
    throw new Error(`API path must start with /api/. Got: ${path}`)
  }
  return fetch(`${API_ORIGIN}${path}`, init)
}

/** Backend-supported toolType values. Match server/src/routes/upload.ts and workers/videoProcessor.ts exactly. Do not invent names. */
export const BACKEND_TOOL_TYPES = {
  VIDEO_TO_TRANSCRIPT: 'video-to-transcript',
  VIDEO_TO_SUBTITLES: 'video-to-subtitles',
  TRANSLATE_SUBTITLES: 'translate-subtitles',
  FIX_SUBTITLES: 'fix-subtitles',
  BURN_SUBTITLES: 'burn-subtitles',
  COMPRESS_VIDEO: 'compress-video',
  CONVERT_SUBTITLES: 'convert-subtitles',
} as const

export type BackendToolType = (typeof BACKEND_TOOL_TYPES)[keyof typeof BACKEND_TOOL_TYPES]

export interface UploadResponse {
  jobId: string
  status: 'queued'
}

export interface JobStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  /** Phase 2.5: jobs ahead in queue for "Processing… {N} jobs ahead of you." */
  queuePosition?: number
  result?: {
    downloadUrl: string
    fileName?: string
    issues?: any[]
    warnings?: { type: string; message: string; line?: number }[]
    consistencyIssues?: { line: number; issueType: string }[]
    segments?: { start: number; end: number; text: string; speaker?: string }[]
    summary?: { summary: string; bullets: string[]; actionItems?: string[] }
    chapters?: { title: string; startTime: number; endTime?: number }[]
  }
}

export interface UploadOptions {
  toolType: BackendToolType
  url?: string
  format?: 'srt' | 'vtt'
  language?: string
  targetLanguage?: string
  compressionLevel?: 'light' | 'medium' | 'heavy'
  trimmedStart?: number // seconds
  trimmedEnd?: number // seconds
  additionalLanguages?: string[] // For multi-language
  targetFormat?: 'srt' | 'vtt' | 'txt' // Phase 1B: convert-subtitles
  fixTiming?: boolean
  timingOffsetMs?: number
  grammarFix?: boolean
  lineBreakFix?: boolean
  removeFillers?: boolean
  compressProfile?: 'web' | 'mobile' | 'archive'
  // Transcript extras
  includeSummary?: boolean
  includeChapters?: boolean
  exportFormats?: ('txt' | 'json' | 'docx' | 'pdf')[]
  speakerDiarization?: boolean
  glossary?: string
  webhookUrl?: string
}

/** Map backend subtitle validation errors to human-friendly messages. */
function mapSubtitleUploadError(backendMessage: string): string {
  if (/unsupported subtitle format/i.test(backendMessage)) {
    return "This file doesn't look like a subtitle file. Upload SRT, VTT, or a text subtitle."
  }
  return backendMessage
}

function buildUploadFormData(file: File, options: UploadOptions): FormData {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('toolType', options.toolType)
  if (options.format) formData.append('format', options.format)
  if (options.language) formData.append('language', options.language)
  if (options.targetLanguage) formData.append('targetLanguage', options.targetLanguage)
  if (options.compressionLevel) formData.append('compressionLevel', options.compressionLevel)
  if (options.trimmedStart !== undefined) formData.append('trimmedStart', options.trimmedStart.toString())
  if (options.trimmedEnd !== undefined) formData.append('trimmedEnd', options.trimmedEnd.toString())
  if (options.additionalLanguages && options.additionalLanguages.length > 0) {
    formData.append('additionalLanguages', JSON.stringify(options.additionalLanguages))
  }
  if (options.targetFormat) formData.append('targetFormat', options.targetFormat)
  if (options.fixTiming !== undefined) formData.append('fixTiming', String(options.fixTiming))
  if (options.timingOffsetMs !== undefined) formData.append('timingOffsetMs', options.timingOffsetMs.toString())
  if (options.grammarFix !== undefined) formData.append('grammarFix', String(options.grammarFix))
  if (options.lineBreakFix !== undefined) formData.append('lineBreakFix', String(options.lineBreakFix))
  if (options.removeFillers !== undefined) formData.append('removeFillers', String(options.removeFillers))
  if (options.compressProfile) formData.append('compressProfile', options.compressProfile)
  if (options.includeSummary !== undefined) formData.append('includeSummary', String(options.includeSummary))
  if (options.includeChapters !== undefined) formData.append('includeChapters', String(options.includeChapters))
  if (options.speakerDiarization !== undefined) formData.append('speakerDiarization', String(options.speakerDiarization))
  if (options.glossary) formData.append('glossary', options.glossary)
  if (options.exportFormats && options.exportFormats.length > 0) {
    formData.append('exportFormats', JSON.stringify(options.exportFormats))
  }
  if (options.webhookUrl) formData.append('webhookUrl', options.webhookUrl)
  return formData
}

export interface UploadProgressOptions {
  onProgress?: (percent: number) => void
}

const CHUNK_SIZE = 5 * 1024 * 1024 // 5 MB
const CHUNK_THRESHOLD = 15 * 1024 * 1024 // 15 MB — use chunked upload above this
const CHUNK_PARALLEL = 4 // upload 4 chunks at a time for faster large uploads
const CHUNKED_UPLOAD_STATE_KEY = 'videotools_chunked_upload'

interface ChunkedUploadState {
  uploadId: string
  fileName: string
  fileSize: number
  totalChunks: number
  uploadedChunks: number[]
}

function getChunkedUploadState(): ChunkedUploadState | null {
  try {
    const raw = sessionStorage.getItem(CHUNKED_UPLOAD_STATE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as ChunkedUploadState
    if (!s?.uploadId || !Array.isArray(s.uploadedChunks)) return null
    return s
  } catch {
    return null
  }
}

function setChunkedUploadState(state: ChunkedUploadState): void {
  try {
    sessionStorage.setItem(CHUNKED_UPLOAD_STATE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function clearChunkedUploadState(): void {
  try {
    sessionStorage.removeItem(CHUNKED_UPLOAD_STATE_KEY)
  } catch {
    // ignore
  }
}

function buildInitBody(file: File, options: UploadOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    filename: file.name,
    totalSize: file.size,
    totalChunks: Math.ceil(file.size / CHUNK_SIZE),
    toolType: options.toolType,
  }
  if (options.format) body.format = options.format
  if (options.language) body.language = options.language
  if (options.targetLanguage) body.targetLanguage = options.targetLanguage
  if (options.compressionLevel) body.compressionLevel = options.compressionLevel
  if (options.trimmedStart !== undefined) body.trimmedStart = options.trimmedStart
  if (options.trimmedEnd !== undefined) body.trimmedEnd = options.trimmedEnd
  if (options.additionalLanguages && options.additionalLanguages.length > 0) {
    body.additionalLanguages = options.additionalLanguages
  }
  if (options.targetFormat) body.targetFormat = options.targetFormat
  if (options.fixTiming !== undefined) body.fixTiming = options.fixTiming
  if (options.timingOffsetMs !== undefined) body.timingOffsetMs = options.timingOffsetMs
  if (options.grammarFix !== undefined) body.grammarFix = options.grammarFix
  if (options.lineBreakFix !== undefined) body.lineBreakFix = options.lineBreakFix
  if (options.removeFillers !== undefined) body.removeFillers = options.removeFillers
  if (options.compressProfile) body.compressProfile = options.compressProfile
  if (options.includeSummary !== undefined) body.includeSummary = options.includeSummary
  if (options.includeChapters !== undefined) body.includeChapters = options.includeChapters
  if (options.speakerDiarization !== undefined) body.speakerDiarization = options.speakerDiarization
  if (options.glossary) body.glossary = options.glossary
  if (options.exportFormats && options.exportFormats.length > 0) body.exportFormats = options.exportFormats
  if (options.webhookUrl) body.webhookUrl = options.webhookUrl
  return body
}

/** Chunked upload for large files. Resumable: same file retry reuses uploadId and only sends missing chunks. */
async function uploadFileChunked(
  file: File,
  options: UploadOptions,
  progressOptions?: UploadProgressOptions
): Promise<UploadResponse> {
  const userId = localStorage.getItem('userId') || 'demo-user'
  const plan = localStorage.getItem('plan') || 'free'
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

  let uploadId: string
  let uploadedChunks: number[]

  const existing = getChunkedUploadState()
  const canResume =
    existing &&
    existing.fileName === file.name &&
    existing.fileSize === file.size &&
    existing.totalChunks === totalChunks

  if (canResume && existing) {
    uploadId = existing.uploadId
    uploadedChunks = [...existing.uploadedChunks]
  } else {
    const initRes = await api('/api/upload/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-plan': plan,
      },
      body: JSON.stringify(buildInitBody(file, options)),
    })
    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({ message: 'Upload init failed' }))
      throw new Error(err.message || 'Upload init failed')
    }
    const initData = (await initRes.json()) as { uploadId: string }
    uploadId = initData.uploadId
    uploadedChunks = []
    setChunkedUploadState({
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      totalChunks,
      uploadedChunks: [],
    })
    progressOptions?.onProgress?.(0)
  }

  const uploadChunk = async (chunkIndex: number): Promise<void> => {
    const start = chunkIndex * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const blob = file.slice(start, end)
    const res = await fetch(`${API_ORIGIN}/api/upload/chunk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-upload-id': uploadId,
        'x-chunk-index': String(chunkIndex),
        'x-user-id': userId,
        'x-plan': plan,
      },
      body: blob,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Chunk upload failed' }))
      throw new Error(err.message || 'Chunk upload failed')
    }
    uploadedChunks.push(chunkIndex)
    setChunkedUploadState({
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      totalChunks,
      uploadedChunks: [...uploadedChunks],
    })
  }

  const indicesToUpload = Array.from({ length: totalChunks }, (_, i) => i).filter((i) => !uploadedChunks.includes(i))
  let done = uploadedChunks.length
  for (let i = 0; i < indicesToUpload.length; i += CHUNK_PARALLEL) {
    const batch = indicesToUpload.slice(i, i + CHUNK_PARALLEL).map((chunkIndex) => uploadChunk(chunkIndex))
    await Promise.all(batch)
    done += batch.length
    progressOptions?.onProgress?.(Math.round((done / totalChunks) * 100))
  }

  const completeRes = await api('/api/upload/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-plan': plan,
    },
    body: JSON.stringify({ uploadId }),
  })
  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({ message: 'Upload complete failed' }))
    throw new Error(err.message || 'Upload complete failed')
  }
  const data = (await completeRes.json()) as UploadResponse
  if (!data?.jobId) throw new Error('Invalid upload response. Please retry.')
  clearChunkedUploadState()
  return data
}

/** Upload with real progress. Uses chunked upload for large files (resumable-friendly); XHR for smaller. */
export function uploadFileWithProgress(
  file: File,
  options: UploadOptions,
  progressOptions?: UploadProgressOptions
): Promise<UploadResponse> {
  if (file.size > CHUNK_THRESHOLD) {
    return uploadFileChunked(file, options, progressOptions)
  }

  const formData = buildUploadFormData(file, options)
  const url = `${API_ORIGIN}/api/upload`
  const userId = localStorage.getItem('userId') || 'demo-user'
  const plan = localStorage.getItem('plan') || 'free'

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && progressOptions?.onProgress) {
        progressOptions.onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 204 || !xhr.responseText?.trim()) {
        reject(new Error('Upload accepted but no job ID returned. Please retry.'))
        return
      }
      let data: UploadResponse & { message?: string }
      try {
        data = JSON.parse(xhr.responseText) as UploadResponse & { message?: string }
      } catch {
        reject(new Error('Invalid upload response. Please retry.'))
        return
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.jobId) {
        resolve({ jobId: data.jobId, status: data.status ?? 'queued' })
        return
      }
      const err = data?.message || 'Upload failed'
      reject(new Error(
        options.toolType === 'translate-subtitles' || options.toolType === 'fix-subtitles' || options.toolType === 'convert-subtitles'
          ? mapSubtitleUploadError(err)
          : err
      ))
    })

    xhr.addEventListener('error', () => reject(new Error('Upload failed')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.open('POST', url)
    xhr.setRequestHeader('x-user-id', userId)
    xhr.setRequestHeader('x-plan', plan)
    xhr.send(formData)
  })
}

export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResponse> {
  const formData = buildUploadFormData(file, options)
  const response = await api('/api/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'x-user-id': localStorage.getItem('userId') || 'demo-user',
      'x-plan': localStorage.getItem('plan') || 'free',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }))
    const message = error.message || 'Upload failed'
    const displayMessage =
      options.toolType === 'translate-subtitles' || options.toolType === 'fix-subtitles' || options.toolType === 'convert-subtitles'
        ? mapSubtitleUploadError(message)
        : message
    throw new Error(displayMessage)
  }

  if (response.status === 204) {
    throw new Error('Upload accepted but no job ID returned. Please retry.')
  }
  const text = await response.text()
  if (!text || !text.trim()) {
    throw new Error('Upload accepted but no job ID returned. Please retry.')
  }
  let data: UploadResponse
  try {
    data = JSON.parse(text) as UploadResponse
  } catch {
    throw new Error('Invalid upload response. Please retry.')
  }
  if (!data?.jobId) {
    throw new Error('Invalid upload response. Please retry.')
  }
  return data
}

export async function uploadFromURL(url: string, options: UploadOptions): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('toolType', options.toolType)
  formData.append('url', url)
  
  if (options.format) formData.append('format', options.format)
  if (options.language) formData.append('language', options.language)

  const response = await api('/api/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'x-user-id': localStorage.getItem('userId') || 'demo-user',
      'x-plan': localStorage.getItem('plan') || 'free',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }))
    throw new Error(error.message || 'Upload failed')
  }

  if (response.status === 204) {
    throw new Error('Upload accepted but no job ID returned. Please retry.')
  }
  const text = await response.text()
  if (!text || !text.trim()) {
    throw new Error('Upload accepted but no job ID returned. Please retry.')
  }
  let data: UploadResponse
  try {
    data = JSON.parse(text) as UploadResponse
  } catch {
    throw new Error('Invalid upload response. Please retry.')
  }
  if (!data?.jobId) {
    throw new Error('Invalid upload response. Please retry.')
  }
  return data
}

export async function uploadDualFiles(
  videoFile: File,
  subtitleFile: File,
  toolType: BackendToolType,
  options?: {
    trimmedStart?: number
    trimmedEnd?: number
    burnFontSize?: 'small' | 'medium' | 'large'
    burnPosition?: 'bottom' | 'middle'
    burnBackgroundOpacity?: 'none' | 'low' | 'high'
  }
): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('video', videoFile)
  formData.append('subtitles', subtitleFile)
  formData.append('toolType', toolType)
  if (options?.trimmedStart !== undefined) {
    formData.append('trimmedStart', options.trimmedStart.toString())
  }
  if (options?.trimmedEnd !== undefined) {
    formData.append('trimmedEnd', options.trimmedEnd.toString())
  }
  if (options?.burnFontSize) formData.append('burnFontSize', options.burnFontSize)
  if (options?.burnPosition) formData.append('burnPosition', options.burnPosition)
  if (options?.burnBackgroundOpacity) formData.append('burnBackgroundOpacity', options.burnBackgroundOpacity)

  const response = await api('/api/upload/dual', {
    method: 'POST',
    body: formData,
    headers: {
      'x-user-id': localStorage.getItem('userId') || 'demo-user',
      'x-plan': localStorage.getItem('plan') || 'free',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }))
    throw new Error(error.message || 'Upload failed')
  }

  if (response.status === 204) {
    throw new Error('Upload accepted but no job ID returned. Please retry.')
  }
  const text = await response.text()
  if (!text || !text.trim()) {
    throw new Error('Upload accepted but no job ID returned. Please retry.')
  }
  let data: UploadResponse
  try {
    data = JSON.parse(text) as UploadResponse
  } catch {
    throw new Error('Invalid upload response. Please retry.')
  }
  if (!data?.jobId) {
    throw new Error('Invalid upload response. Please retry.')
  }
  return data
}

/** Thrown when GET /api/job/:id returns 404 (job expired or never existed). Show "Session expired. Please upload again." */
export class SessionExpiredError extends Error {
  constructor(message = 'Session expired. Please upload again.') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await api(`/api/job/${jobId}`)

  if (response.status === 404) {
    throw new SessionExpiredError('Session expired. Please upload again.')
  }

  if (!response.ok) {
    throw new Error('Failed to get job status')
  }

  return response.json()
}

// Batch processing APIs
export interface BatchUploadResponse {
  batchId: string
  totalVideos: number
  estimatedDuration: number
  estimatedMinutes: number
  primaryLanguage: string
  additionalLanguages: string[]
  status: 'queued'
}

export async function uploadBatch(
  files: File[],
  primaryLanguage: string,
  additionalLanguages: string[] = []
): Promise<BatchUploadResponse> {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  formData.append('primaryLanguage', primaryLanguage)
  if (additionalLanguages.length > 0) {
    formData.append('additionalLanguages', JSON.stringify(additionalLanguages))
  }

  const response = await api('/api/batch/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'x-user-id': localStorage.getItem('userId') || 'demo-user',
      'x-plan': localStorage.getItem('plan') || 'free',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Batch upload failed' }))
    throw new Error(error.message || 'Batch upload failed')
  }

  return response.json()
}

export interface BatchStatus {
  batchId: string
  status: 'queued' | 'processing' | 'completed' | 'partial' | 'failed'
  progress: {
    total: number
    completed: number
    failed: number
    percentage: number
  }
  estimatedTimeRemaining: number
  errors: { videoName: string; reason: string }[]
}

export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
  const response = await api(`/api/batch/${batchId}/status`)

  if (!response.ok) {
    throw new Error('Failed to get batch status')
  }

  return response.json()
}

export function getBatchDownloadUrl(batchId: string): string {
  return `${API_ORIGIN}/api/batch/${batchId}/download`
}

// Usage APIs
export interface UsageData {
  plan: string
  limits: {
    minutesPerMonth: number
    maxLanguages: number
    batchEnabled: boolean
    maxFileSize?: number
    maxVideoDuration?: number
  }
  usage: {
    totalMinutes: number
    remaining: number
    videoCount: number
    batchCount: number
  }
  overages: {
    minutes: number
    charge: number
  }
  resetDate: string
}

export async function getCurrentUsage(): Promise<UsageData> {
  const response = await api('/api/usage/current', {
    headers: {
      'x-user-id': localStorage.getItem('userId') || 'demo-user',
      'x-plan': localStorage.getItem('plan') || 'free',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get usage data')
  }

  return response.json()
}

/** Translate transcript text to a target language (English, Hindi, Telugu, Spanish, Chinese, Russian). */
export const TRANSCRIPT_TRANSLATION_LANGUAGES = ['English', 'Hindi', 'Telugu', 'Spanish', 'Chinese', 'Russian'] as const

export async function translateTranscript(
  text: string,
  targetLanguage: string
): Promise<{ translatedText: string }> {
  const response = await api('/api/translate-transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguage }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error((data as { message?: string }).message || 'Translation failed')
  }
  return response.json()
}
