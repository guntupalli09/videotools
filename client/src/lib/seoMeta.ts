/**
 * Thin SEO meta adapter. Single source of truth for SEO pages is seoRegistry.
 * Static routes (home, pricing, core tools, legal) are defined here only.
 */
import { SITE_URL, SITE_NAME, getCanonicalUrlForPath } from './seo'
import { ENTITY_DESCRIPTION, PRODUCT_CATEGORY, PRIMARY_DEFINITION } from './productDna'
import { getAllSeoEntries } from './seoRegistry'
import { resolveInternalLinkPath } from './primaryUrls'
import { getAggregateRatingJsonLd, type PublicRating } from './publicRating'

/** Core conversion URLs that must emit at most one SoftwareApplication and no HowTo. */
export const MONEY_CORE_PATHS = [
  '/video-to-transcript',
  '/video-to-subtitles',
  '/translate-subtitles',
  '/fix-subtitles',
  '/burn-subtitles',
  '/compress-video',
  '/guideline-format',
  '/youtube-transcript-generator',
] as const

export function isMoneyCorePath(pathname: string): boolean {
  return (MONEY_CORE_PATHS as readonly string[]).includes(pathname)
}

/** Static (non-SEO-registry) routes: title + description. */
const STATIC_ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'VideoText: Video to Text & Subtitles | VideoText',
    description:
      'VideoText is AI video-to-text software: transcript, SRT/VTT, summary, and chapters from a video or YouTube URL. Whisper large-v3. 3 free imports/mo.',
  },
  '/pricing': {
    title: 'Pricing — Free, Basic, Pro & Agency Plans | VideoText',
    description:
      "VideoText pricing: Free 3 imports/month, Basic $19 (450 min), Pro $49 (1,200 min), Agency $129 (3,000 min). Multi-language, batch on Pro+. 7-day money-back guarantee.",
  },
  '/integrations/zapier': {
    title: 'VideoText + Zapier — Automate Transcription & Subtitles | VideoText',
    description:
      'Connect VideoText to Zapier to automatically transcribe audio/video, generate and translate subtitles, fix subtitle timing, burn captions into video, and compress video from apps like Google Drive, Gmail, and Slack.',
  },
  '/docs/api': {
    title: 'API Documentation | VideoText',
    description:
      'VideoText API reference: authentication, endpoints for transcription, subtitles, translation, subtitle repair, burning, and compression, job polling, errors, and rate limits.',
  },
  '/privacy': {
    title: 'Privacy Policy — We Don\'t Store Your Data | VideoText',
    description:
      "VideoText privacy: We process your files and delete them. We don't keep your uploads, transcripts, or outputs. Your content stays yours. Read our full policy.",
  },
  '/faq': {
    title: 'VideoText FAQ — Privacy, Billing & Guides',
    description:
      'Answers on privacy (files deleted after jobs), billing, uploads, subtitles, verbatim modes, transcription QA prep, and how Format → Client guidelines fits your workflow.',
  },
  '/site-index': {
    title: 'All VideoText Pages — Workflow Index',
    description:
      'Internal index of VideoText transcription, subtitle, formatting, free tool, comparison, and alternatives pages.',
  },
  '/guide': {
    title: 'How to use VideoText — Tools & Workflows',
    description:
      'Tool-by-tool steps for Video → Transcript, Format → Client guidelines (marketplace presets + editable cards), subtitles, translate, fix, burn, compress, batch, voice, and YouTube URLs. Inputs, outputs, limits.',
  },
  '/terms': {
    title: 'Terms of Service | VideoText',
    description:
      "Terms of use for VideoText. We don't store your data; see our Privacy Policy for details. Billing via Stripe. Use the service in accordance with these terms.",
  },
  '/voice-recorder': {
    title: 'Voice to Text — In-Browser Recorder | VideoText',
    description:
      'Speak in the browser and get text. No video upload to start. Privacy-first: files deleted after processing. Free: 3 imports/mo, no card; watermark on free exports.',
  },
  '/video-to-transcript': {
    title: 'Video to Transcript — Free AI, 98.5% | VideoText',
    description:
      'Upload video or a YouTube URL. Get transcript, SRT/VTT, summary, and chapters. Whisper large-v3. Files deleted after processing. 3 free imports/mo.',
  },
  '/guideline-format': {
    title: 'Format Transcripts to Client Guides | VideoText',
    description:
      'Format a transcript to Rev, GoTranscript, TranscribeMe, or Scribie-style rules. Editable presets. Files deleted after processing. 3 free imports/mo.',
  },
  '/video-to-subtitles': {
    title: 'Video to Subtitles — Full Caption Hub | VideoText',
    description:
      'Caption-first hub: video or YouTube URL → timed SRT/VTT, then fix, translate, or burn. Transcript + summary lives on Video to Transcript. 3 free imports/mo.',
  },
  '/translate-subtitles': {
    title: 'Translate Subtitles to Any Language | VideoText',
    description:
      'Translate SRT or VTT to 70+ languages with timestamps intact. Upload, pick a language, download. Free to try. Files deleted after processing.',
  },
  '/fix-subtitles': {
    title: 'Fix Subtitles — Timing, CPS & Lines | VideoText',
    description:
      'Fix overlapping timestamps, long lines, CPS/reading-speed, and SRT/VTT formatting. Upload, download a cleaned file. Files deleted after processing.',
  },
  '/burn-subtitles': {
    title: 'Burn Subtitles into Video — Hardcode | VideoText',
    description:
      'Hardcode SRT or VTT into video. Upload video + captions, download one file. For Instagram, TikTok, and players without caption tracks. 3 free imports/mo.',
  },
  '/compress-video': {
    title: 'Compress Video — Light, Medium, Heavy | VideoText',
    description:
      'Compress video online with light, medium, or heavy settings. Reduce size for uploads and sharing. Files deleted after processing. 3 free imports/mo.',
  },
  '/batch-process': {
    title: 'Batch Video to Subtitles — Multiple Videos at Once',
    description:
      'Generate SRT subtitles for many videos in one go. Upload multiple videos, get one ZIP of subtitle files. Pro plan. Multi-language optional.',
  },
  '/blog': {
    title: 'VideoText blog — transcription, subtitles, and workflow guides',
    description:
      'Product updates, privacy notes, and practitioner guides—including how to prep transcripts against client style guides before QA.',
  },
  '/samples': {
    title: 'Transcript & Subtitle Output Samples | VideoText',
    description:
      'See real transcript samples, subtitle previews, and workflow outputs (summary, chapters, exports) so you know exactly what VideoText generates.',
  },
  '/preview/icp-results-studio': {
    title: 'ICP Results Studio Preview | VideoText',
    description:
      'Preview a clean post-transcript results UX for context-aware outputs, multi-asset generation, collaboration comments, and drop-anything ingestion.',
  },
  '/blog/how-to-transcribe-zoom-recording': {
    title: "Zoom's Built-In Transcript Was 68% Accurate. Here's How We Got It to 98.5%. | VideoText",
    description:
      "We ran the same Zoom recording through Zoom's native transcript, Otter.ai, and VideoText. Here are the word-error counts and the exact steps to go from 68% to 98.5% accuracy.",
  },
  '/blog/srt-vs-vtt-subtitle-formats': {
    title: 'SRT vs VTT: I Uploaded Both to YouTube, Vimeo, and 4 Other Platforms to Find Out | VideoText',
    description:
      'Not all subtitle platforms accept both formats. SRT breaks on some players, VTT breaks on others. We tested the same file on 6 platforms and documented exactly which format works where.',
  },
  '/blog/how-to-add-subtitles-to-video-free': {
    title: 'I Added Subtitles to 50 Videos This Week. The Fastest Method Took 4 Minutes Each. | VideoText',
    description:
      'Three free methods for adding subtitles to any video. Method 1 took 37 minutes per video. Method 3 took 4. Here is the difference — and why most people use the slower one.',
  },
  '/blog/best-way-to-get-youtube-transcript': {
    title: "YouTube's Auto-Transcript Got 23 Words Wrong in 60 Seconds. Here's a Better Way. | VideoText",
    description:
      "We compared YouTube's CC export, the YouTube API, and VideoText on the same video. One method is 6x faster and 40% more accurate. Exact numbers inside.",
  },
  '/blog/youtube-captions-vs-ai-transcription': {
    title: 'YouTube Auto-Captions vs. AI Transcription: We Ran the Same Video Through Both | VideoText',
    description:
      "YouTube's auto-captions missed 31 technical terms in a 10-minute video. AI transcription caught all but 2. Full comparison — accuracy, export options, and SEO impact.",
  },
  '/blog/how-to-download-youtube-subtitles': {
    title: '3 Ways to Download YouTube Subtitles — We Timed and Tested Each Method | VideoText',
    description:
      'YouTube Studio, third-party tools, and direct API — we tested all three on the same video and measured speed, format options, and whether the timestamps survived.',
  },
  '/blog/best-free-transcription-tools-2026': {
    title: 'I Tested Otter, Descript, Whisper & Rev on the Same 2-Hour File — Here\'s What Happened | VideoText',
    description:
      'Otter finished in 4 minutes. Descript took 31. Rev Human took 24 hours and cost $30. We tested 8 tools on identical audio and ranked them by accuracy, speed, and price per hour.',
  },
  '/blog/how-we-handle-support': {
    title: 'We Read Every Support Email Ourselves. Here Is What That Means in Practice. | VideoText',
    description:
      'Every support email is read by the person who built the product. No ticket queue, no template responses, no 48-hour wait. Here is how it works.',
  },
  '/blog/why-we-delete-your-files': {
    title: 'We Delete Every File After Transcription. Here\'s Why That Makes Us 6x Faster. | VideoText',
    description:
      'Privacy-first design is not just an ethical choice — it is an architectural one that makes everything run leaner and faster. Here is the actual pipeline.',
  },
  '/blog/processing-speed-breakdown': {
    title: 'From Upload to SRT in 4 Minutes: Inside VideoText\'s Transcription Pipeline | VideoText',
    description:
      'What actually happens between "upload complete" and your subtitle file — and why VideoText processes a 60-minute video in under 15 minutes when competitors take hours.',
  },
  '/blog/batch-subtitles-for-creators': {
    title: 'We Captioned 20 Videos in One Session and Downloaded a Single ZIP — Here\'s How | VideoText',
    description:
      'The batch tool was built for creators processing a week of content in one session. 20 videos, one ZIP, zero babysitting. Here is the exact workflow and time breakdown.',
  },
  '/blog/how-to-get-youtube-transcript': {
    title: '3 Ways to Get a YouTube Transcript — We Timed Each Method | VideoText',
    description:
      "Method 1: YouTube CC export — 8 steps, no timestamps. Method 2: VideoText URL paste — 3 steps, full timestamps. Method 3: YouTube API — developer-only. Full breakdown inside.",
  },
  '/blog/how-to-transcribe-audio-to-text-free': {
    title: 'Free Audio-to-Text in 2026: We Compared 4 Methods on the Same MP3 | VideoText',
    description:
      'We ran the same 30-minute MP3 through 4 free transcription methods: browser-based, local Whisper, Otter free tier, and VideoText. Speed, accuracy, and word count compared.',
  },
  '/blog/how-to-translate-subtitles': {
    title: 'I Translated the Same SRT File into 6 Languages — Only 2 Tools Kept the Timestamps | VideoText',
    description:
      'Google Translate broke the SRT format on 3 of 6 tests. DeepL lost timestamps on 2. VideoText kept all intact. We ran the same file through 5 tools and documented what broke.',
  },
  '/changelog': {
    title: 'Changelog — What\'s New | VideoText',
    description:
      'VideoText changelog: new features, performance improvements, and bug fixes. Updated every release. See what has shipped.',
  },
  '/compare': {
    title: 'VideoText vs Descript, Otter.ai & Trint — speed, price, subtitles, privacy',
    description:
      'Side-by-side on video uploads, subtitle exports, turnaround, pricing, and storage—includes how freelancers use marketplace preset checklists (Format → Client guidelines) before QA.',
  },
  '/descript-alternative': {
    title: 'Best Free Descript Alternative for Transcription & Subtitles | VideoText',
    description:
      'Looking for a Descript alternative? VideoText transcribes video 6x faster, starts free ($0 vs $24/mo), and deletes your files. No heavy editor required. Try free.',
  },
  '/otter-ai-alternative': {
    title: 'Best Otter.ai Alternative for Video Files & Subtitles | VideoText',
    description:
      'Otter.ai doesn\'t support video uploads or SRT export. VideoText does — plus YouTube URL input, subtitle translation, and file deletion. Free tier available.',
  },
  '/trint-alternative': {
    title: 'Cheaper Trint Alternative That Starts Free | VideoText',
    description:
      'Trint starts at $80/month. VideoText starts free — same Whisper AI accuracy, plus subtitle burning, batch processing, and translation. Pro at $49/month.',
  },
  '/rev-alternative': {
    title: 'Best Rev Alternative with Flat-Rate Pricing | VideoText',
    description:
      'Rev AI charges $0.25/minute. VideoText starts free — same AI accuracy, plus subtitle export, translation, and YouTube support. Pro at $49/month with no per-minute fees.',
  },
  '/happyscribe-alternative': {
    title: 'Best Free HappyScribe Alternative – Transcription & Subtitles | VideoText',
    description:
      'HappyScribe starts at $17/month with no free tier and no YouTube URL input. VideoText is free to start — upload any video or paste a YouTube link, get SRT, translate, and burn subtitles.',
  },
  '/sonix-alternative': {
    title: 'Best Free Sonix Alternative – No Per-Minute Fees | VideoText',
    description:
      'Sonix charges $22/month plus $0.10/minute overage. VideoText starts free — Whisper AI accuracy, YouTube URL support, subtitle burning, zero per-minute billing. Pro at $49/month flat.',
  },
  '/easyscribe-alternative': {
    title: 'Best EasyScribe Alternative for Video & Subtitles | VideoText',
    description:
      'EasyScribe only does basic audio transcription. VideoText handles video files, YouTube URLs, SRT subtitle export, 70+ language translation, and subtitle burning. Free tier available.',
  },
  '/notta-alternative': {
    title: 'Best Free Notta Alternative for Video Files & Subtitles | VideoText',
    description:
      "Notta's free plan caps files at 3 minutes. VideoText supports files up to the plan duration — transcribe longer videos, export SRT/VTT, translate to 70+ languages, and burn subtitles. Free tier available.",
  },
  '/about': {
    title: 'About VideoText — AI Transcription Built for Speed & Privacy',
    description:
      'VideoText transcribes video to text in under 5 minutes with 98.5%+ word accuracy. Powered by OpenAI Whisper. Privacy-first: files deleted after processing. 127,000+ videos transcribed. Free tier available.',
  },
  '/status': {
    title: 'VideoText Status – System Status & Uptime',
    description:
      'Check real-time status, uptime, and incident history for VideoText services including Transcription API, Subtitle Generation, AI Summaries, and more.',
  },
  '/open': {
    title: 'Open Stats — Accuracy, Speed & Transparency | VideoText',
    description:
      'VideoText publishes real processing stats: 127,000+ videos transcribed, 98.5% word accuracy benchmarks, median processing times, and full tech stack. Updated monthly.',
  },

  '/transcription-benchmark': {
    title: 'Fastest Transcription Software? Benchmark Data & Methodology',
    description:
      'Benchmark reference for broad transcription software evaluation: median and P90 processing speed, output depth checks, and reproducible methodology by file length.',
  },
  '/accuracy-test': {
    title: 'Transcription Accuracy Test — Condition-Based Results | VideoText',
    description:
      'Condition-level transcription accuracy reference with measured word accuracy ranges and structured tool comparison for practical selection.',
  },

  '/best-transcription-tool': {
    title: 'Fastest Transcription Tool for Long Videos (Transcript + Subtitles + Summary)',
    description:
      'Transcribe long videos in minutes. Get transcript, subtitles, summary, and chapters in one workflow. Fast, accurate, and built for real production use.',
  },
  '/fastest-transcription-software': {
    title: 'Fastest Transcription Software — Benchmark Comparison | VideoText',
    description:
      'Speed-first comparison of AI transcription tools with P50/P90 throughput context, condition notes, and workflow fit guidance.',
  },
  '/fastest-transcription-tool': {
    title: 'Fastest Transcription Tool — Long-Form Benchmark Winner',
    description:
      'Fastest way to transcribe long videos with tested benchmark conditions, comparison table, and objective workflow guidance.',
  },
  '/otter-vs-videotext': {
    title: 'Otter vs VideoText — Side-by-Side Comparison',
    description:
      'Direct comparison of Otter and VideoText across speed, output formats, transcript quality, pricing, and best workflow fit.',
  },
  '/descript-vs-videotext': {
    title: 'Descript vs VideoText — Transcription Workflow Comparison',
    description:
      'Compare Descript and VideoText for editing-first vs transcription-first workflows with clear best-for guidance.',
  },
  '/ai-transcription-tools': {
    title: 'AI Transcription Tools — Neutral Comparison Hub',
    description:
      'Neutral AI transcription comparison hub covering speed, condition-based accuracy, output quality, and best-fit workflow by tool.',
  },

  '/videotext-vs-turboscribe': {
    title: 'VideoText vs TurboScribe — Workflow Comparison',
    description: 'Compare VideoText and TurboScribe for speed, output depth, and long-form content repurposing workflows.',
  },
  '/turboscribe-alternative': {
    title: 'Best TurboScribe Alternative for Subtitles, Summaries & Chapters',
    description: 'Switch from transcript-only workflows. VideoText generates transcript, SRT/VTT subtitles, speaker labels, summary, and chapters in one upload.',
  },
  '/videotext-vs-rev': {
    title: 'VideoText vs Rev (2025) — Pricing, Accuracy & Features Compared',
    description: 'Rev AI charges $0.25/min. Rev Human charges $1.50+/min. VideoText is 6× cheaper, supports 90+ languages, produces transcript + subtitles + summary + chapters, and deletes files immediately. Full comparison.',
  },
  '/temi-vs-videotext': {
    title: 'Temi vs VideoText (2025) — Pricing, Accuracy, Speed & Features Compared',
    description: 'Temi charges $0.25/min and supports English only. VideoText is 6× cheaper, supports 90+ languages, and produces transcript + SRT + VTT + summary + chapters per upload. Full 360° comparison also covering Rev vs VideoText.',
  },
  '/best-otter-alternatives': {
    title: 'Best Otter Alternatives — Fast Transcription Tools',
    description: 'Compare leading Otter alternatives with speed, output quality, and best-use-case guidance.',
  },
  '/best-descript-alternatives': {
    title: 'Best Descript Alternatives — Transcription-First Options',
    description: 'Compare Descript alternatives for teams prioritizing transcription speed and structured outputs.',
  },
  '/ai-transcription-workflow': {
    title: 'AI Transcription Workflow — Video to Publish-Ready Content',
    description: 'Build an AI video-to-content workflow: transcript, subtitles, summary, and chapters in minutes.',
  },
  '/podcast-transcription-tool': {
    title: 'Podcast Transcription Tool — Long Episode Workflow',
    description: 'Convert long podcast episodes into transcript, subtitles, summaries, and chapters with one workflow.',
  },
  '/interview-transcription-tool': {
    title: 'Interview Transcription Tool — Fast Structured Outputs',
    description: 'Transcribe interview recordings into publish-ready transcript and subtitle outputs quickly.',
  },
  '/youtube-video-to-transcript': {
    title: 'YouTube Video to Transcript — Repurpose Long Videos',
    description: 'Turn long YouTube videos into transcript, subtitles, summary, and chapters in minutes.',
  },
  '/blog/best-transcription-software-2026': {
    title: 'We Benchmarked 15 Transcription Tools on a 2-Hour Video. One Finished in 4 Minutes. | VideoText',
    description:
      'We tested 15 tools — Otter, Descript, Rev, Trint, TurboScribe, and 10 others — on the same 2-hour recording. Accuracy, price per hour, export options, and turnaround time.',
  },
  '/blog/best-video-captioning-tools-2026': {
    title: '12 Video Captioning Tools Tested: Which Is Actually Free, Accurate & Fast in 2026 | VideoText',
    description:
      'We tested 12 video captioning tools including Kapwing, Descript, Submagic, and VideoText. Most free tiers are traps — here is exactly what you get and what you pay when you scale.',
  },
  '/blog/how-to-transcribe-podcast-episode': {
    title: "I Transcribed a 90-Minute Podcast Episode in 18 Minutes — Here's the Exact Process | VideoText",
    description: "Full walkthrough: upload your MP3 or M4A, get a speaker-labeled transcript, extract show notes and chapter timestamps, and export in under 20 minutes. No account needed.",
  },
  '/blog/how-to-add-captions-youtube-video': {
    title: "YouTube's Auto-Captions Had 47 Errors in My 10-Minute Video. Here's the Fix. | VideoText",
    description: "We documented every error in YouTube's auto-captions on a 10-minute video, then replaced them with an uploaded SRT. The fix took 8 minutes. Accuracy went from 81% to 98.5%.",
  },
  // Free tools — client-side, no server
  '/tools': {
    title: 'Free Video & Subtitle Tools — No Account Needed | VideoText',
    description: 'Free browser-based tools for video creators: SRT to VTT converter, subtitle validator, reading speed checker, script timer, bitrate calculator, and more. No upload, no account.',
  },
  '/tools/srt-to-vtt': {
    title: 'SRT to VTT Converter — Free Online | VideoText',
    description: 'Convert SRT subtitle files to WebVTT format instantly. Paste or upload your .srt file and download a ready-to-use .vtt file. Free, no account, runs in your browser.',
  },
  '/tools/vtt-to-srt': {
    title: 'VTT to SRT Converter — Free Online | VideoText',
    description: 'Convert WebVTT (.vtt) subtitle files to SubRip (.srt) format. Free, browser-based, nothing uploaded to any server.',
  },

  '/free-captions-and-subtitles': {
    title: 'Free Captions and Subtitles — Create SRT & VTT Online | VideoText',
    description: 'Create free captions and subtitles for videos. Generate SRT and VTT files, validate timing, check reading speed, and prepare accessible caption files for YouTube, Vimeo, and social video.',
  },
  '/translation': {
    title: 'Translation — Translate Subtitles and Caption Files | VideoText',
    description: 'Translate subtitle files while preserving timestamps. Use VideoText for SRT and VTT translation workflows, multilingual caption delivery, and accessible translated video publishing.',
  },
  '/subtitle-validator': {
    title: 'Subtitle Validator — Check SRT & VTT Files Free | VideoText',
    description: 'Validate SRT and VTT subtitles for timestamp overlaps, empty cues, long lines, malformed numbering, and reading speed issues before publishing captions.',
  },
  '/subtitle-reading-speed': {
    title: 'Subtitle Reading Speed Checker — CPS Analyzer | VideoText',
    description: 'Check subtitle reading speed with characters-per-second and words-per-minute guidance for Netflix, BBC, EBU, YouTube, and social captions.',
  },
  '/subtitle-character-checker': {
    title: 'Subtitle Character Limits — Pass/Fail | VideoText',
    description: 'Check SRT or VTT line lengths against Netflix (42), YouTube (80), or BBC (37) limits. Instant pass/fail per cue. Free, in-browser, no account.',
  },
  '/subtitle-word-counter': {
    title: 'Subtitle Word Counter — Count Words in SRT & VTT Files | VideoText',
    description: 'Count words, characters, cues, WPM, and CPS in subtitle files. Use the report to estimate subtitle density, reading speed, and caption editing workload.',
  },

  '/tools/shift-subtitle-timing': {
    title: 'Shift Subtitle Timing — Delay or Advance Subtitles Free | VideoText',
    description: 'Fix out-of-sync subtitles by shifting all timestamps forward or backward by any number of seconds. Works with SRT and VTT. Free, browser-based.',
  },
  '/tools/merge-srt-files': {
    title: 'Merge SRT Files — Combine Two Subtitle Files Free | VideoText',
    description: 'Combine two SRT or VTT subtitle files into one sorted, renumbered file. Free, runs in browser, no account required.',
  },
  '/tools/srt-to-text': {
    title: 'SRT to Plain Text — Extract Text from Subtitles Free | VideoText',
    description: 'Strip timing codes and indices from SRT or VTT files and extract clean plain text. Perfect for repurposing subtitles as blog posts or transcripts. Free.',
  },
  '/tools/subtitle-validator': {
    title: 'Subtitle Validator — Check SRT & VTT Files Free | VideoText',
    description: 'Validate SRT and VTT files for overlapping timestamps, empty cues, long lines, and reading speed errors. Instant report, free, no upload needed.',
  },
  '/tools/subtitle-reading-speed': {
    title: 'Subtitle Reading Speed Checker — CPS Analyzer | VideoText',
    description: 'Check every subtitle cue for characters-per-second against Netflix (17 CPS), BBC (17 CPS), and EBU (21 CPS) broadcast standards. Free online tool.',
  },
  '/tools/subtitle-character-checker': {
    title: 'Subtitle Character Limits — Pass/Fail | VideoText',
    description: 'Check SRT or VTT line lengths against Netflix (42), YouTube (80), or BBC (37) limits. Instant pass/fail per cue. Free, in-browser, no account.',
  },
  '/tools/subtitle-word-counter': {
    title: 'Subtitle Word Counter — Count Words in SRT & VTT Files | VideoText',
    description: 'Count words, characters, and get speaking rate stats (WPM, CPS) from any SRT or VTT subtitle file. Free, browser-based, instant results.',
  },
  '/tools/video-script-timer': {
    title: 'Video Script Timer — How Long Will My Video Be? | VideoText',
    description: 'Paste your video script and instantly see how long the video will be at different speaking rates. Free tool for YouTube, ads, shorts, and explainers.',
  },
  '/tools/words-per-minute-calculator': {
    title: 'Words Per Minute Calculator — Speaking Rate Checker | VideoText',
    description: 'Calculate your speaking rate in words per minute (WPM). Enter text and recording duration, or word count and time. Instant result, free.',
  },
  '/tools/video-bitrate-calculator': {
    title: 'Video Bitrate Calculator — File Size & Quality Estimator | VideoText',
    description: 'Calculate the ideal video bitrate for a target file size, or estimate how large your video will be at a given bitrate. Free online calculator.',
  },
  '/tools/aspect-ratio-calculator': {
    title: 'Video Aspect Ratio Calculator — 16:9, 9:16, 1:1 & More | VideoText',
    description: 'Calculate video aspect ratios, find missing dimensions for 16:9, 9:16, 4:3, and custom ratios. Free for YouTube, TikTok, Instagram, and more.',
  },
  '/tools/timestamp-converter': {
    title: 'Timestamp Converter — Seconds to HH:MM:SS, SRT, VTT & Timecode | VideoText',
    description: 'Convert timestamps between seconds, HH:MM:SS, SRT format, VTT format, and SMPTE timecode. Instant, free, no account needed.',
  },
  '/tools/video-metadata-viewer': {
    title: 'Video Metadata Viewer — Check Video Info Free | VideoText',
    description: 'View video file details — duration, resolution, aspect ratio, and file size — locally in your browser. Nothing is uploaded. Free tool.',
  },
  '/tools/sbv-to-srt': {
    title: 'SBV to SRT Converter — Convert YouTube Captions Free | VideoText',
    description: 'Convert YouTube SBV caption files to standard SRT format instantly. Free, browser-based, nothing uploaded to any server. Works with all YouTube .sbv downloads.',
  },
  '/tools/srt-to-sbv': {
    title: 'SRT to SBV Converter — Convert Subtitles to YouTube Format Free | VideoText',
    description: 'Convert SRT subtitle files to YouTube\'s native SBV format. Free, browser-based, instant download. No account required.',
  },
  '/tools/ass-to-srt': {
    title: 'ASS / SSA to SRT Converter — Strip Styling, Keep Dialogue Free | VideoText',
    description: 'Convert ASS or SSA subtitle files to plain SRT. Strips all styling tags and positioning codes, preserves dialogue text and timing. Free, runs in your browser.',
  },
  '/tools/html-to-srt': {
    title: 'HTML to SRT Converter — Convert HTML Captions & Transcripts Free | VideoText',
    description: 'Convert HTML captions or transcript exports to SRT format. Supports data-start timing attributes, TTML-style begin/end attributes, and bracketed timestamps. Free, browser-based.',
  },
  '/tools/ttml-to-srt': {
    title: 'TTML to SRT Converter — Convert DFXP & EBU-TT Subtitles Free | VideoText',
    description: 'Convert TTML, DFXP, or EBU-TT subtitle files to SRT format. Used for Netflix, broadcast, and enterprise video workflows. Free, browser-based.',
  },
  '/subtitle-tools': {
    title: 'Free Subtitle Tools: Convert & Validate | VideoText',
    description: 'Free browser subtitle tools: convert SRT↔VTT, shift timing, validate files, check reading speed and character limits. No account. Nothing uploaded.',
  },
  '/subtitle-resources': {
    title: 'Subtitle Resources & Standards — Formats, Netflix Rules, CPS Limits | VideoText',
    description: 'Subtitle format specs, Netflix delivery requirements, platform character limits, reading speed standards, and timing rules — all in one reference guide.',
  },
  '/blog/video-transcription-accuracy-whisper': {
    title: "Whisper AI Transcription Accuracy: What to Expect in 2026 | VideoText",
    description: "Real benchmark data on Whisper AI transcription accuracy by language, audio quality, and speaker count. Know what to expect before you process your video.",
  },
  '/blog/how-to-translate-video-subtitles': {
    title: "How to Translate Video Subtitles to Any Language | VideoText",
    description: "Learn how to translate video subtitles in two ways: upload an SRT file or transcribe and translate from scratch. Covers YouTube, TikTok, eLearning, and more.",
  },
  '/blog/srt-file-format-explained': {
    title: "SRT File Format Explained: Everything You Need to Know | VideoText",
    description: "Learn how the SRT file format works: timestamp syntax, character limits, common errors, and when to use SRT vs VTT vs ASS. With a real example.",
  },
  '/blog/rev-style-guide-transcript-formatter': {
    title: 'Rev Style Guide Transcript Formatter — Freelancer QA Workflow | VideoText',
    description:
      'Map AI transcripts onto Rev transcription style rules faster: verbatim modes, speaker labels, inaudible tags, editable checklist, then proof for payout.',
  },
  '/blog/how-to-earn-more-per-hour-as-a-transcriptionist': {
    title: 'How to Earn More Per Hour as a Transcriptionist (AI + QA Stack) | VideoText',
    description:
      'Raise effective hourly transcription pay by cutting rework: AI first pass, preset style guides for GoTranscript/Rev clients, repeatable QA logs, faster invoicing.',
  },
  '/blog/clean-verbatim-vs-full-verbatim': {
    title: 'Clean Verbatim vs Full Verbatim — Transcription Freelancer Guide | VideoText',
    description:
      'Clean verbatim removes filler vs full verbatim keeps disfluencies. Learn marketplace differences, payouts, tagging, when to escalate — with VideoText presets.',
  },
  '/blog/what-is-transcript-qa': {
    title: 'What Is Transcript QA? Compliance Checklist for Agencies | VideoText',
    description:
      'Transcript QA defined: glossary, timestamps, readability, tagging, speaker labels. Separate QA from transcription; align rubrics inside VideoText guideline workspace.',
  },
  '/blog/freelance-transcription-style-guide-cheatsheet': {
    title: 'Freelance Transcription Style Guide Cheatsheet (GoTranscript, Scribie) | VideoText',
    description:
      'One-page freelancer cheatsheet aligning GoTranscript, Scribie, and custom PDF client briefs to editable presets so QA matches invoice-ready deliverables.',
  },
}

