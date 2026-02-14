#!/usr/bin/env node
/**
 * Sync routes-inventory.json from client SEO registry (single source of truth).
 * Run from repo root: npx tsx scripts/seo/sync-routes-from-registry.ts
 * Keeps static routes from registry.ts and merges SEO paths from client registry.
 */
import * as path from 'path'
import * as fs from 'fs'
import { STATIC_ROUTES } from './registry'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')
const INVENTORY_PATH = path.join(__dirname, 'routes-inventory.json')

function extractSeoPathsFromRegistry(): string[] {
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const paths: string[] = []
  const pathRe = /path:\s*'(\/[^']+)'/g
  let m: RegExpExecArray | null
  while ((m = pathRe.exec(content)) !== null) {
    paths.push(m[1])
  }
  return paths
}

function main(): void {
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
