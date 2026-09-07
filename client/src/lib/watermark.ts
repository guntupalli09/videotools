/** Keep in sync with server/src/utils/watermark.ts */

export const WATERMARK_LINE1 = 'Fast AI transcription by VideoText.io — Free Plan'
export const WATERMARK_LINE2 = 'Upgrade to Pro at videotext.io/pricing to remove this watermark'
export const WATERMARK_SEPARATOR = '=================================================================================='
export const WATERMARK_UPGRADE_URL = 'videotext.io/pricing'

/** PDF/DOCX footer — full upgrade message. */
export const WATERMARK_DOC_FOOTER = WATERMARK_LINE2

export const WATERMARK_DOC_HEADER = WATERMARK_LINE1

export const WATERMARK_CLIPBOARD_SUFFIX = `\n\n---\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n`

const SRT_WATERMARK_CUE = [
  '1',
  '00:00:00,000 --> 00:00:08,000',
  WATERMARK_LINE1,
  WATERMARK_LINE2,
  '',
  '',
].join('\n')

const VTT_WATERMARK_CUE_LINES = ['', '00:00:00.000 --> 00:00:08.000', WATERMARK_LINE1, WATERMARK_LINE2, '']

function shiftSrtCueNumbers(content: string, offset: number): string {
  if (offset <= 0) return content
  const lines = content.split('\n')
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()
    const next = lines[i + 1]?.trim() ?? ''
    if (/^\d+$/.test(trimmed) && next.includes('-->')) {
      out.push(String(parseInt(trimmed, 10) + offset))
    } else {
      out.push(line)
    }
  }
  return out.join('\n')
}

function parseTimeToMs(ts: string): number {
  const m = ts.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/)
  if (!m) return 0
  return (
    parseInt(m[1]!, 10) * 3600000 +
    parseInt(m[2]!, 10) * 60000 +
    parseInt(m[3]!, 10) * 1000 +
    parseInt(m[4]!, 10)
  )
}

function formatSrtTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const msPart = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(msPart).padStart(3, '0')}`
}

function maxSrtEndMs(content: string): number {
  let max = 8000
  const lines = content.split('\n')
  for (const line of lines) {
    const m = line.match(/-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/)
    if (m?.[1]) max = Math.max(max, parseTimeToMs(m[1]))
  }
  return max
}

function countSrtCues(content: string): number {
  let count = 0
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]?.trim() ?? ''
    const next = lines[i + 1]?.trim() ?? ''
    if (/^\d+$/.test(trimmed) && next.includes('-->')) count++
  }
  return count
}

function trailingSrtWatermarkCue(content: string, startIndex: number): string {
  const endMs = maxSrtEndMs(content)
  const start = formatSrtTime(endMs + 500)
  const end = formatSrtTime(endMs + 8500)
  return [
    String(startIndex),
    `${start} --> ${end}`,
    WATERMARK_LINE1,
    WATERMARK_LINE2,
    '',
  ].join('\n')
}

export function applyWatermarkToSrt(content: string): string {
  const shifted = shiftSrtCueNumbers(content.trimStart(), 1)
  const trailing = trailingSrtWatermarkCue(shifted, countSrtCues(shifted) + 2)
  return `${SRT_WATERMARK_CUE}${shifted}\n${trailing}`
}

export function applyWatermarkToVtt(content: string): string {
  const lines = content.split('\n')
  const headerIdx = lines.findIndex((l) => l.startsWith('WEBVTT'))
  if (headerIdx >= 0) {
    lines.splice(headerIdx + 1, 0, ...VTT_WATERMARK_CUE_LINES)
  } else {
    lines.unshift('WEBVTT', ...VTT_WATERMARK_CUE_LINES)
  }
  const body = lines.join('\n').trimEnd()
  const endMs = maxSrtEndMs(body.replace(/\./g, ','))
  const start = formatSrtTime(endMs + 500).replace(',', '.')
  const end = formatSrtTime(endMs + 8500).replace(',', '.')
  return `${body}\n\n${start} --> ${end}\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n`
}

function embedTxtWatermarkBlocks(content: string): string {
  const header = `${WATERMARK_SEPARATOR}\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n${WATERMARK_SEPARATOR}\n\n`
  const footer = `\n\n${WATERMARK_SEPARATOR}\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n${WATERMARK_SEPARATOR}\n`
  if (content.length < 2500) return header + content + footer
  const mid = Math.floor(content.length / 2)
  const breakAt = content.indexOf('\n\n', mid)
  const split = breakAt > 0 ? breakAt : mid
  const midBlock = `\n\n${WATERMARK_SEPARATOR}\n${WATERMARK_LINE1}\n${WATERMARK_LINE2}\n${WATERMARK_SEPARATOR}\n\n`
  return header + content.slice(0, split) + midBlock + content.slice(split) + footer
}

export function applyWatermarkToTxt(content: string): string {
  return embedTxtWatermarkBlocks(content)
}

export function applyWatermarkToCsv(content: string): string {
  const header = `# ${WATERMARK_LINE1}\n# ${WATERMARK_LINE2}\n# DO NOT EDIT — upgrade to Pro for clean exports\n`
  const footer = `\n# ${WATERMARK_LINE1}\n# ${WATERMARK_LINE2}\n`
  return header + content + footer
}

