/**
 * SEO entry point: /srt-to-vtt
 * Reuses VideoToSubtitles. No duplicate logic.
 */
import VideoToSubtitles from '../VideoToSubtitles'

const FAQ = [
  { q: 'How do I get VTT from video?', a: 'Upload your video, choose VTT as the format, and click Generate. You get a timed VTT file for web players.' },
  { q: 'Can I convert SRT to VTT?', a: 'Yes. After generating SRT, use the Convert format section on the same page to get VTT or plain text.' },
  { q: 'Is this free?', a: 'Yes. Free tier available. Paid plans unlock full export and multi-language.' },
]

export default function SrtToVttPage() {
  return (
    <VideoToSubtitles
      seoH1="SRT to VTT — Subtitle Format Conversion"
      seoIntro="Generate VTT from video or convert SRT to VTT. Upload a video for SRT/VTT, or use the convert step after generating. Free tier available."
      faq={FAQ}
    />
  )
}
