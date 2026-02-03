/**
 * SEO entry point: /reduce-video-size
 * Reuses CompressVideo. No duplicate logic.
 */
import CompressVideo from '../CompressVideo'

const FAQ = [
  { q: 'Is this free?', a: 'Yes. Free tier available.' },
  { q: 'What compression levels are there?', a: 'Light, medium, and heavy. Heavier compression gives smaller files; we keep quality suitable for web and sharing.' },
  { q: 'What formats are supported?', a: 'MP4, MOV, AVI, WebM, MKV. Output is typically MP4.' },
]

export default function ReduceVideoSizePage() {
  return (
    <CompressVideo
      seoH1="Reduce Video Size — Compress Without Losing Quality"
      seoIntro="Reduce video file size with adjustable compression. Upload, choose level, download smaller file. Free tier available."
      faq={FAQ}
    />
  )
}