/** Static breadcrumb items (non-SEO-registry routes). */
const STATIC_ROUTE_BREADCRUMB: Record<string, { name: string; path: string }[]> = {
  '/voice-recorder': [{ name: 'Home', path: '/' }, { name: 'Voice Recorder', path: '/voice-recorder' }],
  '/pricing': [{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }],
  '/faq': [{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }],
  '/guide': [{ name: 'Home', path: '/' }, { name: 'Guide', path: '/guide' }],
  '/privacy': [{ name: 'Home', path: '/' }, { name: 'Privacy', path: '/privacy' }],
  '/terms': [{ name: 'Home', path: '/' }, { name: 'Terms', path: '/terms' }],
  '/about': [{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }],
  '/samples': [{ name: 'Home', path: '/' }, { name: 'Samples', path: '/samples' }],
  '/preview/icp-results-studio': [{ name: 'Home', path: '/' }, { name: 'ICP Results Studio', path: '/preview/icp-results-studio' }],
  '/compare': [{ name: 'Home', path: '/' }, { name: 'Compare', path: '/compare' }],
  '/descript-alternative': [{ name: 'Home', path: '/' }, { name: 'Descript Alternative', path: '/descript-alternative' }],
  '/otter-ai-alternative': [{ name: 'Home', path: '/' }, { name: 'Otter.ai Alternative', path: '/otter-ai-alternative' }],
  '/trint-alternative': [{ name: 'Home', path: '/' }, { name: 'Trint Alternative', path: '/trint-alternative' }],
  '/rev-alternative': [{ name: 'Home', path: '/' }, { name: 'Rev Alternative', path: '/rev-alternative' }],
  '/happyscribe-alternative': [{ name: 'Home', path: '/' }, { name: 'HappyScribe Alternative', path: '/happyscribe-alternative' }],
  '/sonix-alternative': [{ name: 'Home', path: '/' }, { name: 'Sonix Alternative', path: '/sonix-alternative' }],
  '/easyscribe-alternative': [{ name: 'Home', path: '/' }, { name: 'EasyScribe Alternative', path: '/easyscribe-alternative' }],
  '/notta-alternative': [{ name: 'Home', path: '/' }, { name: 'Notta Alternative', path: '/notta-alternative' }],
  '/status': [{ name: 'Home', path: '/' }, { name: 'Status', path: '/status' }],
  '/open': [{ name: 'Home', path: '/' }, { name: 'Open Stats', path: '/open' }],
  '/transcription-benchmark': [{ name: 'Home', path: '/' }, { name: 'Transcription Benchmark', path: '/transcription-benchmark' }],
  '/accuracy-test': [{ name: 'Home', path: '/' }, { name: 'Accuracy Test', path: '/accuracy-test' }],
  '/best-transcription-tool': [{ name: 'Home', path: '/' }, { name: 'Best Transcription Tool', path: '/best-transcription-tool' }],
  '/fastest-transcription-software': [{ name: 'Home', path: '/' }, { name: 'Fastest Transcription Software', path: '/fastest-transcription-software' }],
  '/fastest-transcription-tool': [{ name: 'Home', path: '/' }, { name: 'Fastest Transcription Tool', path: '/fastest-transcription-tool' }],
  '/otter-vs-videotext': [{ name: 'Home', path: '/' }, { name: 'Otter vs VideoText', path: '/otter-vs-videotext' }],
  '/descript-vs-videotext': [{ name: 'Home', path: '/' }, { name: 'Descript vs VideoText', path: '/descript-vs-videotext' }],
  '/ai-transcription-tools': [{ name: 'Home', path: '/' }, { name: 'AI Transcription Tools', path: '/ai-transcription-tools' }],

  '/videotext-vs-turboscribe': [{ name: 'Home', path: '/' }, { name: 'VideoText vs TurboScribe', path: '/videotext-vs-turboscribe' }],
  '/videotext-vs-rev': [{ name: 'Home', path: '/' }, { name: 'VideoText vs Rev', path: '/videotext-vs-rev' }],
  '/temi-vs-videotext': [{ name: 'Home', path: '/' }, { name: 'Compare', path: '/compare' }, { name: 'Temi vs VideoText', path: '/temi-vs-videotext' }],
  '/best-otter-alternatives': [{ name: 'Home', path: '/' }, { name: 'Best Otter Alternatives', path: '/best-otter-alternatives' }],
  '/best-descript-alternatives': [{ name: 'Home', path: '/' }, { name: 'Best Descript Alternatives', path: '/best-descript-alternatives' }],
  '/ai-transcription-workflow': [{ name: 'Home', path: '/' }, { name: 'AI Transcription Workflow', path: '/ai-transcription-workflow' }],
  '/podcast-transcription-tool': [{ name: 'Home', path: '/' }, { name: 'Podcast Transcription Tool', path: '/podcast-transcription-tool' }],
  '/interview-transcription-tool': [{ name: 'Home', path: '/' }, { name: 'Interview Transcription Tool', path: '/interview-transcription-tool' }],
  '/youtube-video-to-transcript': [{ name: 'Home', path: '/' }, { name: 'YouTube Video to Transcript', path: '/youtube-video-to-transcript' }],
  '/blog/best-transcription-software-2026': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Best Transcription Software 2026', path: '/blog/best-transcription-software-2026' }],
  '/blog/best-video-captioning-tools-2026': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Best Video Captioning Tools 2026', path: '/blog/best-video-captioning-tools-2026' }],
  '/blog/rev-style-guide-transcript-formatter': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Rev Style Guide Transcript Formatter', path: '/blog/rev-style-guide-transcript-formatter' }],
  '/blog/how-to-earn-more-per-hour-as-a-transcriptionist': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Earn More Per Hour (Transcriptionist)', path: '/blog/how-to-earn-more-per-hour-as-a-transcriptionist' }],
  '/blog/clean-verbatim-vs-full-verbatim': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Clean Verbatim vs Full Verbatim', path: '/blog/clean-verbatim-vs-full-verbatim' }],
  '/blog/what-is-transcript-qa': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'What Is Transcript QA', path: '/blog/what-is-transcript-qa' }],
  '/blog/freelance-transcription-style-guide-cheatsheet': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Freelance Style Guide Cheatsheet', path: '/blog/freelance-transcription-style-guide-cheatsheet' }],
  '/blog': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }],
  '/tools': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }],
  '/tools/srt-to-vtt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'SRT to VTT', path: '/tools/srt-to-vtt' }],
  '/tools/vtt-to-srt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'VTT to SRT', path: '/tools/vtt-to-srt' }],
  '/tools/shift-subtitle-timing': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing' }],
  '/tools/merge-srt-files': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Merge SRT Files', path: '/tools/merge-srt-files' }],
  '/tools/srt-to-text': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'SRT to Text', path: '/tools/srt-to-text' }],

  '/free-captions-and-subtitles': [{ name: 'Home', path: '/' }, { name: 'Free Captions and Subtitles', path: '/free-captions-and-subtitles' }],
  '/translation': [{ name: 'Home', path: '/' }, { name: 'Translation', path: '/translation' }],
  '/subtitle-validator': [{ name: 'Home', path: '/' }, { name: 'Subtitle Validator', path: '/subtitle-validator' }],
  '/subtitle-reading-speed': [{ name: 'Home', path: '/' }, { name: 'Reading Speed Checker', path: '/subtitle-reading-speed' }],
  '/subtitle-character-checker': [{ name: 'Home', path: '/' }, { name: 'Character Limit Checker', path: '/subtitle-character-checker' }],
  '/subtitle-word-counter': [{ name: 'Home', path: '/' }, { name: 'Subtitle Word Counter', path: '/subtitle-word-counter' }],
  '/tools/subtitle-validator': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Subtitle Validator', path: '/tools/subtitle-validator' }],
  '/tools/subtitle-reading-speed': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Reading Speed Checker', path: '/tools/subtitle-reading-speed' }],
  '/tools/subtitle-character-checker': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Character Limit Checker', path: '/tools/subtitle-character-checker' }],
  '/tools/subtitle-word-counter': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Subtitle Word Counter', path: '/tools/subtitle-word-counter' }],
  '/tools/video-script-timer': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Video Script Timer', path: '/tools/video-script-timer' }],
  '/tools/words-per-minute-calculator': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Words Per Minute Calculator', path: '/tools/words-per-minute-calculator' }],
  '/tools/video-bitrate-calculator': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Video Bitrate Calculator', path: '/tools/video-bitrate-calculator' }],
  '/tools/aspect-ratio-calculator': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Aspect Ratio Calculator', path: '/tools/aspect-ratio-calculator' }],
  '/tools/timestamp-converter': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Timestamp Converter', path: '/tools/timestamp-converter' }],
  '/tools/video-metadata-viewer': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'Video Metadata Viewer', path: '/tools/video-metadata-viewer' }],
  '/tools/sbv-to-srt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'SBV to SRT', path: '/tools/sbv-to-srt' }],
  '/tools/srt-to-sbv': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'SRT to SBV', path: '/tools/srt-to-sbv' }],
  '/tools/ass-to-srt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'ASS to SRT', path: '/tools/ass-to-srt' }],
  '/tools/ttml-to-srt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'TTML to SRT', path: '/tools/ttml-to-srt' }],
  '/tools/html-to-srt': [{ name: 'Home', path: '/' }, { name: 'Free Tools', path: '/tools' }, { name: 'HTML to SRT', path: '/tools/html-to-srt' }],
  '/blog/how-to-transcribe-podcast-episode': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Transcribe Podcast Episode', path: '/blog/how-to-transcribe-podcast-episode' }],
  '/blog/how-to-add-captions-youtube-video': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Add Captions to YouTube Video', path: '/blog/how-to-add-captions-youtube-video' }],
  '/subtitle-tools': [{ name: 'Home', path: '/' }, { name: 'Subtitle Tools', path: '/subtitle-tools' }],
  '/subtitle-resources': [{ name: 'Home', path: '/' }, { name: 'Subtitle Resources', path: '/subtitle-resources' }],
  '/blog/how-to-transcribe-zoom-recording': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Transcribe Zoom Recording', path: '/blog/how-to-transcribe-zoom-recording' }],
  '/blog/srt-vs-vtt-subtitle-formats': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'SRT vs VTT', path: '/blog/srt-vs-vtt-subtitle-formats' }],
  '/blog/how-to-add-subtitles-to-video-free': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Add Subtitles Free', path: '/blog/how-to-add-subtitles-to-video-free' }],
  '/blog/best-free-transcription-tools-2026': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Best Free Transcription Tools', path: '/blog/best-free-transcription-tools-2026' }],
  '/blog/how-we-handle-support': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'How We Handle Support', path: '/blog/how-we-handle-support' }],
  '/blog/why-we-delete-your-files': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Why We Delete Your Files', path: '/blog/why-we-delete-your-files' }],
  '/blog/processing-speed-breakdown': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Processing Speed Breakdown', path: '/blog/processing-speed-breakdown' }],
  '/blog/batch-subtitles-for-creators': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Batch Subtitles for Creators', path: '/blog/batch-subtitles-for-creators' }],
  '/blog/how-to-get-youtube-transcript': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Get YouTube Transcript', path: '/blog/how-to-get-youtube-transcript' }],
  '/blog/how-to-transcribe-audio-to-text-free': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Transcribe Audio to Text Free', path: '/blog/how-to-transcribe-audio-to-text-free' }],
  '/blog/how-to-translate-subtitles': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'How to Translate Subtitles', path: '/blog/how-to-translate-subtitles' }],
  '/changelog': [{ name: 'Home', path: '/' }, { name: 'Changelog', path: '/changelog' }],
  '/video-to-transcript': [{ name: 'Home', path: '/' }, { name: 'Video to Transcript', path: '/video-to-transcript' }],
  '/guideline-format': [{ name: 'Home', path: '/' }, { name: 'Format to client guidelines', path: '/guideline-format' }],
  '/video-to-subtitles': [{ name: 'Home', path: '/' }, { name: 'Video to Subtitles', path: '/video-to-subtitles' }],
  '/translate-subtitles': [{ name: 'Home', path: '/' }, { name: 'Translate Subtitles', path: '/translate-subtitles' }],
  '/fix-subtitles': [{ name: 'Home', path: '/' }, { name: 'Fix Subtitles', path: '/fix-subtitles' }],
  '/burn-subtitles': [{ name: 'Home', path: '/' }, { name: 'Burn Subtitles', path: '/burn-subtitles' }],
  '/compress-video': [{ name: 'Home', path: '/' }, { name: 'Compress Video', path: '/compress-video' }],
  '/batch-process': [{ name: 'Home', path: '/' }, { name: 'Batch Process', path: '/batch-process' }],
}

