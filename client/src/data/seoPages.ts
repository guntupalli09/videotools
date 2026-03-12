/**
 * Programmatic SEO: transcription targets and intents for generating pages.
 * Used by generateSeoPages.ts to produce /transcribe-[target], /[target]-to-text, etc.
 */

export const transcriptionTargets = [
  'youtube video',
  'podcast',
  'interview',
  'meeting',
  'webinar',
  'lecture',
  'zoom recording',
  'mp4 video',
  'audio recording',
  'online course',
  'training video',
  'presentation',
  'documentary',
  'video podcast',
  'conference talk',
  'speech',
  'video interview',
  'product demo',
  'tutorial video',
  'marketing video',
] as const

/** Slug-friendly target (e.g. "youtube video" -> "youtube-video") */
export function targetToSlug(target: string): string {
  return target.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/** Human-readable target (e.g. "youtube-video" -> "YouTube Video") */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
