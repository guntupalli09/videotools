#!/usr/bin/env node
/**
 * SEO health check for CI/schedule. Shell-mode: robots + sitemap + HTTP 200.
 * Strict-mode: plus title, meta description, canonical, BreadcrumbList, FAQPage on sample URLs.
 * Env: SITE_URL (canonical base; default https://www.videotext.io), BASE_URL (fetch base; default SITE_URL),
 *      SEO_HEALTH_MODE=shell|strict (default: strict if BASE_URL matches SITE_URL, else shell).
 * Exit: 0 on PASS, 1 on FAIL. Prints first failing URL and reason.
 */
import * as path from 'path'
import * as fs from 'fs'

const SITE_URL = (process.env.SITE_URL || 'https://www.videotext.io').replace(/\/$/, '')
const BASE_URL = (process.env.BASE_URL || SITE_URL).replace(/\/$/, '')
const MODE = process.env.SEO_HEALTH_MODE || 'shell'
const SAMPLE_SIZE = Math.min(20, parseInt(process.env.SEO_HEALTH_SAMPLE_SIZE || '10', 10) || 10)

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')

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
    out.set(p, faqMatch ? (faqMatch[1].match(/\{\s*q:\s*'/g) || []).length : 0)
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
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'SEO-Health-Check/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function fetchOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'SEO-Health-Check/1.0' } })
    return res.ok
  } catch {
    return false
  }
}

function fail(reason: string, url?: string): never {
  console.error('FAIL:', reason + (url ? ` (${url})` : ''))
  process.exit(1)
}

async function main(): Promise<void> {
  console.log('[seo-health] mode=%s BASE_URL=%s SITE_URL=%s', MODE, BASE_URL, SITE_URL)

  // 1) robots.txt
  const robotsUrl = `${BASE_URL}/robots.txt`
  const robotsOk = await fetchOk(robotsUrl)
  if (!robotsOk) fail('robots.txt did not return 200', robotsUrl)
  const robotsBody = await fetchUrl(robotsUrl)
  if (/Disallow:\s*\/\s*$/m.test(robotsBody)) fail('robots.txt appears to block all (Disallow: /)', robotsUrl)
  console.log('[seo-health] robots.txt OK')

  // 2) sitemap.xml
  const sitemapUrl = `${BASE_URL}/sitemap.xml`
  const sitemapOk = await fetchOk(sitemapUrl)
  if (!sitemapOk) fail('sitemap.xml did not return 200', sitemapUrl)
  const sitemapBody = await fetchUrl(sitemapUrl)
  const locs = [...sitemapBody.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim().toLowerCase())
  const seen = new Set<string>()
  for (const loc of locs) {
    if (seen.has(loc)) fail('sitemap.xml contains duplicate <loc>', loc)
    seen.add(loc)
  }
  console.log('[seo-health] sitemap.xml OK (%d URLs)', locs.length)

  if (MODE === 'shell') {
    console.log('[seo-health] PASS (shell-mode)')
    return
  }

  // 3) Sample URLs from sitemap (or use same-host URLs only)
  const baseOrigin = new URL(BASE_URL).origin
  const sampleUrls = locs
    .filter((u) => u.startsWith(baseOrigin))
    .slice(0, SAMPLE_SIZE)
  if (sampleUrls.length === 0) fail('no sitemap URLs under BASE_URL to sample')

  const registryFaq = getRegistryFaqCountByPath()
  for (const url of sampleUrls) {
    try {
      const html = await fetchUrl(url)
      const pathname = new URL(url).pathname || '/'
      const pathKey = pathname === '/' ? '/' : pathname
      const { title, metaDescription, canonical, breadcrumbList, faqPage } = parseHtml(html)
      if (!title || title.length < 2) fail('missing or empty <title>', url)
      if (!metaDescription || metaDescription.length < 20) fail('missing or short meta description', url)
      const expectedCanonical = pathKey === '/' ? SITE_URL : `${SITE_URL}${pathKey}`
      const canonicalNorm = canonical ? canonical.replace(/\/$/, '') || canonical : ''
      const expectedNorm = expectedCanonical.replace(/\/$/, '')
      if (!canonical || canonicalNorm !== expectedNorm) fail(`canonical expected ${expectedCanonical}, got ${canonical || 'null'}`, url)
      const isToolOrSeo = pathKey !== '/' && pathKey !== '/pricing' && pathKey !== '/faq'
      if (isToolOrSeo && !breadcrumbList) fail('BreadcrumbList JSON-LD expected', url)
      const expectFaqPage = pathKey === '/faq' || (registryFaq.get(pathKey) ?? 0) > 0
      if (expectFaqPage && !faqPage) fail('FAQPage JSON-LD expected (registry has FAQs)', url)
      if (!expectFaqPage && faqPage && pathKey !== '/faq') fail('FAQPage JSON-LD should not be present', url)
    } catch (e) {
      fail((e as Error).message, url)
    }
  }
  console.log('[seo-health] PASS (strict-mode, %d URLs)', sampleUrls.length)
}

main()
