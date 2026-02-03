/**
 * SEO entry point: /subtitle-grammar-fixer
 * Reuses FixSubtitles. No duplicate logic.
 */
import FixSubtitles from '../FixSubtitles'

const FAQ = [
  { q: 'What does the grammar fixer do?', a: 'It corrects timing and formatting in SRT/VTT files. Enable grammar-fix when processing to improve caption text and structure.' },
  { q: 'Is this free?', a: 'Yes. Upload SRT or VTT, get a corrected file. Free.' },
  { q: 'Do timestamps change?', a: 'The tool can fix overlapping or invalid timestamps; otherwise they stay the same.' },
]

export default function SubtitleGrammarFixerPage() {
  return (
    <FixSubtitles
      seoH1="Subtitle Grammar Fixer — Auto-Correct Caption Text"
      seoIntro="Fix grammar and formatting in SRT/VTT files. Upload subtitles, get corrected text and timing. Free."
      faq={FAQ}
    />
  )
}
