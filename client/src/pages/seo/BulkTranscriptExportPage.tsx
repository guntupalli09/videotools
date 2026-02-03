/**
 * SEO entry point: /bulk-transcript-export
 * Reuses BatchProcess. No duplicate logic.
 */
import BatchProcess from '../BatchProcess'

const FAQ = [
  { q: 'What is bulk transcript export?', a: 'Upload multiple videos and get transcript/subtitle output for all in one ZIP. Same as Batch Processing.' },
  { q: 'Is this free?', a: 'Bulk/batch is on Pro and Agency plans.' },
  { q: 'What do I get in the ZIP?', a: 'One SRT (or equivalent) per video. You can use each file as transcript or captions.' },
]

export default function BulkTranscriptExportPage() {
  return (
    <BatchProcess
      seoH1="Bulk Transcript Export — Text for Many Videos"
      seoIntro="Get transcripts for many videos in one batch. Upload multiple videos, receive one ZIP. Pro and Agency plans."
      faq={FAQ}
    />
  )
}
