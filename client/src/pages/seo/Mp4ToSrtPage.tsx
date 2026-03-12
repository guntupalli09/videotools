/**
 * SEO entry point: /mp4-to-srt
 * Reuses the same tool as /video-to-subtitles. Do NOT duplicate upload, polling, or API logic here.
 */
import VideoToSubtitles from '../VideoToSubtitles'

const FAQ = [
  {
    q: 'How do I get SRT from MP4?',
    a: 'Upload your MP4 file, choose SRT as the format, and click Generate. You get a timed SRT file ready for YouTube or other platforms.',
  },
  {
    q: 'Can I get VTT instead of SRT?',
    a: 'Yes. The tool supports both SRT (recommended for YouTube) and VTT (for web). Select your preferred format before processing.',
  },
  {
    q: 'Does it support multiple languages?',
    a: 'Yes. You can set a spoken language or use auto-detect. Paid plans support multiple output languages in one go.',
  },
]

export default function Mp4ToSrtPage() {
  return (
    <VideoToSubtitles
      seoH1="MP4 to SRT Online"
      seoIntro="Generate SRT subtitles from MP4 video. Upload your file, pick SRT or VTT, and download timed captions. Sign up for free to try."
      faq={FAQ}
    />
  )
}
