/**
 * SEO entry point: /subtitle-validation
 * Reuses FixSubtitles. No duplicate logic.
 */
import FixSubtitles from '../FixSubtitles'

const FAQ = [
  { q: 'What does validation check?', a: 'Timing overlaps, line length, formatting. The tool reports issues and can fix them; you get a corrected SRT/VTT file.' },
  { q: 'Is this free?', a: 'Yes. Upload SRT or VTT, get validation and a corrected file. Free.' },
  { q: 'Can I edit subtitles after?', a: 'Yes. Paid plans unlock in-app editing; you can also download and edit the file elsewhere.' },
]

export default function SubtitleValidationPage() {
  return (
    <FixSubtitles
      seoH1="Subtitle Validation — Check Timing and Format"
      seoIntro="Validate and fix SRT/VTT files: timing, line length, formatting. Upload subtitles, get a corrected file. Free."
      faq={FAQ}
    />
  )
}
