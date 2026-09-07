import { Link, useParams, useNavigate } from 'react-router-dom'
import { GENERATED_POSTS } from '../data/generatedPosts'
import { FORMATTING_GUIDE_BLOG_POSTS } from '../data/formattingGuideBlogPosts'

interface BlogPost {
  slug: string
  date: string
  title: string
  summary: string
  tag: string
  readTime: string
  content: React.ReactNode
}

const POSTS: BlogPost[] = [
  ...(FORMATTING_GUIDE_BLOG_POSTS as BlogPost[]),
  {
    slug: 'voice-to-text-free-in-browser',
    date: 'March 22, 2026',
    title: 'Voice to text in your browser — free, no app, no upload',
    summary: 'The fastest way to turn speech into text: open a tab, hit record, speak. No file to prepare, no account needed. Here is how it works and when to use it.',
    tag: 'New feature',
    readTime: '4 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Every other transcription tool asks you to record audio somewhere else first, save a file, then upload it. That is three extra steps before you even start. Voice to Text removes all of them. You open a tab, click a button, and speak. The transcript appears when you stop.
        </p>
        <p>
          No account required. No file to prepare. No app to install.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How it works</h3>
        <p>
          Your browser already has a microphone API. We use it directly — Chrome, Firefox, Safari, and Edge all support it. When you click the mic button, your browser asks for microphone permission (once), then starts recording compressed audio locally. The waveform shows your audio is being captured. When you stop, the audio uploads and our AI (OpenAI Whisper) transcribes it. Results come back in seconds, not minutes.
        </p>
        <p>
          For a 5-minute recording, expect the transcript in under 15 seconds. For 30 minutes, under 90 seconds.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">When to use Voice to Text instead of video upload</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Live interviews and calls</strong> — You are in the moment. You do not want to worry about screen recording or exporting. Just record from the browser.</li>
          <li><strong>Voice notes</strong> — Faster than typing. Speak your thoughts, get a text draft, paste it wherever you need.</li>
          <li><strong>Lectures and workshops</strong> — Open the tool on your laptop, hit record at the start, stop at the end. Full transcript waiting for you.</li>
          <li><strong>Quick meetings</strong> — For a one-hour team sync where you don't have a video recording, this is the fastest way to get written notes.</li>
          <li><strong>Any time you don't have a video file</strong> — If you're starting from scratch, recording directly is always faster than creating a file first.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Tips for best accuracy</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Use a quiet room or a headset — background noise is filtered but still affects accuracy.</li>
          <li>Speak at a normal, steady pace. Whispering or rushing lowers confidence.</li>
          <li>Say punctuation cues if you need them ("period", "new paragraph") — Whisper sometimes picks these up naturally.</li>
          <li>Accents are handled well. Whisper is trained across hundreds of languages and accent variations.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Up to 1 hour per session</h3>
        <p>
          The recorder supports up to 60 minutes per session on all plans. Hit stop whenever you're done — you don't have to use the full hour. The transcript covers everything from start to stop.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Privacy</h3>
        <p>
          The audio is sent to our server for transcription and then immediately deleted. We never store your recordings or transcripts. Nothing is retained after your session ends.
        </p>
        <p>
          Try it now — no signup needed:{' '}
          <a href="/voice-recorder" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Voice to Text →</a>
        </p>
      </div>
    ),
  },
  {
    slug: 'best-way-to-get-youtube-transcript',
    date: 'April 17, 2026',
    title: 'Best way to get a YouTube transcript (without manual cleanup)',
    summary: 'A practical guide to turning YouTube videos into clean transcript assets for SEO, repurposing, and publishing workflows.',
    tag: 'YouTube',
    readTime: '7 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          If you search “best way to get YouTube transcript,” most advice still tells you to copy captions manually, clean punctuation by hand, and then reformat the text for actual use. That works for one short clip, but it breaks at scale. Teams publishing weekly videos, podcasts, webinars, and tutorials need a system that starts with a URL and ends with reusable content.
        </p>
        <p>
          The fastest workflow is: paste URL, generate transcript, export structured outputs, repurpose into article sections and social snippets. That is why we built a dedicated YouTube Transcript Generator route instead of hiding YouTube inside a generic upload flow.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What to optimize for (not just “get text”)</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Speed to first draft:</strong> You should move from URL to readable transcript quickly.</li>
          <li><strong>Output quality:</strong> Transcript should be structured enough to publish with minimal editing.</li>
          <li><strong>Repurposing workflow:</strong> You need chapter-ready sections, summary framing, and export options.</li>
          <li><strong>Consistency:</strong> The process must work for every new video, not one-off hacks.</li>
        </ul>
        <p>
          Try the dedicated workflow here: <a className="text-blue-600 dark:text-blue-400 hover:underline font-medium" href="/youtube-transcript-generator">YouTube Transcript Generator →</a>
        </p>
      </div>
    ),
  },
  {
    slug: 'youtube-captions-vs-ai-transcription',
    date: 'April 17, 2026',
    title: 'YouTube captions vs AI transcription: what actually saves time?',
    summary: 'Native captions are useful, but AI transcription workflows win when you need structured outputs and fast repurposing.',
    tag: 'Comparison',
    readTime: '6 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          YouTube captions are great for baseline accessibility. But for content teams, the goal is usually not just accessibility — it is production velocity. You need text you can turn into blog posts, FAQ blocks, social scripts, and campaign copy. Native caption tools were not built for that full workflow.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Where YouTube captions help</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Fast default subtitle layer for playback.</li>
          <li>No extra setup if captions are already available.</li>
          <li>Useful fallback when you only need basic on-platform viewing.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Where AI transcription workflows win</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Structured outputs:</strong> transcript + summary + chapters + subtitle exports.</li>
          <li><strong>Repurposing speed:</strong> faster transition from video to text assets.</li>
          <li><strong>Cross-tool workflow:</strong> cleaner handoff into CMS, docs, and content ops.</li>
        </ul>
        <p>
          If your goal is to publish text derivatives quickly, use a dedicated URL-first workflow: <a className="text-blue-600 dark:text-blue-400 hover:underline font-medium" href="/youtube-transcript-generator">YouTube Transcript Generator →</a>
        </p>
      </div>
    ),
  },
  {
    slug: 'how-to-download-youtube-subtitles',
    date: 'April 17, 2026',
    title: 'How to download YouTube subtitles and keep them usable',
    summary: 'Step-by-step guide to generating subtitle files you can actually reuse in editing, publishing, and localization.',
    tag: 'Guide',
    readTime: '5 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Downloading subtitles is easy. Downloading subtitles that are usable in production workflows is where most teams lose time. The main issues are inconsistent formatting, timing gaps, and missing structure for editing tools.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Practical subtitle workflow</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Paste the video URL in a YouTube transcription workflow.</li>
          <li>Generate transcript and subtitle outputs.</li>
          <li>Export SRT or VTT depending on platform.</li>
          <li>Use subtitle files for upload, editing, or translation workflows.</li>
        </ol>
        <p>
          This keeps subtitle generation tied to transcript generation so your content and timing stay consistent across channels.
        </p>
        <p>
          Start from here: <a className="text-blue-600 dark:text-blue-400 hover:underline font-medium" href="/youtube-transcript-generator">YouTube Transcript Generator →</a>
        </p>
      </div>
    ),
  },
  {
    slug: 'how-to-transcribe-zoom-recording',
    date: 'March 7, 2026',
    title: 'How to transcribe a Zoom recording: step-by-step guide',
    summary: 'Zoom saves recordings as MP4. Here is the exact process to get a clean, searchable transcript from any call — free, no extra software.',
    tag: 'Guide',
    readTime: '5 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Zoom saves cloud and local recordings as MP4 files. That means transcribing them is straightforward — you do not need special Zoom integrations or a paid Otter.ai subscription. You just need the MP4 and a transcription tool that can handle it.
        </p>
        <p>
          Here is the complete process.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 1: Download your Zoom recording</h3>
        <p>
          For <strong>cloud recordings</strong>: Log in to zoom.us → Recordings → find your meeting → click Download. Zoom gives you an MP4 (video), an M4A (audio only), and optionally a VTT file if you had Zoom's own transcription enabled.
        </p>
        <p>
          For <strong>local recordings</strong>: Zoom saves them to your Documents/Zoom folder by default. Open Zoom → Meetings → Recorded → Show in Finder/Explorer. The file ends in .mp4.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 2: Upload to VideoText</h3>
        <p>
          Go to <strong>Video to Transcript</strong>. Drag your Zoom MP4 into the upload zone or click to browse. Most Zoom recordings are 100–500 MB; the upload handles that fine over a normal broadband connection.
        </p>
        <p>
          You do not need an account for the first three imports.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 3: Wait for transcription</h3>
        <p>
          A 60-minute Zoom call typically transcribes in 4–7 minutes. You see the transcript build in real time as segments complete — you do not stare at a spinner until the end. For a 30-minute call, expect 2–4 minutes.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 4: Use Speakers, Summary, or Chapters</h3>
        <p>
          Once the transcript is ready, three branches become available:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Speakers</strong> — groups paragraphs by speaker (Speaker 1, 2, etc.). For a two-person call, this cleanly separates interviewer and interviewee or manager and report.</li>
          <li><strong>Summary</strong> — extracts decisions, action items, and key points. Useful for sending meeting notes immediately after the call.</li>
          <li><strong>Chapters</strong> — breaks the transcript into navigable sections. Good for long all-hands or team calls where you want to jump to a specific topic.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 5: Translate (optional)</h3>
        <p>
          If you need the transcript in another language — for a global team or a client who speaks Hindi or Spanish — click Translate and pick the target language. The translation appears in a new tab alongside the original.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 6: Download or copy</h3>
        <p>
          Click Copy to grab the full transcript as plain text. Or use the Exports branch (paid plans) to download as JSON, Markdown, CSV, or Notion-style format for your note-taking workflow.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Common questions</h3>
        <p>
          <strong>Does Zoom's built-in transcription do the same thing?</strong> Zoom offers AI Companion transcription on paid plans, but it requires the host to enable it before the meeting, only saves to the cloud, and does not give you speaker summary or keyword indexing. VideoText works on any recording after the fact.
        </p>
        <p>
          <strong>What if the audio quality is poor?</strong> Zoom recordings made with background noise or a bad mic will have lower accuracy. Trim the video to the segment you need and use the spoken-language setting for best results.
        </p>
        <p>
          <strong>Is the transcript stored?</strong> No. Your file is processed and deleted. We never keep your video, audio, or transcript on our servers.
        </p>
      </div>
    ),
  },
  {
    slug: 'srt-vs-vtt-subtitle-formats',
    date: 'March 5, 2026',
    title: 'SRT vs VTT: which subtitle format should you use?',
    summary: 'Both SRT and VTT are plain-text subtitle formats. The difference comes down to where you are uploading and what your player supports.',
    tag: 'Guide',
    readTime: '4 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          SRT (SubRip Text) and VTT (Web Video Text Tracks) are the two most common subtitle file formats. They look similar, they contain the same basic information — timestamps and text — and you can open both in a text editor. So why do both exist and which should you use?
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What SRT looks like</h3>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`1
00:00:01,200 --> 00:00:04,500
Welcome to the video.

2
00:00:05,000 --> 00:00:08,300
Today we are covering subtitle formats.`}
        </pre>
        <p>
          SRT uses a sequential number, a timestamp with comma-separated milliseconds, and the text. That is it. No header, no metadata. Maximum simplicity.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What VTT looks like</h3>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`WEBVTT

00:00:01.200 --> 00:00:04.500
Welcome to the video.

00:00:05.000 --> 00:00:08.300
Today we are covering subtitle formats.`}
        </pre>
        <p>
          VTT starts with "WEBVTT", uses dots instead of commas for milliseconds, and supports optional cue settings like position and alignment. It is a W3C standard designed for HTML5.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">When to use SRT</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>YouTube</strong> — SRT is the recommended format for YouTube Studio subtitle uploads.</li>
          <li><strong>Vimeo</strong> — Accepts SRT; it is the most common upload format.</li>
          <li><strong>Social media</strong> — LinkedIn, Facebook, and TikTok all accept SRT.</li>
          <li><strong>Video editing software</strong> — Premiere Pro, DaVinci Resolve, and CapCut all import SRT.</li>
          <li><strong>Any platform that is not explicitly web-only</strong> — SRT is the safer default.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">When to use VTT</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>HTML5 video players</strong> — The <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;track&gt;</code> element in HTML natively reads VTT.</li>
          <li><strong>Custom web players</strong> — Video.js, Plyr, and similar players default to VTT.</li>
          <li><strong>Safari</strong> — Safari's native player prefers VTT over SRT.</li>
          <li><strong>When you need position control</strong> — VTT lets you set subtitle position and alignment per cue, which SRT cannot do.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">The practical answer for most people</h3>
        <p>
          <strong>Use SRT unless you are building a web video player or your platform specifically requires VTT.</strong> SRT is accepted everywhere VTT is, and also by older tools and platforms that pre-date the VTT standard. If you upload to YouTube, use SRT. If you are embedding video on your own site with an HTML5 player, use VTT.
        </p>
        <p>
          VideoText generates both from the same upload. Choose at the point of download — no re-processing needed.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Converting between formats</h3>
        <p>
          SRT and VTT are nearly identical in content. Converting is just a find-and-replace of the header and comma/dot swap. VideoText's Fix Subtitles tool handles conversion. If you have an SRT and need VTT for a web player, generate subtitles and switch the format dropdown — the timestamps are identical.
        </p>
      </div>
    ),
  },
  {
    slug: 'how-to-add-subtitles-to-video-free',
    date: 'March 3, 2026',
    title: 'How to add subtitles to any video for free',
    summary: 'A complete walkthrough: generate subtitles automatically, fix timing issues, then burn them into the video permanently — all free, no desktop software.',
    tag: 'Guide',
    readTime: '6 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Adding subtitles to a video used to mean buying software like Adobe Premiere, learning a timeline editor, or paying a captioning service. Today you can do it in a browser in about ten minutes — free. Here is the exact process.
        </p>
        <p>
          There are two types of subtitles you might want:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Soft subtitles (a separate file)</strong> — the viewer can toggle them on/off. Used for YouTube, Vimeo, streaming platforms.</li>
          <li><strong>Hard subtitles (burned into the video)</strong> — always visible. Used for social media clips, reels, silent autoplay content.</li>
        </ul>
        <p>
          Both workflows start the same way.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 1: Generate the subtitle file</h3>
        <p>
          Go to <strong>Video to Subtitles</strong>. Upload your video (MP4, MOV, AVI, WebM — up to the limit shown). Choose your output format: <strong>SRT</strong> for YouTube/Vimeo/social, <strong>VTT</strong> for web players. Set the spoken language if you know it — auto-detect works but setting the language manually improves accuracy for non-English content.
        </p>
        <p>
          Click Generate. The transcript runs through AI speech recognition and creates a timed subtitle file. For a 5-minute video, this takes about 30–60 seconds.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 2: Fix timing and formatting (optional but recommended)</h3>
        <p>
          AI-generated subtitles are accurate but sometimes have:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Overlapping timestamps (one cue starts before the previous one ends)</li>
          <li>Lines that are too long for a single subtitle frame (YouTube recommends max 42 characters per line)</li>
          <li>Gaps between cues that are too short or too long</li>
        </ul>
        <p>
          Upload the SRT/VTT to <strong>Fix Subtitles</strong>. The tool automatically corrects overlaps, splits long lines, and adjusts gaps. Download the corrected file.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 3a: Upload to YouTube (soft subtitles)</h3>
        <p>
          In YouTube Studio: open your video → Subtitles → Add → Upload File. Select your SRT. YouTube maps the timestamps automatically. The subtitles appear in the video player as a toggleable CC track. This is the best approach for YouTube — do not burn them in, because viewers can turn YouTube's automatic captions off and your uploaded captions are higher quality.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 3b: Burn into the video (hard subtitles)</h3>
        <p>
          For social media clips, Instagram Reels, TikTok, or any context where the video plays silently by default, you want the captions <em>burned in</em> — always visible without the viewer having to click anything.
        </p>
        <p>
          Go to <strong>Burn Subtitles</strong>. Upload your video and the SRT/VTT file. Choose:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Font size (small / medium / large)</li>
          <li>Position (bottom / middle of screen)</li>
          <li>Background opacity (transparent to solid box)</li>
        </ul>
        <p>
          Click Burn. Download the output video — it is a single MP4 with captions permanently embedded. Upload that file to Instagram, TikTok, or wherever.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 4: Translate for other markets (optional)</h3>
        <p>
          If you want the same video in Spanish, Arabic, Hindi, or another language: go to <strong>Translate Subtitles</strong>. Upload the SRT. Pick the target language. Download the translated SRT with the original timestamps preserved. You can then burn the translated version into a separate copy of the video.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What about accessibility?</h3>
        <p>
          Soft subtitles (uploaded SRT files) are better for accessibility than burned-in captions, because screen readers and closed-caption tools can interact with them. If your goal is ADA or WCAG compliance, upload the SRT to the platform rather than burning it in.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Is all of this free?</h3>
        <p>
          Sign up for free to get 3 uploads per month across all tools. Pro plan is $7.99/month for continued processing.
        </p>
      </div>
    ),
  },
  {
    slug: 'best-free-transcription-tools-2026',
    date: 'March 1, 2026',
    title: 'Best free transcription tools in 2026: an honest comparison',
    summary: 'We compared the most-used free transcription tools on accuracy, speed, export options, and privacy. Here is what we found — including our own limitations.',
    tag: 'Guide',
    readTime: '7 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          There are more transcription tools than ever in 2026. Most have a free tier. Most are built on the same underlying model (Whisper or a derivative). The differences are in the workflow, the limits, and what happens to your data. This is an honest comparison — including where VideoText falls short.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What we tested</h3>
        <p>
          We ran the same 15-minute interview clip through six tools: VideoText, Otter.ai, Descript, Whisper (direct), Rev's free tier, and Tactiq. Same file, same audio quality, measured accuracy by word error rate against a hand-corrected reference transcript.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Otter.ai</h3>
        <p>
          <strong>Free tier:</strong> 300 minutes/month, requires account. <strong>Accuracy:</strong> Excellent for English, strong for meetings with multiple speakers. Speaker diarization is the best in class — it labels speakers and learns names over time if you stay in the ecosystem. <strong>Privacy:</strong> Otter stores your transcripts and audio indefinitely in their cloud. They use aggregated data for model improvement. <strong>Best for:</strong> Teams doing frequent meetings in English who want a persistent transcript library.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Descript</h3>
        <p>
          <strong>Free tier:</strong> 1 hour of transcription, requires account, watermark on exports. <strong>Accuracy:</strong> Very good. Descript's real differentiator is the editor — you edit the video by editing the transcript text. Removing filler words is one click. <strong>Privacy:</strong> Files are stored in Descript's cloud. <strong>Best for:</strong> Podcast editors and video producers who want to edit audio/video by editing text. Not a pure transcription tool.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">OpenAI Whisper (direct)</h3>
        <p>
          <strong>Free tier:</strong> Free to run locally if you have a capable GPU. Free via API at very low cost. <strong>Accuracy:</strong> State of the art — this is the model most tools are built on, including VideoText. <strong>Privacy:</strong> Complete if run locally; API calls go to OpenAI. <strong>Best for:</strong> Developers and technical users comfortable running Python. Not practical for most people without setup.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Rev (free tier)</h3>
        <p>
          <strong>Free tier:</strong> Limited; Rev is primarily a paid human transcription service. Their AI tier is $0.25/minute. <strong>Accuracy:</strong> Human transcripts are the gold standard; AI tier is Whisper-class. <strong>Best for:</strong> Legal, medical, or financial content where you need guaranteed accuracy and are willing to pay for human review.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">VideoText</h3>
        <p>
          <strong>Free tier:</strong> 3 uploads per month, sign up for free, watermark on subtitle exports. <strong>Accuracy:</strong> Whisper-based, same model as the field. <strong>Privacy:</strong> Files are deleted after processing — we store no transcript, no audio, no video. <strong>Best for:</strong> One-off transcription where you do not want your content stored, or workflows that also need subtitle generation, translation, fixing, or burning.
        </p>
        <p>
          <strong>Where we fall short:</strong> We do not have persistent storage — if you close the tab, the transcript is gone. We do not have a collaborative workspace. Speaker diarization is not as mature as Otter's. We do not support audio-only files natively.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Summary table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">Tool</th>
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">Free limit</th>
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">Account needed</th>
                <th className="text-left py-2 font-semibold text-gray-900 dark:text-white">Stores files</th>
              </tr>
            </thead>
            <tbody className="space-y-1">
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">VideoText</td>
                <td className="py-2 pr-4">3 imports/mo</td>
                <td className="py-2 pr-4">No (3 imports)</td>
                <td className="py-2">No</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">Otter.ai</td>
                <td className="py-2 pr-4">300 min/mo</td>
                <td className="py-2 pr-4">Yes</td>
                <td className="py-2">Yes</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">Descript</td>
                <td className="py-2 pr-4">1 hr total</td>
                <td className="py-2 pr-4">Yes</td>
                <td className="py-2">Yes</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">Whisper (local)</td>
                <td className="py-2 pr-4">Unlimited</td>
                <td className="py-2 pr-4">No</td>
                <td className="py-2">No</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Rev AI</td>
                <td className="py-2 pr-4">$0.25/min</td>
                <td className="py-2 pr-4">Yes</td>
                <td className="py-2">Yes</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Our recommendation</h3>
        <p>
          If you need a persistent transcript library with team collaboration and strong speaker diarization: <strong>Otter.ai</strong>. If you do podcast or video editing and want to edit by cutting text: <strong>Descript</strong>. If you process sensitive content and do not want it stored anywhere: <strong>VideoText</strong> or local Whisper.
        </p>
      </div>
    ),
  },
  {
    slug: 'how-we-handle-support',
    date: 'March 1, 2026',
    title: 'How we handle support: honest, fast, no ticket queue',
    summary: 'Every support email is read by the person who built the product. Here is what that means in practice.',
    tag: 'Product',
    readTime: '3 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          When you email VideoText, you are emailing me — the person who wrote the upload route, the subtitle parser, the billing flow. There is no ticket system, no tier-1 support reading from a script. That is by design.
        </p>
        <p>
          Most support tools at our stage create theatre: a helpdesk portal that routes emails through a CRM so you can report "2-hour response time" while the actual answer is copy-pasted from a FAQ. We do not do that. We reply directly from the same account that runs the infrastructure.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What this means for you</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>If a job fails and you tell us, we look at the actual logs — not a summarised error code.</li>
          <li>If something is broken in a specific browser or on a specific file type, we can reproduce it the same day.</li>
          <li>If you have a feature request, it goes directly into the backlog, not into a "we'll pass this along" void.</li>
        </ul>
        <p>
          We also built the in-app Tex assistant for questions that do not need a human — "which plan includes batch processing?" or "why is my SRT file misaligned?" Tex handles those instantly so the email queue stays clear for real issues.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Our current SLA</h3>
        <p>
          We aim to reply to all support emails within 24 hours, usually faster. If your job fails, the upload is automatically returned to your daily quota — no chasing required. If you are on a paid plan and something is wrong, we will prioritise a fix the same day.
        </p>
        <p className="text-gray-500 dark:text-gray-400 italic">
          Email us at support@videotext.io. Or use the Feedback button in the app.
        </p>
      </div>
    ),
  },
  {
    slug: 'why-we-delete-your-files',
    date: 'February 26, 2026',
    title: 'Why we delete your files — and why that makes us faster',
    summary: 'Privacy-first design is not just an ethical choice. It is an architectural one that makes everything run leaner.',
    tag: 'Privacy',
    readTime: '4 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Every video you upload to VideoText is deleted after processing. Not archived, not moved to cold storage "just in case" — deleted. This is not a marketing claim we added to the landing page. It is the actual system design.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How it works</h3>
        <p>
          When you upload a file, it lands in a temporary directory on the processing server. The worker picks it up, runs FFmpeg extraction, sends the audio to Whisper for transcription, assembles the result, and streams it back to your browser. Once the job is marked complete, the temp file is deleted. The transcript and subtitle files you download are never stored server-side — they are generated on the fly and sent directly to your browser.
        </p>
        <p>
          We store job metadata (duration, tool type, plan at time of job) for billing accuracy and analytics. We do not store the transcript text, the subtitle content, or any frame of your video.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Why this also makes us faster</h3>
        <p>
          When you don't store files, you don't need the infrastructure to serve them. No S3 bucket reads, no CDN layer, no database lookups for file assets. The processing pipeline is a straight line: upload → extract → transcribe → return. That simplicity is part of why our median job latency is lower than tools that round-trip through object storage.
        </p>
        <p>
          It also means our pricing can be lower. Storage is not free. Tools that keep your files forever are building a storage cost into every subscription tier whether you realise it or not.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What this means for you</h3>
        <p>
          If you need a copy of your transcript or subtitles, download it before closing the tab. We do not have a "retrieve my files" button because there is nothing to retrieve. That is the trade-off and we think it is the right one for a tool that handles sensitive business and creative content.
        </p>
      </div>
    ),
  },
  {
    slug: 'processing-speed-breakdown',
    date: 'February 25, 2026',
    title: 'How VideoText processes video: a plain-English breakdown of the pipeline',
    summary: 'What actually happens between "upload complete" and your subtitle file appearing — and why we are faster than most alternatives.',
    tag: 'Engineering',
    readTime: '5 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          The most common question we get after someone uses the tool for the first time: "Why is it so fast?" The honest answer is that the pipeline is simple and we have been aggressive about cutting wait time at every step.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 1: Upload</h3>
        <p>
          Files are uploaded in 10 MB chunks. This means a 500 MB video does not fail if your connection drops halfway — the upload resumes from the last successful chunk. The moment the final chunk arrives, the job is enqueued immediately. You do not wait for a "finalisation" step.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 2: Extraction-first</h3>
        <p>
          We do not transcribe the video directly. First, FFmpeg strips the audio track into a compressed mono WAV. This extraction happens in seconds even for long videos. The smaller audio file then goes to Whisper. This matters because Whisper's processing time scales with audio duration, not video file size — so a high-bitrate 4K video with a 30-minute audio track processes the same as a compressed 720p file of the same length.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 3: Streaming transcription</h3>
        <p>
          Whisper processes the audio in segments. As each segment completes, it is streamed back to your browser via Server-Sent Events. You see the transcript building in real time rather than staring at a spinner waiting for the full file. This is why the "time to first word" feel of VideoText is fast even on longer videos — you are seeing actual output within the first 15–30 seconds of processing, not after the whole job finishes.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 4: Priority queue</h3>
        <p>
          Jobs are queued in Redis with plan-based priority weights. Pro jobs have higher weight than Free. Under normal load this makes no difference — the queue empties faster than it fills. Under heavy load (multiple large batch jobs running simultaneously), paid users pre-empt free-tier jobs automatically. This is the main practical difference between the free tier and Pro from a speed perspective.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Numbers</h3>
        <p>
          Median processing time for a 10-minute video: approximately 45–90 seconds end-to-end, depending on server load. A 60-minute video typically completes in 5–8 minutes. Batch jobs with 10 videos of 5 minutes each run in parallel workers and usually finish in under 10 minutes total.
        </p>
        <p className="text-gray-500 dark:text-gray-400 italic">
          These are production numbers from our Bull queue metrics. They will vary with server load but represent median performance, not best-case.
        </p>
      </div>
    ),
  },
  {
    slug: 'best-transcription-software-2026',
    date: 'March 14, 2026',
    title: 'Best transcription software in 2026 (tested): who wins for each workflow',
    summary: 'A workflow-first comparison of leading transcription tools. We score speed-to-output, transcript quality, export depth, privacy model, and real cost — with clear best-for picks.',
    tag: 'Guide',
    readTime: '10 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Most transcription tools in 2026 use similar base models, so model name alone is no longer useful for choosing software. What actually changes outcomes is workflow fit: how quickly you get usable output, whether exports are practical, what gets stored, and how pricing scales once usage increases.
        </p>
        <p>
          We benchmarked common tools on the same recorded file and scored them against five buying criteria: <strong>speed to usable output</strong>, <strong>transcript quality</strong>, <strong>output depth</strong>, <strong>privacy/retention model</strong>, and <strong>real monthly cost</strong>. If you want the short version, jump to the table below, then read the workflow-specific picks.
        </p>
        <p>
          If your immediate goal is to convert a file now, use the product page at <a href="/video-to-transcript" className="text-blue-600 dark:text-blue-400 hover:underline">/video-to-transcript</a>. This article is the buying-decision layer for teams comparing broad transcription software options, not a replacement for the core tool route.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Methodology (why this comparison is different)</h3>
        <p>
          We did not rank tools by feature count. We ranked by delivery quality for real jobs: recorded meetings, podcasts, interviews, and long-form video repurposing. Scores combine quantitative checks (processing time and output completeness) with workflow checks (handoff quality, subtitle/export coverage, and where friction appears). For a deeper speed breakdown, see the <a href="/transcription-benchmark" className="text-blue-600 dark:text-blue-400 hover:underline">transcription benchmark</a>.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-3 font-semibold">Tool</th>
                <th className="text-left py-2 pr-3 font-semibold">Best for</th>
                <th className="text-left py-2 pr-3 font-semibold">Output depth</th>
                <th className="text-left py-2 pr-3 font-semibold">Retention model</th>
                <th className="text-left py-2 font-semibold">Trade-off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                ['VideoText', 'Recorded video + transcript-to-publish workflow', 'Transcript + summary + chapters + subtitles + exports', 'Processed then deleted', 'Not a live meeting bot'],
                ['Otter.ai', 'Live meeting capture and searchable meeting history', 'Meeting transcript + collaboration', 'Cloud transcript library', 'Limited fit for file-first video workflows'],
                ['Descript', 'Edit-first podcast/video teams', 'Transcript + timeline editing', 'Cloud project storage', 'Heavier UI for transcription-only tasks'],
                ['Rev', 'Human-reviewed, high-assurance transcripts', 'AI + human service options', 'Stored', 'Per-minute pricing can scale quickly'],
                ['Whisper (local/API)', 'Developer-controlled custom pipelines', 'Raw transcript-first output', 'Local or API dependent', 'Requires setup and tooling'],
              ].map(([tool, bestFor, depth, privacy, tradeoff]) => (
                <tr key={tool}>
                  <td className="py-2 pr-3 font-semibold text-gray-800 dark:text-gray-200">{tool}</td>
                  <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{bestFor}</td>
                  <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{depth}</td>
                  <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{privacy}</td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{tradeoff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">1) VideoText — best for recorded content workflows</h3>
        <p>
          <strong>Why it ranks high:</strong> fast processing, structured outputs in one run, and a retention model designed for teams that do not want transcript archives stored by default. For users who start with recorded files and need publish-ready outputs, this removes multiple downstream steps.
        </p>
        <p>
          <strong>Best for:</strong> creators, agencies, and operators transcribing recorded video/audio into transcript + subtitle + summary outputs. If your workflow is file-first, this category fit matters more than “meeting bot” features.
        </p>
        <p>
          <strong>Limitations:</strong> not a live meeting bot and not positioned as a permanent transcript vault.
        </p>
        <p>
          Related reads: <a href="/best-transcription-tool" className="text-blue-600 dark:text-blue-400 hover:underline">best transcription tool comparison</a>, <a href="/otter-ai-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Otter alternative breakdown</a>.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">2) Otter.ai — best for live meeting capture</h3>
        <p>
          <strong>Why choose it:</strong> strong fit for teams that prioritize live call capture and searchable meeting history.
        </p>
        <p>
          <strong>Trade-off:</strong> if your main use case is pre-recorded file transcription with subtitle/export depth, dedicated file-first tools can be a better fit.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">3) Descript — best for editing-driven teams</h3>
        <p>
          <strong>Why choose it:</strong> transcript editing tightly connected to timeline editing can be worth it for podcast/video production teams.
        </p>
        <p>
          <strong>Trade-off:</strong> higher workflow overhead if your only goal is “upload recording, get transcript/subtitles fast”.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">4) Rev — best when human review is non-negotiable</h3>
        <p>
          <strong>Why choose it:</strong> human transcript service option for high-assurance use cases.
        </p>
        <p>
          <strong>Trade-off:</strong> per-minute economics can become expensive versus flat-rate software once volume grows.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">5) Whisper (local/API) — best for technical teams</h3>
        <p>
          <strong>Why choose it:</strong> deep control and low raw model cost at scale for teams that can maintain their own pipeline.
        </p>
        <p>
          <strong>Trade-off:</strong> implementation and maintenance burden for non-technical operators.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Best transcription software by use case</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-semibold">Use case</th>
                <th className="text-left py-2 font-semibold">Best tool</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                ['Recorded video/audio to publish-ready outputs', 'VideoText'],
                ['Live meeting bot capture', 'Otter.ai'],
                ['Transcript-first video editing workflow', 'Descript'],
                ['Human-reviewed legal/compliance transcripts', 'Rev (human)'],
                ['Developer-run custom transcription stack', 'Whisper local/API'],
              ].map(([uc, tool]) => (
                <tr key={uc}>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{uc}</td>
                  <td className="py-2 font-semibold text-blue-600 dark:text-blue-400">{tool}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Decision rule (30-second version)</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>If you process <strong>recorded files</strong> and need transcripts + subtitle/export outputs quickly: choose a file-first workflow (<a href="/video-to-transcript" className="text-blue-600 dark:text-blue-400 hover:underline">start here</a>).</li>
          <li>If you need <strong>live meeting capture</strong> with a bot: choose a meeting-bot-first product.</li>
          <li>If you need <strong>editing-first</strong> transcript workflows: choose an editor-led platform.</li>
          <li>If you need <strong>human-reviewed output</strong> for compliance-grade scenarios: choose a human service tier.</li>
        </ul>
        <p>
          Also compare: <a href="/best-transcription-tool" className="text-blue-600 dark:text-blue-400 hover:underline">best transcription tool page</a>, <a href="/fastest-transcription-software" className="text-blue-600 dark:text-blue-400 hover:underline">fastest transcription software</a>, <a href="/ai-transcription-tools" className="text-blue-600 dark:text-blue-400 hover:underline">AI transcription tools hub</a>.
        </p>
        <p>
          Ready to test on your own file instead of reading comparisons? Start here: <a href="/video-to-transcript" className="text-blue-600 dark:text-blue-400 hover:underline">video to transcript tool</a>.
        </p>
      </div>
    ),
  },
  {
    slug: 'best-video-captioning-tools-2026',
    date: 'March 13, 2026',
    title: 'Best video captioning tools for content creators in 2026',
    summary: 'Auto-captions, burned-in subtitles, translated captions — a practical guide to the best tools for adding captions to YouTube, Instagram, TikTok, and Reels.',
    tag: 'Guide',
    readTime: '6 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Adding captions to video is no longer optional. Platforms reward captioned content with better reach. Viewers watch significantly more of a video with captions in a no-sound environment. And search engines index caption text for discoverability.
        </p>
        <p>
          Here is a practical guide to the best captioning tools in 2026, broken down by where you publish.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">The two types of captions</h3>
        <p>
          Before picking a tool, decide which type you need:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Soft captions (subtitle file)</strong> — A separate SRT or VTT file. The viewer can toggle them on/off. Best for YouTube, Vimeo, and web players. Better for accessibility (screen readers can interact). Lower video file size.</li>
          <li><strong>Hard captions (burned in)</strong> — Permanently visible in the video pixels. Can't be toggled off. Best for Instagram, TikTok, Facebook, and any platform where video auto-plays silently. No subtitle file needed by the viewer's player.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Best tools for YouTube captioning</h3>
        <p>
          YouTube accepts SRT file uploads in YouTube Studio. Don't burn captions for YouTube — upload the SRT and let YouTube display them. The AI auto-captions YouTube generates are often inaccurate; an uploaded SRT improves search discoverability and CC quality.
        </p>
        <p>
          <strong>Recommended workflow:</strong> VideoText Video to Subtitles → download SRT → upload to YouTube Studio. The whole process takes about 3–5 minutes for a 10-minute video. VideoText also generates translated SRT files in one step, letting you add multi-language captions to the same YouTube video.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Best tools for Instagram Reels and TikTok</h3>
        <p>
          Both platforms have auto-caption features, but they are English-only, not always accurate, and not always displayed by default. For consistent quality, burn in captions before uploading.
        </p>
        <p>
          <strong>Recommended workflow:</strong> VideoText Video to Subtitles (get SRT) → Fix Subtitles (check timing) → Burn Subtitles (embed in video) → upload the MP4. This gives you full control over font size, position, and language.
        </p>
        <p>
          Alternatively: CapCut has a built-in auto-caption feature with style presets. Good for quick clips. Accuracy is lower than Whisper for non-standard speech.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Best tools for multi-language captioning</h3>
        <p>
          If you publish in multiple languages: VideoText generates a translated SRT in one step. Workflow: generate English SRT → Translate Subtitles → pick target language → burn translated captions into a localised version. Or upload translated SRT to YouTube to add a multi-language caption track.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Best tools for accessibility compliance (WCAG)</h3>
        <p>
          For ADA/WCAG compliance in educational or corporate video, soft captions (uploaded SRT files) are required — not burned-in captions, because assistive technologies interact with subtitle tracks. Soft captions also need to meet timing standards (not too fast, max 3 words per second).
        </p>
        <p>
          Use VideoText Fix Subtitles to auto-enforce timing and line-length standards before uploading to your LMS or website video player.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Quick comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-3 font-semibold">Tool</th>
                <th className="text-left py-2 pr-3 font-semibold">SRT export</th>
                <th className="text-left py-2 pr-3 font-semibold">Burn in</th>
                <th className="text-left py-2 font-semibold">Translation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                ['VideoText', '✓', '✓', '✓ 70+ languages'],
                ['CapCut', '✓', '✓', '✓ limited'],
                ['Descript', '✓', '✗', '✗'],
                ['Otter.ai', '✗', '✗', '✗'],
                ['Rev AI', '✓', '✗', '✗'],
                ['YouTube auto-captions', 'Download only', 'N/A', 'English only'],
              ].map(([tool, srt, burn, trans]) => (
                <tr key={tool}>
                  <td className="py-2 pr-3 font-semibold text-gray-800 dark:text-gray-200">{tool}</td>
                  <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{srt}</td>
                  <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{burn}</td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{trans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How to choose</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>YouTube uploads:</strong> VideoText → SRT → YouTube Studio upload</li>
          <li><strong>Instagram/TikTok short clips:</strong> VideoText → SRT → Burn Subtitles</li>
          <li><strong>Multi-language content:</strong> VideoText Translate Subtitles</li>
          <li><strong>Podcast clips with captions:</strong> VideoText or CapCut (both work well)</li>
          <li><strong>Corporate/accessibility compliance:</strong> VideoText Fix Subtitles + soft caption upload</li>
        </ul>
      </div>
    ),
  },
  {
    slug: 'how-to-get-youtube-transcript',
    date: 'March 14, 2026',
    title: 'How to get a YouTube video transcript (free, any video)',
    summary: 'Three methods to get a transcript from any YouTube video — using VideoText, YouTube\'s own caption export, or the API. Which works best depends on what you need to do with it.',
    tag: 'Guide',
    readTime: '5 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          You can get a transcript from almost any YouTube video — free, in minutes. There are three main methods, each with different trade-offs depending on why you need the transcript.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Method 1: VideoText (best for accuracy and export options)</h3>
        <p>
          Go to <strong>Video to Transcript</strong>. Paste the YouTube URL (youtube.com/watch?v=... or youtu.be/...). Select the spoken language if known. Click Transcribe.
        </p>
        <p>
          VideoText streams the audio from YouTube and runs it through Whisper AI. You see the transcript build in real time — typically 2–4 minutes for a 30-minute video. No download required. No account needed for the first three imports.
        </p>
        <p>
          After transcribing, you can:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Copy</strong> the transcript as plain text</li>
          <li><strong>Translate</strong> it into English, Hindi, Telugu, Spanish, Chinese, or Russian</li>
          <li><strong>Generate chapters</strong> — AI-segmented sections with timestamps</li>
          <li><strong>Speakers</strong> — separate who said what in multi-speaker content</li>
          <li><strong>Summary</strong> — extract key points and action items</li>
          <li><strong>Export</strong> as JSON, CSV, Markdown, or Notion format (paid plans)</li>
        </ul>
        <p>
          This method gives the highest accuracy and the most export options. It also works for videos without YouTube captions (foreign-language videos, unlisted content, older uploads where auto-captions were never generated).
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Method 2: YouTube's built-in caption export (fastest for English content)</h3>
        <p>
          If the video has auto-generated or manually added captions, you can export them directly from YouTube Studio — but only for videos you own.
        </p>
        <p>
          For videos you do not own, YouTube shows a text transcript in the video description area on desktop: click the three-dot menu below the video → "Show transcript". This gives you timestamped text you can copy, but it cannot be downloaded as a file and it is limited to auto-captions (which are often inaccurate for non-English or fast speech).
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Method 3: YouTube Data API (for developers)</h3>
        <p>
          YouTube's captions API lets you fetch the caption track for a video programmatically. This requires a Google API key and returns the auto-generated VTT or SRT track. It is the fastest method at scale but requires setup, only works for videos with captions already, and the auto-caption quality varies widely.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Which method should you use?</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>You want the transcript for research or writing:</strong> VideoText (best accuracy, translate, summarise)</li>
          <li><strong>You want to quickly skim what was said:</strong> YouTube's built-in "Show transcript" panel</li>
          <li><strong>You're processing many videos automatically:</strong> YouTube Data API (for videos with captions) or VideoText API (for Whisper accuracy at scale)</li>
          <li><strong>You need subtitles/SRT for re-uploading:</strong> VideoText, then Video to Subtitles</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What about age-restricted videos or private videos?</h3>
        <p>
          VideoText can transcribe age-restricted videos if you provide your YouTube cookies (for logged-in access). Private or unlisted videos can be transcribed if you have the direct URL. Videos that require account login to view cannot be processed without your authentication cookies.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How accurate is the result?</h3>
        <p>
          VideoText uses Whisper large-v3, the same model that powers many commercial transcription tools. On clear speech in a quiet environment, accuracy is approximately 98.5%. Heavy accents, fast speech, or significant background noise will reduce this. Setting the spoken language manually (rather than relying on auto-detect) improves results for non-English content.
        </p>
      </div>
    ),
  },
  {
    slug: 'how-to-transcribe-audio-to-text-free',
    date: 'March 12, 2026',
    title: 'How to transcribe audio to text for free in 2026',
    summary: 'The fastest free methods to convert MP3, M4A, WAV, and other audio recordings to text — step-by-step, with accuracy tips and format options.',
    tag: 'Guide',
    readTime: '4 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Transcribing audio to text is now fast and free for most use cases. Here is the direct process using VideoText, plus what to do when audio quality is poor.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Supported formats</h3>
        <p>
          VideoText accepts audio embedded in video files: MP4, MOV, AVI, WebM, and MKV. For pure audio files (MP3, M4A, WAV, FLAC), the easiest approach is to wrap the audio in a video container using a free tool like FFmpeg:
        </p>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-xs font-mono overflow-x-auto">
          {`ffmpeg -i your-recording.mp3 -c:a copy output.mp4`}
        </pre>
        <p>
          This creates an MP4 with no video track that VideoText processes the same as a video file. Alternatively, upload your audio file directly — many video hosts (Vimeo, YouTube) accept audio-only uploads that produce a static image video, which you can then paste as a URL.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step-by-step: audio to text</h3>
        <ol className="list-decimal pl-5 space-y-3">
          <li>Go to <strong>Video to Transcript</strong> on VideoText</li>
          <li>Upload your audio file (wrapped in MP4, or upload a video file with audio)</li>
          <li>Set the <strong>spoken language</strong> — this matters most for non-English content. Auto-detect works but manual is faster and more accurate</li>
          <li>Click <strong>Transcribe</strong></li>
          <li>Watch the transcript build in real time</li>
          <li>Copy, download, or translate when complete</li>
        </ol>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Getting the best accuracy</h3>
        <p>
          Accuracy is highest when:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>The recording is clear mono or stereo — no heavy reverb or background music</li>
          <li>The spoken language is set manually (not auto-detect)</li>
          <li>Speech rate is normal — not extremely fast or heavily accented</li>
          <li>There is no overlapping speech (two people speaking at once)</li>
        </ul>
        <p>
          If your recording has multiple speakers, use the <strong>Speakers</strong> tab after transcribing to separate who said what. For interviews and podcasts this cleanly labels each speaker.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What about very long recordings?</h3>
        <p>
          VideoText processes recordings in streamed segments. A 60-minute audio recording transcribes in approximately 5–8 minutes. You see output appearing within the first 30 seconds — you do not wait for the full job to complete before reading.
        </p>
        <p>
          For recordings longer than 2 hours, the free tier handles the file but the job may be queued behind paid-tier jobs during peak hours. Pro plan ($7.99/month) gives queue priority.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Free alternatives</h3>
        <p>
          <strong>OpenAI Whisper (local)</strong>: The same model, run entirely on your machine. Free and private — but requires Python, a decent GPU, and setup time. Not practical for non-technical users. <strong>Otter.ai free tier</strong>: 300 minutes/month for live meeting recording. Does not accept audio file uploads on any plan. <strong>Google Docs voice typing</strong>: Real-time only, not for pre-recorded audio.
        </p>
        <p>
          For most users, VideoText's free tier (3 imports/month) is the simplest path: no setup, no Python, no credit card.
        </p>
      </div>
    ),
  },
  {
    slug: 'how-to-translate-subtitles',
    date: 'March 10, 2026',
    title: 'How to translate subtitles to any language (SRT & VTT)',
    summary: 'Translate an SRT or VTT subtitle file to Spanish, Arabic, Hindi, French, or 50+ other languages — keeping the original timestamps intact.',
    tag: 'Guide',
    readTime: '4 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Translating subtitles is not the same as translating plain text. You have to keep the timestamps accurate and the line lengths short enough to display properly. Here is how to do it in a few minutes.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 1: Get your subtitle file</h3>
        <p>
          You need an SRT or VTT file first. If you do not have one, generate it: go to <strong>Video to Subtitles</strong>, upload your video, and download the SRT. This takes 1–3 minutes for a 10-minute video.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 2: Translate using VideoText</h3>
        <p>
          Go to <strong>Translate Subtitles</strong>. Upload your SRT or VTT file. Choose the target language from the dropdown — VideoText supports 70+ languages including:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Spanish, French, German, Italian, Portuguese</li>
          <li>Arabic, Hebrew, Persian (Farsi)</li>
          <li>Hindi, Bengali, Tamil, Telugu, Urdu</li>
          <li>Chinese (Simplified and Traditional), Japanese, Korean</li>
          <li>Russian, Ukrainian, Polish, Czech</li>
          <li>Dutch, Swedish, Norwegian, Danish, Finnish</li>
        </ul>
        <p>
          Click Translate. The translation runs segment by segment to preserve timestamps. Your original SRT structure is maintained — each cue number, start time, and end time stays exactly the same. Only the text changes.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 3: Download and use</h3>
        <p>
          Download the translated SRT or VTT. The translated file is ready to upload to YouTube, Vimeo, or your video player. You can also burn it into a second copy of the video using <strong>Burn Subtitles</strong> — useful for creating localised social media versions.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Common questions</h3>
        <p>
          <strong>Do I need to re-time the subtitles after translating?</strong> No. The timestamps are preserved from the source file. The translated text fits within the same display windows. If the translation produces significantly longer text per line, you may want to run it through <strong>Fix Subtitles</strong> after translating to auto-split long lines.
        </p>
        <p>
          <strong>What if I need to translate from a non-English language?</strong> VideoText handles this — upload a French SRT, translate to Arabic or Japanese. The tool detects the source language automatically.
        </p>
        <p>
          <strong>Can I translate transcript text (not subtitle files)?</strong> Yes. After generating a transcript in <strong>Video to Transcript</strong>, click the Translate button in the transcript view to see the full text in your target language. This produces a plain-text translation without timestamps — useful for reading, summarising, or sharing.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What about right-to-left languages (Arabic, Hebrew)?</h3>
        <p>
          Translated SRT and VTT files for Arabic, Hebrew, and other RTL languages contain the correct translated text. How the text renders in your video player depends on the player's RTL support. Most modern players (YouTube, VLC, video.js) handle RTL subtitle text correctly. If you are burning subtitles into video, test the output to confirm the font renders correctly for your target language.
        </p>
      </div>
    ),
  },
  {
    slug: 'batch-subtitles-for-creators',
    date: 'February 20, 2026',
    title: 'Batch subtitles: caption 20 videos at once and download a ZIP',
    summary: 'The batch tool was built for creators and agencies who need to process a week of content in one session without babysitting each upload.',
    tag: 'Feature',
    readTime: '3 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Most subtitle tools are built for one video at a time. That works fine for a single YouTube video. It does not work for a content agency running 40 client videos per week, or a podcaster turning every episode into multi-platform clips.
        </p>
        <p>
          The VideoText batch tool was built for that use case specifically.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How it works</h3>
        <p>
          Upload up to 20 videos in a single session. Choose your subtitle language (or multiple languages on Pro/Agency). The jobs run in parallel workers — not sequentially. When all jobs complete, you download a single ZIP file containing one SRT per video, named to match your original filenames.
        </p>
        <p>
          If one video fails (corrupt file, unsupported codec, audio too short), the rest of the batch continues. The ZIP includes the successful files and a log showing which files failed and why.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Who uses this</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Video editors processing a client's monthly content calendar in one session.</li>
          <li>Podcasters captioning every episode of a back-catalogue in an afternoon.</li>
          <li>Agencies running localisation workflows that need subtitles in three languages per video.</li>
          <li>Educators uploading a full course library for accessibility compliance.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Plan availability</h3>
        <p>
          Batch processing requires a Pro plan. Pro supports up to 20 videos per batch with a 60-minute total duration.
        </p>
      </div>
    ),
  },
  {
    slug: 'best-transcription-tools-for-journalists',
    date: 'March 18, 2026',
    title: 'Best transcription tools for journalists in 2026',
    summary:
      'Journalists need accurate transcripts fast — for quotes, fact-checking, and story filing. Here are the tools that actually hold up under deadline pressure.',
    tag: 'Roundup',
    readTime: '7 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Transcribing interviews is one of the most time-consuming parts of journalism. A 30-minute phone call can take 90 minutes to transcribe manually. The right tool cuts that to minutes — and gives you searchable text you can quote directly.
        </p>
        <p>
          Here are the tools journalists actually use in 2026, with honest notes on where each one falls short.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">1. VideoText — best for accuracy and privacy</h3>
        <p>
          VideoText uses OpenAI Whisper large-v3 for transcription — one of the most accurate speech models available. It handles MP3s from digital voice recorders, M4As from iPhone Voice Memos, and MP4s from Zoom or Teams calls.
        </p>
        <p>
          What makes it good for journalism: files are deleted immediately after processing. No cloud retention, no storage of sensitive source recordings. Speaker labels separate interviewer and interviewee. Results stream in real time — a 60-minute interview transcribes in 5–8 minutes.
        </p>
        <p>
          Free tier: 3 uploads per month. Pro plan is $7.99/month with no per-minute fees.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">2. Otter.ai — best for live recording in the field</h3>
        <p>
          Otter.ai records and transcribes in real time through its mobile app. Useful for press conferences or town halls where you want a live transcript appearing as people speak. Free tier is generous (300 minutes/month). Accuracy is slightly lower than Whisper on recorded audio.
        </p>
        <p>
          Downside: Otter stores your recordings on their servers by default. If source protection matters, review your data settings carefully.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">3. Trint — best for broadcast journalists</h3>
        <p>
          Trint is built for newsrooms. It has an interactive editor where you can click any word to play from that point, and it supports team collaboration. Pricing starts at $80/month per seat, making it more suited to staff reporters at larger outlets than freelancers.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">4. Sonix — best for multilingual coverage</h3>
        <p>
          Sonix supports 35+ languages and has a clean editor for correcting transcripts. It charges $22/month plus $0.10/minute overage — costs add up quickly for long interviews. No free tier, just a 30-minute trial.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">5. Rev — best for human transcription</h3>
        <p>
          Rev offers human transcriptionists at $1.50/minute with ~99% accuracy and turnaround in a few hours. Much slower than AI tools and expensive for long recordings, but the right choice for sensitive long-form investigations where you need absolutely verified text.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What to look for as a journalist</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Accuracy on phone recordings</strong> — phone audio is lower quality than in-person. Test your tool on a real phone call.</li>
          <li><strong>Speaker separation</strong> — you need to know who said what, especially in multi-source interviews.</li>
          <li><strong>Privacy policy</strong> — check whether recordings are stored and for how long. Source protection matters.</li>
          <li><strong>Speed</strong> — on deadline, you need a transcript in minutes, not hours.</li>
          <li><strong>Format support</strong> — voice recorders export MP3; iPhones export M4A; Zoom exports MP4. Your tool needs to handle all three.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Bottom line</h3>
        <p>
          For most journalists — especially freelancers and reporters at smaller outlets — VideoText is the fastest option with the clearest privacy policy. Otter.ai is better for live recording. Trint and Rev make sense for newsrooms with larger budgets or long-form investigations.
        </p>
        <p>
          Start with the free tier on VideoText or Otter.ai and test on a real interview recording before committing to a paid plan.
        </p>
      </div>
    ),
  },
  {
    slug: 'best-transcription-tools-for-students',
    date: 'March 18, 2026',
    title: 'Best free transcription tools for students in 2026',
    summary:
      'Transcribing lecture recordings and research interviews takes hours manually. These tools cut it to minutes — and most have a free tier that covers everything a student needs.',
    tag: 'Roundup',
    readTime: '6 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Students record lectures, seminars, research interviews, and study groups. Turning those recordings into searchable, shareable notes used to mean hours of manual typing. AI transcription now does it in minutes — and most tools have a free tier.
        </p>
        <p>
          Here are the best options in 2026, with honest notes on what each is actually good for.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">1. VideoText — best for lecture and interview recordings</h3>
        <p>
          VideoText gives you a full transcript from any video or audio file — including Zoom lecture recordings (MP4), iPhone Voice Memos (M4A), and digital voice recorder files (MP3). Three free imports per month, no credit card.
        </p>
        <p>
          What makes it useful for studying: the Keywords branch indexes every topic mentioned in the lecture so you can jump to exactly where the professor discussed a concept. The Chapters branch breaks the recording into navigable sections. The Translate branch lets you read the transcript in your native language if English is not your first language.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">2. Otter.ai — best for live note-taking in class</h3>
        <p>
          Otter.ai has a mobile app that records and transcribes in real time. If you attend in-person lectures and want a live transcript appearing as the professor speaks, Otter is the best option. The free plan gives 300 minutes per month.
        </p>
        <p>
          Downside: Otter stores your recordings on their servers. The web interface for reviewing recordings is less clean than VideoText's transcript viewer.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">3. Whisper (local) — best for full privacy</h3>
        <p>
          OpenAI Whisper is available as a free open-source tool you run on your own computer. Nothing leaves your device. Requires Python and command-line comfort — not suited for everyone, but ideal for students transcribing sensitive research interview data.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">4. Google Docs voice typing — best for budget constraints</h3>
        <p>
          Google Docs includes a free voice typing feature that can transcribe audio played through your speakers in real time. Results are rough — accuracy is below dedicated AI tools — but it costs nothing and requires no signup beyond a Google account.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How to use a transcript for studying</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Upload your lecture recording to VideoText and get the transcript.</li>
          <li>Paste it into Notion, Obsidian, or Google Docs.</li>
          <li>Use Ctrl+F to search for any term you need to review.</li>
          <li>Use the Keywords branch to find where specific concepts appear in the recording.</li>
          <li>Use Chapters to jump to specific sections without replaying the whole file.</li>
          <li>Copy key definitions and explanations directly into your notes.</li>
        </ol>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Tips for better transcription accuracy</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Record as close to the speaker as possible — room acoustics reduce accuracy.</li>
          <li>Set the spoken language in the tool before processing for non-English lectures.</li>
          <li>If the professor has a strong accent or uses heavy jargon, review key technical terms in the transcript.</li>
          <li>For iPhone recordings, M4A from Voice Memos transcribes well without any conversion.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Bottom line</h3>
        <p>
          For recorded lectures and research interviews, VideoText is the strongest free option. For live in-class transcription, Otter.ai is better. For research requiring full data privacy, use local Whisper.
        </p>
        <p>
          Start with the free tiers — most students can cover their key lectures without paying anything.
        </p>
      </div>
    ),
  },
  {
    slug: 'how-to-transcribe-interview-recording',
    date: 'March 18, 2026',
    title: 'How to transcribe an interview recording (step-by-step)',
    summary:
      'Whether you recorded a phone call, Zoom interview, or in-person meeting, here is the exact process to get a clean, speaker-labeled transcript in minutes.',
    tag: 'Guide',
    readTime: '5 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Transcribing an interview recording manually takes roughly three to four times the length of the recording. A 30-minute interview becomes two hours of typing. AI transcription cuts that to 5–8 minutes with accuracy high enough for journalistic quotes and research analysis.
        </p>
        <p>
          Here is the complete process.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 1: Get your recording file</h3>
        <p>
          Different recording setups produce different file types:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>iPhone Voice Memos</strong> — exports as M4A. Tap the recording → Share → Save to Files.</li>
          <li><strong>Digital voice recorder</strong> — transfers as MP3 via USB or memory card.</li>
          <li><strong>Zoom call</strong> — download as MP4 from Zoom cloud recordings or from Documents/Zoom locally.</li>
          <li><strong>Phone call recording app</strong> (TapeACall, Google Recorder) — exports as MP3 or M4A.</li>
          <li><strong>In-person recording on Android</strong> — saves as MP3 or AAC in the Voice Recorder app.</li>
        </ul>
        <p>
          All of these formats work directly with VideoText — no conversion needed.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 2: Upload to VideoText</h3>
        <p>
          Go to <strong>Video to Transcript</strong>. Drag your recording into the upload zone or click to browse. Select the spoken language if it is not English — this significantly improves accuracy for non-English interviews.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 3: Wait for transcription</h3>
        <p>
          A 30-minute interview typically transcribes in 3–6 minutes. The transcript builds in real time — you can start reading before the full file is done.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 4: Use the Speakers branch for Q&A format</h3>
        <p>
          Click <strong>Speakers</strong> to see the transcript organized by speaker turn. The AI labels each person as Speaker 1, Speaker 2, etc. For a two-person interview, this clearly separates interviewer questions from interviewee answers.
        </p>
        <p>
          You cannot rename the speaker labels within VideoText, but you can copy the speaker-labeled text and do a find-and-replace in any text editor: replace "Speaker 1" with the interviewer's name, "Speaker 2" with the source's name.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 5: Review and verify quotes</h3>
        <p>
          Always verify direct quotes against the original recording before publishing or submitting research. AI transcription is highly accurate but will occasionally mishear:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Proper nouns, names, and places</li>
          <li>Industry-specific jargon and acronyms</li>
          <li>Words spoken quietly or over background noise</li>
          <li>Overlapping speech from multiple people</li>
        </ul>
        <p>
          Use the transcript to identify the time-coded location of each quote, then play from that timestamp in your audio player to confirm. This is faster than listening through the whole recording.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 6: Export</h3>
        <p>
          Download the transcript as TXT for direct pasting into your article or research document. The SRT export includes timestamps and is useful if you want to sync the transcript to a video version of the interview.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Legal note</h3>
        <p>
          Recording laws vary by jurisdiction. In the US, one-party consent states allow recording with only your own consent; two-party (all-party) consent states require all participants to agree. Always check local recording laws and inform interview subjects where required. VideoText deletes your file immediately after transcription — nothing is stored on its servers.
        </p>
      </div>
    ),
  },
  {
    slug: 'how-to-transcribe-lecture-recording',
    date: 'March 18, 2026',
    title: 'How to transcribe a lecture recording for better study notes',
    summary:
      'Lecture recordings are hard to study from. A searchable transcript changes that — here is how to get one in minutes from any recording format.',
    tag: 'Guide',
    readTime: '5 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Listening back to a lecture recording is slow. You cannot search it, highlight it, or copy a definition from it. A transcript solves all of that. Here is how to get one from any lecture recording — Zoom, iPhone, digital recorder, or screen capture.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 1: Get your lecture recording file</h3>
        <p>
          Depending on how you recorded the lecture:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Zoom class recording</strong> — download as MP4 from Zoom cloud or Documents/Zoom folder locally.</li>
          <li><strong>iPhone Voice Memos</strong> — tap the recording → Share → Save to Files. File is M4A.</li>
          <li><strong>Digital voice recorder</strong> — connect via USB, copy the MP3 to your computer.</li>
          <li><strong>Panopto or Echo360</strong> — download the lecture as MP4 from the university portal.</li>
          <li><strong>Screen recording (Mac)</strong> — saved as MOV in your Movies folder or wherever you specified.</li>
          <li><strong>Google Meet recording</strong> — check Google Drive. Download as MP4.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 2: Upload to VideoText</h3>
        <p>
          Go to <strong>Video to Transcript</strong>. Drag the file into the upload zone. Set the spoken language if it is not English. Click Transcribe.
        </p>
        <p>
          No account is needed for the first three imports.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 3: Wait for the transcript</h3>
        <p>
          A 60-minute lecture typically transcribes in 5–8 minutes. A 20-minute lecture takes about 2 minutes. You see the transcript build in real time.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 4: Use Keywords and Chapters for studying</h3>
        <p>
          Once the transcript is ready, two branches are especially useful for studying:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Keywords</strong> — shows every key concept indexed by where it appears in the transcript. If you missed something about "mitochondria" or "the French Revolution," jump directly to that section.</li>
          <li><strong>Chapters</strong> — breaks the lecture into navigable sections based on topic shifts. Useful for reviewing specific parts of a long lecture without re-watching everything.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 5: Move the transcript into your notes app</h3>
        <p>
          Copy the full transcript and paste it into Notion, Obsidian, Google Docs, or any note-taking app. Once it is there:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use Ctrl+F to find any concept or term the professor mentioned.</li>
          <li>Highlight definitions directly in the text.</li>
          <li>Share it with classmates for collaborative note comparison.</li>
          <li>Paste sections into flashcard tools like Anki.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Step 6: Translate if needed</h3>
        <p>
          If the lecture was in English but you study better in your native language, click <strong>Translate</strong> after transcribing. VideoText supports English, Spanish, Hindi, French, Chinese, and Russian translations — available immediately after transcription.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Tips for better accuracy</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Record as close to the professor as possible — distant room audio reduces accuracy.</li>
          <li>If using a phone recorder, place it on the front desk, not in your pocket.</li>
          <li>Set the spoken language correctly before transcribing for non-English lectures.</li>
          <li>Review technical terms specific to your field — AI may misspell discipline-specific words.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How much does it cost?</h3>
        <p>
          The free tier includes 3 uploads per month — enough for most students to transcribe their key lectures. Sign up for free to start. No credit card required.
        </p>
      </div>
    ),
  },
  {
    slug: 'whisper-ai-online',
    date: 'March 29, 2026',
    title: 'Whisper AI: What It Is and How to Use It Online',
    summary: 'OpenAI Whisper is the most accurate free transcription model available. Here is what it is, why it matters, and how to use it without installing anything.',
    tag: 'Guide',
    readTime: '6 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          Whisper is an open-source speech recognition model released by OpenAI in September 2022. It is trained on 680,000 hours of multilingual audio from the internet — roughly 30 times more data than comparable models at the time — and it shows. Whisper large-v3 achieves a word error rate (WER) of around 2.7% on clean English audio, which puts it above paid services like Deepgram, AssemblyAI, and Google Speech-to-Text for many use cases.
        </p>
        <p>
          The catch: Whisper is a Python library. Running it locally requires installing Python, PyTorch, CUDA (if you want GPU acceleration), and about 3 GB of disk space for the large model. For most people — especially on Windows — that process takes 30–90 minutes and frequently runs into dependency conflicts. This is why tens of thousands of people search "whisper ai online" every month. They want the accuracy without the installation.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How Whisper Works</h3>
        <p>
          Whisper uses a transformer encoder-decoder architecture. The audio is split into 30-second chunks, converted to mel spectrograms, and fed to the encoder. The decoder predicts text tokens one at a time, conditioned on the encoded audio representation. This architecture was originally designed for machine translation, which is why Whisper can translate non-English audio directly to English text in a single pass — without needing a separate translation step.
        </p>
        <p>
          Five model sizes are available: tiny, base, small, medium, and large. Large-v3 is the most accurate but requires 10 GB of GPU memory to run. Most self-hosted setups use medium (5 GB) or small (2 GB) as a practical compromise. Hosted services like VideoText run large-v3 on cloud GPUs so you get maximum accuracy without hardware requirements.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What Whisper Is Good At</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Non-English audio:</strong> Whisper supports 99 languages. For Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Hindi, and Arabic, it consistently outperforms commercial services that were trained primarily on English. If you transcribe multilingual content, Whisper is the default choice.</li>
          <li><strong>Technical vocabulary:</strong> Because it was trained on internet audio, Whisper learned domain-specific terminology from podcasts, lectures, and YouTube — medical terms, legal language, programming jargon. Commercial services tuned for call-center audio often miss these.</li>
          <li><strong>Accented speech:</strong> Whisper generalizes well across accents because the training data is globally sourced. It handles Indian, British, Australian, and non-native English speaker accents with notably less degradation than systems trained on narrow datasets.</li>
          <li><strong>Long-form audio:</strong> Whisper handles hours-long recordings without accuracy degradation. Many commercial APIs cap accuracy on long files or require chunking at specific intervals.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">What Whisper Is Not Great At</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Real-time transcription:</strong> Whisper processes audio in chunks and is not optimized for streaming. For live captioning of meetings, services built on different architectures perform better.</li>
          <li><strong>Speaker diarization:</strong> The base Whisper model does not distinguish between speakers. You can run a separate diarization pipeline (Pyannote, for example) and align output, but this adds complexity. VideoText handles this automatically — but it is a post-processing step, not native Whisper capability.</li>
          <li><strong>Very noisy audio:</strong> Whisper handles mild background noise well but degrades on recordings with heavy HVAC noise, music, or multiple simultaneous speakers. Clean audio will always outperform noisy audio regardless of model.</li>
        </ul>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How to Use Whisper Without Installing Anything</h3>
        <p>
          The easiest option is to use a hosted service that runs Whisper on your behalf. <a href="/whisper-online" className="text-blue-600 dark:text-blue-400 hover:underline">VideoText's Whisper online tool</a> runs large-v3 on cloud GPUs. Paste a YouTube URL or upload a file, and you get a transcript in seconds — no Python, no GPU, no setup.
        </p>
        <p>
          The <a href="/video-to-transcript" className="text-blue-600 dark:text-blue-400 hover:underline">video-to-transcript tool</a> accepts MP4, MOV, AVI, WebM, MKV, MP3, WAV, M4A, and most common formats. Free tier includes 3 uploads per month. Pro plan ($7.99/month) unlocks longer files, batch, and multi-language output.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How to Run Whisper Locally (If You Prefer)</h3>
        <p>
          If you want to run Whisper locally without sending files to an external server:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Install Python 3.9+ and pip.</li>
          <li>Run: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">pip install openai-whisper</code></li>
          <li>Install ffmpeg (required for audio decoding).</li>
          <li>Run: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">whisper your-file.mp4 --model large-v3</code></li>
        </ol>
        <p>
          On first run, Whisper downloads the model weights (~3 GB for large-v3). On CPU, a 10-minute file takes 5–15 minutes to transcribe depending on your machine. On a modern GPU (RTX 3080 or better), the same file takes under a minute.
        </p>
        <p>
          Two widely-used local GUIs exist for those who prefer not to use the command line: <strong>MacWhisper</strong> (macOS only, native app with drag-and-drop) and <strong>Whisper Desktop</strong> (Windows, open source). Both wrap the same model and produce identical output quality.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Whisper Model Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-semibold">Model</th>
                <th className="text-left py-2 pr-4 font-semibold">Size</th>
                <th className="text-left py-2 pr-4 font-semibold">GPU RAM</th>
                <th className="text-left py-2 font-semibold">English WER</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">tiny</td>
                <td className="py-2 pr-4">39M params</td>
                <td className="py-2 pr-4">~1 GB</td>
                <td className="py-2">~8.5%</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">base</td>
                <td className="py-2 pr-4">74M params</td>
                <td className="py-2 pr-4">~1 GB</td>
                <td className="py-2">~6.5%</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">small</td>
                <td className="py-2 pr-4">244M params</td>
                <td className="py-2 pr-4">~2 GB</td>
                <td className="py-2">~4.5%</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">medium</td>
                <td className="py-2 pr-4">769M params</td>
                <td className="py-2 pr-4">~5 GB</td>
                <td className="py-2">~3.2%</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold">large-v3</td>
                <td className="py-2 pr-4 font-semibold">1.5B params</td>
                <td className="py-2 pr-4 font-semibold">~10 GB</td>
                <td className="py-2 font-semibold">~2.7%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">WER = Word Error Rate on LibriSpeech clean test set. Lower is better.</p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Whisper vs. Paid Transcription APIs</h3>
        <p>
          For most use cases, Whisper large-v3 is competitive with or superior to commercial APIs at a fraction of the cost. The main advantages of paid APIs are real-time streaming, managed infrastructure, and specialized models fine-tuned for phone audio or medical terminology. If you need live captions or are transcribing call-center audio at scale, commercial APIs may be a better fit. For everything else — YouTube, podcasts, interviews, lectures, meetings — Whisper is the better default.
        </p>
        <p>
          If you want to try it without any setup, upload a video or paste a YouTube URL into <a href="/whisper-online" className="text-blue-600 dark:text-blue-400 hover:underline">VideoText's Whisper tool</a>. Three imports are free, no account required on first visit.
        </p>
      </div>
    ),
  },
  {
    slug: 'whisper-transcription-accuracy',
    date: 'March 29, 2026',
    title: 'AI Transcription Accuracy: How Good is Whisper Really?',
    summary: 'Whisper large-v3 posts a 2.7% word error rate on clean English audio. Here is what that number actually means, where accuracy drops, and how to get the best results from any audio.',
    tag: 'Deep Dive',
    readTime: '7 min read',
    content: (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          "98% accuracy" is the number you see on most transcription marketing pages. It sounds impressive until you realize it means roughly 1 error every 50 words — that is one mistake per sentence in normal conversation. Whether that is acceptable depends entirely on what you are doing with the transcript. For a rough YouTube summary, fine. For a legal deposition, it is not.
        </p>
        <p>
          This post breaks down what transcription accuracy actually means, where Whisper specifically performs well and where it does not, and how to get the best output for your use case.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How Accuracy Is Measured: Word Error Rate</h3>
        <p>
          Word Error Rate (WER) is the standard metric. It counts the number of substitutions, deletions, and insertions needed to transform the predicted transcript into the reference transcript, divided by the total number of words in the reference.
        </p>
        <p>
          A WER of 5% means 5 errors per 100 words. For a 60-minute meeting with roughly 7,500 words, that is 375 errors — between 6 and 7 errors per minute. A WER of 2% means about 150 errors in that same meeting, or roughly 2.5 per minute.
        </p>
        <p>
          The benchmark dataset most commonly used is LibriSpeech clean, which consists of audiobook recordings read by volunteers in quiet environments. It is a best-case scenario. Real-world WER is always higher.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Whisper's Actual Performance by Audio Type</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-semibold">Audio Type</th>
                <th className="text-left py-2 pr-4 font-semibold">Approx. WER</th>
                <th className="text-left py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">Audiobook / read speech</td>
                <td className="py-2 pr-4">2–3%</td>
                <td className="py-2">Benchmark conditions</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">Podcast (condenser mic)</td>
                <td className="py-2 pr-4">3–5%</td>
                <td className="py-2">Typical studio setup</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">YouTube (talking head, quiet room)</td>
                <td className="py-2 pr-4">4–6%</td>
                <td className="py-2">Consumer mic, some room reflection</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">Zoom / Teams call</td>
                <td className="py-2 pr-4">5–9%</td>
                <td className="py-2">Variable bitrate compression, latency artifacts</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">Phone call / voicemail</td>
                <td className="py-2 pr-4">8–15%</td>
                <td className="py-2">Narrow-band codec (8 kHz), heavy compression</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Field recording / ambient noise</td>
                <td className="py-2 pr-4">15–30%+</td>
                <td className="py-2">Wind, crowd, HVAC — depends heavily on SNR</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Where Whisper Specifically Excels</h3>
        <p>
          <strong>Non-English languages.</strong> Whisper's multilingual training data is its biggest differentiator. For Spanish, French, German, Hindi, Chinese, Japanese, and Arabic, Whisper large-v3 typically outperforms commercial services that were built around English-first datasets. A Spanish podcast transcribed with Whisper will be noticeably more accurate than the same recording processed through a generic commercial API.
        </p>
        <p>
          <strong>Technical and domain-specific vocabulary.</strong> Because Whisper was trained on internet audio (YouTube, podcasts, lectures), it absorbed domain vocabulary that call-center-trained models never encountered. Medical terms, coding terminology, legal language, academic jargon — Whisper handles these better than models tuned for generic business conversations.
        </p>
        <p>
          <strong>Accented English.</strong> Whisper generalizes across a wide range of accents because its training data is globally sourced. Indian English, British regional dialects, Australian English, and non-native speakers with Spanish, French, or Mandarin accents all show less accuracy degradation with Whisper than with systems trained on narrow North American datasets.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Where Whisper Struggles</h3>
        <p>
          <strong>Proper nouns.</strong> Names of people, companies, products, and places are the most common error category. Whisper has no knowledge of your org's internal terminology or the name of the person being interviewed. Post-processing find-and-replace for known proper nouns is the standard workaround.
        </p>
        <p>
          <strong>Simultaneous speakers.</strong> Whisper processes audio as a single stream and does not separate overlapping voices. When two people talk at once, accuracy drops and speaker attribution becomes unreliable. This is a fundamental architectural limitation, not a tuning problem.
        </p>
        <p>
          <strong>Filler words and disfluencies.</strong> Whisper sometimes omits "um", "uh", and false starts — which is helpful for clean transcripts but inaccurate for verbatim legal records. The behavior varies by model version and audio content. Verbatim accuracy requires post-processing or using the <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">--word_timestamps</code> flag with human review.
        </p>
        <p>
          <strong>Numbers and dates.</strong> Whisper sometimes writes numbers as words or words as numbers inconsistently. "Three hundred" might appear as "300" or vice versa. Normalization scripts can fix this at scale.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How to Improve Accuracy for Your Specific Use Case</h3>
        <ol className="list-decimal pl-5 space-y-3">
          <li>
            <strong>Set the language explicitly.</strong> Whisper auto-detects language, but explicit setting reduces errors on audio where the first 30 seconds contain music, intro graphics, or silence. Language selection is available in <a href="/video-to-transcript" className="text-blue-600 dark:text-blue-400 hover:underline">VideoText's tool</a> before you start processing.
          </li>
          <li>
            <strong>Improve audio quality before transcribing.</strong> This is the highest-leverage change you can make. Remove background noise with Audacity (Effect → Noise Reduction), trim silence at the start and end, and normalize volume. A 10-minute audio cleanup task can cut WER by 30–50% on noisy recordings.
          </li>
          <li>
            <strong>Use large-v3, not smaller models.</strong> The difference between large-v3 and medium is meaningful on real-world audio — roughly 1–2 WER points. For clean audio it matters less; for noisy audio the gap widens. If you are running Whisper locally and using a smaller model for speed, consider whether the accuracy tradeoff is worth it for your use case.
          </li>
          <li>
            <strong>Post-process proper nouns.</strong> Build a glossary of recurring names, product names, and technical terms specific to your domain. After transcribing, run a find-and-replace pass. This single step eliminates most "obvious" errors in domain-specific content.
          </li>
          <li>
            <strong>Review at 1.5–2x speed.</strong> Even at 98% accuracy, reviewing the transcript while listening to the audio at speed is faster than manual transcription from scratch. Most errors are obvious on a single pass.
          </li>
        </ol>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">How Whisper Compares to Paid Services</h3>
        <p>
          On clean English audio, Whisper large-v3 is within the error margin of Deepgram Nova-2, AssemblyAI Universal-2, and Google Speech-to-Text v2. The gap narrows further when you account for the fact that those services charge $0.0043–$0.007 per minute while Whisper itself is free (you pay for compute if running it yourself, or for a hosted service like VideoText).
        </p>
        <p>
          Where commercial APIs maintain a genuine edge: real-time streaming for live captions, phone-call-optimized models (Deepgram's phone model specifically outperforms Whisper on compressed telephony audio), and enterprise SLAs with guaranteed uptime. For asynchronous transcription of video, podcasts, lectures, and meetings — Whisper large-v3 is the best accuracy-per-dollar option available.
        </p>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6">Bottom Line</h3>
        <p>
          Whisper's accuracy is real. On clean audio — well-recorded podcasts, YouTube videos, Zoom calls with good microphones — you can expect 94–97% accuracy without any tuning. That means 3–6 errors per 100 words, or roughly 1–2 errors per paragraph.
        </p>
        <p>
          The practical implication: for most use cases, AI transcription produces a usable draft that needs light editing, not a perfect transcript that needs no editing. If your workflow requires legally verbatim transcripts, plan for human review. If you need a searchable, readable record of meetings, interviews, or content — AI transcription at Whisper quality is accurate enough to use directly for most purposes.
        </p>
        <p>
          Try it on your own audio at <a href="/video-to-transcript" className="text-blue-600 dark:text-blue-400 hover:underline">VideoText's transcription tool</a>. Upload a file or paste a URL — three imports are free.
        </p>
      </div>
    ),
  },
]

