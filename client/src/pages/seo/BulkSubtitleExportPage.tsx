/**
 * SEO entry point: /bulk-subtitle-export
 * Reuses BatchProcess. No duplicate logic.
 */
import BatchProcess from '../BatchProcess'

const FAQ = [
  { q: 'What is bulk subtitle export?', a: 'Upload multiple videos and get SRT subtitle files for all of them in one ZIP. Same as Batch Processing.' },
  { q: 'Is this free?', a: 'Bulk/batch is on Pro and Agency plans. Free and Basic use single-file tools.' },
  { q: 'What format are the files?', a: 'SRT. One SRT per video in the ZIP.' },
]

export default function BulkSubtitleExportPage() {
  return (
    <BatchProcess
      seoH1="Bulk Subtitle Export — SRT for Many Videos"
      seoIntro="Export SRT subtitles for many videos in one go. Upload multiple videos, download one ZIP. Pro and Agency plans."
      faq={FAQ}
    />
  )
}
