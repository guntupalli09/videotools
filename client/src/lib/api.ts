import { API_ORIGIN } from './apiBase'
import { trackEvent } from './analytics'

/** Fire-and-forget analytics; never throws. */
function trackUploadEvent(event: 'upload_started' | 'upload_completed', props: Record<string, unknown>) {
  try {
    trackEvent(event, props)
  } catch {
    // no-op
  }
}

/** RequestInit plus optional timeout (ms). Timeout applies only when no custom signal is provided. */
export type ApiInit = RequestInit & { timeout?: number }

/**
 * Single entry point for all API requests. Enforces /api/* contract so no request
 * can hit /upload, /usage, etc. (missing /api) or /api/api/* (double prefix).
 * VITE_API_URL must be ORIGIN ONLY (e.g. https://api.videotext.io), NOT .../api.
 * Use init.timeout for GET/short requests so slow networks fail fast and can retry (e.g. polling).
 */
export function api(path: string, init?: ApiInit): Promise<Response> {
  if (!path.startsWith('/api/')) {
    throw new Error(`API path must start with /api/. Got: ${path}`)
  }
  const { timeout, ...rest } = init ?? {}
  let signal = rest.signal
  if (timeout != null && timeout > 0 && !signal) {
    const controller = new AbortController()
    signal = controller.signal
    const t = setTimeout(() => controller.abort(), timeout)
    return fetch(`${API_ORIGIN}${path}`, { ...rest, signal }).finally(() => clearTimeout(t))
  }
  return fetch(`${API_ORIGIN}${path}`, rest)
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
  /** When set, backend treats upload as audio-only and skips server-side extraction (transcript/subtitles only). */
  uploadMode?: 'audio-only'
  /** Original video filename when uploadMode is audio-only (for output naming). */
  originalFileName?: string
  /** Original video file size in bytes when uploadMode is audio-only (for limits/logging). */
  originalFileSize?: number
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
  if (options.uploadMode === 'audio-only') {
    formData.append('uploadMode', 'audio-only')
    if (options.originalFileName) formData.append('originalFileName', options.originalFileName)
    if (options.originalFileSize !== undefined) formData.append('originalFileSize', String(options.originalFileSize))
  }
  return formData
}

export interface UploadProgressOptions {
  onProgress?: (percent: number) => void
  /** When set, chunked upload skips the connection probe and uses this profile (enables parallel preflight + probe in pages). */
  connectionSpeed?: 'fast' | 'medium' | 'slow'
  /** Optional AbortSignal to cancel upload (XHR abort / chunked stop). */
  signal?: AbortSignal
}

const CHUNK_THRESHOLD = 15 * 1024 * 1024 // 15 MB — use chunked upload above this
const CHUNKED_UPLOAD_STATE_KEY = 'videotools_chunked_upload'
/** Server accepts up to 10 MB per chunk (express.raw limit). */
const SERVER_CHUNK_LIMIT = 10 * 1024 * 1024

/** Heuristic: touch device or narrow screen or common mobile UA. Used to pick smaller chunks + sequential upload. */
function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod|Android|webOS|Mobile/i.test(ua)) return true
  if ('ontouchstart' in window) return true
  if (window.innerWidth > 0 && window.innerWidth < 768) return true
  return false
}

/** Probe connection speed via GET /health. Used to pick chunk size and parallelism for desktop chunked upload. */
const PROBE_TIMEOUT_MS = 2_500
const PROBE_FAST_MS = 400   // under this → fast (10 MB, 4 parallel)
const PROBE_MEDIUM_MS = 1200 // under this → medium (5 MB, 2 parallel); else slow (2 MB, 1 parallel)
const PROBE_CACHE_MS = 30_000
const USAGE_CACHE_MS = 45_000

let probeCache: { speed: 'fast' | 'medium' | 'slow'; at: number } | null = null

