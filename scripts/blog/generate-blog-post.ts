#!/usr/bin/env node
/**
 * Weekly blog post generator.
 * Usage: npx tsx scripts/blog/generate-blog-post.ts
 *
 * 1. Picks the next unused topic from scripts/blog/topics.json
 * 2. Calls Claude API (claude-sonnet-4-6) to generate an SEO-rich blog post as HTML
 * 3. Appends the post to client/src/data/generatedPosts.ts
 * 4. Updates client/public/sitemap-core.xml with the new URL
 * 5. Updates client/src/lib/seoMeta.ts with title, description, breadcrumb
 * 6. Marks the topic as used in topics.json
 *
 * Requires: ANTHROPIC_API_KEY environment variable (set as GitHub secret in CI)
 */

import * as fs from 'fs'
import * as path from 'path'
import Anthropic from '@anthropic-ai/sdk'

// ── Paths ──────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..', '..')
const TOPICS_FILE = path.join(__dirname, 'topics.json')
const GENERATED_POSTS_FILE = path.join(ROOT, 'client', 'src', 'data', 'generatedPosts.ts')
const SITEMAP_FILE = path.join(ROOT, 'client', 'public', 'sitemap-core.xml')
const SEO_META_FILE = path.join(ROOT, 'client', 'src', 'lib', 'seoMeta.ts')

// ── Load .env from repo root ───────────────────────────────────────────────
const envPath = path.join(ROOT, '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq > 0) {
      const k = t.slice(0, eq).trim()
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (k && !process.env[k]) process.env[k] = v
    }
  }
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Topic {
  slug: string
  keyword: string
  title: string
  angle: string
  tag: string
  target_intent: string
}

interface TopicsFile {
  topics: Topic[]
  used: Topic[]
}

interface GeneratedPost {
  slug: string
  date: string
  title: string
  summary: string
  tag: string
  readTime: string
  contentHtml: string
  metaDescription: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function loadTopics(): TopicsFile {
  return JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8')) as TopicsFile
}

function saveTopics(data: TopicsFile): void {
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function getNextTopic(data: TopicsFile): Topic | null {
  const usedSlugs = new Set(data.used.map((t) => t.slug))
  // Find first topic not already posted (also check generatedPosts.ts to avoid re-posting)
  const existing = fs.readFileSync(GENERATED_POSTS_FILE, 'utf8')
  for (const topic of data.topics) {
    if (usedSlugs.has(topic.slug)) continue
    if (existing.includes(`slug: '${topic.slug}'`)) continue
    return topic
  }
  return null
}

// ── Claude API call ────────────────────────────────────────────────────────
async function generatePost(topic: Topic, client: Anthropic): Promise<GeneratedPost> {
  const today = new Date()

  const systemPrompt = `You are a senior content writer for VideoText.io, an AI-powered video transcription and subtitle tool.

VideoText features:
- Video to transcript (YouTube URL or file upload, streams in real time)
- Video to subtitles (SRT/VTT export)
- Translate subtitles (50+ languages)
- Fix subtitles (timing, line breaks, grammar)
- Burn subtitles into video
- Compress video
- Batch process up to 100 videos
- Files deleted immediately after processing (privacy-first)
- Whisper large-v3 AI, 98.5% accuracy on clean audio
- Free tier: 3 imports/month. Paid from $10/month.

Writing style:
- Practical, direct, no fluff. First sentence should answer the main question immediately.
- Short paragraphs (2-4 sentences max).
- Use real numbers and specifics wherever possible.
- Link to VideoText tools naturally in context (use href="/tool-path").
- Honest about limitations.
- No marketing speak. Write like you're helping a colleague.

Internal links to use where relevant:
- /video-to-transcript
- /video-to-subtitles
- /translate-subtitles
- /fix-subtitles
- /burn-subtitles
- /compress-video
- /batch-process
- /blog/srt-vs-vtt-subtitle-formats
- /compare
- /pricing`

  const userPrompt = `Write a complete blog post for VideoText.io.

Target keyword: "${topic.keyword}"
Title: "${topic.title}"
Writing angle / what to cover: ${topic.angle}
Tag: ${topic.tag}
Date: ${formatDate(today)}

Return ONLY valid JSON with this exact structure (no markdown wrapping, no extra text):
{
  "slug": "${topic.slug}",
  "date": "${formatDate(today)}",
  "title": "exact title here",
  "summary": "2-sentence summary (used in card preview and meta description). Max 160 characters. Include the target keyword.",
  "tag": "${topic.tag}",
  "readTime": "X min read",
  "metaDescription": "SEO meta description, 150-160 characters, includes keyword, unique value prop",
  "contentHtml": "FULL HTML content as a single string. Use these HTML tags only: <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <pre><code>, <table><thead><tbody><tr><th><td>, <a href='...'>, <blockquote>. Do NOT include <html>, <head>, <body>, <h1>, <h2> tags. Start with a <p> tag. Length: 700-1000 words. Include 3-6 internal links to VideoText tools. Include 3-5 h3 subheadings. Include at least one list (ul or ol). End with a practical next step that links to a VideoText tool."
}

Important for contentHtml:
- Use class='...' only for standard Tailwind classes if needed, otherwise omit
- Internal links must use VideoText paths like href='/video-to-transcript'
- External links should open in new tab: target='_blank' rel='noopener noreferrer'
- All single quotes inside the JSON string value must be escaped as \\' or use &apos;
- Tables should be wrapped: <div class='overflow-x-auto'><table>...</table></div>`

  console.log(`[blog] Calling Claude API for topic: ${topic.slug}`)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: userPrompt },
    ],
    system: systemPrompt,
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  // Strip any markdown code fences if Claude wrapped the JSON
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let parsed: GeneratedPost
  try {
    parsed = JSON.parse(cleaned) as GeneratedPost
  } catch (e) {
    console.error('[blog] Failed to parse Claude response as JSON:')
    console.error(cleaned.slice(0, 500))
    throw new Error('Claude API response was not valid JSON')
  }

