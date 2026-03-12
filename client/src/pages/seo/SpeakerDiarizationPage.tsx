/**
 * SEO entry point: /speaker-diarization
 * Reuses VideoToTranscript. No duplicate logic.
 */
import VideoToTranscript from '../VideoToTranscript'

const FAQ = [
  { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
  { q: 'How are speakers labeled?', a: 'After transcribing, open the Speakers branch. Paragraphs are grouped and labeled (Speaker 1, 2, etc.) from the transcript structure.' },
  { q: 'Do timestamps stay accurate?', a: 'Yes. The transcript and all branches use the same underlying text; you can jump from Chapters or Keywords to the transcript.' },
]

export default function SpeakerDiarizationPage() {
  return (
    <VideoToTranscript
      seoH1="Speaker-Separated Video Transcripts — Instantly Online"
      seoIntro="Get video transcripts with speaker-style grouping. Transcribe, then open the Speakers branch and optionally view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian."
      faq={FAQ}
    />
  )
}
