#!/usr/bin/env node
/**
 * Smoke test: fetch 10 URLs and assert title, meta description, canonical, BreadcrumbList, FAQPage.
 * FAQPage assertion is registry-driven: expect FAQPage JSON-LD when registry entry has faq.length > 0.
 * No flaky deps; uses fetch. Run after build with BASE_URL pointing at served client (e.g. http://localhost:4173).
 * Run from repo root: npx tsx scripts/seo/smoke-seo-output.ts
 */
import * as path from 'path'
import * as fs from 'fs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')

const STATIC_PATHS = ['/', '/pricing', '/faq']
const CORE_TOOL_PATHS = ['/video-to-transcript', '/video-to-subtitles']
const FIVE_SEO_PATHS = ['/video-to-text', '/mp4-to-srt', '/subtitle-generator', '/srt-translator', '/meeting-transcript']

const TEN_PATHS = [...STATIC_PATHS, ...CORE_TOOL_PATHS, ...FIVE_SEO_PATHS]

/** Parse registry file: path -> number of FAQ items (0 if no faq or path not found). */
function getRegistryFaqCountByPath(): Map<string, number> {
  const out = new Map<string, number>()
  if (!fs.existsSync(REGISTRY_PATH)) return out
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const pathRe = /path:\s*'(\/[^']+)'/g
  const matches = [...content.matchAll(pathRe)]
  for (let i = 0; i < matches.length; i++) {
    const p = matches[i][1]
    const blockEnd = i + 1 < matches.length ? matches[i + 1].index! : content.length
    const block = content.slice(matches[i].index!, blockEnd)
    const faqMatch = block.match(/faq:\s*\[\n([\s\S]*?)\n    \],/)
    const count = faqMatch ? (faqMatch[1].match(/\{\s*q:\s*'/g) || []).length : 0
    out.set(p, count)
  }
  return out
}

function parseHtml(html: string): {
  title: string | null
  metaDescription: string | null
  canonical: string | null
  breadcrumbList: boolean
  faqPage: boolean
} {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : null
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  const metaDescription = descMatch ? descMatch[1].trim() : null
  const canonMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i)
  const canonical = canonMatch ? canonMatch[1].trim() : null
  const breadcrumbList = /"@type"\s*:\s*"BreadcrumbList"/.test(html) || /BreadcrumbList/.test(html)
  const faqPage = /"@type"\s*:\s*"FAQPage"/.test(html) || /FAQPage/.test(html)
  return { title, metaDescription, canonical, breadcrumbList, faqPage }
}

async function fetchUrl(url: string): Promise<string> {
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'SEO-Smoke/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function main(): Promise<void> {
  const registryFaqCount = getRegistryFaqCountByPath()
  const base = BASE_URL.replace(/\/$/, '')
  let failed = false
  for (const p of TEN_PATHS) {
    const url = p === '/' ? base : `${base}${p}`
    try {
      const html = await fetchUrl(url)
      const { title, metaDescription, canonical, breadcrumbList, faqPage } = parseHtml(html)
      if (!title || title.length < 2) {
        console.error(`[smoke] ${url}: missing or empty <title>`)
        failed = true
        continue
      }
      if (!metaDescription || metaDescription.length < 20) {
        console.error(`[smoke] ${url}: missing or short meta description`)
        failed = true
        continue
      }
      const expectedPath = p === '/' ? '' : p
      const expectedCanonical = `${base}${expectedPath}`
      if (!canonical || canonical !== expectedCanonical) {
        console.error(`[smoke] ${url}: canonical expected ${expectedCanonical}, got ${canonical}`)
        failed = true
        continue
      }
      const isToolOrSeo = p !== '/' && p !== '/pricing' && p !== '/faq'
      if (isToolOrSeo && !breadcrumbList) {
        console.error(`[smoke] ${url}: BreadcrumbList JSON-LD expected`)
        failed = true
        continue
      }
      const expectFaqPage = p === '/faq' || (registryFaqCount.get(p) ?? 0) > 0
      if (expectFaqPage && !faqPage) {
        console.error(`[smoke] ${url}: FAQPage JSON-LD expected (registry has FAQs for this path)`)
        failed = true
        continue
      }
      if (!expectFaqPage && faqPage && p !== '/faq') {
        console.error(`[smoke] ${url}: FAQPage JSON-LD should not be present (registry has no FAQs for this path)`)
        failed = true
        continue
      }
      console.log(`[smoke] OK ${url}`)
    } catch (e) {
      console.error(`[smoke] ${url}: ${(e as Error).message}`)
      failed = true
    }
  }
  if (failed) process.exit(1)
  console.log('[smoke] All 10 URLs passed.')
}

main()
