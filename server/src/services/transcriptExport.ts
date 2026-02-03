import path from 'path'
import fs from 'fs'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import PDFDocument from 'pdfkit'

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

/**
 * Export transcript as JSON (segments + full text).
 */
export function exportTranscriptJson(
  fullText: string,
  segments: TranscriptSegment[],
  outputPath: string
): void {
  const data = {
    text: fullText,
    segments: segments.map((s) => ({ start: s.start, end: s.end, text: s.text })),
  }
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Export transcript as DOCX.
 */
export async function exportTranscriptDocx(
  fullText: string,
  outputPath: string
): Promise<void> {
  const paragraphs = fullText
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => new Paragraph({ children: [new TextRun(p.trim())] }))
  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun(fullText || '(No content)')] }))
  }
  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  })
  const buf = await Packer.toBuffer(doc)
  fs.writeFileSync(outputPath, buf)
}

/**
 * Export transcript as PDF.
 */
export function exportTranscriptPdf(
  fullText: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const stream = fs.createWriteStream(outputPath)
    doc.pipe(stream)
    doc.fontSize(11)
    const lines = fullText.split(/\n/).filter((l) => l.trim())
    if (lines.length === 0) doc.text('(No content)', { continued: false })
    else lines.forEach((line, i) => doc.text(line, { continued: i < lines.length - 1 }))
    doc.end()
    stream.on('finish', () => resolve())
    stream.on('error', reject)
    doc.on('error', reject)
  })
}
