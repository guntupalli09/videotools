#!/usr/bin/env node
/**
 * SEO automation verification: caps, proposals format, routes inventory.
 * Run after generating proposals or before merging. Non-zero exit if checks fail.
 */
import * as path from 'path'
import * as fs from 'fs'
import type { SeoConfig, SeoProposals } from './types'
import { loadRoutesInventory } from './registry'

const SCRIPT_DIR = path.resolve(__dirname)
const CONFIG_PATH = path.join(SCRIPT_DIR, 'seo.config.json')
const PROPOSALS_PATH = path.join(SCRIPT_DIR, 'output', 'seo-proposals.json')

function loadConfig(): SeoConfig {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
  return JSON.parse(raw) as SeoConfig
}

function main(): void {
  let failed = false
  const config = loadConfig()
  const caps = config.caps
  const thresholds = config.thresholds

  console.log('[SEO verify] Checking config and proposals...')

  if (!fs.existsSync(PROPOSALS_PATH)) {
    console.log('[SEO verify] No proposals file; skipping proposal checks.')
    return
  }

  const raw = fs.readFileSync(PROPOSALS_PATH, 'utf8')
  let out: SeoProposals
  try {
    out = JSON.parse(raw) as SeoProposals
  } catch (e) {
    console.error('[SEO verify] Invalid JSON in proposals:', (e as Error).message)
    process.exit(1)
  }

  if (out.caps_used.new_pages > caps.max_new_pages_per_run) {
    console.error('[SEO verify] FAIL: new_pages', out.caps_used.new_pages, '> cap', caps.max_new_pages_per_run)
    failed = true
  }
  if (out.caps_used.updates > caps.max_updates_per_run) {
    console.error('[SEO verify] FAIL: updates', out.caps_used.updates, '> cap', caps.max_updates_per_run)
    failed = true
  }
  if (out.caps_used.new_pages > caps.weekly_new_pages_cap) {
    console.error('[SEO verify] FAIL: new_pages', out.caps_used.new_pages, '> weekly cap', caps.weekly_new_pages_cap)
    failed = true
  }
  if (out.caps_used.updates > caps.weekly_updates_cap) {
    console.error('[SEO verify] FAIL: updates', out.caps_used.updates, '> weekly cap', caps.weekly_updates_cap)
    failed = true
  }

  for (const p of out.proposals) {
    if (p.type === 'CREATE_NEW_PAGE' && p.slug) {
      if (p.slug.length < 5) {
        console.error('[SEO verify] FAIL: slug too short:', p.slug)
        failed = true
      }
    }
    if ((p.type === 'UPDATE_EXISTING_PAGE' || p.type === 'FAQ_ONLY') && p.path) {
      const inventory = loadRoutesInventory()
      if (!inventory.includes(p.path)) {
        console.error('[SEO verify] FAIL: path not in inventory:', p.path)
        failed = true
      }
    }
  }

  const inventory = loadRoutesInventory()
  if (inventory.length === 0) {
    console.error('[SEO verify] FAIL: routes inventory is empty')
    failed = true
  }

  if (!failed) {
    console.log('[SEO verify] Caps and inventory checks passed.')
    return
  }
  process.exit(1)
}

main()
