/**
 * SEO entry point: /subtitle-line-break-fixer
 * Reuses FixSubtitles. No duplicate logic.
 */
import FixSubtitles from '../FixSubtitles'

const FAQ = [
  { q: 'What does the line break fixer do?', a: 'It fixes long lines and line breaks in SRT/VTT so captions fit platform limits and are easier to read.' },
  { q: 'Is this free?', a: 'Yes. Upload your subtitle file, get a corrected file. Free.' },
  { q: 'Can I edit after?', a: 'Yes. Paid plans unlock in-app editing; you can also download and edit the file elsewhere.' },
]

export default function SubtitleLineBreakFixerPage() {
  return (
    <FixSubtitles
      seoH1="Subtitle Line Break Fixer — Fix Long Lines and Wrapping"
      seoIntro="Fix long lines and line breaks in SRT/VTT for readability and platform limits. Upload, download corrected file. Free."
      faq={FAQ}
    />
  )
}
