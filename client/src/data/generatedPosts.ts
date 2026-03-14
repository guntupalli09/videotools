/**
 * Auto-generated blog posts.
 * DO NOT EDIT MANUALLY — this file is written by scripts/blog/generate-blog-post.ts
 * Run via: npm run blog:generate  (or automatically every Monday via GitHub Actions)
 *
 * Each post has HTML content rendered via dangerouslySetInnerHTML in Blog.tsx.
 * Content is AI-generated (Claude Sonnet) using topics from scripts/blog/topics.json.
 */

export interface GeneratedPost {
  slug: string
  date: string
  title: string
  summary: string
  tag: string
  readTime: string
  contentHtml: string
}

/**
 * GENERATED_POSTS — appended weekly by the blog automation script.
 * Newest post first.
 */
export const GENERATED_POSTS: GeneratedPost[] = [
  {
    slug: 'how-to-transcribe-podcast-episode',
    date: 'March 14, 2026',
    title: "How to Transcribe a Podcast Episode (Free, Any Format)",
    summary: "Learn how to transcribe a podcast episode from any audio format in minutes. Step-by-step guide covering MP3, M4A, speaker labels, and show notes export.",
    tag: 'Guide',
    readTime: '6 min read',
    contentHtml: "<p>To transcribe a podcast episode, upload your MP3 or M4A file to <a href='/video-to-transcript'>VideoText&apos;s transcript tool</a>, and you&apos;ll have a full text transcript in roughly 20–40% of the episode&apos;s runtime. A 60-minute episode typically takes 12–15 minutes to process. No account required on the free tier.</p><h3>What You Need Before You Start</h3><p>You don&apos;t need to convert your audio to any special format. VideoText accepts MP3, M4A, MP4, WAV, and most common podcast export formats directly. If your podcast host gives you a download link, that works too — you can paste a URL instead of uploading a file.</p><p>One thing that affects accuracy more than anything else: audio quality. Clean recordings with minimal background noise hit 98.5% accuracy with Whisper large-v3. Recordings with heavy room echo, crosstalk, or low bitrates will drop noticeably. If you&apos;re transcribing an older episode with audio issues, the transcript will still be useful but expect more manual cleanup.</p><h3>Step-by-Step: Transcribing Your Episode</h3><ol><li><strong>Go to <a href='/video-to-transcript'>VideoText&apos;s video-to-transcript tool</a></strong> — it handles audio files just as well as video.</li><li><strong>Upload your file or paste a URL.</strong> For most podcast hosts, right-click the episode download button and copy the direct MP3 link. Paste it in, and VideoText fetches the file itself.</li><li><strong>Start transcription.</strong> The transcript streams in real time as it processes, so you can start reading while it&apos;s still running. No waiting for a finished-job email.</li><li><strong>Add speaker labels manually.</strong> VideoText doesn&apos;t auto-identify speakers by name, but the transcript breaks on speaker turns. You can do a quick find-and-replace in the exported text — swap &quot;Speaker 1&quot; for your host name, &quot;Speaker 2&quot; for your guest, and so on. Takes about 2 minutes for a standard interview format.</li><li><strong>Export.</strong> Copy the plain text for show notes, or export as a structured file if you need timestamps.</li></ol><h3>Actual Time Estimates by Episode Length</h3><div class='overflow-x-auto'><table><thead><tr><th>Episode Length</th><th>Processing Time</th><th>Manual Cleanup (clean audio)</th></tr></thead><tbody><tr><td>15 minutes</td><td>3–4 min</td><td>5–10 min</td></tr><tr><td>30 minutes</td><td>6–8 min</td><td>10–15 min</td></tr><tr><td>60 minutes</td><td>12–15 min</td><td>20–30 min</td></tr><tr><td>90 minutes</td><td>18–22 min</td><td>30–45 min</td></tr></tbody></table></div><p>These are real-world estimates for clean audio. Add 50–100% to the cleanup column if your recording has background noise, heavy accents, or multiple overlapping speakers.</p><h3>Turning the Transcript into Show Notes</h3><p>A raw transcript isn&apos;t show notes — it&apos;s the raw material. Here&apos;s what most podcasters actually do with it:</p><ul><li><strong>Summary paragraph:</strong> Paste the first 500 words into an AI writing tool and ask for a 3-sentence summary. That becomes your episode description.</li><li><strong>Timestamps:</strong> VideoText includes word-level timestamps in the export. Search for topic transitions in the transcript, grab the timestamp, and you have a chapter list ready to paste into YouTube or your podcast host.</li><li><strong>Pull quotes:</strong> Skim the transcript for strong one-liners. These make good social media clips and newsletter quotes. Easier to spot in text than by re-listening.</li><li><strong>SEO keywords:</strong> The transcript text is indexable content. Publishing it on your episode page improves search visibility, especially for niche topic keywords your audience actually searches.</li></ul><h3>If You Publish Video Podcasts</h3><p>If your podcast also goes out as a video on YouTube, you can take this a step further. Use <a href='/video-to-subtitles'>VideoText&apos;s subtitle tool</a> to generate a timed SRT file from the same upload. YouTube&apos;s auto-captions are noticeably worse than Whisper on technical topics, proper nouns, and accented speech — replacing them with an accurate SRT file takes about 2 minutes in YouTube Studio and meaningfully improves accessibility.</p><p>If you need the subtitles in another language — say, your podcast has a Spanish-speaking audience — <a href='/translate-subtitles'>translate the subtitles</a> directly in VideoText. It supports 50+ languages and keeps the timing intact so you don&apos;t have to re-sync anything.</p><p>For shows that record separate video and audio tracks, timing occasionally drifts. The <a href='/fix-subtitles'>fix subtitles tool</a> handles timing corrections without you needing to manually shift every cue.</p><h3>A Note on Privacy</h3><p>Podcast interviews often include pre-release content, guest conversations, or sponsor details you haven&apos;t published yet. VideoText deletes all uploaded files immediately after processing — nothing is stored on the server. That&apos;s the default behavior, not an opt-in setting.</p><p><strong>Ready to start?</strong> Upload your first episode — up to 3 imports free per month — at <a href='/video-to-transcript'>VideoText&apos;s transcript tool</a>. If you produce more than 3 episodes a month, <a href='/pricing'>paid plans start at $10/month</a> with no per-minute charges.</p>",
  },
  // Posts will be appended here automatically by scripts/blog/generate-blog-post.ts
]