export function applyWatermarkToJson(content: string): string {
  try {
    const obj = JSON.parse(content) as Record<string, unknown>
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      const notice = `[${WATERMARK_LINE1}] ${WATERMARK_LINE2}`
      const full = typeof obj.fullTranscript === 'string' ? obj.fullTranscript : null
      return JSON.stringify(
        {
          _watermark: `${WATERMARK_LINE1} | ${WATERMARK_LINE2}`,
          _upgrade: WATERMARK_UPGRADE_URL,
          _watermark_locked: true,
          ...obj,
          ...(full != null
            ? { fullTranscript: `${notice}\n\n${full}\n\n${notice}` }
            : {}),
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
          _watermark_locked: true,
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

/** ASS/SSA: comment header + opening dialogue cue with upgrade message. */
export function applyWatermarkToAss(content: string): string {
  const header = `; ${WATERMARK_LINE1}\n; ${WATERMARK_LINE2}\n`
  const cue = `Dialogue: 0,0:00:00.00,0:00:08.00,Default,,0,0,0,,${WATERMARK_LINE1}\\N${WATERMARK_LINE2}\n`
  const trimmed = content.trimStart()
  if (trimmed.startsWith('[Script Info]')) {
    const scriptEnd = trimmed.indexOf('\n\n', trimmed.indexOf('[Script Info]'))
    const insertAt = scriptEnd >= 0 ? scriptEnd + 2 : trimmed.indexOf('\n') + 1
    return trimmed.slice(0, insertAt) + header + trimmed.slice(insertAt) + '\n' + cue
  }
  return header + trimmed + '\n' + cue
}

export type WatermarkTextFormat = 'txt' | 'csv' | 'json' | 'notion' | 'srt' | 'vtt' | 'ass'

export function watermarkTextExport(content: string, format: WatermarkTextFormat): string {
  switch (format) {
    case 'srt':
      return applyWatermarkToSrt(content)
    case 'vtt':
      return applyWatermarkToVtt(content)
    case 'ass':
      return applyWatermarkToAss(content)
    case 'json':
    case 'notion':
      return applyWatermarkToJson(content)
    case 'csv':
      return applyWatermarkToCsv(content)
    default:
      return applyWatermarkToTxt(content)
  }
}

export function watermarkClipboardText(text: string): string {
  return applyWatermarkToTxt(text.trim())
}

/** Draw prominent diagonal + footer watermark on every PDF page (jsPDF). */
export function drawPdfFreePlanWatermark(doc: import('jspdf').jsPDF): void {
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220)
    doc.text('VideoText Free', pageW / 2, pageH / 2, { angle: 35, align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(140)
    doc.text(WATERMARK_LINE1, 15, pageH - 14)
    doc.text(WATERMARK_LINE2, 15, pageH - 9)
    doc.setTextColor(0)
  }
}

/** @deprecated Use watermarkTextExport or WATERMARK_DOC_FOOTER */
export const FREE_EXPORT_WATERMARK = WATERMARK_CLIPBOARD_SUFFIX
