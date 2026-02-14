#!/usr/bin/env node
/**
 * Apply SEO proposals to seoRegistry.ts.
 * Supports CREATE_NEW_PAGE, FAQ_ONLY, UPDATE_EXISTING_PAGE with strict guardrails.
 * Deterministic: same proposals JSON => same registry edit.
 * Run from repo root: npx tsx scripts/seo/apply-proposals-to-registry.ts [path-to-seo-proposals.json]
 */
import * as path from 'path'
import * as fs from 'fs'
import type { SeoProposals, ProposalAction, FaqItem } from './types'
import type { SeoConfig } from './types'
import { getIndexablePaths } from './registry'

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')
const CONFIG_PATH = path.join(__dirname, 'seo.config.json')
const defaultProposalsPath = path.join(__dirname, 'output', 'seo-proposals.json')

const MAX_FAQ_ADDITIONS_PER_PAGE = 5
const MAX_INTRO_APPEND_CHARS = 120
const MAX_INTRO_DELTA_RATIO = 0.25

type SeoToolKey =
  | 'video-to-transcript'
  | 'video-to-subtitles'
  | 'translate-subtitles'
  | 'fix-subtitles'
  | 'burn-subtitles'
  | 'compress-video'
  | 'batch-process'

function loadConfig(): SeoConfig {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
  return JSON.parse(raw) as SeoConfig
}

function escapeTsString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '')
}

function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function defaultToolKey(keyword: string): SeoToolKey {
  const k = keyword.toLowerCase()
  if (k.includes('subtitle') && (k.includes('translate') || k.includes('srt') || k.includes('vtt'))) return 'translate-subtitles'
  if (k.includes('subtitle') && (k.includes('fix') || k.includes('timing') || k.includes('grammar'))) return 'fix-subtitles'
  if (k.includes('burn') || k.includes('hardcod') || k.includes('caption')) return 'burn-subtitles'
  if (k.includes('compress') || k.includes('reduce') || k.includes('size')) return 'compress-video'
  if (k.includes('batch') || k.includes('bulk')) return 'batch-process'
  if (k.includes('subtitle') || k.includes('srt') || k.includes('vtt')) return 'video-to-subtitles'
  return 'video-to-transcript'
}

function normalizeFaqQ(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ')
}

function getRegistryPaths(content: string): string[] {
  const pathRe = /path:\s*'(\/[^']+)'/g
  return [...content.matchAll(pathRe)].map((m) => m[1])
}

function getEntryBlock(content: string, targetPath: string): { start: number; end: number; block: string } | null {
  const pathRe = /path:\s*'(\/[^']+)'/g
  const matches = [...content.matchAll(pathRe)]
  const idx = matches.findIndex((m) => m[1] === targetPath)
  if (idx === -1) return null
  const start = matches[idx].index!
  const end = idx + 1 < matches.length ? matches[idx + 1].index! : content.length
  return { start, end, block: content.slice(start, end) }
}