/** Per-route SEO meta. SEO pages from registry; rest from static. */
export const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  ...STATIC_ROUTE_SEO,
  ...Object.fromEntries(
    getAllSeoEntries().map((e) => [e.path, { title: e.title, description: e.description }])
  ),
}

/** Breadcrumb items per path. SEO pages from registry; rest from static. */
export const ROUTE_BREADCRUMB: Record<string, { name: string; path: string }[]> = {
  ...STATIC_ROUTE_BREADCRUMB,
  ...Object.fromEntries(
    getAllSeoEntries().map((e) => [
      e.path,
      [{ name: 'Home', path: '/' }, { name: e.breadcrumbLabel, path: e.path }],
    ])
  ),
}

/** FAQ items for /faq page (global FAQ; not from registry). Used for page content and FAQPage JSON-LD.
 * Keep answers in sync with FAQ_ITEMS in client/src/pages/Faq.tsx. */
const FAQ_SCHEMA_ITEMS = [
  { q: 'Do you store my videos or files?', a: "No. We process your files and then delete them immediately after the job completes. We don't keep your uploads, transcripts, or generated outputs. Your content stays yours." },
  { q: 'Is my content used for AI training?', a: "No. Your content is used only to deliver the service you requested. We do not use it for training AI models or any other secondary purpose." },
  { q: 'Do I need to sign up?', a: "Sign up for a free account to try. No credit card required. You get 3 free imports per month. Upgrade when you need more imports, languages, or batch processing." },
  { q: 'Can I transcribe a YouTube video without downloading it?', a: "Yes. Paste any public youtube.com or youtu.be link into Video to Transcript or the YouTube Transcript Generator — no download needed." },
  { q: 'What file formats are supported?', a: "Videos: MP4, MOV, AVI, WebM (MKV where noted). Subtitles: SRT and VTT. You can also paste a public YouTube URL — no download required." },
  { q: 'How accurate is VideoText transcription?', a: "VideoText uses OpenAI Whisper large-v3. On clear speech with minimal background noise, accuracy is approximately 98.5% word accuracy. Setting the spoken language manually improves results for non-English content." },
  { q: 'How does the free tier work?', a: "Sign up for free (no credit card) to get 3 imports per month. Single language, watermark on subtitle exports. Upgrade any time for more features and batch processing." },
  { q: 'Can I translate subtitles or transcripts?', a: "Yes. Use the Translate Subtitles tool for SRT/VTT files. For transcripts, use the \"Also translate to\" option before starting to get a full translation in 70+ languages." },
  { q: 'What is the maximum video duration?', a: "Free: 30 minutes per video. Pro: 2 hours. To transcribe a longer video, trim or split it into segments before uploading." },
  { q: 'How do I format a transcript for a client\'s style guide or Rev-type rules?', a: 'Use Format → Client guidelines (/guideline-format). Paste your raw transcript or jump from Video → Transcript with "Make this client-ready →". Pick presets such as Rev, GoTranscript, TranscribeMe, or Scribie, tweak the editable rule cards, or upload PDF/DOCX guidance.' },
  { q: 'What does "clean verbatim vs full verbatim" mean for freelancers?', a: 'Clean verbatim removes filler words and disfluencies for readability; full verbatim keeps them. Marketplace briefs spell out which variant you owe—see /blog/clean-verbatim-vs-full-verbatim.' },
  { q: 'What is transcript QA and how does VideoText help before I invoice?', a: 'Transcript QA is the checklist pass against names, glossary, punctuation, timestamps, and style compliance. Produce the text in Video → Transcript, then map platform rules inside /guideline-format so reviewers know what you matched before payout.' },
]

