#!/usr/bin/env node
/**
 * Write changelog.md from seo-proposals.json. Used in CI after downloading artifact.
 * Usage: npx tsx scripts/seo/write-changelog.ts [path-to-seo-proposals.json]
 */
import * as path from 'path'
import * as fs from 'fs'
import type { SeoProposals } from './types'

const defaultPath = path.join(__dirname, 'output', 'seo-proposals.json')
const proposalsPath = process.argv[2] || defaultPath

if (!fs.existsSync(proposalsPath)) {
  console.warn('[SEO] No proposals file at', proposalsPath)
  process.exit(0)
}

const raw = fs.readFileSync(proposalsPath, 'utf8')
const out = JSON.parse(raw) as SeoProposals
const lines: string[] = [
  `# SEO Weekly Changelog — ${out.generated_at.slice(0, 10)}`,
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
lines.push('- Review proposals before merging.')

const outDir = path.dirname(proposalsPath)
const changelogPath = path.join(outDir, 'changelog.md')
fs.writeFileSync(changelogPath, lines.join('\n'), 'utf8')
console.log('[SEO] Wrote', changelogPath)
