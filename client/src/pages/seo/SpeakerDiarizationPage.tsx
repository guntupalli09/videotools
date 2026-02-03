/**
 * SEO entry point: /speaker-diarization
 * Reuses VideoToTranscript. No duplicate logic.
 */
import VideoToTranscript from '../VideoToTranscript'

const FAQ = [
  { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month. No signup required.' },
  { q: 'How are speakers labeled?', a: 'After transcribing, open the Speakers branch. Paragraphs are grouped and labeled (Speaker 1, 2, etc.) from the transcript structure.' },
  { q: 'Do timestamps stay accurate?', a: 'Yes. The transcript and all branches use the same underlying text; you can jump from Chapters or Keywords to the transcript.' },
]

export default function SpeakerDiarizationPage() {
  return (
    <VideoToTranscript
      seoH1="Speaker-Separated Video Transcripts — Instantly Online"
      seoIntro="Get video transcripts with speaker-style grouping. Upload any video, transcribe, then open the Speakers branch to see who said what."
      faq={FAQ}
    />
  )
}
