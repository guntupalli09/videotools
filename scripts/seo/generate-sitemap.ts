#!/usr/bin/env node
/**
 * Generate sitemap.xml from routes inventory. Run from repo root.
 * Output: client/public/sitemap.xml (or path via SITEMAP_OUTPUT env).
 * To refresh inventory from client registry first: npm run seo:sync
 */
import * as path from 'path'
import * as fs from 'fs'
import { getIndexablePaths } from './registry'

const SITE_URL = process.env.SITE_URL || 'https://www.videotext.io'
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const DEFAULT_OUTPUT = path.join(REPO_ROOT, 'client', 'public', 'sitemap.xml')

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function main(): Promise<void> {
  const inventory = getIndexablePaths()
  const today = new Date().toISOString().slice(0, 10)

  const urls = inventory
    .filter((p) => p !== '*')
    .map((p) => {
      const loc = p === '/' ? SITE_URL : `${SITE_URL}${p}`
      const priority = p === '/' ? '1.0' : p === '/pricing' ? '0.9' : p.startsWith('/video-to-') || p.startsWith('/mp4-') ? '0.9' : '0.8'
      const changefreq = p === '/' ? 'weekly' : 'monthly'
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`

  const outPath = process.env.SITEMAP_OUTPUT || DEFAULT_OUTPUT
  fs.writeFileSync(outPath, xml, 'utf8')
  console.log('[SEO] Sitemap written to', outPath)

  if (process.env.SITEMAP_PING !== '0' && process.env.SITEMAP_PING !== 'false') {
    const sitemapUrl = `${SITE_URL}/sitemap.xml`
    const pingUrls = [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
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
