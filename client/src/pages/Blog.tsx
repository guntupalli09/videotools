import { Link, useParams, useNavigate } from 'react-router-dom'

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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 1: Download your Zoom recording</h3>
        <p>
          For <strong>cloud recordings</strong>: Log in to zoom.us → Recordings → find your meeting → click Download. Zoom gives you an MP4 (video), an M4A (audio only), and optionally a VTT file if you had Zoom's own transcription enabled.
        </p>
        <p>
          For <strong>local recordings</strong>: Zoom saves them to your Documents/Zoom folder by default. Open Zoom → Meetings → Recorded → Show in Finder/Explorer. The file ends in .mp4.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 2: Upload to VideoText</h3>
        <p>
          Go to <strong>Video to Transcript</strong>. Drag your Zoom MP4 into the upload zone or click to browse. Most Zoom recordings are 100–500 MB; the upload handles that fine over a normal broadband connection.
        </p>
        <p>
          You do not need an account for the first three imports.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 3: Wait for transcription</h3>
        <p>
          A 60-minute Zoom call typically transcribes in 4–7 minutes. You see the transcript build in real time as segments complete — you do not stare at a spinner until the end. For a 30-minute call, expect 2–4 minutes.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 4: Use Speakers, Summary, or Chapters</h3>
        <p>
          Once the transcript is ready, three branches become available:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Speakers</strong> — groups paragraphs by speaker (Speaker 1, 2, etc.). For a two-person call, this cleanly separates interviewer and interviewee or manager and report.</li>
          <li><strong>Summary</strong> — extracts decisions, action items, and key points. Useful for sending meeting notes immediately after the call.</li>
          <li><strong>Chapters</strong> — breaks the transcript into navigable sections. Good for long all-hands or team calls where you want to jump to a specific topic.</li>
        </ul>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 5: Translate (optional)</h3>
        <p>
          If you need the transcript in another language — for a global team or a client who speaks Hindi or Spanish — click Translate and pick the target language. The translation appears in a new tab alongside the original.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 6: Download or copy</h3>
        <p>
          Click Copy to grab the full transcript as plain text. Or use the Exports branch (paid plans) to download as JSON, Markdown, CSV, or Notion-style format for your note-taking workflow.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Common questions</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">What SRT looks like</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">What VTT looks like</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">When to use SRT</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>YouTube</strong> — SRT is the recommended format for YouTube Studio subtitle uploads.</li>
          <li><strong>Vimeo</strong> — Accepts SRT; it is the most common upload format.</li>
          <li><strong>Social media</strong> — LinkedIn, Facebook, and TikTok all accept SRT.</li>
          <li><strong>Video editing software</strong> — Premiere Pro, DaVinci Resolve, and CapCut all import SRT.</li>
          <li><strong>Any platform that is not explicitly web-only</strong> — SRT is the safer default.</li>
        </ul>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">When to use VTT</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>HTML5 video players</strong> — The <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;track&gt;</code> element in HTML natively reads VTT.</li>
          <li><strong>Custom web players</strong> — Video.js, Plyr, and similar players default to VTT.</li>
          <li><strong>Safari</strong> — Safari's native player prefers VTT over SRT.</li>
          <li><strong>When you need position control</strong> — VTT lets you set subtitle position and alignment per cue, which SRT cannot do.</li>
        </ul>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">The practical answer for most people</h3>
        <p>
          <strong>Use SRT unless you are building a web video player or your platform specifically requires VTT.</strong> SRT is accepted everywhere VTT is, and also by older tools and platforms that pre-date the VTT standard. If you upload to YouTube, use SRT. If you are embedding video on your own site with an HTML5 player, use VTT.
        </p>
        <p>
          VideoText generates both from the same upload. Choose at the point of download — no re-processing needed.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Converting between formats</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 1: Generate the subtitle file</h3>
        <p>
          Go to <strong>Video to Subtitles</strong>. Upload your video (MP4, MOV, AVI, WebM — up to the limit shown). Choose your output format: <strong>SRT</strong> for YouTube/Vimeo/social, <strong>VTT</strong> for web players. Set the spoken language if you know it — auto-detect works but setting the language manually improves accuracy for non-English content.
        </p>
        <p>
          Click Generate. The transcript runs through AI speech recognition and creates a timed subtitle file. For a 5-minute video, this takes about 30–60 seconds.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 2: Fix timing and formatting (optional but recommended)</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 3a: Upload to YouTube (soft subtitles)</h3>
        <p>
          In YouTube Studio: open your video → Subtitles → Add → Upload File. Select your SRT. YouTube maps the timestamps automatically. The subtitles appear in the video player as a toggleable CC track. This is the best approach for YouTube — do not burn them in, because viewers can turn YouTube's automatic captions off and your uploaded captions are higher quality.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 3b: Burn into the video (hard subtitles)</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 4: Translate for other markets (optional)</h3>
        <p>
          If you want the same video in Spanish, Arabic, Hindi, or another language: go to <strong>Translate Subtitles</strong>. Upload the SRT. Pick the target language. Download the translated SRT with the original timestamps preserved. You can then burn the translated version into a separate copy of the video.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">What about accessibility?</h3>
        <p>
          Soft subtitles (uploaded SRT files) are better for accessibility than burned-in captions, because screen readers and closed-caption tools can interact with them. If your goal is ADA or WCAG compliance, upload the SRT to the platform rather than burning it in.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Is all of this free?</h3>
        <p>
          Sign up for free to get 3 imports per month across all tools. Resets on the 1st of each month. Paid plans start at $19/month if you need more volume.
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">What we tested</h3>
        <p>
          We ran the same 15-minute interview clip through six tools: VideoText, Otter.ai, Descript, Whisper (direct), Rev's free tier, and Tactiq. Same file, same audio quality, measured accuracy by word error rate against a hand-corrected reference transcript.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Otter.ai</h3>
        <p>
          <strong>Free tier:</strong> 300 minutes/month, requires account. <strong>Accuracy:</strong> Excellent for English, strong for meetings with multiple speakers. Speaker diarization is the best in class — it labels speakers and learns names over time if you stay in the ecosystem. <strong>Privacy:</strong> Otter stores your transcripts and audio indefinitely in their cloud. They use aggregated data for model improvement. <strong>Best for:</strong> Teams doing frequent meetings in English who want a persistent transcript library.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Descript</h3>
        <p>
          <strong>Free tier:</strong> 1 hour of transcription, requires account, watermark on exports. <strong>Accuracy:</strong> Very good. Descript's real differentiator is the editor — you edit the video by editing the transcript text. Removing filler words is one click. <strong>Privacy:</strong> Files are stored in Descript's cloud. <strong>Best for:</strong> Podcast editors and video producers who want to edit audio/video by editing text. Not a pure transcription tool.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">OpenAI Whisper (direct)</h3>
        <p>
          <strong>Free tier:</strong> Free to run locally if you have a capable GPU. Free via API at very low cost. <strong>Accuracy:</strong> State of the art — this is the model most tools are built on, including VideoText. <strong>Privacy:</strong> Complete if run locally; API calls go to OpenAI. <strong>Best for:</strong> Developers and technical users comfortable running Python. Not practical for most people without setup.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Rev (free tier)</h3>
        <p>
          <strong>Free tier:</strong> Limited; Rev is primarily a paid human transcription service. Their AI tier is $0.25/minute. <strong>Accuracy:</strong> Human transcripts are the gold standard; AI tier is Whisper-class. <strong>Best for:</strong> Legal, medical, or financial content where you need guaranteed accuracy and are willing to pay for human review.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">VideoText</h3>
        <p>
          <strong>Free tier:</strong> 3 imports per month (resets on the 1st), sign up for free, watermark on subtitle exports. <strong>Accuracy:</strong> Whisper-based, same model as the field. <strong>Privacy:</strong> Files are deleted after processing — we store no transcript, no audio, no video. <strong>Best for:</strong> One-off transcription where you do not want your content stored, or workflows that also need subtitle generation, translation, fixing, or burning.
        </p>
        <p>
          <strong>Where we fall short:</strong> We do not have persistent storage — if you close the tab, the transcript is gone. We do not have a collaborative workspace. Speaker diarization is not as mature as Otter's. We do not support audio-only files natively.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Summary table</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Our recommendation</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">What this means for you</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>If a job fails and you tell us, we look at the actual logs — not a summarised error code.</li>
          <li>If something is broken in a specific browser or on a specific file type, we can reproduce it the same day.</li>
          <li>If you have a feature request, it goes directly into the backlog, not into a "we'll pass this along" void.</li>
        </ul>
        <p>
          We also built the in-app Tex assistant for questions that do not need a human — "which plan includes batch processing?" or "why is my SRT file misaligned?" Tex handles those instantly so the email queue stays clear for real issues.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Our current SLA</h3>
        <p>
          We aim to reply to all support emails within 24 hours, usually faster. If your job fails, the minutes are automatically returned to your account — no chasing required. If you are on a paid plan and something is wrong, we will prioritise a fix the same day.
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">How it works</h3>
        <p>
          When you upload a file, it lands in a temporary directory on the processing server. The worker picks it up, runs FFmpeg extraction, sends the audio to Whisper for transcription, assembles the result, and streams it back to your browser. Once the job is marked complete, the temp file is deleted. The transcript and subtitle files you download are never stored server-side — they are generated on the fly and sent directly to your browser.
        </p>
        <p>
          We store job metadata (duration, tool type, plan at time of job) for billing accuracy and analytics. We do not store the transcript text, the subtitle content, or any frame of your video.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Why this also makes us faster</h3>
        <p>
          When you don't store files, you don't need the infrastructure to serve them. No S3 bucket reads, no CDN layer, no database lookups for file assets. The processing pipeline is a straight line: upload → extract → transcribe → return. That simplicity is part of why our median job latency is lower than tools that round-trip through object storage.
        </p>
        <p>
          It also means our pricing can be lower. Storage is not free. Tools that keep your files forever are building a storage cost into every subscription tier whether you realise it or not.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">What this means for you</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 1: Upload</h3>
        <p>
          Files are uploaded in 10 MB chunks. This means a 500 MB video does not fail if your connection drops halfway — the upload resumes from the last successful chunk. The moment the final chunk arrives, the job is enqueued immediately. You do not wait for a "finalisation" step.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 2: Extraction-first</h3>
        <p>
          We do not transcribe the video directly. First, FFmpeg strips the audio track into a compressed mono WAV. This extraction happens in seconds even for long videos. The smaller audio file then goes to Whisper. This matters because Whisper's processing time scales with audio duration, not video file size — so a high-bitrate 4K video with a 30-minute audio track processes the same as a compressed 720p file of the same length.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 3: Streaming transcription</h3>
        <p>
          Whisper processes the audio in segments. As each segment completes, it is streamed back to your browser via Server-Sent Events. You see the transcript building in real time rather than staring at a spinner waiting for the full file. This is why the "time to first word" feel of VideoText is fast even on longer videos — you are seeing actual output within the first 15–30 seconds of processing, not after the whole job finishes.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 4: Priority queue</h3>
        <p>
          Jobs are queued in Redis with plan-based priority weights. Agency jobs have the highest weight, then Pro/Creator Pro, then Basic, then Free. Under normal load this makes no difference — the queue empties faster than it fills. Under heavy load (multiple large batch jobs running simultaneously), paid users pre-empt free-tier jobs automatically. This is the main practical difference between the free tier and paid plans from a speed perspective.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Numbers</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Method 1: VideoText (best for accuracy and export options)</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Method 2: YouTube's built-in caption export (fastest for English content)</h3>
        <p>
          If the video has auto-generated or manually added captions, you can export them directly from YouTube Studio — but only for videos you own.
        </p>
        <p>
          For videos you do not own, YouTube shows a text transcript in the video description area on desktop: click the three-dot menu below the video → "Show transcript". This gives you timestamped text you can copy, but it cannot be downloaded as a file and it is limited to auto-captions (which are often inaccurate for non-English or fast speech).
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Method 3: YouTube Data API (for developers)</h3>
        <p>
          YouTube's captions API lets you fetch the caption track for a video programmatically. This requires a Google API key and returns the auto-generated VTT or SRT track. It is the fastest method at scale but requires setup, only works for videos with captions already, and the auto-caption quality varies widely.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Which method should you use?</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>You want the transcript for research or writing:</strong> VideoText (best accuracy, translate, summarise)</li>
          <li><strong>You want to quickly skim what was said:</strong> YouTube's built-in "Show transcript" panel</li>
          <li><strong>You're processing many videos automatically:</strong> YouTube Data API (for videos with captions) or VideoText API (for Whisper accuracy at scale)</li>
          <li><strong>You need subtitles/SRT for re-uploading:</strong> VideoText, then Video to Subtitles</li>
        </ul>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">What about age-restricted videos or private videos?</h3>
        <p>
          VideoText can transcribe age-restricted videos if you provide your YouTube cookies (for logged-in access). Private or unlisted videos can be transcribed if you have the direct URL. Videos that require account login to view cannot be processed without your authentication cookies.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">How accurate is the result?</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Supported formats</h3>
        <p>
          VideoText accepts audio embedded in video files: MP4, MOV, AVI, WebM, and MKV. For pure audio files (MP3, M4A, WAV, FLAC), the easiest approach is to wrap the audio in a video container using a free tool like FFmpeg:
        </p>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-xs font-mono overflow-x-auto">
          {`ffmpeg -i your-recording.mp3 -c:a copy output.mp4`}
        </pre>
        <p>
          This creates an MP4 with no video track that VideoText processes the same as a video file. Alternatively, upload your audio file directly — many video hosts (Vimeo, YouTube) accept audio-only uploads that produce a static image video, which you can then paste as a URL.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step-by-step: audio to text</h3>
        <ol className="list-decimal pl-5 space-y-3">
          <li>Go to <strong>Video to Transcript</strong> on VideoText</li>
          <li>Upload your audio file (wrapped in MP4, or upload a video file with audio)</li>
          <li>Set the <strong>spoken language</strong> — this matters most for non-English content. Auto-detect works but manual is faster and more accurate</li>
          <li>Click <strong>Transcribe</strong></li>
          <li>Watch the transcript build in real time</li>
          <li>Copy, download, or translate when complete</li>
        </ol>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Getting the best accuracy</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">What about very long recordings?</h3>
        <p>
          VideoText processes recordings in streamed segments. A 60-minute audio recording transcribes in approximately 5–8 minutes. You see output appearing within the first 30 seconds — you do not wait for the full job to complete before reading.
        </p>
        <p>
          For recordings longer than 2 hours, the free tier handles the file but the job may be queued behind paid-tier jobs during peak hours. Paid plans (from $19/month) give queue priority.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Free alternatives</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 1: Get your subtitle file</h3>
        <p>
          You need an SRT or VTT file first. If you do not have one, generate it: go to <strong>Video to Subtitles</strong>, upload your video, and download the SRT. This takes 1–3 minutes for a 10-minute video.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 2: Translate using VideoText</h3>
        <p>
          Go to <strong>Translate Subtitles</strong>. Upload your SRT or VTT file. Choose the target language from the dropdown — VideoText supports 50+ languages including:
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Step 3: Download and use</h3>
        <p>
          Download the translated SRT or VTT. The translated file is ready to upload to YouTube, Vimeo, or your video player. You can also burn it into a second copy of the video using <strong>Burn Subtitles</strong> — useful for creating localised social media versions.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Common questions</h3>
        <p>
          <strong>Do I need to re-time the subtitles after translating?</strong> No. The timestamps are preserved from the source file. The translated text fits within the same display windows. If the translation produces significantly longer text per line, you may want to run it through <strong>Fix Subtitles</strong> after translating to auto-split long lines.
        </p>
        <p>
          <strong>What if I need to translate from a non-English language?</strong> VideoText handles this — upload a French SRT, translate to Arabic or Japanese. The tool detects the source language automatically.
        </p>
        <p>
          <strong>Can I translate transcript text (not subtitle files)?</strong> Yes. After generating a transcript in <strong>Video to Transcript</strong>, click the Translate button in the transcript view to see the full text in your target language. This produces a plain-text translation without timestamps — useful for reading, summarising, or sharing.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">What about right-to-left languages (Arabic, Hebrew)?</h3>
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">How it works</h3>
        <p>
          Upload up to 20 videos in a single session. Choose your subtitle language (or multiple languages on Pro/Agency). The jobs run in parallel workers — not sequentially. When all jobs complete, you download a single ZIP file containing one SRT per video, named to match your original filenames.
        </p>
        <p>
          If one video fails (corrupt file, unsupported codec, audio too short), the rest of the batch continues. The ZIP includes the successful files and a log showing which files failed and why.
        </p>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Who uses this</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Video editors processing a client's monthly content calendar in one session.</li>
          <li>Podcasters captioning every episode of a back-catalogue in an afternoon.</li>
          <li>Agencies running localisation workflows that need subtitles in three languages per video.</li>
          <li>Educators uploading a full course library for accessibility compliance.</li>
        </ul>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">Plan availability</h3>
        <p>
          Batch processing requires a Pro, Creator Pro, or Agency plan. Pro supports up to 20 videos per batch with a 60-minute total duration. Agency supports up to 100 videos with a 300-minute total. Creator Pro matches Pro limits at $10/month for early users.
        </p>
      </div>
    ),
  },
]

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="block text-left w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full">
          {post.tag}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{post.date}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{post.readTime}</span>
      </div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2 leading-snug">{post.title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{post.summary}</p>
      <span className="mt-4 inline-block text-sm text-violet-600 dark:text-violet-400 font-medium">Read more →</span>
    </Link>
  )
}

function PostView({ post }: { post: BlogPost }) {
  return (
    <div>
      <Link
        to="/blog"
        className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium mb-8 inline-block"
      >
        ← All posts
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full">
          {post.tag}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{post.date}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{post.readTime}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-snug">{post.title}</h1>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        {post.content}
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Sign up for free — 3 imports per month, no credit card required.</p>
        <Link
          to="/video-to-transcript"
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          Try the tool →
        </Link>
      </div>
    </div>
  )
}

export default function Blog() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const activePost = slug ? (POSTS.find((p) => p.slug === slug) ?? null) : null

  // 404 redirect for unknown slugs
  if (slug && !activePost) {
    navigate('/blog', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {!activePost && (
          <Link to="/" className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium mb-6 inline-block">
            ← Back to home
          </Link>
        )}

        {activePost ? (
          <PostView post={activePost} />
        ) : (
          <>
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Blog</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Engineering, product, and privacy writing from the VideoText team.{' '}
                <Link to="/changelog" className="text-violet-600 hover:text-violet-700 dark:text-violet-400 font-medium">
                  See the changelog →
                </Link>
              </p>
            </div>

            <div className="space-y-4">
              {POSTS.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