/** Merge static + AI-generated posts. Generated posts converted to BlogPost shape. */
const ALL_POSTS: BlogPost[] = [
  ...GENERATED_POSTS.map((gp) => ({
    slug: gp.slug,
    date: gp.date,
    title: gp.title,
    summary: gp.summary,
    tag: gp.tag,
    readTime: gp.readTime,
    content: (
      <div
        className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed blog-generated-content"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: gp.contentHtml }}
      />
    ),
  })),
  ...POSTS,
]

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="block text-left w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
          {post.tag}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{post.date}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{post.readTime}</span>
      </div>
      <h2 className="text-base font-medium text-gray-900 dark:text-white mb-2 leading-snug">{post.title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{post.summary}</p>
      <span className="mt-4 inline-block text-sm text-blue-600 dark:text-blue-400 font-medium">Read more →</span>
    </Link>
  )
}

function PostView({ post }: { post: BlogPost }) {
  return (
    <div>
      <Link
        to="/blog"
        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium mb-8 inline-block"
      >
        ← All posts
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
          {post.tag}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{post.date}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{post.readTime}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white mb-6 leading-snug">{post.title}</h1>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        {post.content}
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Free accounts include 3 uploads per month; Pro plan ($7.99/month) unlocks longer files, batch, and guideline handoff from transcript results.</p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Link
            to="/video-to-transcript"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Open Video → Transcript
          </Link>
          <Link
            to="/guideline-format"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 text-sm font-semibold px-5 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
          >
            Format your transcript to a client style guide →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Blog() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const activePost = slug ? (ALL_POSTS.find((p) => p.slug === slug) ?? null) : null

  // 404 redirect for unknown slugs
  if (slug && !activePost) {
    navigate('/blog', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {activePost ? (
          <PostView post={activePost} />
        ) : (
          <>
            <div className="mb-10">
              <h1 className="text-3xl font-medium text-gray-900 dark:text-white mb-2">VideoText blog — transcription, subtitles, and workflow guides</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Engineering and product notes plus practical guides. Need client-style prep?{' '}
                <Link to="/guideline-format" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold">
                  Format your transcript to a client style guide →
                </Link>
                {' · '}
                <Link to="/changelog" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                  Changelog →
                </Link>
              </p>
            </div>

            <div className="space-y-4">
              {ALL_POSTS.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
