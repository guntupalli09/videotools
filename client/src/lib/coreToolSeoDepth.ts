/**
 * Unique on-page SEO depth for the 8 core money-tool URLs.
 * Visible sections + FAQ used for FAQPage JSON-LD. Product claims only.
 */

export type CoreToolFaq = { q: string; a: string }

export type CoreToolSeoDepth = {
  path: string
  /** 40–60 word direct answer for the lead block under H1. */
  answerFirst: string
  howItWorks: { heading: string; steps: { title: string; detail: string }[] }
  whoItsFor: { heading: string; items: { who: string; why: string }[] }
  outputs: { heading: string; items: string[] }
  proof: { heading: string; items: { label: string; detail: string }[] }
  related: { heading: string; links: { href: string; label: string; note: string }[] }
  faq: CoreToolFaq[]
  extraSections?: { heading: string; body: string }[]
}

const CORE: Record<string, CoreToolSeoDepth> = {
  '/translate-subtitles': {
    path: '/translate-subtitles',
    answerFirst:
      'Upload an SRT or VTT and VideoText translates the spoken lines into 70+ languages while keeping the original timestamps. Use this when you already have a subtitle file. If you still need captions from video, start on Video to Subtitles. Files are deleted after processing. Free: 3 imports/month, no credit card.',
    howItWorks: {
      heading: 'How subtitle translation works',
      steps: [
        { title: 'Upload SRT or VTT', detail: 'Drop an existing subtitle file. Cue numbers, timestamps, and structure stay in place — only spoken text is translated.' },
        { title: 'Pick a target language', detail: 'Choose from 70+ languages. Timing codes are not rewritten, so the translated file stays in sync with the video.' },
        { title: 'Download the translated file', detail: 'Export the same format you uploaded. Next, fix reading speed if needed, or burn captions into the video.' },
      ],
    },
    whoItsFor: {
      heading: 'Who this translator is for',
      items: [
        { who: 'YouTube and course teams', why: 'Localize an existing caption track without re-timing every cue.' },
        { who: 'Agencies', why: 'Turn one master SRT into language versions for client delivery.' },
        { who: 'Publishers with an SRT already', why: 'This page translates files. If you still need captions from video, start on Video to Subtitles.' },
      ],
    },
    outputs: {
      heading: 'What you download',
      items: [
        'Translated SRT or VTT with original timestamps',
        'Cue order and structure preserved',
        'Optional document path for TXT / DOCX / JSON text (not a subtitle track)',
      ],
    },
    proof: {
      heading: 'Why teams use this instead of generic translate boxes',
      items: [
        { label: 'Timestamps stay intact', detail: 'Cue start/end times are kept so the file does not drift after translation.' },
        { label: '70+ languages', detail: 'Arabic, Hindi, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, and more.' },
        { label: 'Privacy-first', detail: 'Files are deleted after processing. Free plan: 3 imports/mo, no card; watermark on free exports.' },
      ],
    },
    related: {
      heading: 'Natural next steps',
      links: [
        { href: '/video-to-subtitles', label: 'Video to Subtitles', note: 'No SRT yet? Generate timed captions from video first.' },
        { href: '/fix-subtitles', label: 'Fix Subtitles', note: 'After translation, check overlaps, long lines, and CPS.' },
        { href: '/burn-subtitles', label: 'Burn Subtitles', note: 'Hardcode the translated track into the video for social.' },
        { href: '/srt-generator', label: 'SRT file generator', note: 'Need a new .srt from video (file maker), not a translation.' },
        { href: '/video-to-srt', label: 'Video to SRT converter', note: 'Converter path: video in, timed SRT out.' },
        { href: '/subtitle-tools', label: 'Free subtitle tools', note: 'In-browser convert, validate, and check character limits.' },
      ],
    },
    faq: [
      { q: 'How do I translate SRT or VTT subtitles?', a: 'Upload your SRT or VTT, pick a target language, and download the translated file. Timestamps stay aligned with the original cues.' },
      { q: 'Do timestamps survive translation?', a: 'Yes. VideoText translates cue text only and keeps the original start and end times, so the file stays in sync.' },
      { q: 'Is subtitle translation free?', a: 'Yes. The free plan includes 3 imports per month, no credit card; watermark on free exports. Files are deleted after processing.' },
      { q: 'How many languages can I translate to?', a: '70+ languages, including Arabic, Hindi, Spanish, French, German, Portuguese, Chinese, Japanese, and Korean.' },
      { q: 'I do not have an SRT yet — how do I start?', a: 'Create captions on Video to Subtitles (full product hub), or use the SRT file generator / video-to-SRT converter if you only need a .srt. Then return here to translate.' },
    ],
  },

  '/burn-subtitles': {
    path: '/burn-subtitles',
    answerFirst:
      'Hardcode an SRT or VTT into a video so captions stay visible on Instagram, TikTok, and any player that ignores sidecar files. Upload the video plus the subtitle file and download one MP4. Need captions first? Generate them on Video to Subtitles. Files deleted after processing. Free: 3 imports/month, no card.',
    howItWorks: {
      heading: 'How burning subtitles into video works',
      steps: [
        { title: 'Upload the video', detail: 'MP4, MOV, AVI, or WebM. This is the file that will get captions hardcoded into the picture.' },
        { title: 'Upload SRT or VTT', detail: 'Use an existing subtitle file. Need one first? Generate it on Video to Subtitles, then come back here.' },
        { title: 'Download the burned video', detail: 'You get a new video with captions baked in so they play on Instagram, TikTok, and anywhere a caption track is ignored.' },
      ],
    },
    whoItsFor: {
      heading: 'Who needs hardcoded captions',
      items: [
        { who: 'Social editors', why: 'Reels, Shorts, and TikTok often play muted and do not reliably use sidecar SRT files.' },
        { who: 'Agencies delivering a finished file', why: 'Clients get one MP4. No extra “please turn captions on” step.' },
        { who: 'Anyone who already has an SRT', why: 'This page hardcodes a file into video. It does not generate the SRT — that is Video to Subtitles.' },
      ],
    },
    outputs: {
      heading: 'What you get',
      items: [
        'A video file with SRT/VTT captions hardcoded (open captions)',
        'Captions visible without a player subtitle menu',
        'Same spoken timing as the subtitle file you uploaded',
      ],
    },
    proof: {
      heading: 'Why burn here instead of an NLE',
      items: [
        { label: 'No editor required', detail: 'Upload video + SRT/VTT. No Premiere, Final Cut, or FFmpeg command line.' },
        { label: 'Privacy-first', detail: 'Files are deleted after processing.' },
        { label: 'Free to try', detail: '3 imports/mo, no card; watermark on free exports on the free plan.' },
      ],
    },
    related: {
      heading: 'Build the file, then burn it',
      links: [
        { href: '/video-to-subtitles', label: 'Video to Subtitles', note: 'Generate SRT/VTT from video if you do not have a file yet.' },
        { href: '/fix-subtitles', label: 'Fix Subtitles', note: 'Clean overlaps, long lines, and CPS before burning.' },
        { href: '/translate-subtitles', label: 'Translate Subtitles', note: 'Burn a localized track without re-timing.' },
        { href: '/compress-video', label: 'Compress Video', note: 'Shrink the burned file for upload limits.' },
        { href: '/video-to-transcript', label: 'Video to Transcript', note: 'Need searchable text and chapters, not burned captions.' },
      ],
    },
    extraSections: [
      {
        heading: 'Hardcode subtitles online (no Premiere)',
        body: 'Hardcode subtitles online by uploading the video and an SRT or VTT. The words are written into the pixels — same idea as “hardcode subtitles” in an NLE, without installing Premiere, CapCut, or FFmpeg.',
      },
      {
        heading: 'Open captions vs a sidecar file',
        body: 'Open captions (also called hardcoded or burned-in captions) are always visible. A sidecar SRT can be toggled off. Use this page when you need open captions for Instagram, TikTok, or any player that ignores subtitle tracks.',
      },
      {
        heading: 'Permanently embed captions',
        body: 'Permanently embed captions when the deliverable is one MP4. Viewers cannot turn them off. If you still need an editable track, keep the SRT and upload it as closed captions on YouTube or Vimeo instead.',
      },
    ],
    faq: [
      { q: 'How do I hardcode subtitles online?', a: 'Upload the video and the SRT or VTT on this page, then download the new file with captions baked in. No desktop editor required. Free: 3 imports/month, no card.' },
      { q: 'What does it mean to burn subtitles into a video?', a: 'Burning (hardcoding) embeds caption text into the video frames. Viewers see the words even if the player has no caption track.' },
      { q: 'Are burned subtitles the same as open captions?', a: 'Yes. Open captions, hardcoded captions, and burned-in captions all mean the text is permanently part of the picture.' },
      { q: 'How do I permanently embed captions?', a: 'Use this burn tool: video + SRT/VTT in, one MP4 out. The captions cannot be toggled off.' },
      { q: 'Do I need Premiere or FFmpeg?', a: 'No. This is a browser workflow: video + subtitle file in, burned video out.' },
      { q: 'Is this the same as /burn-subtitles-into-video?', a: 'Yes. That URL now redirects here so “burn subtitles into video” and the product page share one ranking URL.' },
      { q: 'Can I generate the SRT on the same site first?', a: 'Yes. Use Video to Subtitles (or the SRT file generator) to create a timed file, optionally Fix or Translate it, then burn it here.' },
    ],
  },

  '/video-to-transcript': {
    path: '/video-to-transcript',
    answerFirst:
      'VideoText converts a video file or public YouTube URL into a clean transcript, SRT/VTT subtitles, an AI summary, and chapter markers. It uses OpenAI Whisper large-v3 (~98.5% on clear audio). A 60-minute video typically finishes in under five minutes. Files are deleted after processing. Free: 3 imports/month, no credit card.',
    howItWorks: {
      heading: 'How video-to-transcript works',
      steps: [
        { title: 'Upload a file or paste a YouTube URL', detail: 'MP4, MOV, and common video/audio formats, or a public YouTube link. No need to download the YouTube file first.' },
        { title: 'Whisper large-v3 transcribes the audio', detail: 'About 98.5%+ on clear audio. One pass produces text plus timed subtitle files, not a text dump only.' },
        { title: 'Download transcript, SRT/VTT, summary, and chapters', detail: 'Then format to a client style guide, fix captions, or translate the SRT.' },
      ],
    },
    whoItsFor: {
      heading: 'Who this page is for',
      items: [
        { who: 'Teams who need the words, not just captions', why: 'Meetings, interviews, podcasts, and research — searchable text plus optional SRT.' },
        { who: 'People comparing “video to text” tools', why: 'This is the fastest-path product page: upload once, get transcript + SRT/VTT + summary + chapters.' },
        { who: 'Caption-only jobs', why: 'If you only want a subtitle file, use Video to Subtitles (hub) or the SRT file generator.' },
      ],
    },
    outputs: {
      heading: 'Outputs from one import',
      items: [
        'Full transcript (export TXT / DOCX / PDF and other result formats)',
        'SRT and VTT subtitle files',
        'AI summary and chapter markers',
      ],
    },
    proof: {
      heading: 'Speed, accuracy, and privacy',
      items: [
        { label: 'Built as a fast online AI transcription tool', detail: 'Long recordings are processed as a single job — no timeline editing.' },
        { label: '~98.5%+ on clear audio', detail: 'Whisper large-v3. Accuracy still depends on noise, overlap, and language.' },
        { label: 'Files deleted after processing', detail: 'Privacy-first. Free: 3 imports/mo, no card; watermark on free exports.' },
      ],
    },
    related: {
      heading: 'After the transcript',
      links: [
        { href: '/guideline-format', label: 'Format to client guidelines', note: 'Apply Rev / GoTranscript / TranscribeMe / Scribie-style rules.' },
        { href: '/video-to-subtitles', label: 'Video to Subtitles', note: 'Caption-first hub if SRT/VTT is the main deliverable.' },
        { href: '/fix-subtitles', label: 'Fix Subtitles', note: 'Repair timing, line length, and CPS on the SRT.' },
        { href: '/translate-subtitles', label: 'Translate Subtitles', note: 'Localize the SRT with timestamps kept.' },
        { href: '/voice-recorder', label: 'Voice recorder', note: 'Live mic → text when you have no video file.' },
        { href: '/burn-subtitles', label: 'Burn Subtitles', note: 'Hardcode the SRT into the video for social.' },
      ],
    },
    faq: [
      { q: 'How do I convert a video to a transcript?', a: 'Upload a video or paste a public YouTube URL. VideoText transcribes with Whisper large-v3 and returns transcript text plus SRT/VTT, summary, and chapters.' },
      { q: 'Can I transcribe a YouTube video without downloading it?', a: 'Yes. Paste a public YouTube URL on this page. VideoText streams the audio — you do not need to download the video first.' },
      { q: 'Is it free?', a: 'Yes. Free plan: 3 imports per month, no credit card; watermark on free exports. Paid plans are Basic $19, Pro $49, and Agency $129.' },
      { q: 'How accurate is it?', a: 'About 98.5%+ on clear audio. Set the spoken language when you know it. Noisy or overlapping speech will need a review pass.' },
      { q: 'Does VideoText keep my files?', a: 'Files are deleted after processing. Uploads are not kept as a library.' },
      { q: 'What is the difference between this and Video to Subtitles?', a: 'This page is the full text workflow: transcript + SRT/VTT + summary + chapters. Video to Subtitles is the caption-first hub when the main job is a subtitle file.' },
    ],
  },

  '/video-to-subtitles': {
    path: '/video-to-subtitles',
    answerFirst:
      'Turn a video file or YouTube URL into timed SRT and VTT captions with Whisper large-v3 (~98.5% on clear audio). This is the caption-first hub: generate the file, then fix, translate, or burn. For a full transcript plus summary and chapters, use Video to Transcript. Free: 3 imports/month, no card. Files deleted after processing.',
    howItWorks: {
      heading: 'How the full caption product works',
      steps: [
        { title: 'Upload video or a YouTube URL', detail: 'Same AI pipeline as the rest of VideoText — this page is the caption-first entry, not a separate converter brand.' },
        { title: 'Get timed SRT or VTT', detail: 'Whisper large-v3 aligns speech to cues. Choose SRT (YouTube, editors) or VTT (HTML5 players).' },
        { title: 'Continue the product path', detail: 'Need the full text package too? Use Video to Transcript for transcript + summary + chapters from the same kind of upload. Then Fix, Translate, or Burn the SRT.' },
      ],
    },
    whoItsFor: {
      heading: 'Who should use this hub (vs SRT siblings)',
      items: [
        { who: 'Creators who want captions plus the rest of VideoText', why: 'This is the product hub: video → timed subtitles, then fix / translate / burn, and transcript+summary when you need words not just cues.' },
        { who: 'People who searched “SRT file generator”', why: 'Use /srt-generator — that page is the file maker/creator. It links back here for the full product.' },
        { who: 'People who searched “video to SRT”', why: 'Use /video-to-srt — that page is the converter (video in, .srt out). Same engine, narrower intent.' },
      ],
    },
    outputs: {
      heading: 'What this hub is for',
      items: [
        'Timed SRT and VTT from video or YouTube URL',
        'A path into transcript + summary + chapters via Video to Transcript',
        'Handoff to Fix, Translate, and Burn — not a dead-end file download',
      ],
    },
    proof: {
      heading: 'Same product facts as the rest of VideoText',
      items: [
        { label: 'Whisper large-v3', detail: '~98.5%+ on clear audio. You still review names and noisy sections.' },
        { label: 'Privacy-first', detail: 'Files deleted after processing.' },
        { label: 'Free plan', detail: '3 imports/mo, no card; watermark on free exports.' },
      ],
    },
    related: {
      heading: 'File-maker siblings and next tools',
      links: [
        { href: '/srt-generator', label: 'SRT file generator', note: 'Create a new .srt from video (maker/creator intent).' },
        { href: '/video-to-srt', label: 'Video to SRT converter', note: 'Converter intent: video → timed SRT file.' },
        { href: '/video-to-transcript', label: 'Video to Transcript', note: 'Full text package: transcript + SRT + summary + chapters.' },
        { href: '/fix-subtitles', label: 'Fix Subtitles', note: 'Overlaps, long lines, CPS, formatting.' },
        { href: '/translate-subtitles', label: 'Translate Subtitles', note: '70+ languages, timestamps kept.' },
        { href: '/burn-subtitles', label: 'Burn Subtitles', note: 'Hardcode the SRT into the video.' },
      ],
    },
    faq: [
      { q: 'How do I generate subtitles from a video?', a: 'Upload a video or paste a YouTube URL, choose SRT or VTT, and download the timed file. Whisper large-v3 creates the cues.' },
      { q: 'Can I also get a transcript and summary?', a: 'Yes. Use Video to Transcript for transcript + SRT/VTT + summary + chapters from a video or YouTube URL. This hub stays caption-first.' },
      { q: 'Is it free?', a: 'Yes. 3 imports per month, no card; watermark on free exports. Files are deleted after processing.' },
      { q: 'How is this different from the SRT file generator?', a: 'This page is the full product hub (captions plus the VideoText workflow). /srt-generator is the file maker/creator for “srt file generator” searches. Same engine; different intent.' },
      { q: 'How is this different from Video to SRT?', a: '/video-to-srt is the converter page (video in, SRT out). Use that if you searched “video to srt”. Come here when you want the caption product and next steps (fix, translate, burn, transcript).' },
    ],
  },

  '/fix-subtitles': {
    path: '/fix-subtitles',
    answerFirst:
      'Upload an SRT or VTT and VideoText auto-corrects overlapping timestamps, long lines, reading-speed (CPS) issues, and formatting errors. This repairs an existing subtitle file — it does not generate captions from video. Files are deleted after processing. Free: 3 imports/month, no credit card.',
    howItWorks: {
      heading: 'How subtitle repair works',
      steps: [
        { title: 'Upload SRT or VTT', detail: 'The tool scans cues for overlaps, long lines, reading-speed (CPS), gaps, and formatting issues.' },
        { title: 'Choose what to auto-correct', detail: 'Timing overlaps, line length, CPS/reading speed, and formatting. Optional grammar and line-break passes when you enable them.' },
        { title: 'Download the cleaned file', detail: 'Then translate, burn into video, or check character limits in the free tools.' },
      ],
    },
    whoItsFor: {
      heading: 'Who needs a subtitle fixer',
      items: [
        { who: 'QC and caption vendors', why: 'Catch overlaps and CPS failures before a platform or client rejects the file.' },
        { who: 'Creators after auto-captions', why: 'YouTube-style first drafts often have long lines and stacked cues.' },
        { who: 'Post-translation cleanup', why: 'Translated text is often longer — fix line length and reading speed after Translate Subtitles.' },
      ],
    },
    outputs: {
      heading: 'What gets fixed',
      items: [
        'Overlapping timestamps',
        'Long lines (characters per line)',
        'CPS / reading-speed issues',
        'Formatting cleanup on SRT/VTT',
      ],
    },
    proof: {
      heading: 'What this tool is (and is not)',
      items: [
        { label: 'Repair, not generate', detail: 'This page fixes an existing SRT/VTT. To create captions from video, use Video to Subtitles.' },
        { label: 'Privacy-first', detail: 'Files are deleted after processing.' },
        { label: 'Free to try', detail: '3 imports/mo, no card; watermark on free exports.' },
      ],
    },
    related: {
      heading: 'Where fix sits in the workflow',
      links: [
        { href: '/video-to-subtitles', label: 'Video to Subtitles', note: 'Generate the SRT first if you do not have one.' },
        { href: '/translate-subtitles', label: 'Translate Subtitles', note: 'Localize, then re-check CPS on the new language.' },
        { href: '/burn-subtitles', label: 'Burn Subtitles', note: 'Hardcode the cleaned file into the video.' },
        { href: '/guideline-format', label: 'Client guidelines', note: 'Transcript style rules (verbatim, speakers) — different from cue QC.' },
        { href: '/tools/subtitle-validator', label: 'Subtitle validator', note: 'Free in-browser scan before or after a fix pass.' },
        { href: '/tools/subtitle-character-checker', label: 'Character limit checker', note: 'Netflix / YouTube / BBC line-length pass/fail.' },
      ],
    },
    faq: [
      { q: 'What does Fix Subtitles correct?', a: 'Overlapping timestamps, long lines, CPS/reading-speed issues, and common SRT/VTT formatting problems. You can also enable extra passes such as line breaks when you need them.' },
      { q: 'Do I upload a video or a subtitle file?', a: 'Upload SRT or VTT. A video file is optional for scene-cut context — the primary input is the subtitle file.' },
      { q: 'Is it free?', a: 'Yes. 3 imports per month on the free plan, no card; watermark on free exports. Files are deleted after processing.' },
      { q: 'Is this the same as the free subtitle validator?', a: 'No. The validator reports issues in your browser. This page auto-corrects the file. Use both: validate, then fix.' },
      { q: 'Should I fix before or after translation?', a: 'Fix obvious overlaps before translate. After translation, run fix again — target-language text is often longer and can break CPS.' },
    ],
  },

  '/guideline-format': {
    path: '/guideline-format',
    answerFirst:
      'This page formats an existing transcript to client style rules — Rev, GoTranscript, TranscribeMe, or Scribie presets you can edit. It does not transcribe video. Paste text or jump from Video to Transcript, pick a preset, and export client-ready copy. Files are deleted after processing. Free: 3 imports/month, no credit card.',
    howItWorks: {
      heading: 'How client-guideline formatting works',
      steps: [
        { title: 'Paste a transcript or jump from Video to Transcript', detail: 'Start with raw text. This page formats style — it does not transcribe video.' },
        { title: 'Pick a preset', detail: 'Rev, GoTranscript, TranscribeMe, or Scribie-style rule cards. Edit cards before you apply them.' },
        { title: 'Export client-ready text', detail: 'Review flagged segments, then export. For caption QC (CPS, overlaps), use Fix Subtitles instead.' },
      ],
    },
    whoItsFor: {
      heading: 'Who this is for',
      items: [
        { who: 'Marketplace transcriptionists', why: 'Match Rev / GoTranscript / TranscribeMe / Scribie-style rules before QA.' },
        { who: 'Agencies with a house style', why: 'Reusable presets and editable cards beat a blank document each job.' },
        { who: 'Teams who already have a transcript', why: 'If you still need the words from video, start on Video to Transcript.' },
      ],
    },
    outputs: {
      heading: 'What you produce',
      items: [
        'A transcript formatted to the selected guideline style',
        'Speaker-label and filler-word handling per preset',
        'A QA-oriented pass so reviewers see what you matched',
      ],
    },
    proof: {
      heading: 'Scope (no invented features)',
      items: [
        { label: 'Style rules, not speech-to-text', detail: 'Presets apply verbatim/non-verbatim, speakers, fillers, and related transcript rules.' },
        { label: 'Privacy-first', detail: 'Files are deleted after processing.' },
        { label: 'Free to try', detail: '3 imports/mo, no card; watermark on free exports.' },
      ],
    },
    related: {
      heading: 'Transcript in, captions out',
      links: [
        { href: '/video-to-transcript', label: 'Video to Transcript', note: 'Create the raw transcript first.' },
        { href: '/gotranscript-guidelines', label: 'GoTranscript guidelines', note: 'Highest-traffic vendor example — then format here in one click.' },
        { href: '/scribie-transcription-guidelines', label: 'Scribie guidelines', note: 'Full-verbatim example. Apply the preset on this page.' },
        { href: '/verbit-transcription-guidelines', label: 'Verbit guidelines', note: 'Enterprise / legal style example.' },
        { href: '/transcribeme-guidelines', label: 'TranscribeMe guidelines', note: 'Intelligent-verbatim example.' },
        { href: '/rev-transcript-guidelines', label: 'Rev guidelines', note: 'Clean-verbatim example.' },
        { href: '/fix-subtitles', label: 'Fix Subtitles', note: 'Cue-level QC (overlaps, CPS) after you export SRT.' },
        { href: '/video-to-subtitles', label: 'Video to Subtitles', note: 'Caption-first path if the deliverable is SRT/VTT.' },
      ],
    },
    faq: [
      { q: 'Does this transcribe video?', a: 'No. It formats an existing transcript. Use Video to Transcript to get the text from a file or YouTube URL.' },
      { q: 'What style guides can I apply?', a: 'Presets for Rev, GoTranscript, TranscribeMe, and Scribie-style rules. Cards are editable. You can also work from uploaded client notes in your workflow.' },
      { q: 'Is guideline formatting free?', a: 'Yes. Free plan: 3 imports per month, no credit card; watermark on free exports. Paid plans are Basic $19, Pro $49, and Agency $129.' },
      { q: 'Is this the same as Fix Subtitles?', a: 'No. Guideline format is transcript style (verbatim, speakers, fillers). Fix Subtitles is caption-file QC: overlaps, long lines, and CPS.' },
      { q: 'When should I use this in the workflow?', a: 'After Video to Transcript, before you invoice or send to client QA. If the client also wants SRT, generate or export captions and run Fix Subtitles separately.' },
    ],
  },

  '/voice-recorder': {
    path: '/voice-recorder',
    answerFirst:
      'Record your voice in the browser and get a transcript immediately — no video file required. This is live microphone-to-text for notes, dictation, and memos. For a finished video or YouTube URL, use Video to Transcript instead. Files are deleted after processing. Free: 3 imports/month, no credit card.',
    howItWorks: {
      heading: 'How the in-browser voice recorder works',
      steps: [
        { title: 'Allow the microphone', detail: 'This page is live speech → text in the browser. You do not upload a video file to start.' },
        { title: 'Speak and see text', detail: 'Use it for notes, dictation, and drafts. For a finished video or YouTube URL, use Video to Transcript instead.' },
        { title: 'Copy or continue in VideoText', detail: 'Move cleaned text into guideline format, or generate captions from a recording on the video tools.' },
      ],
    },
    whoItsFor: {
      heading: 'Who the voice recorder is for',
      items: [
        { who: 'Dictation and notes', why: 'No file to upload — talk and capture text.' },
        { who: 'Quick voice memos', why: 'Faster than a full video import when you only have a mic.' },
        { who: 'Not for “burn captions into my MP4”', why: 'That is Burn Subtitles. Caption-from-video is Video to Subtitles.' },
      ],
    },
    outputs: {
      heading: 'What you get',
      items: [
        'In-browser voice → text',
        'A transcript you can copy or take into other VideoText tools',
        'A different path from file/YouTube transcription',
      ],
    },
    proof: {
      heading: 'How this differs from Video to Transcript',
      items: [
        { label: 'Microphone-first', detail: 'Built for live recording, not “upload MP4.”' },
        { label: 'Privacy-first', detail: 'Processing follows the same delete-after-processing approach as other tools.' },
        { label: 'Free to try', detail: '3 imports/mo, no card; watermark on free exports.' },
      ],
    },
    related: {
      heading: 'When you have a file instead',
      links: [
        { href: '/video-to-transcript', label: 'Video to Transcript', note: 'Upload video or YouTube URL → transcript + SRT + summary + chapters.' },
        { href: '/video-to-subtitles', label: 'Video to Subtitles', note: 'Caption-first hub from a video file.' },
        { href: '/guideline-format', label: 'Client guidelines', note: 'Format the text after you capture it.' },
        { href: '/translate-subtitles', label: 'Translate Subtitles', note: 'If you already have an SRT to localize.' },
      ],
    },
    faq: [
      { q: 'How do I convert voice to text in the browser?', a: 'Open this page, allow the microphone, and speak. Text appears from your live recording — you do not start by uploading a video file.' },
      { q: 'Is this the same as Video to Transcript?', a: 'No. Voice recorder is mic → text. Video to Transcript is file or YouTube URL → transcript + SRT/VTT + summary + chapters.' },
      { q: 'Is there a free voice to text option?', a: 'Yes. Free plan: 3 imports per month, no card; watermark on free exports.' },
      { q: 'I landed on /speak-to-text — is that different?', a: 'Same product family. This page is the primary voice → text tool. Use this URL when you want the recorder.' },
    ],
  },

  '/compress-video': {
    path: '/compress-video',
    answerFirst:
      'Shrink a video online with light, medium, or heavy compression when the file is too large for email, Drive, or a platform limit. This does not add subtitles or transcribe audio. Files are deleted after processing. Free: 3 imports/month, no credit card. Then caption or transcribe the smaller file if you need the words.',
    howItWorks: {
      heading: 'How video compression works',
      steps: [
        { title: 'Upload the video', detail: 'Use this when the file is too large for email, Drive, or a platform limit — not to transcribe it.' },
        { title: 'Choose light, medium, or heavy', detail: 'Three levels. Heavier settings shrink more; they are not a promise of zero quality change.' },
        { title: 'Download the smaller file', detail: 'Then transcribe, caption, or burn subtitles on the compressed copy if that is your workflow.' },
      ],
    },
    whoItsFor: {
      heading: 'Who this compressor is for',
      items: [
        { who: 'People hitting upload caps', why: 'Reduce size before YouTube, LMS, or client portals.' },
        { who: 'Teams sending review copies', why: 'A smaller MP4 is easier to share than a camera original.' },
        { who: 'Not a caption tool', why: 'Compression does not add subtitles. Use Video to Subtitles or Burn Subtitles for that.' },
      ],
    },
    outputs: {
      heading: 'What you choose',
      items: [
        'Light compression',
        'Medium compression',
        'Heavy compression',
        'A smaller video file to download',
      ],
    },
    proof: {
      heading: 'Honest limits',
      items: [
        { label: 'Three levels only', detail: 'Light / medium / heavy — no invented codecs or “visually lossless” guarantee on heavy.' },
        { label: 'Privacy-first', detail: 'Files are deleted after processing.' },
        { label: 'Free to try', detail: '3 imports/mo, no card; watermark on free exports.' },
      ],
    },
    related: {
      heading: 'Compress, then use the words',
      links: [
        { href: '/video-to-transcript', label: 'Video to Transcript', note: 'Transcribe the (smaller) file.' },
        { href: '/video-to-subtitles', label: 'Video to Subtitles', note: 'Generate SRT/VTT after you shrink the video.' },
        { href: '/burn-subtitles', label: 'Burn Subtitles', note: 'Hardcode captions, then compress if the burned file is large.' },
        { href: '/tools/video-bitrate-calculator', label: 'Bitrate calculator', note: 'Free planner for target size vs bitrate.' },
      ],
    },
    faq: [
      { q: 'How do I compress a video online?', a: 'Upload the file, choose light, medium, or heavy, and download the result. No desktop app required.' },
      { q: 'Is it free?', a: 'Yes. 3 imports per month, no card; watermark on free exports. Files are deleted after processing.' },
      { q: 'Will quality stay the same?', a: 'Light aims for a smaller file with modest change. Medium and heavy reduce size more and can show more quality loss. Pick the lowest level that meets your size limit.' },
      { q: 'Is this the same as adding subtitles?', a: 'No. This only reduces file size. Use Video to Subtitles to make an SRT, or Burn Subtitles to hardcode captions.' },
    ],
  },
}

export function getCoreToolSeoDepth(pathname: string): CoreToolSeoDepth | null {
  return CORE[pathname] ?? null
}

export function getCoreToolFaq(pathname: string): CoreToolFaq[] {
  return CORE[pathname]?.faq ?? []
}

export const CORE_MONEY_TOOL_PATHS = Object.keys(CORE)