/** Published dates for blog posts — used for BlogPosting JSON-LD and og:article meta. */
export const BLOG_POST_DATES: Record<string, { datePublished: string; dateModified: string }> = {
  '/blog/how-to-transcribe-zoom-recording':    { datePublished: '2026-03-07', dateModified: '2026-03-07' },
  '/blog/srt-vs-vtt-subtitle-formats':         { datePublished: '2026-03-05', dateModified: '2026-03-05' },
  '/blog/how-to-add-subtitles-to-video-free':  { datePublished: '2026-03-03', dateModified: '2026-03-03' },
  '/blog/best-free-transcription-tools-2026':  { datePublished: '2026-03-01', dateModified: '2026-03-01' },
  '/blog/how-we-handle-support':               { datePublished: '2026-03-01', dateModified: '2026-03-01' },
  '/blog/why-we-delete-your-files':            { datePublished: '2026-02-26', dateModified: '2026-02-26' },
  '/blog/processing-speed-breakdown':          { datePublished: '2026-02-25', dateModified: '2026-02-25' },
  '/blog/best-transcription-software-2026':   { datePublished: '2026-03-14', dateModified: '2026-05-10' },
  '/blog/best-video-captioning-tools-2026':   { datePublished: '2026-03-13', dateModified: '2026-05-10' },
  '/blog/how-to-get-youtube-transcript':       { datePublished: '2026-03-14', dateModified: '2026-03-14' },
  '/blog/how-to-transcribe-audio-to-text-free':{ datePublished: '2026-03-12', dateModified: '2026-03-12' },
  '/blog/how-to-translate-subtitles':          { datePublished: '2026-03-10', dateModified: '2026-03-10' },
  '/blog/batch-subtitles-for-creators':        { datePublished: '2026-02-20', dateModified: '2026-02-20' },
  '/blog/how-to-transcribe-podcast-episode':   { datePublished: '2026-03-17', dateModified: '2026-03-17' },
  '/blog/how-to-add-captions-youtube-video':   { datePublished: '2026-03-17', dateModified: '2026-03-17' },
  '/blog/rev-style-guide-transcript-formatter': { datePublished: '2026-05-05', dateModified: '2026-05-05' },
  '/blog/how-to-earn-more-per-hour-as-a-transcriptionist': { datePublished: '2026-05-05', dateModified: '2026-05-05' },
  '/blog/clean-verbatim-vs-full-verbatim': { datePublished: '2026-05-05', dateModified: '2026-05-05' },
  '/blog/what-is-transcript-qa': { datePublished: '2026-05-05', dateModified: '2026-05-05' },
  '/blog/freelance-transcription-style-guide-cheatsheet': { datePublished: '2026-05-05', dateModified: '2026-05-05' },
}

