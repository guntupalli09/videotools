import { describe, it, expect } from 'vitest'
import {
  applyWatermark,
  applyWatermarkToSrt,
  applyWatermarkToVtt,
  applyWatermarkToJson,
  applyWatermarkToCsv,
  WATERMARK_LINE1,
} from '../src/utils/watermark'

describe('watermark utils', () => {
  it('prepends valid SRT cue starting at index 1', () => {
    const out = applyWatermarkToSrt('2\n00:00:01,000 --> 00:00:02,000\nHello\n')
    expect(out.startsWith('1\n00:00:00,000 --> 00:00:08,000')).toBe(true)
    expect(out).toContain(WATERMARK_LINE1)
    expect(out).toContain('2\n00:00:01,000')
  })

  it('inserts VTT cue after WEBVTT header', () => {
    const out = applyWatermarkToVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n')
    expect(out).toContain('WEBVTT')
    expect(out).toContain('00:00:00.000 --> 00:00:08.000')
    expect(out).toContain(WATERMARK_LINE1)
  })

  it('adds _watermark to JSON objects', () => {
    const out = applyWatermarkToJson('{"fullTranscript":"hi"}')
    const parsed = JSON.parse(out) as { _watermark?: string; fullTranscript?: string }
    expect(parsed._watermark).toContain('VideoText')
    expect(parsed.fullTranscript).toBe('hi')
  })

  it('wraps JSON arrays (Notion blocks) with watermark metadata', () => {
    const out = applyWatermarkToJson('[{"type":"paragraph"}]')
    const parsed = JSON.parse(out) as { _watermark?: string; blocks?: unknown[] }
    expect(parsed._watermark).toBeTruthy()
    expect(parsed.blocks).toHaveLength(1)
  })

  it('adds CSV comment header without breaking rows', () => {
    const out = applyWatermarkToCsv('col1,col2\na,b\n')
    expect(out.startsWith('# ')).toBe(true)
    expect(out).toContain('col1,col2')
  })

  it('routes by extension', () => {
    expect(applyWatermark('WEBVTT\n\n', '.vtt')).toContain('WEBVTT')
    expect(applyWatermark('hello', '.txt')).toContain('hello')
  })
})
