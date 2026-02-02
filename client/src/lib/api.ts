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
}

export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResponse> {
  const formData = new FormData()
  // Field name must be exactly "file" for Multer upload.single('file')
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

  // Do NOT set Content-Type: browser must set multipart/form-data with boundary
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

  // 204 or empty body: no jobId to poll; treat as error so UI doesn't show "Processing failed" from JSON parse error
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
  options?: { trimmedStart?: number; trimmedEnd?: number }
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

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await api(`/api/job/${jobId}`)

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
