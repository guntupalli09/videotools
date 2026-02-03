/**
 * SEO entry point: /multilingual-subtitles
 * Reuses TranslateSubtitles. No duplicate logic.
 */
import TranslateSubtitles from '../TranslateSubtitles'

const FAQ = [
  { q: 'Can I get multiple languages from one file?', a: 'Yes. Upload once and translate to different languages; each download is one target language. Paid plans support multiple languages in one flow.' },
  { q: 'Is this free?', a: 'Yes. Free tier available. Upgrade for more minutes and multi-language features.' },
  { q: 'Do timestamps stay accurate?', a: 'Yes. Translation only changes text; timestamps are preserved.' },
]

export default function MultilingualSubtitlesPage() {
  return (
    <TranslateSubtitles
      seoH1="Multilingual Subtitles — Multiple Languages from One File"
      seoIntro="Get subtitles in multiple languages. Translate SRT/VTT to Arabic, Hindi, Spanish, and more. One upload, many languages."
      faq={FAQ}
    />
  )
}
