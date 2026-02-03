/**
 * SEO entry point: /meeting-transcript
 * Reuses VideoToTranscript. No duplicate logic.
 */
import VideoToTranscript from '../VideoToTranscript'

const FAQ = [
  { q: 'Is this free?', a: 'Yes. The free tier includes 60 minutes per month. No signup required to try.' },
  { q: 'Does this work for meetings?', a: 'Yes. Upload any meeting recording (MP4, MOV, etc.) and get a transcript. Use the Speakers branch to see who said what.' },
  { q: 'Do timestamps stay accurate?', a: 'Yes. The transcript preserves paragraph structure; the Chapters branch lets you jump by section.' },
]

export default function MeetingTranscriptPage() {
  return (
    <VideoToTranscript
      seoH1="Meeting Transcript — Turn Meetings into Text"
      seoIntro="Convert meeting recordings to text in seconds. Upload a video, get a transcript. Use Speakers and Summary branches for who said what and key points."
      faq={FAQ}
    />
  )
}
