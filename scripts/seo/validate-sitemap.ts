#!/usr/bin/env node
/**
 * Validate sitemaps: no duplicate URLs; core + programmatic must match indexable inventory.
 * Run after generate-sitemap. Exit 1 on failure.
 */
import * as path from 'path'
import * as fs from 'fs'
import { getIndexablePaths } from './registry'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const PUBLIC_DIR = path.join(REPO_ROOT, 'client', 'public')
const SITE_URL = process.env.SITE_URL || 'https://videotext.io'

function extractUrlsFromXml(xml: string): string[] {
  const locRe = /<loc>([^<]+)<\/loc>/g
  const found: string[] = []
  let match: RegExpExecArray | null
  while ((match = locRe.exec(xml)) !== null) {
    found.push(match[1])
  }
  return found
}

function main(): void {
  const corePath = path.join(PUBLIC_DIR, 'sitemap-core.xml')
  const programmaticPath = path.join(PUBLIC_DIR, 'sitemap-programmatic.xml')

  if (!fs.existsSync(corePath) || !fs.existsSync(programmaticPath)) {
    console.error('[validate-sitemap] Run npm run seo:sitemap first')
    process.exit(1)
  }

  const coreUrls = extractUrlsFromXml(fs.readFileSync(corePath, 'utf8'))
  const programmaticUrls = extractUrlsFromXml(fs.readFileSync(programmaticPath, 'utf8'))
  const found = [...coreUrls, ...programmaticUrls]

  const indexablePaths = getIndexablePaths()
  const expectedUrls = new Set(
    indexablePaths.map((p) => (p === '/' ? SITE_URL : `${SITE_URL}${p}`))
  )

  const foundSet = new Set(found)
  let failed = false

  if (found.length !== foundSet.size) {
    console.error('[validate-sitemap] Duplicate <loc> across sitemaps')
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
  console.log('[validate-sitemap] OK — core:', coreUrls.length, ', programmatic:', programmaticUrls.length, ', total:', found.length)
}

main()
