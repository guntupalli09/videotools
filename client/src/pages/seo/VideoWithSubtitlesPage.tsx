/**
 * SEO entry point: /video-with-subtitles
 * Reuses BurnSubtitles. No duplicate logic.
 */
import BurnSubtitles from '../BurnSubtitles'

const FAQ = [
  { q: 'How do I add subtitles to video?', a: 'Upload your video and an SRT or VTT file. We burn the captions into the video and you download one file with subtitles visible.' },
  { q: 'Is this free?', a: 'Yes. Free tier available. No signup required to try.' },
  { q: 'What video formats are supported?', a: 'MP4, MOV, AVI, WebM, MKV. Output is typically MP4.' },
]

export default function VideoWithSubtitlesPage() {
  return (
    <BurnSubtitles
      seoH1="Video with Subtitles — Add Captions to Video"
      seoIntro="Add subtitles to video permanently. Upload video and SRT/VTT, get a single video with captions baked in. No signup for free tier."
      faq={FAQ}
    />
  )
}
