import { Link } from 'react-router-dom'

export default function SubtitleResources() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-widest mb-3">Reference Guide</p>
          <h1 className="text-4xl md:text-5xl font-display font-medium mb-4">Subtitle Resources & Standards</h1>
          <p className="text-lg text-gray-300 max-w-2xl">
            Subtitle format specs, timing standards, Netflix delivery rules, character limits, and reading speed benchmarks — everything in one place.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-16">

        {/* Formats */}
        <section id="formats">
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white mb-2">Subtitle Format Reference</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">The most widely used subtitle formats and their key characteristics.</p>

          <div className="space-y-6">
            {[
              {
                name: 'SRT — SubRip Text (.srt)',
                badge: 'Universal',
                badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
                desc: 'The most widely supported subtitle format in the world. Created in the early 2000s by SubRip software, SRT is plain text with a simple structure: a sequential cue number, a timestamp range in HH:MM:SS,mmm format (comma-separated milliseconds), and one or more lines of subtitle text.',
                structure: `1
00:00:01,500 --> 00:00:04,200
Welcome to the presentation.

2
00:00:05,000 --> 00:00:08,750
Today we'll cover subtitle formats.`,
                points: [
                  'Supported by YouTube, Netflix, Vimeo, Amazon, Plex, VLC',
                  'Compatible with Premiere Pro, DaVinci Resolve, Final Cut Pro',
                  'Milliseconds use a comma separator (,), not a period',
                  'Basic HTML tags (<i>, <b>, <u>) supported by some players',
                  'No native support for positioning, regions, or advanced styling',
                ],
              },
              {
                name: 'VTT — WebVTT (.vtt)',
                badge: 'Web standard',
                badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
                desc: 'WebVTT (Web Video Text Tracks) is the W3C standard for HTML5 video captions. It is required for the <track> element in HTML5 video players. VTT is similar to SRT but uses a period for milliseconds (00:00:01.500), starts with a WEBVTT header, supports cue identifiers (optional), and adds cue settings for positioning and alignment.',
                structure: `WEBVTT

00:00:01.500 --> 00:00:04.200
Welcome to the presentation.

intro
00:00:05.000 --> 00:00:08.750 align:center position:50%
Today we'll cover subtitle formats.`,
                points: [
                  'Required for HTML5 <track> elements in web video players',
                  'Supported by Video.js, Plyr, JW Player, Shaka Player',
                  'Milliseconds use a period separator (.), not a comma',
                  'File must begin with the literal text WEBVTT on the first line',
                  'Supports cue positioning, region definitions, and CSS styling via ::cue()',
                  'Cue identifiers are optional (unlike SRT\'s mandatory sequence numbers)',
                ],
              },
              {
                name: 'ASS / SSA — Advanced SubStation Alpha (.ass / .ssa)',
                badge: 'Advanced styling',
                badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
                desc: 'A format commonly used for anime fansubs and karaoke subtitles. ASS supports advanced per-character styling, positioning, animations, and multi-line karaoke effects. It is not supported by most streaming platforms but is widely used by media players like MPC-HC and mpv.',
                points: [
                  'Supports rich per-character styling (color, size, font, outline)',
                  'Used for anime fansubs and karaoke typesetting',
                  'Not accepted by Netflix, YouTube, or most streaming platforms',
                  'Supported by VLC, mpv, and desktop media players',
                ],
              },
              {
                name: 'TTML / DFXP (.ttml / .xml)',
                badge: 'Broadcast',
                badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
                desc: 'Timed Text Markup Language is an XML-based format used by broadcast workflows and streaming platforms for their internal delivery pipelines. Netflix requires TTML for certain localization workflows. DFXP (Distribution Format Exchange Profile) is a subset profile of TTML.',
                points: [
                  'XML-based, verbose but structured for broadcast pipelines',
                  'Used by Netflix localization delivery (IMSC-1 profile)',
                  'Supported by DALET, Pilat, and professional broadcast playout',
                  'Not typically used by individual creators',
                ],
              },
            ].map((fmt) => (
              <div key={fmt.name} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">{fmt.name}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fmt.badgeColor}`}>{fmt.badge}</span>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{fmt.desc}</p>
                  {fmt.structure && (
                    <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre">{fmt.structure}</pre>
                  )}
                  <ul className="space-y-1.5">
                    {fmt.points.map((p) => (
                      <li key={p} className="text-xs text-gray-500 dark:text-gray-400 flex gap-2">
                        <span className="text-blue-600 shrink-0">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Netflix Rules */}
        <section id="netflix-rules">
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white mb-2">Netflix Subtitle Delivery Requirements</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Netflix publishes detailed timed text style guides for each language. These are the core technical requirements that apply across most languages.</p>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Requirement', 'Spec', 'Notes'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { req: 'Maximum CPS', spec: '20 (English)', notes: '17 for most other languages. Measured per cue.' },
                  { req: 'Maximum characters per line', spec: '42', notes: 'Applies to each line individually, not the cue total.' },
                  { req: 'Maximum lines per cue', spec: '2', notes: 'Three-line cues are rejected at QC.' },
                  { req: 'Minimum cue duration', spec: '0.833s (5 frames)', notes: 'Very short cues fail frame-accurate QC checks.' },
                  { req: 'Maximum cue duration', spec: '7 seconds', notes: 'Longer cues are split into multiple subtitles.' },
                  { req: 'Minimum gap between cues', spec: '2 frames (0.083s at 24fps)', notes: 'Subtitles must not be continuous with no visual break.' },
                  { req: 'Font size', spec: 'Relative to screen', notes: 'Netflix renders at a standard size; do not hardcode pixel sizes.' },
                  { req: 'Line break preference', spec: 'Bottom-heavy', notes: 'Top line should be shorter than bottom line where possible.' },
                  { req: 'Preferred position', spec: 'Bottom center', notes: 'Do not obstruct lower-third graphics.' },
                  { req: 'Italics usage', spec: 'Speaker off-screen', notes: 'Use italics for voice-over, narration, and off-screen speakers.' },
                  { req: 'Ellipsis', spec: '… (U+2026)', notes: 'Use the Unicode ellipsis character, not three periods (...).' },
                  { req: 'Hearing impaired markers', spec: '[MUSIC] / [SOUND EFFECT]', notes: 'SDH tracks use square brackets for non-speech audio cues.' },
                ].map((row) => (
                  <tr key={row.req}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white text-xs">{row.req}</td>
                    <td className="px-4 py-3 font-mono text-blue-700 dark:text-blue-400 text-xs">{row.spec}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Source: Netflix Timed Text Style Guide. Requirements may vary by language — always verify against the current language-specific guide before delivery.</p>
        </section>

        {/* Platform comparison */}
        <section id="platform-standards">
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white mb-2">Subtitle Standards by Platform</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Key technical limits for the major streaming and video platforms.</p>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Platform', 'Format', 'Max CPS', 'Max chars/line', 'Max lines', 'Min gap'].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { platform: 'Netflix', fmt: 'TTML / SRT', cps: '20 (EN)', chars: '42', lines: '2', gap: '2 frames' },
                  { platform: 'YouTube', fmt: 'SRT / VTT', cps: 'None', chars: 'None', lines: '3', gap: 'None' },
                  { platform: 'Amazon Prime', fmt: 'TTML / SRT', cps: '17', chars: '42', lines: '2', gap: '2 frames' },
                  { platform: 'Apple TV+', fmt: 'TTML / SRT', cps: '17', chars: '40', lines: '2', gap: '2 frames' },
                  { platform: 'Disney+', fmt: 'IMSC-1 / SRT', cps: '17', chars: '42', lines: '2', gap: '2 frames' },
                  { platform: 'BBC iPlayer', fmt: 'EBU STL / VTT', cps: '17', chars: '37', lines: '2', gap: '2 frames' },
                  { platform: 'Vimeo', fmt: 'SRT / VTT', cps: 'None', chars: 'None', lines: '2', gap: 'None' },
                  { platform: 'LinkedIn', fmt: 'SRT', cps: 'None', chars: 'None', lines: '2', gap: 'None' },
                ].map((row) => (
                  <tr key={row.platform}>
                    <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white text-xs">{row.platform}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-600 dark:text-gray-400 text-xs">{row.fmt}</td>
                    <td className="px-3 py-2.5 font-mono text-blue-700 dark:text-blue-400 text-xs">{row.cps}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 text-xs">{row.chars}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{row.lines}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{row.gap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reading speed */}
        <section id="reading-speed">
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white mb-2">Subtitle Reading Speed Reference</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">Reading speed is measured in CPS (characters per second). Research shows that average adult viewers can comfortably read at 15–17 CPS. Professional subtitle editors target 17 CPS as a safe maximum for most audiences. Netflix uses 20 CPS for English because English has shorter average word lengths, resulting in a naturally faster reading pace per character.</p>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Comfortable reading', cps: '≤ 15 CPS', desc: 'Easy for all viewers including children and non-native speakers', color: 'border-green-200 dark:border-green-800' },
              { label: 'Professional target', cps: '15–17 CPS', desc: 'EBU R37 and BBC guidelines. Safe for broadcast delivery', color: 'border-blue-200 dark:border-blue-800' },
              { label: 'Netflix English limit', cps: '≤ 20 CPS', desc: 'Maximum for Netflix EN. Exceeding this fails QC', color: 'border-blue-200 dark:border-blue-800' },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl border-2 ${item.color} p-4`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                <p className="text-xl font-bold font-mono text-gray-900 dark:text-white mb-1">{item.cps}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">How to calculate CPS manually</p>
            <p>CPS = (number of characters in the cue, including spaces) ÷ (duration of the cue in seconds)</p>
            <p className="mt-2">Example: A cue with the text "Welcome to the documentary." (28 characters including space) displayed for 2.0 seconds = 14.0 CPS. That is within safe reading speed for all platforms.</p>
          </div>
        </section>

        {/* Timing standards */}
        <section id="timing-standards">
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white mb-2">Subtitle Timing Standards</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Good subtitle timing follows consistent rules developed by broadcast standards bodies and refined through audience research.</p>

          <div className="space-y-4">
            {[
              { title: 'Minimum cue duration', detail: '0.833 seconds (5 frames at 24fps)', body: 'Cues shorter than 5 frames at the target frame rate are invisible to viewers — they vanish before the eye can register the text. Most QC tools and platforms reject cues below this threshold.' },
              { title: 'Maximum cue duration', detail: '7 seconds', body: 'Subtitles displayed for more than 7 seconds feel like they are "hanging" on screen. If the speaker is talking for longer, split the cue into two shorter cues that match natural speech pauses.' },
              { title: 'Minimum gap between cues', detail: '2 frames (≈ 83ms at 24fps)', body: 'When two consecutive subtitles have no gap, the viewer\'s eye doesn\'t register that the subtitle has changed. A 2-frame gap creates a perceptible visual reset that helps viewers track subtitle transitions.' },
              { title: 'Shot change rule', detail: 'Subtitle must not cross a cut by more than 2 frames', body: 'When a scene cuts to a new shot, viewers\' eyes are drawn to the new visual. Subtitle editors traditionally end the cue at or just before the shot change and start a new cue on the new shot.' },
              { title: 'Sentence-end rule', detail: 'Preferred: end cue at sentence end or natural pause', body: 'Cues should break at grammatically natural points — after a sentence, at a comma, or at the end of a clause. Avoid breaking mid-phrase (e.g. "Welcome to / the show") when a better break point is available.' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.title}</p>
                    <p className="font-mono text-xs text-blue-600 dark:text-blue-400 mt-0.5 mb-2">{item.detail}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Character limits */}
        <section id="character-limits">
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white mb-2">Subtitle Character Limits Explained</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            Character limits exist because subtitle rendering on a fixed-width screen has physical constraints. Television subtitles were historically limited to 37–40 characters per line because that's what fit safely within the "safe area" of a standard-definition TV screen without hitting the edges. Modern streaming platforms carry these limits forward because they ensure readability on all screen sizes — from a 75-inch QLED TV to a 5-inch smartphone.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            The 42-character limit used by Netflix, Amazon, and Disney+ was chosen as a compromise between the tighter broadcast standard and the wider available screen real estate of HD and 4K displays. Lines over 42 characters at standard subtitle font size begin to encroach on screen edges on smaller screens and in player windows with variable padding.
          </p>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 font-mono text-sm space-y-3">
            <p className="text-xs text-gray-400 font-sans mb-3">Example — 42-character ruler</p>
            <div>
              <p className="text-gray-400 text-xs select-none mb-0.5">{'123456789012345678901234567890123456789012'}</p>
              <p className="text-green-600 dark:text-green-400">Welcome to the documentary. ✓ 28 chars</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs select-none mb-0.5">{'123456789012345678901234567890123456789012'}</p>
              <p className="text-green-600 dark:text-green-400">The results were unexpected by researchers. ✓ 42</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs select-none mb-0.5">{'123456789012345678901234567890123456789012'}</p>
              <p className="text-red-500 dark:text-red-400">The results were truly unexpected by the team. ✗ 47</p>
            </div>
          </div>
        </section>

        {/* Tools */}
        <section>
          <h2 className="text-2xl font-display font-medium text-gray-900 dark:text-white mb-4">Free tools to check your subtitles</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: 'Subtitle Reading Speed Checker', path: '/tools/subtitle-reading-speed', desc: 'Check CPS against Netflix, BBC, and EBU standards' },
              { label: 'Subtitle Character Limit Checker', path: '/tools/subtitle-character-checker', desc: 'Find lines that exceed 42, 40, or 37 character limits' },
              { label: 'Subtitle Validator', path: '/tools/subtitle-validator', desc: 'Check for timing overlaps, gaps, and format errors' },
              { label: 'SRT to VTT Converter', path: '/tools/srt-to-vtt', desc: 'Convert SRT subtitles to WebVTT for web players' },
              { label: 'VTT to SRT Converter', path: '/tools/vtt-to-srt', desc: 'Convert VTT back to SRT for editing software' },
              { label: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing', desc: 'Fix out-of-sync subtitles with a timing offset' },
            ].map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className="block rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 hover:shadow-sm transition-all group"
              >
                <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 text-sm">{tool.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tool.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* AI CTA */}
        <section className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-center text-white">
          <h2 className="text-2xl font-display font-medium mb-2">Generate subtitles automatically with AI</h2>
          <p className="text-blue-100 mb-6 text-sm max-w-md mx-auto">Upload your video and get accurate, timestamped SRT or VTT subtitles in minutes — no manual transcription needed.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/video-to-subtitles" className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm">Generate subtitles with AI →</Link>
            <Link to="/video-to-transcript" className="inline-block border border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm">Transcribe video instantly</Link>
          </div>
        </section>

        {/* Nav links */}
        <div className="flex flex-wrap gap-4 justify-center pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link to="/subtitle-tools" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Free Subtitle Tools →</Link>
          <Link to="/tools" className="text-sm text-blue-600 hover:text-blue-700 font-medium">All Free Tools →</Link>
        </div>

      </div>
    </div>
  )
}
