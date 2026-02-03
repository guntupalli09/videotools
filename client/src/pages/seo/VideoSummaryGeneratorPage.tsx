/**
 * SEO entry point: /video-summary-generator
 * Reuses VideoToTranscript. No duplicate logic.
 */
import VideoToTranscript from '../VideoToTranscript'

const FAQ = [
  { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month.' },
  { q: 'What does the summary include?', a: 'The Summary branch extracts decisions, action items, and key points from the transcript using simple pattern matching.' },
  { q: 'Can I export the summary?', a: 'Yes. Use the Exports branch to download JSON, CSV, Markdown, or Notion-style export (paid for full download).' },
]

export default function VideoSummaryGeneratorPage() {
  return (
    <VideoToTranscript
      seoH1="Video Summary Generator — Decisions, Actions, Key Points"
      seoIntro="Extract structured summaries from video: decisions, action items, key points. Upload, transcribe, then open the Summary branch."
      faq={FAQ}
    />
  )
}