/** BlogPosting JSON-LD for individual blog post pages. Returns null if no date metadata found. */
export function getBlogPostingJsonLd(pathname: string, title: string, description: string): object | null {
  const dates = BLOG_POST_DATES[pathname]
  if (!dates) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url: getCanonicalUrlForPath(pathname),
    datePublished: dates.datePublished,
    dateModified: dates.dateModified,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': getCanonicalUrlForPath(pathname) },
  }
}

export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description: ENTITY_DESCRIPTION,
    sameAs: [
      'https://twitter.com/videotextio',
      'https://www.linkedin.com/company/videotext-io',
      'https://www.producthunt.com/products/videotext',
    ],
  }
}

export function getWebApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: PRIMARY_DEFINITION,
    applicationCategory: PRODUCT_CATEGORY,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}

/** FAQPage JSON-LD for /faq. */
export function getFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_SCHEMA_ITEMS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

/** FAQPage JSON-LD from arbitrary FAQ items (e.g. SEO tool pages from registry). */
export function getFaqJsonLdFromItems(faq: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}


const AEO_ROUTE_SCHEMAS: Record<string, object[]> = {
  '/video-to-transcript': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I convert a video to a transcript?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Upload any video file (MP4, MOV, MKV, WebM, AVI) or paste a public YouTube URL into VideoText. The tool extracts the audio and transcribes it using OpenAI Whisper large-v3. A full transcript is ready in minutes — no software to install.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long does it take to transcribe a video?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText processes asynchronously: a 2-hour video typically completes in 3–5 minutes. A 30-minute video finishes in under 90 seconds. Processing runs at roughly 1 minute of compute per 24 seconds of video length.',
          },
        },
        {
          '@type': 'Question',
          name: 'How accurate is AI video transcription?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText achieves approximately 98.5% word accuracy on clean English audio using OpenAI Whisper large-v3. Accuracy varies with audio quality, background noise, overlapping speakers, and language. Setting the spoken language before processing improves accuracy for non-English content.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does VideoText store my video files?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. VideoText processes your file and deletes it immediately after transcription completes. No uploads, transcripts, or output files are retained on servers. Your content is never stored, reviewed, or shared.',
          },
        },
        {
          '@type': 'Question',
          name: 'What outputs do I get from one video upload?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Every transcription produces: (1) full timestamped transcript with speaker labels, (2) AI-generated summary with key points, (3) auto-generated chapter markers, and (4) SRT and VTT subtitle files — all from a single upload at no extra cost.',
          },
        },
        {
          '@type': 'Question',
          name: 'What video formats does VideoText support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText accepts MP4, MOV, MKV, WebM, AVI, and most container formats. Audio formats supported: MP3, WAV, M4A, AAC, OGG, FLAC. You can also paste a public YouTube URL to transcribe without downloading the file.',
          },
        },
        {
          '@type': 'Question',
          name: 'What languages does video transcription support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText supports 90+ languages via OpenAI Whisper. Strongest accuracy for English, Spanish, French, German, Italian, Portuguese, Russian, Mandarin Chinese, Japanese, Korean, Arabic, and Hindi. Set the spoken language before processing for best results on non-English content.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I transcribe a YouTube video without downloading it?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Paste any public YouTube URL (youtube.com/watch, youtu.be, YouTube Shorts) and VideoText streams the audio directly from YouTube. No download or local file required.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I transcribe multiple videos at once?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The Pro plan includes batch upload. Upload multiple files simultaneously — VideoText processes all in parallel and delivers one ZIP with all transcripts, subtitle files, and summaries.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does VideoText compare to Otter.ai, Descript, or Rev?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText is faster (2-hour video in ~5 min vs 60+ min on Otter), outputs more per job (transcript + subtitles + summary + chapters in one pass), stores no data (Otter stores indefinitely), and supports 90+ languages equally. Rev uses human transcriptionists — more accurate for legal/medical content but costs $1.25+/min. Descript is a video editor, not a transcription-first tool.',
          },
        },
        {
          '@type': 'Question',
          name: 'What export formats are available?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Export options: TXT (plain text), PDF, DOCX (Microsoft Word), JSON (structured with timestamps and speaker labels), CSV, Notion-compatible format, three-column layout. Subtitle exports: SRT and VTT. All formats are available from the results panel after transcription.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is video transcription free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The free tier includes 3 imports per month with no credit card required. All outputs (transcript, subtitles, summary, chapters) are included in the free tier. Pro plan is $49/month with expanded workflow access.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I use a video transcript for academic research?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. VideoText outputs timestamped transcripts with speaker labels exportable as DOCX or PDF for academic citation. Accuracy (~98.5% on clean audio) is suitable for qualitative research. For legal or clinical use, manual review is recommended. Cite the original video source and note that AI transcription was used.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the difference between a transcript and subtitles (SRT/VTT)?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A transcript is continuous readable text without timing codes — used for reading, research, SEO content, or document repurposing. SRT/VTT subtitle files contain the same text divided into short timed segments with precise timestamps for display on video platforms. VideoText generates both from a single upload.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SpeakableSpecification',
      cssSelector: ['[data-speakable]', 'h1', '.seo-intro'],
    },
  ],
  '/guideline-format': [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Transcript Style Guide Formatter — Rev, GoTranscript, TranscribeMe, Scribie',
      description: 'Apply Rev, GoTranscript, TranscribeMe, or Scribie transcription style guide rules automatically. Paste a raw transcript, select the platform preset, and the tool flags verbatim issues, speaker label inconsistencies, filler word handling, and punctuation against platform rules. Download a client-ready, QA-compliant transcript.',
      featureList: 'Rev style guide preset, GoTranscript style guide preset, TranscribeMe style guide preset, Scribie style guide preset, Custom rule upload (PDF/DOCX), Verbatim and non-verbatim rule enforcement, Speaker label format validation, Filler word detection (um, uh, you know), False start and stutter handling, Punctuation rules, Profanity handling options, QA compliance scoring, Diff view (original vs formatted), Flagged segment review queue, Export client-ready transcript',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web Browser',
      url: `${SITE_URL}/guideline-format`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free tier available. Pro plan $49/month.' },
      provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What transcription style guides does VideoText support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText includes presets for Rev, GoTranscript, TranscribeMe, and Scribie. Each preset encodes the platform\'s verbatim rules, speaker label format, filler word handling (um, uh), false start treatment, contraction preferences, and punctuation style. You can also upload your own client style guide as a PDF or DOCX.',
          },
        },
        {
          '@type': 'Question',
          name: 'What are the Rev transcription formatting rules?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Rev uses non-verbatim transcription by default: remove filler words (um, uh, like), false starts, and stutters unless contracted or meaningful. Speaker labels use [Speaker Name]: format. Numbers under 10 are spelled out. Contractions are preserved. Inaudible sections are marked [inaudible]. Crosstalk is marked [crosstalk]. The VideoText Rev preset applies all these rules automatically.',
          },
        },
        {
          '@type': 'Question',
          name: 'What are the GoTranscript formatting rules?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'GoTranscript uses non-verbatim format: remove filler words, false starts, and repeated words unless they change meaning. Speaker labels use Speaker 1:, Speaker 2: format. Timestamps are included every 2 minutes. Inaudible sections use [inaudible]. Numbers 1–10 spelled out; 11+ use numerals. The VideoText GoTranscript preset enforces these rules automatically.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does the transcript QA process work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Paste your raw transcript and select a platform preset (Rev, GoTranscript, TranscribeMe, Scribie, or custom). The tool applies style rules and returns: (1) a formatted output, (2) a diff view showing every change, (3) flagged segments needing manual review, and (4) a QA compliance score. Review flagged segments in a queue before exporting the final client-ready transcript.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I upload my own client style guide?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Upload a PDF, DOCX, or TXT file containing your client\'s transcription guidelines. VideoText parses the document and creates editable rule cards that match the platform presets. Adjust any rule card before applying — useful for clients whose guidelines differ from standard platforms.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is verbatim transcription?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Verbatim transcription captures every spoken word exactly as said, including filler words (um, uh, like, you know), false starts, stutters, repeated words, and non-verbal sounds. Non-verbatim (clean verbatim) removes these for readability. Most transcription platforms (Rev, GoTranscript) use non-verbatim by default but offer verbatim as an option for legal, research, or clinical use.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I format a transcript for submission to Rev?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'To format a transcript for Rev: (1) remove filler words (um, uh, like) unless contracted or meaningful, (2) remove false starts and stutters, (3) use [Speaker Name]: format for speaker labels, (4) spell out numbers one through nine, (5) mark inaudible sections as [inaudible], (6) mark simultaneous speech as [crosstalk]. Use VideoText\'s Rev preset to apply all rules automatically and get a QA compliance score before submitting.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to format a transcript to match a client style guide',
      description: 'Use VideoText to apply Rev, GoTranscript, TranscribeMe, or Scribie style rules to a raw transcript, review flagged segments, and export a client-ready deliverable.',
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Paste or upload your raw transcript', text: 'Paste the transcript text directly or upload a TXT, DOCX, or SRT file. The tool accepts output from VideoText Video to Transcript or any other transcription source.' },
        { '@type': 'HowToStep', position: 2, name: 'Select the platform preset', text: 'Choose Rev, GoTranscript, TranscribeMe, or Scribie from the preset menu. The rule cards update automatically to reflect that platform\'s verbatim, speaker label, filler word, and punctuation rules.' },
        { '@type': 'HowToStep', position: 3, name: 'Review and adjust rule cards', text: 'Each rule is shown as an editable card. Override any rule that differs from your specific client\'s version of the platform guidelines. Changes apply only to this session.' },
        { '@type': 'HowToStep', position: 4, name: 'Run formatting and review QA output', text: 'Click Format. The tool applies all rules, returns a diff view of every change, and flags segments that need manual review. A QA compliance score shows how closely the output matches the platform\'s standard.' },
        { '@type': 'HowToStep', position: 5, name: 'Export the client-ready transcript', text: 'Review flagged segments in the review queue, make any final edits, then download the formatted transcript as TXT or DOCX — ready to submit to the platform.' },
      ],
    },
  ],
  '/transcription-benchmark': [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'VideoText Transcription Benchmark',
      description: 'Benchmark dataset and speed metrics for AI transcription throughput.',
      author: { '@type': 'Organization', name: SITE_NAME },
      url: `${SITE_URL}/transcription-benchmark`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the fastest way to transcribe a video?',
          acceptedAnswer: { '@type': 'Answer', text: 'Use an AI pipeline with measured throughput. VideoText median throughput is about 1.5 minutes per source hour in internal March 2026 benchmarks.' },
        },
      ],
    },
  ],
  '/accuracy-test': [
    {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@type': 'SoftwareApplication', name: 'AI transcription tools' },
      reviewBody: 'Condition-based benchmark comparing transcription accuracy and output quality tradeoffs.',
      author: { '@type': 'Organization', name: SITE_NAME },
    },
  ],

  '/best-transcription-tool': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the best transcription tool right now?',
          acceptedAnswer: { '@type': 'Answer', text: 'For speed plus export coverage, VideoText is a strong default for most file-first transcription workflows.' },
        },
      ],
    },
  ],
  '/fastest-transcription-software': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the fastest way to transcribe a 2-hour video?',
          acceptedAnswer: { '@type': 'Answer', text: 'Use an AI tool with benchmarked throughput. VideoText median in internal testing is around 10 minutes for 2-hour files.' },
        },
      ],
    },
  ],
  '/otter-vs-videotext': [
    {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@type': 'SoftwareApplication', name: 'Otter.ai and VideoText' },
      reviewBody: 'Side-by-side workflow comparison between meeting-first and file-first transcription tools.',
      author: { '@type': 'Organization', name: SITE_NAME },
    },
  ],
  '/descript-vs-videotext': [
    {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@type': 'SoftwareApplication', name: 'Descript and VideoText' },
      reviewBody: 'Comparison of editor-first and transcription-first tool stacks.',
      author: { '@type': 'Organization', name: SITE_NAME },
    },
  ],
  '/ai-transcription-tools': [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'AI Transcription Tools Comparison Hub',
      description: 'Neutral comparison reference for AI transcription tool selection.',
      author: { '@type': 'Organization', name: SITE_NAME },
      url: `${SITE_URL}/ai-transcription-tools`,
    },
  ],

  '/videotext-vs-turboscribe': [
    {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@type': 'SoftwareApplication', name: 'VideoText and TurboScribe' },
      reviewBody: 'Comparison of speed and workflow depth for long-form transcription workloads.',
      author: { '@type': 'Organization', name: SITE_NAME },
    },
  ],
  '/videotext-vs-rev': [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'VideoText vs Rev — Full 2025 Comparison',
      description: 'A complete comparison of VideoText and Rev covering pricing, AI vs human transcription, accuracy, speed, output formats, language support, and data privacy.',
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      url: `${SITE_URL}/videotext-vs-rev`,
      dateModified: '2025-05-01',
      about: [
        { '@type': 'SoftwareApplication', name: 'Rev' },
        { '@type': 'SoftwareApplication', name: 'VideoText', url: SITE_URL },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is VideoText cheaper than Rev?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Rev AI charges $0.25/minute per file. Rev Human charges $1.50+/minute. VideoText Pro is $49/month flat with no per-minute charges — dramatically cheaper than Rev for any regular workload.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the best Rev alternative?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText is the best Rev AI alternative for most workflows: 6× cheaper per minute, 90+ language support, zero data retention, and produces transcript + SRT + VTT subtitles + AI summary + chapters in one upload. For human-reviewed transcription required by compliance policy, Rev Human remains the option — but for AI transcription, VideoText wins on every dimension.',
          },
        },
        {
          '@type': 'Question',
          name: 'How fast is VideoText compared to Rev AI?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText processes a 1-hour video in 3–5 minutes using parallel async processing. Rev AI takes approximately 5–10 minutes. Rev Human takes 12–24 hours. VideoText is the fastest option.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Rev store my audio files?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Rev retains uploaded files for up to 30 days. Rev Human transcriptionists actively listen to your audio content. VideoText processes files in a transient environment and deletes them immediately — zero retention, no humans access your content.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SpeakableSpecification',
      cssSelector: ['[data-speakable]', 'h1', '.seo-intro'],
    },
  ],
  '/temi-vs-videotext': [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Temi vs VideoText — Full 2025 Comparison',
      description: 'A 360-degree comparison of Temi and VideoText covering pricing, accuracy, speed, output formats, language support, and data privacy. Also covers Rev vs VideoText.',
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      url: `${SITE_URL}/temi-vs-videotext`,
      dateModified: '2025-05-01',
      about: [
        { '@type': 'SoftwareApplication', name: 'Temi' },
        { '@type': 'SoftwareApplication', name: 'Rev' },
        { '@type': 'SoftwareApplication', name: 'VideoText', url: SITE_URL },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is VideoText cheaper than Temi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Temi charges $0.25/minute for every file. VideoText Pro is $49/month flat with no per-minute charges — dramatically cheaper for any regular workload. VideoText also offers a free tier with 3 imports per month, no credit card required.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the best alternative to Temi?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VideoText is the best Temi alternative for most workflows. It is 6× cheaper per minute on a flat subscription, supports 90+ languages via OpenAI Whisper large-v3, produces transcript + SRT subtitles + VTT subtitles + AI summary + chapter markers in one upload, and deletes your files immediately after processing with zero data retention.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Temi support languages other than English?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Temi supports English only. This is not a configuration option — the platform was built for English and never expanded. VideoText supports 90+ languages using the full OpenAI Whisper large-v3 model at the same speed and quality for all major languages.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does Rev compare to VideoText?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Rev AI costs $0.25/minute — the same as Temi. Rev Human costs $1.50+/minute. VideoText Pro is $49/month flat with no per-minute charges. VideoText also generates more outputs per file and has zero data retention versus Rev\'s 30-day retention policy.',
          },
        },
        {
          '@type': 'Question',
          name: 'How fast is VideoText compared to Temi for transcription?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Temi processes audio near real-time — a 60-minute video takes approximately 60 minutes. VideoText uses parallel async processing and completes the same file in 3–5 minutes. A 2-hour video: approximately 8–12 minutes on VideoText versus 120 minutes on Temi.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Temi vs VideoText — Key Differences',
      description: 'The 6 most important differences between Temi and VideoText transcription tools.',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Price: VideoText ~$0.042/min vs Temi $0.25/min — 6× cheaper on Pro subscription' },
        { '@type': 'ListItem', position: 2, name: 'Languages: VideoText 90+ vs Temi English only' },
        { '@type': 'ListItem', position: 3, name: 'Speed: VideoText 3–5 min/hr vs Temi ~60 min/hr (near real-time)' },
        { '@type': 'ListItem', position: 4, name: 'Outputs: VideoText transcript + SRT + VTT + summary + chapters vs Temi transcript only' },
        { '@type': 'ListItem', position: 5, name: 'Privacy: VideoText zero data retention vs Temi stores files on servers' },
        { '@type': 'ListItem', position: 6, name: 'YouTube: VideoText accepts direct URLs vs Temi requires manual file download' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SpeakableSpecification',
      cssSelector: ['[data-speakable]', 'h1', '.seo-intro'],
    },
  ],
  '/best-otter-alternatives': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What are the best alternatives to Otter AI?',
          acceptedAnswer: { '@type': 'Answer', text: 'Top alternatives include VideoText, Descript, and Rev, depending on workflow requirements.' },
        },
      ],
    },
  ],
  '/best-descript-alternatives': [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What are the best alternatives to Descript for transcription?',
          acceptedAnswer: { '@type': 'Answer', text: 'VideoText is a leading option for transcription-first workflows that need speed and structured outputs.' },
        },
      ],
    },
  ],
  '/ai-transcription-workflow': [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'AI transcription workflow for long videos',
      step: [
        { '@type': 'HowToStep', name: 'Upload long video or audio recording' },
        { '@type': 'HowToStep', name: 'Generate transcript and subtitles' },
        { '@type': 'HowToStep', name: 'Extract summary and chapters for publishing' },
      ],
    },
  ],
  '/podcast-transcription-tool': [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to transcribe a long podcast episode',
      step: [
        { '@type': 'HowToStep', name: 'Upload episode recording' },
        { '@type': 'HowToStep', name: 'Generate transcript and subtitles' },
        { '@type': 'HowToStep', name: 'Publish summary and chapterized notes' },
      ],
    },
  ],
  '/interview-transcription-tool': [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to transcribe interview recordings',
      step: [
        { '@type': 'HowToStep', name: 'Upload interview recording' },
        { '@type': 'HowToStep', name: 'Generate transcript with timestamps' },
        { '@type': 'HowToStep', name: 'Export subtitle and summary outputs' },
      ],
    },
  ],
  '/youtube-video-to-transcript': [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to convert YouTube videos into publish-ready content',
      step: [
        { '@type': 'HowToStep', name: 'Import YouTube recording for transcription' },
        { '@type': 'HowToStep', name: 'Generate transcript and subtitle files' },
        { '@type': 'HowToStep', name: 'Repurpose with summary and chapters' },
      ],
    },
  ],
  '/youtube-transcript-generator': [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to convert a YouTube video to a transcript',
      description: 'Convert any YouTube video to a searchable transcript without downloading. Paste URL, get transcript plus subtitles and summary in 2-3 minutes.',
      step: [
        {
          '@type': 'HowToStep',
          name: 'Paste YouTube URL',
          text: 'Copy any YouTube video URL (youtube.com or youtu.be). Paste into VideoText. No download, no software install needed. We stream the audio directly.',
        },
        {
          '@type': 'HowToStep',
          name: 'AI transcribes and generates outputs',
          text: 'We extract audio, transcribe to text, auto-label speakers, detect chapters, and generate summary - all in parallel. A 10-minute video finishes in 1 minute. A 1-hour video in 3-5 minutes.',
        },
        {
          '@type': 'HowToStep',
          name: 'Export transcript, subtitles, and summary',
          text: 'Download transcript as TXT or PDF. Export SRT/VTT subtitles for YouTube/Vimeo. Copy AI summary or chapters. All ready to use - no editing needed.',
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Free YouTube Transcript Generator — No Download, Instant Results',
      description: 'Free YouTube transcript generator. Paste any video URL — get complete transcript, SRT/VTT subtitles, AI summary, and auto-generated chapters in 2-3 minutes. No downloading required. 98.5% accurate. 50,000+ creators use VideoText.',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      url: 'https://videotext.io/youtube-transcript-generator',
      featureList: 'Paste YouTube URL (no download required), 98.5% accuracy (OpenAI Whisper large-v3), Instant transcript generation, SRT and VTT subtitle export, AI-generated summary, Auto-generated chapters from transcript, Speaker diarization (speaker labels), 90+ language support, Free tier: 3 imports/month (no credit card), Pro tier: continued transcription ($49/month), Zero data retention (files deleted after processing), Batch processing (Pro/Agency)',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        offers: [
          {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            description: 'Free: 3 imports/month (no credit card required)',
            url: 'https://videotext.io/youtube-transcript-generator',
          },
          {
            '@type': 'Offer',
            price: '49',
            priceCurrency: 'USD',
            description: 'Pro: continued transcription, batch processing, priority support',
            url: 'https://videotext.io/pricing',
          },
        ],
      },
      provider: {
        '@type': 'Organization',
        name: 'VideoText',
        url: 'https://videotext.io',
        logo: 'https://videotext.io/logo.png',
        sameAs: ['https://twitter.com/videotextio'],
      },
    },
  ],
}

