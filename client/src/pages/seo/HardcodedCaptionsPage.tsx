/**
 * SEO entry point: /hardcoded-captions
 * Reuses BurnSubtitles. No duplicate logic.
 */
import BurnSubtitles from '../BurnSubtitles'

const FAQ = [
  { q: 'What are hardcoded captions?', a: 'Captions burned into the video so they always show. Upload video + SRT/VTT and get one video with captions baked in.' },
  { q: 'Is this free?', a: 'Yes. Free tier available. Upgrade for more minutes.' },
  { q: 'Can I choose font size and position?', a: 'Yes. You can set font size (small/medium/large), position (bottom/middle), and background opacity before processing.' },
]

export default function HardcodedCaptionsPage() {
  return (
    <BurnSubtitles
      seoH1="Hardcoded Captions — Burn Subtitles into Video"
      seoIntro="Burn SRT or VTT subtitles into your video. Upload video and subtitle file, get one video with hardcoded captions. Free tier available."
      faq={FAQ}
    />
  )
}
