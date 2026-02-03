/**
 * SEO entry point: /subtitle-timing-fixer
 * Reuses FixSubtitles. No duplicate logic.
 */
import FixSubtitles from '../FixSubtitles'

const FAQ = [
  { q: 'What does the fixer do?', a: 'It fixes overlapping timestamps, long lines, and gaps in SRT/VTT files so they meet platform and readability rules.' },
  { q: 'Is this free?', a: 'Yes. Upload your subtitle file, get a corrected file. Free.' },
  { q: 'Do I need to upload video?', a: 'No. You upload only the SRT or VTT file. The tool analyzes and corrects timing and format.' },
]

export default function SubtitleTimingFixerPage() {
  return (
    <FixSubtitles
      seoH1="Subtitle Timing Fixer — Fix Overlaps and Gaps"
      seoIntro="Fix overlapping timestamps and gaps in SRT/VTT files. Upload your subtitle file, get corrected timing. Free."
      faq={FAQ}
    />
  )
}