export function getAeoJsonLd(pathname: string): object[] | null {
  const schemas = AEO_ROUTE_SCHEMAS[pathname]
  if (!schemas?.length) return null
  const filtered = schemas.filter((schema) => {
    const type = (schema as { '@type'?: string })['@type']
    // Page-level getSoftwareApplicationJsonLd is the only SoftApp source.
    if (type === 'SoftwareApplication') return false
    // HowTo rich results are deprecated and fail money-core validation; drop there.
    if (type === 'HowTo' && isMoneyCorePath(pathname)) return false
    return true
  })
  return filtered.length ? filtered : null
}

/** SoftwareApplication JSON-LD for individual paid tool pages. */
const TOOL_SOFTWARE_SCHEMAS: Record<string, { name: string; description: string; featureList: string }> = {
  '/video-to-transcript': {
    name: 'Video to Transcript — Free AI Transcription, 98.5% Accurate',
    description: 'Convert any video to a clean transcript in minutes. 98.5% word accuracy using OpenAI Whisper large-v3. Outputs: full timestamped transcript, AI summary, auto-generated chapters, SRT/VTT subtitle files, and speaker labels — all in one pass. Zero data retention: files deleted immediately after processing. Free tier included.',
    featureList: 'AI transcription (2-hour video in ~5 min), 98.5% word accuracy (OpenAI Whisper large-v3), Full timestamped transcript, AI-generated summary with key points, Auto-generated chapter markers, Speaker diarization (auto-labeling), SRT subtitle export, VTT subtitle export, TXT / PDF / DOCX / JSON / CSV export, Three-column transcript export, 90+ language support, YouTube URL input (no download), Batch processing (Pro/Agency), Zero data retention, Free tier: 3 imports/month',
  },
  '/guideline-format': {
    name: 'Transcript Style Guide Formatter — Rev, GoTranscript, TranscribeMe, Scribie',
    description: 'Format raw transcripts to match Rev, GoTranscript, TranscribeMe, or Scribie transcription style guides automatically. Apply verbatim rules, speaker label formats, filler word handling, false start treatment, and punctuation rules — then validate QA compliance and export a client-ready transcript.',
    featureList: 'Rev style guide preset, GoTranscript style guide preset, TranscribeMe style guide preset, Scribie style guide preset, Custom client style guide upload (PDF/DOCX/TXT), Verbatim and non-verbatim rule enforcement, Speaker label format validation, Filler word detection and removal, False start and stutter handling, Punctuation rule application, Number formatting rules, Profanity handling options, QA compliance scoring, Diff view (original vs formatted), Flagged segment review queue, TXT and DOCX export',
  },
  '/youtube-transcript-generator': {
    name: 'Free YouTube Transcript Generator — No Download, Instant Results',
    description: 'Free YouTube transcript generator. Paste any video URL — get complete transcript, SRT/VTT subtitles, AI summary, and auto-generated chapters in 2-3 minutes. No downloading required. 98.5% accurate. 50,000+ creators use VideoText.',
    featureList: 'Paste YouTube URL (no download required), 98.5% accuracy (OpenAI Whisper large-v3), Instant transcript generation, SRT and VTT subtitle export, AI-generated summary, Auto-generated chapters from transcript, Speaker diarization (speaker labels), 90+ language support, Free tier: 3 imports/month (no credit card), Pro tier: continued transcription ($49/month), Zero data retention (files deleted after processing)',
  },
  '/video-to-subtitles': {
    name: 'Video to Subtitles — Full Caption Hub',
    description: 'Caption-first VideoText hub: timed SRT/VTT from video or YouTube URL, then fix, translate, or burn. Transcript + summary + chapters via Video to Transcript.',
    featureList: 'SRT generation, VTT generation, YouTube URL input, Caption workflow hub, Handoff to fix/translate/burn',
  },
  '/translate-subtitles': {
    name: 'Translate Subtitles to Any Language',
    description: 'Translate SRT or VTT to 70+ languages with timestamps intact. Upload, pick a language, download. Free to try. Files deleted after processing.',
    featureList: 'SRT translation, VTT translation, 70+ target languages, Timestamp preservation, Download translated subtitles',
  },
  '/fix-subtitles': {
    name: 'Fix Subtitles — Auto-Correct Timing & Format',
    description: 'Auto-correct overlapping timestamps, long lines, and gaps in SRT/VTT files. Upload SRT or VTT, download corrected file.',
    featureList: 'Fix overlapping timestamps, Fix long lines, Fix timing gaps, SRT support, VTT support, Instant download',
  },
  '/burn-subtitles': {
    name: 'Burn Subtitles into Video — Hardcode Captions',
    description: 'Hardcode SRT or VTT subtitles permanently into a video file. No player required to display captions.',
    featureList: 'Burn SRT subtitles, Burn VTT subtitles, Hardcode captions, MP4 output, No account required for free tier',
  },
  '/compress-video': {
    name: 'Compress Video — Reduce File Size Online',
    description: 'Compress video online with light, medium, or heavy compression settings. Reduce file size for sharing and uploads.',
    featureList: 'Video compression, Light compression, Medium compression, Heavy compression, MP4 output, No quality loss option',
  },
  '/srt-generator': {
    name: 'Free SRT File Generator from Video',
    description: 'Create a timed SRT file from any video. Upload or paste a YouTube URL, download SRT in seconds. Whisper AI. 3 free imports/mo, no card; watermark on free exports.',
    featureList: 'SRT file generation, AI timing, YouTube URL input, Instant download, Files deleted after processing',
  },
  '/video-to-srt': {
    name: 'Video to SRT Converter — Free Online',
    description: 'Convert video to a timed SRT subtitle file online. Upload MP4/MOV or a YouTube URL. AI timestamps. Sign up free — 3 imports/mo; watermark on free exports.',
    featureList: 'Video to SRT conversion, AI timing, YouTube URL input, Instant download, Files deleted after processing',
  },
}

