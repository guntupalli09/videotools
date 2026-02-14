#!/usr/bin/env node
/**
 * Validate sitemap: no duplicate URLs; sitemap must match indexable inventory exactly.
 * Run after generate-sitemap. Exit 1 on failure.
 * Run from repo root: npx tsx scripts/seo/validate-sitemap.ts
 */
import * as path from 'path'
import * as fs from 'fs'
import { getIndexablePaths } from './registry'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const SITEMAP_PATH = path.join(REPO_ROOT, 'client', 'public', 'sitemap.xml')
const SITE_URL = process.env.SITE_URL || 'https://www.videotext.io'

function main(): void {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error('[validate-sitemap] Sitemap not found:', SITEMAP_PATH)
    process.exit(1)
  }

  const indexablePaths = getIndexablePaths()
  const expectedUrls = new Set(
    indexablePaths.map((p) => (p === '/' ? SITE_URL : `${SITE_URL}${p}`))
  )

  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8')
  const locRe = /<loc>([^<]+)<\/loc>/g
  const found: string[] = []
  let match: RegExpExecArray | null
  while ((match = locRe.exec(xml)) !== null) {
    found.push(match[1])
  }

  const foundSet = new Set(found)
  let failed = false

  if (found.length !== foundSet.size) {
    console.error('[validate-sitemap] Duplicate <loc> in sitemap')
    failed = true
  }

  for (const url of expectedUrls) {
    if (!foundSet.has(url)) {
      console.error('[validate-sitemap] Missing from sitemap:', url)
      failed = true
    }
  }

  for (const url of found) {
    const pathPart = url === SITE_URL ? '/' : url.slice(SITE_URL.length)
    const expectedPath = pathPart || '/'
    if (!indexablePaths.includes(expectedPath)) {
      console.error('[validate-sitemap] Sitemap contains path not in indexable inventory:', url)
      failed = true
    }
  }

  if (failed) {
    process.exit(1)
  }
  console.log('[validate-sitemap] OK —', found.length, 'URLs (indexable only)')
}

main()