async function measureConnectionSpeed(): Promise<'fast' | 'medium' | 'slow'> {
  const now = Date.now()
  if (probeCache && now - probeCache.at < PROBE_CACHE_MS) return probeCache.speed
  const start = performance.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_ORIGIN}/health`, { signal: controller.signal })
    clearTimeout(timeoutId)
    const elapsed = performance.now() - start
    if (!res.ok) return 'slow'
    let speed: 'fast' | 'medium' | 'slow' = elapsed < PROBE_FAST_MS ? 'fast' : elapsed < PROBE_MEDIUM_MS ? 'medium' : 'slow'
    probeCache = { speed, at: Date.now() }
    return speed
  } catch {
    clearTimeout(timeoutId)
    return 'slow'
  }
}

/** Call when about to start chunked upload; returns a promise to run in parallel with preflight, or null if probe not needed. */
export function getConnectionProbeIfNeeded(file: File): Promise<'fast' | 'medium' | 'slow'> | null {
  if (file.size <= CHUNK_THRESHOLD || isMobile()) return null
  return measureConnectionSpeed()
}

interface ChunkedUploadState {
  uploadId: string
  fileName: string
  fileSize: number
  totalChunks: number
  uploadedChunks: number[]
  chunkSize: number // so resume uses same chunking
}

function getChunkedUploadState(): ChunkedUploadState | null {
  try {
    const raw = sessionStorage.getItem(CHUNKED_UPLOAD_STATE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as ChunkedUploadState & { chunkSize?: number }
    if (!s?.uploadId || !Array.isArray(s.uploadedChunks)) return null
    const chunkSize = s.chunkSize ?? 5 * 1024 * 1024
    return { ...s, chunkSize }
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

function buildInitBody(file: File, options: UploadOptions, totalChunks?: number): Record<string, unknown> {
  const defaultChunkSize = isMobile() ? 2 * 1024 * 1024 : SERVER_CHUNK_LIMIT // 2 MB mobile (reliable), 10 MB desktop (fewer round trips)
  const body: Record<string, unknown> = {
    filename: file.name,
    totalSize: file.size,
    totalChunks: totalChunks ?? Math.ceil(file.size / defaultChunkSize),
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
  if (options.uploadMode === 'audio-only') {
    body.uploadMode = 'audio-only'
    if (options.originalFileName) body.originalFileName = options.originalFileName
    if (options.originalFileSize !== undefined) body.originalFileSize = options.originalFileSize
  }
  return body
}

/** Exponential backoff delay (ms): 1s, 2s for attempts 1, 2. */
function getRetryDelayMs(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 4000)
}

/** Chunked upload for large files. Resumable: same file retry reuses uploadId and only sends missing chunks. Desktop: adaptive chunk size and parallelism from connection probe; mobile: 2 MB sequential for reliability. */
async function uploadFileChunked(
  file: File,
  options: UploadOptions,
  progressOptions?: UploadProgressOptions
): Promise<UploadResponse> {
  const uploadStartMs = Date.now()
  trackUploadEvent('upload_started', {
    tool_type: options.toolType,
    file_size_bytes: file.size,
    upload_mode: 'chunked',
  })
  const userId = localStorage.getItem('userId') || 'demo-user'
  const plan = localStorage.getItem('plan') || 'free'
  const mobile = isMobile()
  const signal = progressOptions?.signal
  const existing = getChunkedUploadState()
  const sameFile = existing && existing.fileName === file.name && existing.fileSize === file.size
  const useExistingChunking = sameFile && existing!.uploadId && existing!.totalChunks != null

  let defaultChunkSize: number
  let chunkParallel: number
  const chunkTimeoutMs = mobile ? 90_000 : 120_000
  const maxChunkRetries = 3

  if (mobile) {
    defaultChunkSize = 2 * 1024 * 1024
    chunkParallel = 1
  } else if (useExistingChunking) {
    defaultChunkSize = existing!.chunkSize ?? SERVER_CHUNK_LIMIT
    chunkParallel = 4
  } else {
    const speed = progressOptions?.connectionSpeed ?? (await measureConnectionSpeed())
    if (speed === 'fast') {
      defaultChunkSize = SERVER_CHUNK_LIMIT
      chunkParallel = 4
    } else if (speed === 'medium') {
      defaultChunkSize = 5 * 1024 * 1024
      chunkParallel = 2
    } else {
      defaultChunkSize = 2 * 1024 * 1024
      chunkParallel = 1
    }
  }

  const chunkSize = sameFile ? (existing!.chunkSize ?? defaultChunkSize) : defaultChunkSize
  const totalChunks = sameFile ? (existing!.totalChunks ?? Math.ceil(file.size / chunkSize)) : Math.ceil(file.size / chunkSize)

  let uploadId: string
  let uploadedChunks: number[]

  const canResume = sameFile && existing!.uploadId && existing!.totalChunks === totalChunks

  if (canResume && existing) {
    uploadId = existing.uploadId
    uploadedChunks = [...existing.uploadedChunks]
  } else {
    if (signal?.aborted) throw new Error('Upload cancelled')
    const initRes = await api('/api/upload/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-plan': plan,
      },
      body: JSON.stringify(buildInitBody(file, options, totalChunks)),
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
      chunkSize,
    })
    progressOptions?.onProgress?.(0)
  }

  const uploadChunk = async (chunkIndex: number): Promise<void> => {
    const start = chunkIndex * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const blob = file.slice(start, end)
    for (let attempt = 0; attempt < maxChunkRetries; attempt++) {
      if (signal?.aborted) throw new Error('Upload cancelled')
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), chunkTimeoutMs)
        if (signal) {
          signal.addEventListener('abort', () => controller.abort(), { once: true })
        }
        const res = await fetch(`${API_ORIGIN}/api/upload/chunk`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-upload-id': uploadId,
            'x-chunk-index': String(chunkIndex),
            'x-user-id': userId,
            'x-plan': plan,
          },
          body: blob,
        })
        clearTimeout(timeoutId)
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
          chunkSize,
        })
        return
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') throw new Error('Upload cancelled')
        if (attempt < maxChunkRetries - 1) {
          await new Promise((r) => setTimeout(r, getRetryDelayMs(attempt)))
        } else {
          const msg = e instanceof Error ? e.message : 'Chunk upload failed'
          throw new Error(
            msg +
              ' On mobile or slow connections, use Wi‑Fi and keep the tab open, then try again.'
          )
        }
      }
    }
  }

  const indicesToUpload = Array.from({ length: totalChunks }, (_, i) => i).filter((i) => !uploadedChunks.includes(i))
  let done = uploadedChunks.length
  for (let i = 0; i < indicesToUpload.length; i += chunkParallel) {
    if (signal?.aborted) throw new Error('Upload cancelled')
    const batch = indicesToUpload.slice(i, i + chunkParallel).map((chunkIndex) => uploadChunk(chunkIndex))
    await Promise.all(batch)
    done += batch.length
    progressOptions?.onProgress?.(Math.round((done / totalChunks) * 100))
  }

  if (signal?.aborted) throw new Error('Upload cancelled')
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
  const uploadDurationMs = Date.now() - uploadStartMs
  trackUploadEvent('upload_completed', {
    job_id: data.jobId,
    tool_type: options.toolType,
    file_size_bytes: file.size,
    upload_mode: 'chunked',
    upload_duration_ms: uploadDurationMs,
  })
  console.log('[UPLOAD_TIMING]', { file_size_bytes: file.size, upload_duration_ms: uploadDurationMs, tool_type: options.toolType, mode: 'chunked' })
  return data
}

const SINGLE_UPLOAD_MAX_RETRIES = 3

/** Upload with real progress. Uses chunked upload for large files (resumable-friendly); XHR for smaller. */
export function uploadFileWithProgress(
  file: File,
  options: UploadOptions,
  progressOptions?: UploadProgressOptions
): Promise<UploadResponse> {
  if (file.size > CHUNK_THRESHOLD) {
    return uploadFileChunked(file, options, progressOptions)
  }

  const uploadMode = options.uploadMode === 'audio-only' ? 'audio-only' : 'single'
  trackUploadEvent('upload_started', {
    tool_type: options.toolType,
    file_size_bytes: file.size,
    upload_mode: uploadMode,
  })

  const formData = buildUploadFormData(file, options)
  const url = `${API_ORIGIN}/api/upload`
  const userId = localStorage.getItem('userId') || 'demo-user'
  const plan = localStorage.getItem('plan') || 'free'
  const signal = progressOptions?.signal

  const runOne = (): Promise<UploadResponse> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      let uploadStartMs = 0

      if (signal?.aborted) {
        reject(new Error('Upload cancelled'))
        return
      }
      const onAbort = () => {
        xhr.abort()
      }
      signal?.addEventListener('abort', onAbort, { once: true })

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && progressOptions?.onProgress) {
          progressOptions.onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        signal?.removeEventListener('abort', onAbort)
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
          const uploadDurationMs = uploadStartMs ? Date.now() - uploadStartMs : 0
          trackUploadEvent('upload_completed', {
            job_id: data.jobId,
            tool_type: options.toolType,
            file_size_bytes: file.size,
            upload_mode: uploadMode,
            upload_duration_ms: uploadDurationMs,
          })
          console.log('[UPLOAD_TIMING]', { file_size_bytes: file.size, upload_duration_ms: uploadDurationMs, tool_type: options.toolType, mode: 'xhr' })
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

      xhr.addEventListener('error', () => {
        signal?.removeEventListener('abort', onAbort)
        reject(new Error('Upload failed'))
      })
      xhr.addEventListener('abort', () => {
        signal?.removeEventListener('abort', onAbort)
        reject(new Error('Upload cancelled'))
      })

      xhr.open('POST', url)
      xhr.setRequestHeader('x-user-id', userId)
      xhr.setRequestHeader('x-plan', plan)
      uploadStartMs = Date.now()
      xhr.send(formData)
    })

  return (async () => {
    let lastErr: Error | null = null
    for (let attempt = 0; attempt < SINGLE_UPLOAD_MAX_RETRIES; attempt++) {
      if (signal?.aborted) throw new Error('Upload cancelled')
      try {
        return await runOne()
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error('Upload failed')
        if (lastErr.message === 'Upload cancelled') throw lastErr
        if (attempt < SINGLE_UPLOAD_MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, getRetryDelayMs(attempt)))
        }
      }
    }
    throw lastErr ?? new Error('Upload failed')
  })()
}

export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResponse> {
  const uploadStartMs = Date.now()
  const uploadMode = options.uploadMode === 'audio-only' ? 'audio-only' : 'single'
  trackUploadEvent('upload_started', {
    tool_type: options.toolType,
    file_size_bytes: file.size,
    upload_mode: uploadMode,
  })
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
  const uploadDurationMs = Date.now() - uploadStartMs
  trackUploadEvent('upload_completed', {
    job_id: data.jobId,
    tool_type: options.toolType,
    file_size_bytes: file.size,
    upload_mode: uploadMode,
    upload_duration_ms: uploadDurationMs,
  })
  console.log('[UPLOAD_TIMING]', { file_size_bytes: file.size, upload_duration_ms: uploadDurationMs, tool_type: options.toolType, mode: 'fetch' })
  return data
}

export async function uploadFromURL(url: string, options: UploadOptions): Promise<UploadResponse> {
  trackUploadEvent('upload_started', {
    tool_type: options.toolType,
    upload_mode: 'url',
  })
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
  trackUploadEvent('upload_completed', {
    job_id: data.jobId,
    tool_type: options.toolType,
    upload_mode: 'url',
  })
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
  trackUploadEvent('upload_started', {
    tool_type: toolType,
    file_size_bytes: videoFile.size,
    upload_mode: 'dual',
  })
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
  trackUploadEvent('upload_completed', {
    job_id: data.jobId,
    tool_type: toolType,
    file_size_bytes: videoFile.size,
    upload_mode: 'dual',
  })
  return data
}

/** Thrown when GET /api/job/:id returns 404 (job expired or never existed). Show "Session expired. Please upload again." */
export class SessionExpiredError extends Error {
  constructor(message = 'Session expired. Please upload again.') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

/** True if the error is a network/abort failure (timeout, offline, DNS). */
export function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError && (e.message === 'Failed to fetch' || e.message === 'Load failed')) return true
  if (e instanceof Error && e.name === 'AbortError') return true
  return false
}

/** User-facing message for API failures: network hint when applicable, else error message or generic. */
export function getUserFacingMessage(e: unknown): string {
  if (isNetworkError(e)) return "Check your connection and try again."
  if (e instanceof Error && e.message) return e.message
  return 'Something went wrong. Please try again.'
}

/** Timeout for status/usage GET requests so slow networks fail fast and polling can retry. */
const API_GET_TIMEOUT_MS = 25_000

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await api(`/api/job/${jobId}`, { timeout: API_GET_TIMEOUT_MS })

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
  const response = await api(`/api/batch/${batchId}/status`, { timeout: API_GET_TIMEOUT_MS })

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

let usageCache: { data: unknown; at: number } | null = null

export async function getCurrentUsage(): Promise<UsageData> {
  const now = Date.now()
  if (usageCache && now - usageCache.at < USAGE_CACHE_MS) return usageCache.data as UsageData
  const response = await api('/api/usage/current', {
    timeout: API_GET_TIMEOUT_MS,
    headers: {
      'x-user-id': localStorage.getItem('userId') || 'demo-user',
      'x-plan': localStorage.getItem('plan') || 'free',
    },
  })
  if (!response.ok) throw new Error('Failed to get usage data')
  const data = await response.json()
  usageCache = { data, at: Date.now() }
  return data as UsageData
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
