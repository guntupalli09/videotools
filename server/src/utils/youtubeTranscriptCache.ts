/**
 * Redis-backed cache for YouTube transcript results.
 *
 * Keyed by videoId + language preference so the same video processed by
 * different users (or re-submitted by the same user) hits YouTube only once.
 * TTL defaults to 7 days; set YOUTUBE_TRANSCRIPT_CACHE_TTL_HOURS to override.
 */

import type Redis from 'ioredis'
import { getLogger } from '../lib/logger'

const log = getLogger('worker')

const TTL_SEC = Math.max(
  60,
  (Number(process.env.YOUTUBE_TRANSCRIPT_CACHE_TTL_HOURS) || 24 * 7) * 3600
)

function cacheKey(videoId: string, language: string, defaultLanguage: string): string {
  const lang = language.toLowerCase() || 'en'
  const def = defaultLanguage.toLowerCase() || 'none'
  return `yt:transcript:v1:${videoId}:${lang}:${def}`
}

export interface CachedTranscript {
  fullText: string
  segments: { start: number; end: number; text: string }[]
}

export async function getCachedTranscript(
  redis: Redis,
  videoId: string,
  language: string,
  defaultLanguage: string
): Promise<CachedTranscript | null> {
  try {
    const raw = await redis.get(cacheKey(videoId, language, defaultLanguage))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedTranscript
    log.info({ msg: 'yt_transcript_cache_hit', videoId, language })
    return parsed
  } catch {
    return null
  }
}

export async function setCachedTranscript(
  redis: Redis,
  videoId: string,
  language: string,
  defaultLanguage: string,
  result: CachedTranscript
): Promise<void> {
  try {
    await redis.set(cacheKey(videoId, language, defaultLanguage), JSON.stringify(result), 'EX', TTL_SEC)
  } catch (err: any) {
    log.warn({ msg: 'yt_transcript_cache_set_failed', videoId, error: err?.message })
  }
}
