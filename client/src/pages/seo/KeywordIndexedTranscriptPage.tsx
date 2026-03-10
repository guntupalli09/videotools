/**
 * SEO entry point: /keyword-indexed-transcript
 * Reuses VideoToTranscript. No duplicate logic.
 */
import VideoToTranscript from '../VideoToTranscript'

const FAQ = [
  { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st).' },
  { q: 'What are keywords?', a: 'Repeated terms in the transcript. The Keywords branch shows them and links each to the transcript section where it first appears.' },
  { q: 'Can I export the index?', a: 'Yes. The Exports branch offers JSON, CSV, Markdown, and Notion-style export (paid for full download).' },
]

export default function KeywordIndexedTranscriptPage() {
  return (
    <VideoToTranscript
      seoH1="Keyword-Indexed Transcript — Topic Index from Video"
      seoIntro="Get a keyword index from your video transcript. Upload, transcribe, open the Keywords branch, and view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian."
      faq={FAQ}
    />
  )
}