function parseExistingFaq(block: string): FaqItem[] {
  const faqMatch = block.match(/faq:\s*\[\n([\s\S]*?)\n    \],/)
  if (!faqMatch) return []
  const inner = faqMatch[1]
  const items: FaqItem[] = []
  const itemRe = /\{\s*q:\s*'((?:[^'\\]|\\.)*)'\s*,\s*a:\s*'((?:[^'\\]|\\.)*)'\s*\}/g
  let m
  while ((m = itemRe.exec(inner)) !== null) {
    items.push({ q: m[1].replace(/\\'/g, "'"), a: m[2].replace(/\\'/g, "'") })
  }
  return items
}

function faqToTsLines(items: FaqItem[]): string {
  return items
    .map((item) => `      { q: '${escapeTsString(item.q)}', a: '${escapeTsString(item.a)}' },`)
    .join('\n')
}

function generateFaqFromKeyword(keyword: string, count: number): FaqItem[] {
  const faqs: FaqItem[] = []
  if (count >= 1) faqs.push({ q: `What is ${keyword}?`, a: `VideoText helps with ${keyword}. Use our free tools to get started.` })
  if (count >= 2) faqs.push({ q: `How do I use VideoText for ${keyword}?`, a: 'Upload your file or paste a URL, then follow the steps. Free tier available.' })
  if (count >= 3) faqs.push({ q: 'Is this free?', a: 'Yes. Free tier available. No signup required to try.' })
  return faqs.slice(0, count)
}

function applyFaqOnly(
  content: string,
  proposals: ProposalAction[],
  config: SeoConfig,
  registryPaths: Set<string>,
  logs: string[]
): string {
  const maxAdd = Math.min(MAX_FAQ_ADDITIONS_PER_PAGE, config.thresholds.max_faq_per_update ?? 5)
  const faqOnly = proposals.filter((p) => p.type === 'FAQ_ONLY' && p.path && registryPaths.has(p.path))
  const byPath = new Map<string, ProposalAction[]>()
  for (const p of faqOnly) {
    const list = byPath.get(p.path!) || []
    list.push(p)
    byPath.set(p.path!, list)
  }
  let out = content
  for (const [targetPath, pathProposals] of byPath) {
    const entry = getEntryBlock(out, targetPath)
    if (!entry) continue
    const existingFaq = parseExistingFaq(entry.block)
    const existingQs = new Set(existingFaq.map((f) => normalizeFaqQ(f.q)))
    const toAdd: FaqItem[] = []
    for (const p of pathProposals.slice(0, 1)) {
      const additions = p.faq_additions?.length ? p.faq_additions : generateFaqFromKeyword(p.keyword, Math.min(3, maxAdd))
      for (const item of additions.slice(0, maxAdd - toAdd.length)) {
        const nq = normalizeFaqQ(item.q)
        if (!existingQs.has(nq) && toAdd.length < maxAdd) {
          existingQs.add(nq)
          toAdd.push(item)
        }
      }
    }
    if (toAdd.length === 0) continue
    const newFaq = [...existingFaq, ...toAdd]
    const newFaqBlock = `faq: [\n${faqToTsLines(newFaq)}\n    ],`
    const oldFaqRe = new RegExp(`(path:\\s*'${targetPath.replace(/\//g, '\\/')}'[\\s\\S]*?)faq:\\s*\\[\\n[\\s\\S]*?\\n    \\],`, 'm')
    if (!oldFaqRe.test(out)) continue
    out = out.replace(oldFaqRe, `$1${newFaqBlock}`)
    logs.push(`FAQ_ONLY: ${targetPath} +${toAdd.length} FAQ(s)`)
  }
  return out
}

function applyUpdateExistingPage(
  content: string,
  proposals: ProposalAction[],
  config: SeoConfig,
  indexableSet: Set<string>,
  registryPaths: Set<string>,
  logs: string[]
): string {
  const maxUpdates = config.caps.max_updates_per_run ?? 3
  const updates = proposals.filter((p) => p.type === 'UPDATE_EXISTING_PAGE' && p.path && registryPaths.has(p.path)).slice(0, maxUpdates)
  let out = content
  for (const p of updates) {
    const targetPath = p.path!
    const entry = getEntryBlock(out, targetPath)
    if (!entry) continue
    const introMatch = entry.block.match(/intro:\s*\n\s*'((?:[^'\\]|\\.)*)'/)
    if (introMatch) {
      const currentIntro = introMatch[1].replace(/\\'/g, "'")
      const append = (p.intro_append ?? ` VideoText supports ${p.keyword} and related tools.`).slice(0, MAX_INTRO_APPEND_CHARS)
      if (append && append.length <= currentIntro.length * MAX_INTRO_DELTA_RATIO) {
        const newIntro = currentIntro + append
        const escaped = escapeTsString(newIntro)
        const introRe = new RegExp(`(path:\\s*'${targetPath.replace(/\//g, '\\/')}'[\\s\\S]*?intro:\\s*\\n\\s*)'((?:[^'\\\\]|\\\\.)*)'`, 'm')
        out = out.replace(introRe, `$1'${escaped}'`)
        logs.push(`UPDATE_EXISTING_PAGE: ${targetPath} intro append`)
      }
    }
    const slugsToAdd = p.related_slugs_add?.filter((s) => indexableSet.has(s)) ?? []
    if (slugsToAdd.length > 0) {
      const relatedMatch = entry.block.match(/relatedSlugs:\s*\[([\s\S]*?)\]/)
      if (relatedMatch) {
        const existing = (relatedMatch[1].match(/'(\/[^']+)'/g) || []).map((s) => s.slice(1, -1))
        const combined = [...new Set([...existing, ...slugsToAdd])]
        const newRelated = `relatedSlugs: [${combined.map((s) => `'${s}'`).join(', ')}]`
        const relatedRe = new RegExp(`(path:\\s*'${targetPath.replace(/\//g, '\\/')}'[\\s\\S]*?)relatedSlugs:\\s*\\[[\\s\\S]*?\\]`, 'm')
        out = out.replace(relatedRe, `$1${newRelated}`)
        logs.push(`UPDATE_EXISTING_PAGE: ${targetPath} relatedSlugs +${slugsToAdd.length}`)
      }
    }
  }
  return out
}

function buildNewEntry(p: ProposalAction): string {
  if (p.type !== 'CREATE_NEW_PAGE' || !p.slug) throw new Error('CREATE_NEW_PAGE must have slug')
  const pathVal = '/' + p.slug
  const intentKey = (p.intentKey ?? p.slug).slice(0, 60)
  const title = `${p.keyword} | VideoText`
  const description = `Use VideoText for ${p.keyword}. Free online tools for video to text, subtitles, and more.`
  const h1 = p.keyword
  const intro = description
  const breadcrumbLabel = slugToLabel(p.slug)
  const toolKey = defaultToolKey(p.keyword)
  const relatedSlugs = ['/video-to-transcript', '/video-to-subtitles']
  const faqQ = `What is ${p.keyword}?`
  const faqA = `VideoText helps with ${p.keyword}. Use our free tools to get started.`
  const faqQ2 = 'Is this free?'
  const faqA2 = 'Yes. Free tier available. No signup required to try.'

  return `  {
    path: '${pathVal}',
    title: '${escapeTsString(title)}',
    description:
      '${escapeTsString(description)}',
    h1: '${escapeTsString(h1)}',
    intro:
      '${escapeTsString(intro)}',
    breadcrumbLabel: '${escapeTsString(breadcrumbLabel)}',
    toolKey: '${toolKey}',
    relatedSlugs: [${relatedSlugs.map((s) => `'${s}'`).join(', ')}],
    indexable: true,
    intentKey: '${escapeTsString(intentKey)}',
    faq: [
      { q: '${escapeTsString(faqQ)}', a: '${escapeTsString(faqA)}' },
      { q: '${escapeTsString(faqQ2)}', a: '${escapeTsString(faqA2)}' },
    ],
  }`
}

function main(): void {
  const proposalsPath = process.argv[2] || defaultProposalsPath
  if (!fs.existsSync(proposalsPath)) {
    console.log('[apply-proposals] No proposals file at', proposalsPath, '— skipping.')
    process.exit(0)
  }

  const raw = fs.readFileSync(proposalsPath, 'utf8')
  let out: SeoProposals
  try {
    out = JSON.parse(raw) as SeoProposals
  } catch (e) {
    console.error('[apply-proposals] Invalid JSON:', (e as Error).message)
    process.exit(1)
  }

  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('[apply-proposals] Registry not found:', REGISTRY_PATH)
    process.exit(1)
  }

  const config = loadConfig()
  const indexablePaths = getIndexablePaths()
  const indexableSet = new Set(indexablePaths)
  let content = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const registryPaths = new Set(getRegistryPaths(content))
  const logs: string[] = []

  const faqOnly = out.proposals.filter((p) => p.type === 'FAQ_ONLY')
  const updates = out.proposals.filter((p) => p.type === 'UPDATE_EXISTING_PAGE')
  const createNew = out.proposals.filter((p) => p.type === 'CREATE_NEW_PAGE') as (ProposalAction & { slug: string })[]

  if (faqOnly.length > 0) {
    content = applyFaqOnly(content, out.proposals, config, registryPaths, logs)
  }
  if (updates.length > 0) {
    content = applyUpdateExistingPage(content, out.proposals, config, indexableSet, registryPaths, logs)
  }
  if (createNew.length > 0) {
    const marker = '/** Lookup by path'
    const idx = content.indexOf(marker)
    if (idx === -1) {
      console.error('[apply-proposals] Could not find REGISTRY end marker in', REGISTRY_PATH)
      process.exit(1)
    }
    const beforeComment = content.slice(0, idx)
    const afterComment = content.slice(idx)
    const lastEntryEnd = beforeComment.lastIndexOf('  },')
    if (lastEntryEnd === -1) {
      console.error('[apply-proposals] Could not find last REGISTRY entry in', REGISTRY_PATH)
      process.exit(1)
    }
    const newEntriesBlock = createNew.map((p) => buildNewEntry(p)).join(',\n')
    content =
      beforeComment.slice(0, lastEntryEnd + 4) +
      '\n' +
      newEntriesBlock +
      ',\n]\n\n' +
      afterComment
    logs.push(`CREATE_NEW_PAGE: ${createNew.map((p) => p.slug).join(', ')}`)
  }

  if (logs.length === 0) {
    console.log('[apply-proposals] No applicable proposals — nothing to apply.')
    process.exit(0)
  }

  fs.writeFileSync(REGISTRY_PATH, content, 'utf8')
  for (const log of logs) console.log('[apply-proposals]', log)

  const { execSync } = require('child_process')
  try {
    execSync('node scripts/seo/validate-registry.js', { cwd: REPO_ROOT, stdio: 'inherit' })
  } catch {
    console.error('[apply-proposals] Registry validation failed after edit — abort.')
    process.exit(1)
  }
}

main()
