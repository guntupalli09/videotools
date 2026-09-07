import {
  SeoAlternativeShell,
  SeoAlternativeHero,
  SeoCompareTable,
  SeoDecisionSection,
  SeoTwoColumnCards,
  SeoRelatedLinks,
  SeoFinalCta,
  SeoBody,
} from '../../components/seo/SeoAlternativeLayout'

const COMPARE_ROWS = [
  { label: 'Primary workflow', videotext: 'Upload recorded files after meeting', competitor: 'Live meeting bot joins calls' },
  { label: 'Works without bot/calendar access', videotext: true, competitor: false },
  { label: 'Best for post-recording cleanup', videotext: true, competitor: 'Limited' },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: 'Meeting-notes first' },
  { label: 'Structured output (summary + chapters)', videotext: true, competitor: true },
  { label: 'YouTube URL transcription', videotext: true, competitor: false },
  { label: 'Live meeting auto-join', videotext: false, competitor: true },
]

export default function FirefliesAlternativePage() {
  return (
    <SeoAlternativeShell>
      <SeoAlternativeHero
        title="Fireflies alternative for teams that want post-meeting outputs without a bot in the call"
        description="This page is for teams deciding between a bot-first meeting assistant and a file-first transcription workflow after the meeting. Fireflies is strong for in-call capture. VideoText is stronger when your priority is what happens next: clean transcript outputs, summaries, chapters, and export files from recordings."
        ctaHref="/video-to-transcript?source=fireflies-alternative"
        ctaLabel="Compare with your next recorded meeting"
      />

      <SeoBody>
        <SeoDecisionSection
          title="Switch criteria: Fireflies vs VideoText"
          chooseUsTitle="Stay with Fireflies if you need:"
          chooseUsPoints={[
            'In-call meeting assistant behavior and live capture workflow.',
            'A notes workflow centered on bot participation during meetings.',
            'Search and review primarily tied to live-captured sessions.',
          ]}
          chooseThemTitle="Switch to VideoText if you need:"
          chooseThemPoints={[
            'Post-meeting upload flow without bot attendance.',
            'Transcript + summary + chapters + subtitle export outputs in one pass.',
            'Clean handoff assets from Zoom/Meet/Teams recordings.',
          ]}
        />

        <section>
          <h2 className="mb-4 text-2xl font-medium text-gray-900 dark:text-white">
            Who Fireflies is good for vs who should switch
          </h2>
          <p className="leading-relaxed text-gray-600 dark:text-gray-300">
            Keep Fireflies if your priority is live call capture with an auto-joining meeting bot. Switch to VideoText
            if your workflow is mostly post-recording: Zoom/Meet/Teams downloads, webinar replays, interviews, and
            content repurposing where export quality matters more than live attendance.
          </p>
        </section>

        <SeoTwoColumnCards
          title="Bot-first meeting notes vs file-first deliverables"
          leftTitle="Fireflies path"
          leftBody="Optimized for meeting capture during the call. Best when your process is tightly tied to live assistant tooling."
          rightTitle="VideoText path"
          rightBody="Optimized for after-call production: upload recording, get transcript assets you can share, subtitle, or repurpose immediately."
        />

        <section>
          <h2 className="mb-6 text-2xl font-medium text-gray-900 dark:text-white">VideoText vs Fireflies</h2>
          <SeoCompareTable competitorLabel="Fireflies" rows={COMPARE_ROWS} />
        </section>

        <SeoRelatedLinks
          title="Related alternatives"
          links={[
            { label: 'Otter alternative', to: '/otter-alternative' },
            { label: 'Notta alternative', to: '/notta-alternative' },
            { label: 'Meeting transcription tool', to: '/meeting-transcription-tool' },
            { label: 'Meeting recording to transcript', to: '/meeting-recording-to-transcript' },
            { label: 'Google Meet transcript', to: '/google-meet-transcript' },
            { label: 'Zoom meeting transcript', to: '/zoom-meeting-transcript' },
            { label: 'Transcription benchmark', to: '/transcription-benchmark' },
            {
              label: 'Best transcription software 2026',
              to: 'https://blog.videotext.io/best-transcription-software-2026',
              external: true,
            },
          ]}
        />

        <SeoFinalCta
          title="Try a no-bot workflow on your next meeting recording"
          description="Upload one completed call recording and compare how quickly you get usable transcript, summary, chapter, and export outputs."
          href="/video-to-transcript?source=fireflies-alternative"
          buttonLabel="Start the meeting-file comparison"
        />
      </SeoBody>
    </SeoAlternativeShell>
  )
}
