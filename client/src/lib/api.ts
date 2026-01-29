import { API_BASE } from './apiBase'

export interface UploadResponse {
  jobId: string
  status: 'queued'
}

export interface JobStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  result?: {
    downloadUrl: string
    fileName?: string
    issues?: any[]
  }
}

export interface UploadOptions {
  toolType: string
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

  const response = await fetch(`${API_BASE}/upload`, {
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

  return response.json()
}

export async function uploadFromURL(url: string, options: UploadOptions): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('toolType', options.toolType)
  formData.append('url', url)
  
  if (options.format) formData.append('format', options.format)
  if (options.language) formData.append('language', options.language)

  const response = await fetch(`${API_BASE}/upload`, {
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

  return response.json()
}

export async function uploadDualFiles(
  videoFile: File,
  subtitleFile: File,
  toolType: string,
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

  const response = await fetch(`${API_BASE}/upload/dual`, {
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

  return response.json()
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE}/job/${jobId}`)

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

  const response = await fetch(`${API_BASE}/batch/upload`, {
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
  const response = await fetch(`${API_BASE}/batch/${batchId}/status`)

  if (!response.ok) {
    throw new Error('Failed to get batch status')
  }

  return response.json()
}

export function getBatchDownloadUrl(batchId: string): string {
  return `${API_BASE}/batch/${batchId}/download`
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
  const response = await fetch(`${API_BASE}/usage/current`, {
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
