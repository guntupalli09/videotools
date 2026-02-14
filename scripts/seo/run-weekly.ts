#!/usr/bin/env node
/**
 * Weekly SEO job: collect trends → score/filter → decide → output seo-proposals.json.
 * Run from repo root: npx tsx scripts/seo/run-weekly.ts
 * Optional: put API keys in repo root .env (SERP_API_KEY, AHREFS_API_KEY, SEMRUSH_API_KEY).
 */
import * as path from 'path'
import * as fs from 'fs'
import type { SeoConfig, SeoProposals } from './types'
import { runCollectors } from './collectors'
import { runDecisionEngine } from './decision-engine'

// Load optional .env from repo root so local runs pick up SERP_API_KEY etc.
const repoRoot = path.resolve(__dirname, '..', '..')
const envPath = path.join(repoRoot, '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.replace(/\r$/, '').trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !process.env[key]) process.env[key] = value
    }
  }
}

const SCRIPT_DIR = path.resolve(__dirname)
const CONFIG_PATH = path.join(SCRIPT_DIR, 'seo.config.json')
const OUTPUT_DIR = path.join(SCRIPT_DIR, 'output')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'seo-proposals.json')

function loadConfig(): SeoConfig {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
  return JSON.parse(raw) as SeoConfig
}

async function main(): Promise<void> {
  console.log('[SEO] Loading config from', CONFIG_PATH)
  const config = loadConfig()

  console.log('[SEO] Running collectors...')
  const candidates = await runCollectors(config)
  console.log('[SEO] Candidates:', candidates.length)

  console.log('[SEO] Running decision engine...')
  const { proposals, ignored } = runDecisionEngine(candidates, config)

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const out: SeoProposals = {
    generated_at: new Date().toISOString(),
    caps_used: {
      new_pages: proposals.filter((p) => p.type === 'CREATE_NEW_PAGE').length,
      updates: proposals.filter((p) => p.type === 'UPDATE_EXISTING_PAGE').length,
      faq_only: proposals.filter((p) => p.type === 'FAQ_ONLY').length,
    },
    proposals,
    candidates_ignored: ignored,
    raw_candidates_count: candidates.length,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2), 'utf8')
  console.log('[SEO] Wrote', OUTPUT_FILE)
  console.log('[SEO] Proposals:', out.proposals.length, '| New:', out.caps_used.new_pages, '| Updates:', out.caps_used.updates, '| FAQ-only:', out.caps_used.faq_only)

  const changelogPath = path.join(OUTPUT_DIR, 'changelog.md')
  const changelog = buildChangelog(out)
  fs.writeFileSync(changelogPath, changelog, 'utf8')
  console.log('[SEO] Wrote', changelogPath)
}

function buildChangelog(out: SeoProposals): string {
  const date = out.generated_at.slice(0, 10)
  const lines: string[] = [
    `# SEO Weekly Changelog — ${date}`,
    '',
    `- **Raw candidates:** ${out.raw_candidates_count}`,
    `- **Proposals:** ${out.proposals.length} (new: ${out.caps_used.new_pages}, updates: ${out.caps_used.updates}, FAQ-only: ${out.caps_used.faq_only})`,
    `- **Ignored:** ${out.candidates_ignored}`,
    '',
    '## Planned actions',
    '',
  ]
  for (const p of out.proposals) {
    const target = p.path ?? p.slug ?? '—'
    lines.push(`- **${p.type}:** ${p.keyword} → ${target} (${p.reason})`)
  }
  lines.push('')
  lines.push('## Guardrails')
  lines.push('- Caps respected (new pages / updates / FAQ-only within config).')
  lines.push('- Review proposals before applying; merge only when satisfied.')
  return lines.join('\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
