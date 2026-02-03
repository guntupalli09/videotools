/**
 * SEO entry point: /subtitle-language-checker
 * Reuses TranslateSubtitles. No duplicate logic.
 */
import TranslateSubtitles from '../TranslateSubtitles'

const FAQ = [
  { q: 'What does the checker do?', a: 'You upload SRT/VTT and choose a target language. The tool translates the captions to that language so you can check or use them.' },
  { q: 'Is this free?', a: 'Yes. Free tier available. Paid plans unlock more output options.' },
  { q: 'Can I keep the original file?', a: 'Yes. You download the translated version; your original file is not modified.' },
]

export default function SubtitleLanguageCheckerPage() {
  return (
    <TranslateSubtitles
      seoH1="Subtitle Language Checker — Detect and Translate"
      seoIntro="Check subtitle language and translate to another. Upload SRT/VTT, choose target language, download. Free tier available."
      faq={FAQ}
    />
  )
}
