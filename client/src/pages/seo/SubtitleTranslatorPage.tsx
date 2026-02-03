/**
 * SEO entry point: /subtitle-translator
 * Reuses TranslateSubtitles. No duplicate logic.
 */
import TranslateSubtitles from '../TranslateSubtitles'

const FAQ = [
  { q: 'What languages are supported?', a: '50+ languages including Arabic, Hindi, Spanish, French, German, Chinese, Japanese. Pick target language when translating.' },
  { q: 'Do timestamps stay intact?', a: 'Yes. Only the text is translated; start and end times are unchanged.' },
  { q: 'Is this free?', a: 'Yes. Free tier available. Paid plans unlock more output formats and higher limits.' },
]

export default function SubtitleTranslatorPage() {
  return (
    <TranslateSubtitles
      seoH1="Subtitle Translator — SRT/VTT to Any Language"
      seoIntro="Translate SRT or VTT subtitles to 50+ languages. Upload, pick target language, download. Timestamps stay intact."
      faq={FAQ}
    />
  )
}
