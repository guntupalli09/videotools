/**
 * SEO entry point: /keyword-indexed-transcript
 * Reuses VideoToTranscript. No duplicate logic.
 */
import VideoToTranscript from '../VideoToTranscript'

const FAQ = [
  { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month.' },
  { q: 'What are keywords?', a: 'Repeated terms in the transcript. The Keywords branch shows them and links each to the transcript section where it first appears.' },
  { q: 'Can I export the index?', a: 'Yes. The Exports branch offers JSON, CSV, Markdown, and Notion-style export (paid for full download).' },
]

export default function KeywordIndexedTranscriptPage() {
  return (
    <VideoToTranscript
      seoH1="Keyword-Indexed Transcript — Topic Index from Video"
      seoIntro="Get a keyword index from your video transcript. Upload, transcribe, then open the Keywords branch to see repeated terms and jump to sections."
      faq={FAQ}
    />
  )
}
