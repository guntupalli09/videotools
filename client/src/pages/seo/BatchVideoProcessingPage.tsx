/**
 * SEO entry point: /batch-video-processing
 * Reuses BatchProcess. No duplicate logic.
 */
import BatchProcess from '../BatchProcess'

const FAQ = [
  { q: 'Is batch processing free?', a: 'Batch is available on Pro and Agency plans. Free and Basic plans use single-file tools.' },
  { q: 'What do I get?', a: 'Upload multiple videos; you receive one ZIP of subtitle files (SRT).' },
  { q: 'Can I choose language?', a: 'Yes. You set the language when starting the batch; multi-language is available on higher plans.' },
]

export default function BatchVideoProcessingPage() {
  return (
    <BatchProcess
      seoH1="Batch Video Processing — Multiple Videos at Once"
      seoIntro="Process multiple videos in one batch. Upload many videos, get one ZIP of subtitle files. Pro and Agency plans."
      faq={FAQ}
    />
  )
}
