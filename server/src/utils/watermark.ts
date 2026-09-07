/** Keep in sync with client/src/lib/watermark.ts */

export const WATERMARK_LINE1 = 'Fast AI transcription by VideoText.io — Free Plan'
export const WATERMARK_LINE2 = '⚠  Remove this watermark: videotext.io/pricing  |  Upgrade to Pro'
export const WATERMARK_SEPARATOR = '=================================================================================='
export const WATERMARK_UPGRADE_URL = 'videotext.io/pricing'

/** Shorter line for PDF/DOCX footers and UI copy. */
export const WATERMARK_DOC_FOOTER = `${WATERMARK_LINE1} · ${WATERMARK_UPGRADE_URL}`

export const WATERMARK_CLIPBOARD_SUFFIX = `\n\n---\n${WATERMARK_LINE1} · ${WATERMARK_UPGRADE_URL}\n`

export const TEXT_EXTENSIONS = new Set(['.srt', '.vtt', '.txt', '.json', '.csv'])

const SRT_WATERMARK_CUE = [
  '1',
  '00:00:00,000 --> 00:00:08,000',
  WATERMARK_LINE1,
  WATERMARK_LINE2,
  '',
  '',
].join('\n')

const VTT_WATERMARK_CUE_LINES = ['', '00:00:00.000 --> 00:00:08.000', WATERMARK_LINE1, WATERMARK_LINE2, '']

export function applyWatermarkToSrt(content: string): string {
  return SRT_WATERMARK_CUE + content.trimStart()
}

export function applyWatermarkToVtt(content: string): string {
  const lines = content.split('\n')
  const headerIdx = lines.findIndex((l) => l.startsWith('WEBVTT'))
  if (headerIdx >= 0) {
    lines.splice(headerIdx + 1, 0, ...VTT_WATERMARK_CUE_LINES)
  } else {
    lines.unshift('WEBVTT', ...VTT_WATERMARK_CUE_LINES)
  }
  return lines.join('\n')
}

export function applyWatermarkToTxt(content: string): string {
  const header = `${WATERMARK_SEPARATOR}\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n${WATERMARK_SEPARATOR}\n\n`
  const footer = `\n\n${WATERMARK_SEPARATOR}\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n${WATERMARK_SEPARATOR}\n`
  return header + content + footer
}

export function applyWatermarkToCsv(content: string): string {
  const header = `# ${WATERMARK_LINE1}\n# ${WATERMARK_LINE2}\n`
  const footer = `\n# ${WATERMARK_LINE1}\n# ${WATERMARK_LINE2}\n`
  return header + content + footer
}

export function applyWatermarkToJson(content: string): string {
  try {
    const obj = JSON.parse(content) as unknown
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      return JSON.stringify(
        {
          _watermark: `${WATERMARK_LINE1} | ${WATERMARK_LINE2}`,
          _upgrade: WATERMARK_UPGRADE_URL,
          ...obj,
        },
        null,
        2,
      )
    }
    if (Array.isArray(obj)) {
      return JSON.stringify(
        {
          _watermark: `${WATERMARK_LINE1} | ${WATERMARK_LINE2}`,
          _upgrade: WATERMARK_UPGRADE_URL,
          blocks: obj,
        },
        null,
        2,
      )
    }
  } catch {
    /* fall through */
  }
  return applyWatermarkToTxt(content)
}

/**
 * Apply watermark to text export content by file extension.
 * - SRT/VTT: 8-second opening cue
 * - JSON: _watermark field
 * - CSV: comment header/footer
 * - TXT/default: separator header/footer
 */
export function applyWatermark(content: string, ext: string): string {
  switch (ext) {
    case '.srt':
      return applyWatermarkToSrt(content)
    case '.vtt':
      return applyWatermarkToVtt(content)
    case '.json':
      return applyWatermarkToJson(content)
    case '.csv':
      return applyWatermarkToCsv(content)
    default:
      return applyWatermarkToTxt(content)
  }
}