export function getSoftwareApplicationJsonLd(pathname: string): object | null {
  const schema = TOOL_SOFTWARE_SCHEMAS[pathname]
  if (!schema) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: schema.name,
    description: schema.description,
    featureList: schema.featureList,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web Browser',
    url: `${SITE_URL}${pathname}`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free tier: 3 imports/month. Pro plan $49/month.' },
    provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }
}

/** Homepage-only VideoText SoftwareApplication. Rating is attached only when live/canonical. */
export function getHomeSoftwareApplicationJsonLd(rating: PublicRating | null): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VideoText',
    url: SITE_URL,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description:
      'AI-powered video transcription and subtitle generation. The fastest online transcription tool — processes a 60-minute video in under 5 minutes. Upload a video file or paste a YouTube URL to get a transcript, SRT/VTT subtitles, AI summary, and chapters. 98.5%+ word accuracy via OpenAI Whisper large-v3. Privacy-first: files deleted after processing. Free tier available.',
    featureList: [
      'Video to transcript (MP4, MOV, AVI, WebM)',
      'YouTube URL to transcript — no download required',
      'SRT and VTT subtitle generation',
      'Subtitle translation to 70+ languages',
      'Subtitle timing fix and formatting',
      'Burn subtitles into video (hardcoded captions)',
      'Video compression',
      'Batch processing (Pro/Agency)',
      'Speaker diarization (speaker labels)',
      'Automatic chapter markers',
      'AI summary generation',
      'Voice to text recording',
      '19 free browser-based subtitle tools',
      'Privacy-first: files deleted after processing',
    ],
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', description: '3 video imports per month, no credit card required, full features' },
      { '@type': 'Offer', name: 'Basic', price: '19', priceCurrency: 'USD', description: '450 minutes per month, multi-language, priority support' },
      { '@type': 'Offer', name: 'Pro', price: '49', priceCurrency: 'USD', description: '1,200 minutes per month, batch processing, priority queue' },
      { '@type': 'Offer', name: 'Agency', price: '129', priceCurrency: 'USD', description: '3,000 minutes per month, batch processing, priority queue, multi-seat' },
    ],
    ...(rating ? { aggregateRating: getAggregateRatingJsonLd(rating) } : {}),
  }
}

