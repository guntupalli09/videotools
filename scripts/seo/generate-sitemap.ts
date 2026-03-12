#!/usr/bin/env node
/**
 * Generate split sitemaps: core (submit first) + programmatic.
 * Output: client/public/sitemap-index.xml, sitemap-core.xml, sitemap-programmatic.xml
 */
import * as path from 'path'
import * as fs from 'fs'
import { CORE_PATHS, getSitemap2Paths } from './registry'

const SITE_URL = process.env.SITE_URL || 'https://videotext.io'
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const PUBLIC_DIR = path.join(REPO_ROOT, 'client', 'public')

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildUrlSet(paths: string[], today: string): string {
  const urls = paths
    .filter((p) => p !== '*')
    .map((p) => {
      const loc = p === '/' ? SITE_URL : `${SITE_URL}${p}`
      const priority = p === '/' ? '1.0' : p === '/pricing' ? '0.9' : p.startsWith('/video-to-') || p.startsWith('/mp4-') || p.startsWith('/youtube-') || p.startsWith('/transcribe-youtube') ? '0.9' : '0.8'
      const changefreq = p === '/' ? 'weekly' : 'monthly'
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    })
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
}

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  // Sitemap 1 — Core pages (~40). Submit this first.
  const corePaths = [...new Set(CORE_PATHS)]
  const coreXml = buildUrlSet(corePaths, today)
  const corePath = path.join(PUBLIC_DIR, 'sitemap-core.xml')
  fs.writeFileSync(corePath, coreXml, 'utf8')
  console.log('[SEO] Sitemap 1 (core):', corePath, `(${corePaths.length} URLs)`)

  // Sitemap 2 — Programmatic + remaining manual pages
  const sitemap2Paths = getSitemap2Paths()
  const sitemap2Xml = buildUrlSet(sitemap2Paths, today)
  const sitemap2Path = path.join(PUBLIC_DIR, 'sitemap-programmatic.xml')
  fs.writeFileSync(sitemap2Path, sitemap2Xml, 'utf8')
  console.log('[SEO] Sitemap 2 (programmatic + other):', sitemap2Path, `(${sitemap2Paths.length} URLs)`)

  // Sitemap index — references both. Submit sitemap-index.xml or sitemap-core.xml first.
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-core.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-programmatic.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>
`
  const indexPath = path.join(PUBLIC_DIR, 'sitemap-index.xml')
  fs.writeFileSync(indexPath, indexXml, 'utf8')
  console.log('[SEO] Sitemap index:', indexPath)

  // Legacy: also write sitemap.xml as copy of index (for backwards compatibility)
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), indexXml, 'utf8')
  console.log('[SEO] sitemap.xml (→ index):', path.join(PUBLIC_DIR, 'sitemap.xml'))

  if (process.env.SITEMAP_PING !== '0' && process.env.SITEMAP_PING !== 'false') {
    // Ping with index; to submit core only first, use: SITEMAP_PING_URL=https://videotext.io/sitemap-core.xml
    const pingUrl = process.env.SITEMAP_PING_URL || `${SITE_URL}/sitemap-index.xml`
    const pingUrls = [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(pingUrl)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(pingUrl)}`,
    ]
    for (const url of pingUrls) {
      try {
        const res = await fetch(url)
        if (res.ok) console.log('[SEO] Pinged:', url.split('?')[0])
      } catch {
        // non-fatal
      }
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
