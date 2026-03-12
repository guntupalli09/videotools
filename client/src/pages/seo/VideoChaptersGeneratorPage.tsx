/**
 * SEO entry point: /video-chapters-generator
 * Reuses VideoToTranscript. No duplicate logic.
 */
import VideoToTranscript from '../VideoToTranscript'

const FAQ = [
  { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st).' },
  { q: 'How are chapters created?', a: 'Chapters are derived from transcript paragraphs. Open the Chapters branch after transcribing to see section headings and jump to that part of the transcript.' },
  { q: 'Can I use these on YouTube?', a: 'Chapters are for navigation in our tool. For YouTube chapters, use the timestamps in your video description; our transcript helps you find where sections start.' },
]

export default function VideoChaptersGeneratorPage() {
  return (
    <VideoToTranscript
      seoH1="Video Chapters Generator — Section Headings from Transcript"
      seoIntro="Generate chapter-style sections from your video transcript. Upload, transcribe, use the Chapters branch to jump by section, and view or translate the transcript in 6 languages."
      faq={FAQ}
    />
  )
}
