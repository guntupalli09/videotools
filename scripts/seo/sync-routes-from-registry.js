#!/usr/bin/env node
/**
 * Sync routes-inventory.json from client SEO registry (single source of truth).
 * Run from repo root: node scripts/seo/sync-routes-from-registry.js
 * Keeps static routes (/, /pricing, core tools, etc.) and merges SEO paths from client.
 */
const path = require('path')
const fs = require('fs')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')
const INVENTORY_PATH = path.join(__dirname, 'routes-inventory.json')

const STATIC_ROUTES = [
  '/',
  '/pricing',
  '/privacy',
  '/faq',
  '/terms',
  '/video-to-transcript',
  '/video-to-subtitles',
  '/translate-subtitles',
  '/fix-subtitles',
  '/burn-subtitles',
  '/compress-video',
  '/batch-process',
]

function extractSeoPathsFromRegistry() {
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const paths = []
  const pathRe = /path:\s*'(\/[^']+)'/g
  let m
  while ((m = pathRe.exec(content)) !== null) {
    paths.push(m[1])
  }
  return paths
}

function main() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('[SEO] Registry not found:', REGISTRY_PATH)
    process.exit(1)
  }
  const seoPaths = extractSeoPathsFromRegistry()
  const inventory = [...STATIC_ROUTES, ...seoPaths]
  fs.writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2) + '\n', 'utf8')
  console.log('[SEO] Wrote', INVENTORY_PATH, '| static:', STATIC_ROUTES.length, '| SEO:', seoPaths.length)
}

main()
