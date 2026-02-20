/**
 * Rule-based triggers for Tex. Deterministic, no AI.
 * Input: context. Output: optional suggestion message + link.
 */

export interface TexTriggerContext {
  pathname: string
  plan: string
  fileCount?: number
  fileSizeBytes?: number
  hasMultipleLanguages?: boolean
  idleAfterUpload?: boolean
  lastJobCompletedToolId?: string
}

export interface TexTriggerResult {
  id: string
  message: string
  link?: { path: string; label: string }
}

/**
 * Returns one trigger suggestion or null. Rules are deterministic.
 * No fuzzy matching, no API.
 */
export function getTexTrigger(ctx: TexTriggerContext): TexTriggerResult | null {
  const plan = (ctx.plan || 'free').toLowerCase()
  const pathname = ctx.pathname || ''

  // Multiple uploads → suggest Batch (only if not already on batch)
  if (ctx.fileCount != null && ctx.fileCount >= 2 && !pathname.includes('batch')) {
    if (plan === 'pro' || plan === 'agency') {
      return {
        id: 'suggest-batch',
        message: 'Processing several files? Use Batch to run them in one go.',
        link: { path: '/batch-process', label: 'Open Batch' },
      }
    }
  }

  // Large file on Free → suggest Compress
  if (plan === 'free' && ctx.fileSizeBytes != null && ctx.fileSizeBytes > 80 * 1024 * 1024) {
    return {
      id: 'suggest-compress',
      message: 'Large file? Compress it first to stay within limits.',
      link: { path: '/compress-video', label: 'Compress Video' },
    }
  }

  // Translate with multiple languages → suggest ZIP (Agency)
  if (pathname.includes('translate') && ctx.hasMultipleLanguages && plan === 'agency') {
    return {
      id: 'suggest-zip',
      message: 'Agency plan: you can export multiple languages as ZIP.',
      link: { path: '/translate-subtitles', label: 'Translate Subtitles' },
    }
  }

  // Workflow chain: one suggestion per completed job, priority order (no stacking)
  if (ctx.lastJobCompletedToolId) {
    const tool = ctx.lastJobCompletedToolId
    if (tool === 'transcript' || tool === 'video-to-transcript') {
      return {
        id: 'chain-subtitles',
        message: 'Generate subtitles next?',
        link: { path: '/video-to-subtitles', label: 'Generate Subtitles' },
      }
    }
    if (tool === 'subtitles' || tool === 'video-to-subtitles') {
      return {
        id: 'chain-translate',
        message: 'Translate to another language?',
        link: { path: '/translate-subtitles', label: 'Translate Subtitles' },
      }
    }
    if (tool === 'translate' || tool === 'translate-subtitles') {
      return {
        id: 'chain-zip',
        message: 'Export multiple languages as ZIP?',
        link: { path: '/translate-subtitles', label: 'Export ZIP' },
      }
    }
    if (tool === 'compress' || tool === 'compress-video') {
      return {
        id: 'chain-burn',
        message: 'Burn subtitles into video?',
        link: { path: '/burn-subtitles', label: 'Burn Subtitles' },
      }
    }
  }

  // Legacy: idle after upload (no lastJobCompletedToolId)
  if (ctx.idleAfterUpload && !ctx.lastJobCompletedToolId) {
    if (pathname.includes('video-to-transcript')) {
      return {
        id: 'next-subtitles',
        message: 'Need captions next? Try Video → Subtitles.',
        link: { path: '/video-to-subtitles', label: 'Video → Subtitles' },
      }
    }
    if (pathname.includes('video-to-subtitles')) {
      return {
        id: 'next-translate',
        message: 'Need another language? Try Translate Subtitles.',
        link: { path: '/translate-subtitles', label: 'Translate Subtitles' },
      }
    }
  }

  return null
}
