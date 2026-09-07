import { describe, it, expect } from 'vitest'
import {
  applyWatermark,
  applyWatermarkToSrt,
  applyWatermarkToVtt,
  applyWatermarkToJson,
  applyWatermarkToCsv,
  applyWatermarkToTxt,
  WATERMARK_LINE1,
  WATERMARK_LINE2,
} from '../src/utils/watermark'

describe('watermark utils', () => {
  it('prepends valid SRT cue starting at index 1 and renumbers body', () => {
    const out = applyWatermarkToSrt('1\n00:00:01,000 --> 00:00:02,000\nHello\n')
    expect(out.startsWith('1\n00:00:00,000 --> 00:00:08,000')).toBe(true)
    expect(out).toContain(WATERMARK_LINE1)
    expect(out).toContain('2\n00:00:01,000')
    expect(out).toContain(WATERMARK_LINE2)
  })

  it('inserts VTT cue after WEBVTT header and trailing cue', () => {
    const out = applyWatermarkToVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n')
    expect(out).toContain('WEBVTT')
    expect(out).toContain('00:00:00.000 --> 00:00:08.000')
    expect(out).toContain(WATERMARK_LINE2)
  })

  it('adds _watermark and wraps fullTranscript in JSON', () => {
    const out = applyWatermarkToJson('{"fullTranscript":"hi"}')
    const parsed = JSON.parse(out) as {
      _watermark?: string
      _watermark_locked?: boolean
      fullTranscript?: string
    }
    expect(parsed._watermark).toContain('VideoText')
    expect(parsed._watermark_locked).toBe(true)
    expect(parsed.fullTranscript).toContain(WATERMARK_LINE2)
    expect(parsed.fullTranscript).toContain('hi')
  })

  it('wraps JSON arrays (Notion blocks) with watermark metadata', () => {
    const out = applyWatermarkToJson('[{"type":"paragraph"}]')
    const parsed = JSON.parse(out) as { _watermark?: string; blocks?: unknown[] }
    expect(parsed._watermark).toBeTruthy()
    expect(parsed.blocks).toHaveLength(1)
  })

  it('adds CSV comment header and upgrade notice', () => {
    const out = applyWatermarkToCsv('col1,col2\na,b\n')
    expect(out.startsWith('# ')).toBe(true)
    expect(out).toContain('upgrade to Pro')
    expect(out).toContain('col1,col2')
  })

  it('embeds multiple TXT watermark blocks for long content', () => {
    const long = 'paragraph\n\n'.repeat(200)
    const out = applyWatermarkToTxt(long)
    const count = (out.match(new RegExp(WATERMARK_LINE1, 'g')) || []).length
    expect(count).toBeGreaterThanOrEqual(2)
  })

  it('re-applies watermark if layer was stripped (anti-bypass)', () => {
    const stripped = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n'
    const out = applyWatermark(stripped, '.vtt')
    expect(out).toContain(WATERMARK_LINE1)
    expect(out).toContain(WATERMARK_LINE2)
  })
})
