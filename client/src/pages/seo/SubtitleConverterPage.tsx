/**
 * SEO entry point: /subtitle-converter
 * Reuses VideoToSubtitles. No duplicate logic.
 */
import VideoToSubtitles from '../VideoToSubtitles'

const FAQ = [
  { q: 'What formats are supported?', a: 'Generate SRT or VTT from video. After processing, you can convert to SRT, VTT, or plain text (TXT).' },
  { q: 'Is this free?', a: 'Yes. Free tier available. Conversion preview is free; full download may require upgrade.' },
  { q: 'Do timestamps stay accurate?', a: 'Yes. Conversion only changes format; timestamps are preserved.' },
]

export default function SubtitleConverterPage() {
  return (
    <VideoToSubtitles
      seoH1="Subtitle Converter — SRT, VTT, TXT"
      seoIntro="Convert subtitle formats: SRT, VTT, plain text. Generate from video or convert after download. One tool, multiple formats."
      faq={FAQ}
    />
  )
}
