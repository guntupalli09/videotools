/**
 * Post-build prerender script.
 *
 * Generates static HTML files for every SEO and static route, injecting the
 * correct <title>, <meta name="description">, <link rel="canonical">, Open Graph,
 * Twitter Card, and JSON-LD into each file's <head>.
 *
 * Vercel serves static files before evaluating rewrites, so a file at
 * dist/video-to-text/index.html is served directly — no JS required for crawlers.
 *
 * Run: npx tsx scripts/prerender.ts
 * Or add as a postbuild step: "postbuild": "npx tsx scripts/prerender.ts"
 */

import * as fs from 'fs'
import * as path from 'path'
import { getProgrammaticSeoEntries } from '../client/src/lib/generateSeoPages'

const REPO_ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(REPO_ROOT, 'client', 'dist')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')
const SITE_URL = 'https://videotext.io'
const SITE_NAME = 'VideoText'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteMeta {
  path: string
  title: string
  description: string
  faq?: Array<{ q: string; a: string }>
  breadcrumbLabel?: string
  noindex?: boolean
}

// ── Static route metadata ─────────────────────────────────────────────────────

const STATIC_META: RouteMeta[] = [
  {
    path: '/',
    title: `Video to Text & Subtitles — Free Online Tools | ${SITE_NAME}`,
    description:
      'VideoText: AI-powered video to text and subtitle tools. Transcribe video to transcript, generate SRT/VTT, translate subtitles, fix timing, burn captions, compress video. Sign up for free to try.',
  },
  {
    path: '/pricing',
    title: `Pricing — Free, Basic, Pro & Agency Plans | ${SITE_NAME}`,
    description:
      "VideoText pricing: Free 3 imports/month, Basic $19 (450 min), Pro $49 (1,200 min), Agency $129 (3,000 min). Multi-language, batch on Pro+. 7-day money-back guarantee.",
  },
  {
    path: '/privacy',
    title: `Privacy Policy — We Don't Store Your Data | ${SITE_NAME}`,
    description:
      "VideoText privacy: We process your files and delete them. We don't keep your uploads, transcripts, or outputs. Your content stays yours.",
  },
  {
    path: '/faq',
    title: `FAQ — Privacy, Billing, Tools | ${SITE_NAME}`,
    description:
      "Frequently asked questions about VideoText: privacy, data storage, billing, free tier, translation, and tools. Your files are processed and deleted immediately.",
    faq: [
      { q: 'Do you store my videos or files?', a: "No. We process your files and then delete them. We don't keep your uploads, transcripts, or generated outputs. Your content is never stored on our servers." },
      { q: 'Is my content used for AI training?', a: "No. Your content is used only to deliver the service you requested. We do not use it for training AI models." },
      { q: 'Do I need to sign up?', a: "Yes. Sign up for free to try the tools. No credit card required. Upgrade when you need more imports or paid features." },
      { q: 'What file formats are supported?', a: "Videos: MP4, MOV, AVI, WebM, MKV. Subtitles: SRT and VTT. You can also paste a video URL for supported sources." },
      { q: 'How does the free tier work?', a: "Sign up for free to get 3 imports per month (resets on the 1st), single language output, watermark on subtitle exports. No credit card required." },
      { q: 'Can I translate subtitles or transcripts?', a: "Yes. Use Translate Subtitles for SRT/VTT files (50+ languages). For transcripts, click Translate after generating to view in 6 languages: English, Hindi, Telugu, Spanish, Chinese, Russian." },
    ],
  },
  {
    path: '/guide',
    title: `How to Use VideoText — Tool Guide & Features | ${SITE_NAME}`,
    description:
      'Step-by-step guide to every VideoText tool: Video to Transcript, Video to Subtitles, Translate, Fix, Burn, Compress, Batch. What we expect, what you get, and plan limits.',
  },
  {
    path: '/terms',
    title: `Terms of Service | ${SITE_NAME}`,
    description:
      "Terms of use for VideoText. We don't store your data. Billing via Stripe. Use the service in accordance with these terms.",
  },
  {
    path: '/blog',
    title: `Blog — Engineering, Privacy & Product | ${SITE_NAME}`,
    description:
      'The VideoText blog: how the processing pipeline works, why we delete your files, batch subtitles for creators, transcription guides, and product updates.',
  },
  {
    path: '/changelog',
    title: `Changelog — What's New | ${SITE_NAME}`,
    description:
      "VideoText changelog: new features, performance improvements, and bug fixes. Updated every release.",
  },
  {
    path: '/video-to-transcript',
    title: `Video to Transcript — Free AI Transcription & Translation | ${SITE_NAME}`,
    description:
      'Convert video to text with AI. View transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. Upload video, get plain-text transcript. Summary, chapters, speakers. Free tier.',
  },
  {
    path: '/video-to-subtitles',
    title: `Video to Subtitles — SRT & VTT Generator | ${SITE_NAME}`,
    description:
      'Generate SRT and VTT subtitle files from any video with AI. Upload video. Single or multi-language. Free tier available.',
  },
  {
    path: '/translate-subtitles',
    title: `Translate Subtitles — SRT/VTT to Any Language | ${SITE_NAME}`,
    description:
      'Translate SRT or VTT subtitle files to Arabic, Hindi, Spanish, and 50+ languages with AI. Upload subtitles, pick target language, download. Free tier available.',
  },
  {
    path: '/fix-subtitles',
    title: `Fix Subtitles — Auto-Correct Timing & Format | ${SITE_NAME}`,
    description:
      'Fix overlapping timestamps, long lines, and gaps in SRT/VTT files. Auto-correct timing and formatting. Upload SRT or VTT, download corrected file. Free.',
  },
  {
    path: '/burn-subtitles',
    title: `Burn Subtitles into Video — Hardcode Captions | ${SITE_NAME}`,
    description:
      'Burn SRT or VTT subtitles directly into your video. Upload video + subtitle file, get one video with hardcoded captions. Free tier available.',
  },
  {
    path: '/compress-video',
    title: `Compress Video — Reduce File Size Online | ${SITE_NAME}`,
    description:
      'Compress video online: light, medium, or heavy compression. Upload video. Reduce file size for sharing and uploads. Free tier available.',
  },
  {
    path: '/batch-process',
    title: `Batch Video to Subtitles — Multiple Videos at Once | ${SITE_NAME}`,
    description:
      'Generate SRT subtitles for many videos in one go. Upload multiple videos, get one ZIP of subtitle files. Pro and Agency plans.',
  },
]

