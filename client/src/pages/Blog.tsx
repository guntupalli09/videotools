import { useState } from 'react'
import { Link } from 'react-router-dom'

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

function PostCard({ post, onSelect }: { post: BlogPost; onSelect: (slug: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(post.slug)}
      className="text-left w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all"
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
    </button>
  )
}

function PostView({ post, onBack }: { post: BlogPost; onBack: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium mb-8 inline-block"
      >
        ← All posts
      </button>

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
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Try VideoText for free — 3 imports per month, no credit card required.</p>
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
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const activePost = POSTS.find((p) => p.slug === activeSlug) ?? null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {!activePost && (
          <Link to="/" className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium mb-6 inline-block">
            ← Back to home
          </Link>
        )}

        {activePost ? (
          <PostView post={activePost} onBack={() => setActiveSlug(null)} />
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
                <PostCard key={post.slug} post={post} onSelect={setActiveSlug} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
