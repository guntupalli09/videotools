/**
 * Client-side SRT/VTT export from segments. No server round-trip.
 */
export interface Segment {
  start: number
  end: number
  text: string
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

export function segmentsToSrt(segments: Segment[]): string {
  return segments
    .map((seg, i) => {
      const start = formatSrtTime(seg.start)
      const end = formatSrtTime(seg.end)
      return `${i + 1}\n${start} --> ${end}\n${seg.text.trim() || ' '}\n`
    })
    .join('\n')
}

export function segmentsToVtt(segments: Segment[]): string {
  const header = 'WEBVTT\n\n'
  const body = segments
    .map((seg) => {
      const start = formatVttTime(seg.start)
      const end = formatVttTime(seg.end)
      return `${start} --> ${end}\n${seg.text.trim() || ' '}\n`
    })
    .join('\n')
  return header + body
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