// ── Registry parser ───────────────────────────────────────────────────────────

interface ParsedEntry {
  path: string
  title: string
  description: string
  breadcrumbLabel: string
  faq: Array<{ q: string; a: string }>
}

function parseRegistryEntries(): ParsedEntry[] {
  if (!fs.existsSync(REGISTRY_PATH)) return []
  const src = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const entries: ParsedEntry[] = []

  // Split into blocks by path: '/...'
  const pathMatches = [...src.matchAll(/path:\s*'(\/[^']+)'/g)]

  for (let i = 0; i < pathMatches.length; i++) {
    const blockStart = pathMatches[i].index!
    const blockEnd = i + 1 < pathMatches.length ? pathMatches[i + 1].index! : src.length
    const block = src.slice(blockStart, blockEnd)

    const routePath = pathMatches[i][1]

    // Extract title
    const titleMatch = block.match(/\btitle:\s*'((?:[^'\\]|\\.)*)'/)
    const title = titleMatch ? titleMatch[1].replace(/\\'/g, "'") : ''

    // Extract description (may be multi-line with string concatenation)
    const descMatch = block.match(/\bdescription:\s*\n?\s*'((?:[^'\\]|\\.)*)'/)
    const description = descMatch ? descMatch[1].replace(/\\'/g, "'") : ''

    // Extract breadcrumbLabel
    const labelMatch = block.match(/breadcrumbLabel:\s*'((?:[^'\\]|\\.)*)'/)
    const breadcrumbLabel = labelMatch ? labelMatch[1].replace(/\\'/g, "'") : routePath.slice(1)

    // Extract FAQ items
    const faq: Array<{ q: string; a: string }> = []
    const faqBlock = block.match(/faq:\s*\[([\s\S]*?)\],/)
    if (faqBlock) {
      const faqContent = faqBlock[1]
      const itemMatches = [...faqContent.matchAll(/\{\s*q:\s*'((?:[^'\\]|\\.)*)'\s*,\s*a:\s*'((?:[^'\\]|\\.)*)'\s*\}/g)]
      for (const m of itemMatches) {
        faq.push({
          q: m[1].replace(/\\'/g, "'"),
          a: m[2].replace(/\\'/g, "'"),
        })
      }
    }

    // Check indexable
    if (/indexable:\s*false/.test(block)) continue

    entries.push({ path: routePath, title, description, breadcrumbLabel, faq })
  }

  return entries
}

// ── HTML injection ────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildHead(meta: RouteMeta): string {
  const { path: routePath, title, description, faq, breadcrumbLabel, noindex } = meta
  const canonicalUrl = routePath === '/' ? SITE_URL + '/' : `${SITE_URL}${routePath}`

  const jsonLdBlocks: object[] = []

  // Breadcrumb (for non-home pages)
  if (routePath !== '/') {
    jsonLdBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: breadcrumbLabel ?? title, item: canonicalUrl },
      ],
    })
  }

  // FAQ schema
  if (faq && faq.length > 0) {
    jsonLdBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    })
  }

  const jsonLdTags = jsonLdBlocks
    .map((obj) => `  <script type="application/ld+json">\n    ${JSON.stringify(obj)}\n  </script>`)
    .join('\n')

  return `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${noindex ? '<meta name="robots" content="noindex,nofollow" />' : '<meta name="robots" content="index,follow" />'}
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
${jsonLdTags}`.trim()
}