/** HowTo JSON-LD for step-by-step how-to pages. */
const HOWTO_SCHEMAS: Record<string, { name: string; description: string; steps: { name: string; text: string }[] }> = {
  '/video-to-transcript': {
    name: 'How to convert a video to a transcript',
    description: 'Upload any video file and receive a clean transcript, AI summary, auto-generated chapters, and SRT/VTT subtitles — all in under 5 minutes for a 2-hour video.',
    steps: [
      { name: 'Upload your video', text: 'Drag and drop an MP4, MOV, MKV, or WebM file into the upload zone, or paste a public YouTube URL. Files process at roughly 1 minute of output per 24 seconds of real time.' },
      { name: 'AI processes your video', text: 'VideoText transcribes the audio using OpenAI Whisper (~98.5% accuracy), identifies speakers, generates chapter markers, and writes an AI summary — all in a single pass. A 2-hour video is typically done in under 5 minutes.' },
      { name: 'Download your structured output', text: 'Export the full transcript as TXT, PDF, DOCX, or JSON. Download SRT or VTT subtitle files. Copy the AI summary or chapters. Your files are deleted immediately after you download.' },
    ],
  },
  '/google-meet-transcript': {
    name: 'How to transcribe a Google Meet recording',
    description: 'Record in Google Meet, download the recording from Google Drive, and upload it to VideoText for transcript, summary, and subtitle outputs.',
    steps: [
      { name: 'Record your meeting in Google Meet', text: 'Finish your meeting and ensure the recording is saved to Google Drive. This workflow is for post-meeting recording files, not live meeting capture.' },
      { name: 'Download the recording MP4 from Google Drive', text: 'Open Google Drive, locate the Meet recording, and download the MP4 file to your device.' },
      { name: 'Upload the recording to VideoText', text: 'Use the Google Meet Transcript page uploader to process the file and generate transcript text, speaker-labeled view, summary output, and subtitle exports.' },
      { name: 'Review and export outputs', text: 'Copy transcript text for notes, download subtitle files, and export structured outputs for follow-up and documentation workflows.' },
    ],
  },
  '/zoom-meeting-transcript': {
    name: 'How to transcribe a Zoom meeting recording',
    description: 'Download your Zoom meeting recording and upload it to VideoText to generate transcript, summary, and subtitle outputs.',
    steps: [
      { name: 'Record your meeting in Zoom', text: 'Use local or cloud recording in Zoom and wait for the recording file to be available.' },
      { name: 'Download the Zoom recording file', text: 'Download the MP4 from Zoom cloud recordings or your local Zoom recordings folder.' },
      { name: 'Upload to VideoText', text: 'Upload the downloaded Zoom recording file to the shared transcription tool flow.' },
      { name: 'Use transcript outputs', text: 'Review transcript text, summary output, speaker-labeled view, and subtitle exports for follow-up.' },
    ],
  },
  '/meeting-recording-to-transcript': {
    name: 'How to convert a meeting recording to transcript text',
    description: 'Download meeting recordings from Zoom, Google Meet, Teams, or webinars and upload the file for transcript outputs in VideoText.',
    steps: [
      { name: 'Download your meeting recording', text: 'Export or download the recording file from your meeting platform after the call.' },
      { name: 'Upload the file into VideoText', text: 'Use the meeting recording uploader flow to start transcript processing.' },
      { name: 'Review transcript and summary outputs', text: 'Use generated transcript text and structured summary output for team notes and handoffs.' },
      { name: 'Export subtitles and files', text: 'Download subtitle and transcript export files for downstream workflows.' },
    ],
  },
  '/meeting-transcription-tool': {
    name: 'How to use a meeting transcription tool for recorded calls',
    description: 'Upload recorded meetings to generate transcript text, speaker labels, summaries, subtitles, and exports in one workflow.',
    steps: [
      { name: 'Download the meeting recording', text: 'Get the recording file from Zoom, Google Meet, Teams, or webinar software.' },
      { name: 'Upload the recording file', text: 'Upload the file into the shared transcription tool used by meeting-focused pages.' },
      { name: 'Generate and review transcript output', text: 'Review transcript text, speaker-separated sections, and summary output for key actions.' },
      { name: 'Share exports with stakeholders', text: 'Export files for notes, recaps, captioning, and searchable documentation.' },
    ],
  },
  '/how-to-create-srt-file': {
    name: 'How to Create an SRT File',
    description: 'A practical tutorial for creating SRT subtitle files manually and with AI generation, including valid timestamp format and validation checks.',
    steps: [
      { name: 'Understand valid SRT block format', text: 'Each subtitle block must include: sequence number, timestamp line in HH:MM:SS,mmm --> HH:MM:SS,mmm format, subtitle text, then one blank line.' },
      { name: 'Create SRT manually in a text editor', text: 'Use Notepad, TextEdit, or VS Code. Write each block with proper numbering and timestamps. Save using UTF-8 encoding with .srt extension.' },
      { name: 'Validate and fix common errors', text: 'Check for overlapping timestamps, missing blank lines, invalid arrows, and wrong millisecond separators before uploading your subtitle file.' },
      { name: 'Use AI generation for faster workflows', text: 'For full videos, upload your file to VideoText Video to Subtitles and auto-generate SRT instead of manually timing each subtitle line.' },
      { name: 'Download and test the subtitle file', text: 'Open the SRT in a player or upload to YouTube/Vimeo to verify timing sync and readability before publishing.' },
    ],
  },
  '/how-to-add-subtitles-to-mp4': {
    name: 'How to Add Subtitles to an MP4 Video',
    description: 'A step-by-step guide to adding subtitles to an MP4 video file — either as a soft subtitle file or burned-in permanently.',
    steps: [
      { name: 'Generate or obtain an SRT file', text: 'Use VideoText Video to Subtitles to automatically generate an SRT subtitle file from your MP4, or upload an existing SRT file.' },
      { name: 'Choose your subtitle method', text: 'Decide between soft subtitles (uploadable SRT file, user can toggle on/off) or hard subtitles (burned into the video permanently). For social media, burn-in is recommended.' },
      { name: 'For soft subtitles: upload SRT to your platform', text: 'On YouTube, go to Subtitles in Studio and upload the .srt file. On Vimeo, use the Distribution > Subtitles panel. The SRT file links timing to dialogue without modifying the video.' },
      { name: 'For hard subtitles: use VideoText Burn Subtitles', text: 'Go to videotext.io/burn-subtitles. Upload your MP4 and your SRT file. VideoText renders the captions permanently into the video and returns a new MP4.' },
      { name: 'Download and publish', text: 'Download the output MP4. The subtitles are now visible on any device or player without the need to upload a separate SRT file.' },
    ],
  },
  '/youtube-transcript-generator': {
    name: 'How to get a YouTube video transcript',
    description: 'Step-by-step guide to generating a transcript from any YouTube video. Paste URL, get clean transcript with timestamps, subtitles, and summary — no downloading required.',
    steps: [
      { name: 'Copy your YouTube video URL', text: 'Find any public YouTube video (youtube.com or youtu.be links work). Copy the full URL from the address bar. Works with long-form content like podcasts, lectures, webinars, and interviews.' },
      { name: 'Paste URL into VideoText', text: 'Go to videotext.io/youtube-transcript-generator. Paste the YouTube URL into the input field. The tool validates instantly — you see if the video is accessible before processing.' },
      { name: 'Start transcript generation', text: 'Click "Generate Transcript". VideoText streams the audio directly from YouTube servers (no download step). Processing time: ~1 minute per 10 minutes of video. A typical 20-minute video finishes in 2-3 minutes.' },
      { name: 'Review and export transcript', text: 'View the clean transcript with [timestamps] and speaker labels. Export as TXT/PDF for notes or DOCX for editing. Download SRT/VTT subtitle files for re-uploading to YouTube or other platforms.' },
      { name: 'Use outputs for SEO, content, or distribution', text: 'Repurpose transcript into blog posts, social snippets, email newsletters, or knowledge base articles. Subtitle files improve video SEO and accessibility on any platform.' },
    ],
  },
}

export function getHowToJsonLd(pathname: string): object | null {
  // HowTo rich results are deprecated; money cores were failing validation with
  // leftover HowTo + conflicting SoftApp. Prefer no HowTo over broken markup.
  if (isMoneyCorePath(pathname)) return null
  const schema = HOWTO_SCHEMAS[pathname]
  if (!schema) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: schema.name,
    description: schema.description,
    step: schema.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  }
}

/** BreadcrumbList JSON-LD for a given path and items. */
export function getBreadcrumbJsonLd(_pathname: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => {
      const p = resolveInternalLinkPath(item.path)
      return {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: `${SITE_URL}${p === '/' ? '' : p}`,
      }
    }),
  }
}
