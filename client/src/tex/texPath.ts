/**
 * Route → tool mapping for Tex context. No business logic.
 */

export type ToolId =
  | 'video-to-transcript'
  | 'video-to-subtitles'
  | 'translate-subtitles'
  | 'fix-subtitles'
  | 'burn-subtitles'
  | 'compress-video'
  | 'batch-process'
  | null

const PATH_TO_TOOL: Record<string, ToolId> = {
  '/video-to-transcript': 'video-to-transcript',
  '/video-to-subtitles': 'video-to-subtitles',
  '/translate-subtitles': 'translate-subtitles',
  '/fix-subtitles': 'fix-subtitles',
  '/burn-subtitles': 'burn-subtitles',
  '/compress-video': 'compress-video',
  '/batch-process': 'batch-process',
}

/** Returns tool id for pathname or null. Deterministic. */
export function getToolFromPath(pathname: string): ToolId {
  const normalized = pathname.replace(/\/$/, '') || '/'
  return PATH_TO_TOOL[normalized] ?? null
}

const TOOL_GREETINGS: Record<NonNullable<ToolId>, string> = {
  'video-to-transcript': "You're on Video → Transcript. Drop a video and I'll turn speech into text, with optional summary and chapters.",
  'video-to-subtitles': "You're on Video → Subtitles. Upload a video to get SRT or VTT in seconds.",
  'translate-subtitles': "You're on Translate Subtitles. Upload SRT/VTT and pick a language; I'll keep timings in sync.",
  'fix-subtitles': "You're on Fix Subtitles. Drop subtitles with timing or format issues and I'll clean them up.",
  'burn-subtitles': "You're on Burn Subtitles. I'll bake your captions into the video file.",
  'compress-video': "You're on Compress Video. Drop a large file and I'll shrink it without killing quality.",
  'batch-process': "You're on Batch. Upload multiple videos and process them in one go (Pro/Agency).",
}

/** Tool-specific short greeting for Tex panel. */
export function getToolGreeting(pathname: string): string | null {
  const tool = getToolFromPath(pathname)
  return tool ? TOOL_GREETINGS[tool] ?? null : null
}
