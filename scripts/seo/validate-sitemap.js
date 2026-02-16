#!/usr/bin/env node
/**
 * Validate sitemap: no duplicate URLs, all registry + static paths present.
 * Run after sync-routes-from-registry. Exit 1 on failure.
 * Run from repo root: node scripts/seo/validate-sitemap.js
 */
const path = require('path')
const fs = require('fs')

const SCRIPT_DIR = path.resolve(__dirname)
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const INVENTORY_PATH = path.join(SCRIPT_DIR, 'routes-inventory.json')
const SITEMAP_PATH = path.join(REPO_ROOT, 'client', 'public', 'sitemap.xml')

const SITE_URL = process.env.SITE_URL || 'https://www.videotext.io'

function main() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    console.error('[validate-sitemap] Run sync-routes-from-registry.js first. Missing:', INVENTORY_PATH)
    process.exit(1)
  }
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error('[validate-sitemap] Sitemap not found:', SITEMAP_PATH)
    process.exit(1)
  }

  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'))
  const expectedUrls = new Set(
    inventory.map((p) => (p === '/' ? SITE_URL : `${SITE_URL}${p}`))
  )

  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8')
  const locRe = /<loc>([^<]+)<\/loc>/g
  const found = []
  let match
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
    if (!inventory.includes(expectedPath)) {
      console.error('[validate-sitemap] Sitemap contains path not in inventory:', url)
      failed = true
    }
  }

  if (failed) {
    process.exit(1)
  }
  console.log('[validate-sitemap] OK —', found.length, 'URLs')
}

main()