function injectHead(template: string, meta: RouteMeta): string {
  const injectedHead = buildHead(meta)

  // Replace title tag
  let html = template.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`
  )

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`
  )

  // Replace canonical
  const canonicalUrl = meta.path === '/' ? SITE_URL + '/' : `${SITE_URL}${meta.path}`
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${canonicalUrl}" />`
  )

  // Replace og:title
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
  )

  // Replace og:description
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
  )

  // Replace og:url
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${canonicalUrl}" />`
  )

  // Replace twitter:title
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`
  )

  // Replace twitter:description
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
  )

  // Replace robots (noindex support)
  if (meta.noindex) {
    html = html.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/>/,
      '<meta name="robots" content="noindex,nofollow" />'
    )
  }

  // Inject FAQ + Breadcrumb JSON-LD blocks before </head>
  const extraJsonLd: object[] = []

  if (meta.path !== '/') {
    extraJsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        {
          '@type': 'ListItem',
          position: 2,
          name: meta.breadcrumbLabel ?? meta.title,
          item: canonicalUrl,
        },
      ],
    })
  }

  if (meta.faq && meta.faq.length > 0) {
    extraJsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: meta.faq.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    })
  }

  if (extraJsonLd.length > 0) {
    const jsonLdTags = extraJsonLd
      .map((obj) => `  <script type="application/ld+json">${JSON.stringify(obj)}</script>`)
      .join('\n')
    html = html.replace('</head>', `${jsonLdTags}\n</head>`)
  }

  return html
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const templatePath = path.join(DIST_DIR, 'index.html')
  if (!fs.existsSync(templatePath)) {
    console.error('[prerender] dist/index.html not found — run the client build first.')
    process.exit(1)
  }

  const template = fs.readFileSync(templatePath, 'utf8')

  // Collect all routes: static + registry (parsed) + programmatic
  const registryEntries = parseRegistryEntries()
  const programmaticEntries = getProgrammaticSeoEntries()
  const allRoutes: RouteMeta[] = [
    ...STATIC_META,
    ...registryEntries.map((e) => ({
      path: e.path,
      title: e.title,
      description: e.description,
      faq: e.faq,
      breadcrumbLabel: e.breadcrumbLabel,
    })),
    ...programmaticEntries.map((e) => ({
      path: e.path,
      title: e.title,
      description: e.description,
      faq: e.faq,
      breadcrumbLabel: e.breadcrumbLabel,
    })),
  ]

  let count = 0
  for (const meta of allRoutes) {
    const routePath = meta.path
    const html = injectHead(template, meta)

    if (routePath === '/') {
      // Overwrite root index.html in place
      fs.writeFileSync(templatePath, html, 'utf8')
    } else {
      // Write to dist/{route}/index.html
      const dir = path.join(DIST_DIR, routePath.slice(1))
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8')
    }

    count++
  }

  console.log(`[prerender] Generated ${count} static HTML files in ${DIST_DIR}`)
}

main()