  // Validate required fields
  const required = ['slug', 'date', 'title', 'summary', 'contentHtml', 'metaDescription'] as const
  for (const field of required) {
    if (!parsed[field]) throw new Error(`Missing field in generated post: ${field}`)
  }

  return parsed
}

// ── File updaters ──────────────────────────────────────────────────────────
function appendToGeneratedPosts(post: GeneratedPost): void {
  const content = fs.readFileSync(GENERATED_POSTS_FILE, 'utf8')

  // Serialize the post object. contentHtml uses template literals to avoid escaping hell.
  const entry = `  {
    slug: '${post.slug}',
    date: '${post.date}',
    title: ${JSON.stringify(post.title)},
    summary: ${JSON.stringify(post.summary)},
    tag: '${post.tag}',
    readTime: '${post.readTime}',
    contentHtml: ${JSON.stringify(post.contentHtml)},
  },`

  // Insert before the closing array bracket
  const marker = '  // Posts will be appended here automatically by scripts/blog/generate-blog-post.ts'
  if (content.includes(marker)) {
    const updated = content.replace(marker, `${entry}\n${marker}`)
    fs.writeFileSync(GENERATED_POSTS_FILE, updated, 'utf8')
  } else {
    // Fallback: insert before the last ]
    const updated = content.replace(/(\]\s*\n?)$/, `${entry}\n$1`)
    fs.writeFileSync(GENERATED_POSTS_FILE, updated, 'utf8')
  }

  console.log(`[blog] Appended post to ${GENERATED_POSTS_FILE}`)
}

function updateSitemap(post: GeneratedPost): void {
  const content = fs.readFileSync(SITEMAP_FILE, 'utf8')
  const today = isoDate(new Date())
  const newEntry = `  <url>
    <loc>https://videotext.io/blog/${post.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`

  const updated = content.replace('</urlset>', `${newEntry}\n</urlset>`)
  fs.writeFileSync(SITEMAP_FILE, updated, 'utf8')
  console.log(`[blog] Sitemap updated with /blog/${post.slug}`)
}

function updateSeoMeta(post: GeneratedPost): void {
  const content = fs.readFileSync(SEO_META_FILE, 'utf8')
  const blogPath = `/blog/${post.slug}`

  // Check if already exists
  if (content.includes(`'${blogPath}'`) || content.includes(`"${blogPath}"`)) {
    console.log(`[blog] seoMeta already has ${blogPath}, skipping`)
    return
  }

  // Add to STATIC_ROUTE_SEO — insert before the closing } of the object
  const metaEntry = `  '${blogPath}': {
    title: ${JSON.stringify(post.title + ' | VideoText')},
    description: ${JSON.stringify(post.metaDescription)},
  },`

  const breadcrumbEntry = `  '${blogPath}': [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: ${JSON.stringify(post.title)}, path: '${blogPath}' }],`

  // Insert meta before the closing of STATIC_ROUTE_SEO
  // The closing pattern for the static route SEO object is the line just before "/** Static breadcrumb"
  const updatedMeta = content.replace(
    /(\s*)(\/\*\* Static breadcrumb items)/,
    `\n${metaEntry}\n$1$2`
  )

  // Insert breadcrumb — find the marker for the first auto-generated breadcrumb
  const updatedFull = updatedMeta.replace(
    /(\/\/ Blog posts \(individual URLs now indexable\))/,
    `${breadcrumbEntry}\n  $1`
  )

  fs.writeFileSync(SEO_META_FILE, updatedFull, 'utf8')
  console.log(`[blog] seoMeta updated with ${blogPath}`)
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required')
  }

  const client = new Anthropic({ apiKey })

  // 1. Pick next topic
  const topicsData = loadTopics()
  const topic = getNextTopic(topicsData)
  if (!topic) {
    console.log('[blog] All topics have been used. Add more to topics.json to continue.')
    process.exit(0)
  }

  console.log(`[blog] Selected topic: ${topic.slug} — "${topic.keyword}"`)

  // 2. Generate post via Claude
  const post = await generatePost(topic, client)

  // 3. Append to generatedPosts.ts
  appendToGeneratedPosts(post)

  // 4. Update sitemap
  updateSitemap(post)

  // 5. Update seoMeta.ts
  updateSeoMeta(post)

  // 6. Mark topic as used
  topicsData.used.push(topic)
  saveTopics(topicsData)

  console.log(`[blog] Done. New post: /blog/${post.slug}`)
  console.log(`[blog] Title: ${post.title}`)
  console.log(`[blog] Summary: ${post.summary}`)
}

main().catch((e) => {
  console.error('[blog] Error:', e)
  process.exit(1)
})
