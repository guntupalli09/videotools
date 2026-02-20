/**
 * Infer a user-friendly failure message from client context only.
 * No API calls, no business logic changes. Display layer only.
 */

export interface FailureContext {
  fileSizeBytes?: number
  planLimitBytes?: number
  maxUploadLimitBytes?: number
  mimeType?: string
  isNetworkError?: boolean
  durationMinutes?: number
  planQuotaMinutes?: number
  remainingMinutes?: number
}

const SUPPORTED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/x-matroska',
  'video/mpeg',
])

export function getFailureMessage(ctx: FailureContext): string | undefined {
  if (ctx.isNetworkError) {
    return 'Network interruption — try again.'
  }
  if (ctx.fileSizeBytes != null && ctx.planLimitBytes != null && ctx.fileSizeBytes > ctx.planLimitBytes) {
    return 'File might be too large for your plan.'
  }
  if (ctx.fileSizeBytes != null && ctx.maxUploadLimitBytes != null && ctx.fileSizeBytes > ctx.maxUploadLimitBytes) {
    return 'File exceeds maximum upload size.'
  }
  if (ctx.mimeType && !SUPPORTED_VIDEO_TYPES.has(ctx.mimeType) && !ctx.mimeType.startsWith('video/')) {
    return 'Unsupported codec or file type detected.'
  }
  if (ctx.durationMinutes != null && ctx.planQuotaMinutes != null && ctx.remainingMinutes != null) {
    if (ctx.durationMinutes > ctx.remainingMinutes) {
      return 'Video is longer than your remaining monthly quota.'
    }
  }
  if (ctx.mimeType && ctx.mimeType.includes('audio') && !ctx.mimeType.includes('video')) {
    return 'Audio track may be corrupted or unsupported.'
  }
  return undefined
}
