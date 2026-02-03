/**
 * SEO entry point: /video-compressor
 * Reuses CompressVideo. No duplicate logic.
 */
import CompressVideo from '../CompressVideo'

const FAQ = [
  { q: 'Is this free?', a: 'Yes. Free tier available. No signup required.' },
  { q: 'How much can I reduce file size?', a: 'Light (about 30% smaller), medium (about 50%), or heavy (about 70%). You choose the level before processing.' },
  { q: 'Does quality drop?', a: 'Compression reduces file size; heavier compression may reduce quality. We keep it reasonable for web and sharing.' },
]

export default function VideoCompressorPage() {
  return (
    <CompressVideo
      seoH1="Video Compressor — Reduce File Size Online"
      seoIntro="Compress video online: light, medium, or heavy. Reduce file size for sharing and uploads. Free. No signup required."
      faq={FAQ}
    />
  )
}
