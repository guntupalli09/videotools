declare global {
  interface Navigator {
    modelContext?: {
      provideContext(context: {
        tools: Array<{
          name: string
          description: string
          inputSchema: Record<string, unknown>
          execute: (input: Record<string, unknown>) => Promise<unknown>
        }>
      }): void
    }
  }
}

export function initWebMCP() {
  if (!navigator.modelContext?.provideContext) return

  navigator.modelContext.provideContext({
    tools: [
      {
        name: 'transcribe_video',
        description:
          'Navigate to the VideoText video transcription page where users can upload a video file (MP4, MOV, AVI, WebM) or paste a YouTube URL to get a transcript with speaker labels, chapters, and AI summary.',
        inputSchema: {
          type: 'object',
          properties: {
            youtubeUrl: {
              type: 'string',
              description: 'Optional YouTube URL to pre-fill',
            },
          },
        },
        execute: async (input) => {
          const url = input.youtubeUrl
            ? `/video-to-transcript?url=${encodeURIComponent(String(input.youtubeUrl))}`
            : '/video-to-transcript'
          window.location.href = url
          return { navigated: url }
        },
      },
      {
        name: 'generate_subtitles',
        description:
          'Navigate to the VideoText subtitle generator where users can create SRT or VTT subtitle files from video files or YouTube URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            youtubeUrl: {
              type: 'string',
              description: 'Optional YouTube URL to pre-fill',
            },
          },
        },
        execute: async (input) => {
          const url = input.youtubeUrl
            ? `/video-to-subtitles?url=${encodeURIComponent(String(input.youtubeUrl))}`
            : '/video-to-subtitles'
          window.location.href = url
          return { navigated: url }
        },
      },
      {
        name: 'translate_subtitles',
        description:
          'Navigate to the VideoText subtitle translator where users can translate SRT or VTT files to 70+ languages while preserving timestamps.',
        inputSchema: {
          type: 'object',
          properties: {
            targetLanguage: {
              type: 'string',
              description: 'Target language code (e.g., es, fr, ja, hi)',
            },
          },
        },
        execute: async () => {
          window.location.href = '/translate-subtitles'
          return { navigated: '/translate-subtitles' }
        },
      },
      {
        name: 'convert_subtitle_format',
        description:
          'Navigate to VideoText free browser-based subtitle conversion tools. Convert between SRT, VTT, SBV, ASS/SSA, and TTML formats.',
        inputSchema: {
          type: 'object',
          properties: {
            conversion: {
              type: 'string',
              enum: [
                'srt-to-vtt',
                'vtt-to-srt',
                'sbv-to-srt',
                'srt-to-sbv',
                'ass-to-srt',
                'ttml-to-srt',
              ],
              description: 'The conversion type',
            },
          },
        },
        execute: async (input) => {
          const path = input.conversion
            ? `/tools/${String(input.conversion)}`
            : '/tools'
          window.location.href = path
          return { navigated: path }
        },
      },
      {
        name: 'compress_video',
        description:
          'Navigate to the VideoText video compressor where users can reduce video file size in-browser.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          window.location.href = '/compress-video'
          return { navigated: '/compress-video' }
        },
      },
      {
        name: 'get_pricing',
        description:
          'Get VideoText pricing information. Free: $0 (3 imports/mo), Basic: $19/mo (450 min), Pro: $49/mo (1200 min + batch), Agency: $129/mo (3000 min).',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          return {
            plans: [
              { name: 'Free', price: '$0', minutes: '3 imports/month' },
              { name: 'Basic', price: '$19/mo', minutes: '450 min/month' },
              { name: 'Pro', price: '$49/mo', minutes: '1200 min/month' },
              { name: 'Agency', price: '$129/mo', minutes: '3000 min/month' },
            ],
            url: 'https://videotext.io/pricing',
          }
        },
      },
    ],
  })
}
