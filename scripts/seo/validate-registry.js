#!/usr/bin/env node
/**
 * Validate SEO registry: duplicate paths, required fields, relatedSlugs reference valid paths.
 * Exit 1 on any failure. Run from repo root: node scripts/seo/validate-registry.js
 */
const path = require('path')
const fs = require('fs')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')

const CORE_PATHS = new Set([
  '/video-to-transcript',
  '/video-to-subtitles',
  '/translate-subtitles',
  '/fix-subtitles',
  '/burn-subtitles',
  '/compress-video',
  '/batch-process',
])

function main() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('[validate-registry] Registry not found:', REGISTRY_PATH)
    process.exit(1)
  }

  const content = fs.readFileSync(REGISTRY_PATH, 'utf8')
  let failed = false

  // 1. Extract paths (only from REGISTRY entries: path: '/slug')
  const pathRe = /path:\s*'(\/[^']+)'/g
  const paths = []
  let m
  while ((m = pathRe.exec(content)) !== null) {
    paths.push(m[1])
  }

  const pathSet = new Set(paths)
  const validPaths = new Set([...CORE_PATHS, ...pathSet])

  // Indexable = core + SEO paths that do not have indexable: false
  const pathRe2 = /path:\s*'(\/[^']+)'/g
  const pathMatches = []
  while ((m = pathRe2.exec(content)) !== null) pathMatches.push({ path: m[1], index: m.index })
  const nonIndexable = new Set()
  for (let i = 0; i < pathMatches.length; i++) {
    const blockEnd = pathMatches[i + 1] ? pathMatches[i + 1].index : content.length
    const block = content.slice(pathMatches[i].index, blockEnd)
    if (!/indexable:\s*(?:true|false)\s*[,}]/.test(block)) {
      console.error('[validate-registry] Missing required indexable (true|false) for', pathMatches[i].path)
      failed = true
    }
    if (/indexable:\s*false/.test(block)) nonIndexable.add(pathMatches[i].path)
  }
  const indexablePaths = new Set([...CORE_PATHS, ...paths.filter((p) => !nonIndexable.has(p))])

  // 1b. Extract intentKey, canonicalGroup, primaryInGroup per entry
  const entryMeta = new Map()
  for (let i = 0; i < pathMatches.length; i++) {
    const blockEnd = pathMatches[i + 1] ? pathMatches[i + 1].index : content.length
    const block = content.slice(pathMatches[i].index, blockEnd)
    const path = pathMatches[i].path
    const intentMatch = block.match(/intentKey:\s*'([^']*)'/)
    const canonicalMatch = block.match(/canonicalGroup:\s*'([^']*)'/)
    const primaryMatch = /primaryInGroup:\s*true/.test(block)
    entryMeta.set(path, {
      intentKey: intentMatch ? intentMatch[1] : '',
      canonicalGroup: canonicalMatch ? canonicalMatch[1] : null,
      primaryInGroup: primaryMatch,
      indexable: !nonIndexable.has(path),
    })
  }

  for (const [p, meta] of entryMeta) {
    if (!meta.intentKey || meta.intentKey.length < 2) {
      console.error('[validate-registry] Missing or empty intentKey for', p)
      failed = true
    }
  }

  // Malformed FAQ: each entry with faq must have at least one { q: '...', a: '...' } with non-empty q and a
  for (let i = 0; i < pathMatches.length; i++) {
    const blockEnd = pathMatches[i + 1] ? pathMatches[i + 1].index : content.length
    const block = content.slice(pathMatches[i].index, blockEnd)
    if (!/faq:\s*\[/.test(block)) continue
    const faqMatch = block.match(/faq:\s*\[\r?\n([\s\S]*?)\r?\n\s*\],/)
    if (!faqMatch) {
      console.error('[validate-registry] Malformed faq array for', pathMatches[i].path)
      failed = true
      continue
    }
    const inner = faqMatch[1]
    const itemRe = /\{\s*q:\s*'((?:[^'\\]|\\.)*)'\s*,\s*a:\s*'((?:[^'\\]|\\.)*)'\s*\}/
    const items = inner.match(new RegExp(itemRe.source, 'g')) || []
    for (const item of items) {
      const qm = item.match(/q:\s*'((?:[^'\\]|\\.)*)'/)
      const am = item.match(/a:\s*'((?:[^'\\]|\\.)*)'/)
      const q = qm ? qm[1].replace(/\\'/g, '').trim() : ''
      const a = am ? am[1].replace(/\\'/g, '').trim() : ''
      if (!q || !a) {
        console.error('[validate-registry] FAQ item with empty q or a for', pathMatches[i].path)
        failed = true
      }
    }
  }

  const intentKeyToIndexablePaths = new Map()
  for (const [p, meta] of entryMeta) {
    if (!meta.indexable) continue
    const k = meta.intentKey
    if (!intentKeyToIndexablePaths.has(k)) intentKeyToIndexablePaths.set(k, [])
    intentKeyToIndexablePaths.get(k).push(p)
  }
  for (const [intentKey, indexablePathList] of intentKeyToIndexablePaths) {
    if (indexablePathList.length > 1) {
      console.error('[validate-registry] Duplicate intentKey among indexable pages:', intentKey, indexablePathList)
      failed = true
    }
  }

  const canonicalGroupPrimaries = new Map()
  for (const [p, meta] of entryMeta) {
    if (!meta.indexable || !meta.canonicalGroup || !meta.primaryInGroup) continue
    const g = meta.canonicalGroup
    if (!canonicalGroupPrimaries.has(g)) canonicalGroupPrimaries.set(g, [])
    canonicalGroupPrimaries.get(g).push(p)
  }
  const allowlistPath = path.join(REPO_ROOT, 'scripts', 'seo', 'seo.config.json')
  let canonicalGroupAllowlist = []
  if (fs.existsSync(allowlistPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'))
      canonicalGroupAllowlist = config.canonical_group_allowlist || []
    } catch (_) {}
  }
  for (const [group, primaryPaths] of canonicalGroupPrimaries) {
    if (primaryPaths.length > 1 && !canonicalGroupAllowlist.includes(group)) {
      console.error('[validate-registry] Duplicate primary indexable in canonicalGroup:', group, primaryPaths)
      failed = true
    }
  }

  if (paths.length !== pathSet.size) {
    const seen = new Set()
    for (const p of paths) {
      if (seen.has(p)) {
        console.error('[validate-registry] Duplicate path:', p)
        failed = true
      }
      seen.add(p)
    }
  }

  // 2. Each entry must have title and description (non-empty)
  for (const p of pathSet) {
    const escaped = p.replace(/\//g, '\\/')
    const blockRe = new RegExp(`path:\\s*'${escaped}'[\\s\\S]*?title:\\s*'([^']*)'`, 'm')
    const titleMatch = content.match(blockRe)
    if (!titleMatch || titleMatch[1].length < 5) {
      console.error('[validate-registry] Missing or short title for', p)
      failed = true
    }
    const descRe = new RegExp(`path:\\s*'${escaped}'[\\s\\S]*?description:\\s*\\n?\\s*'([^']*)'`, 'm')
    const descMatch = content.match(descRe)
    if (!descMatch || descMatch[1].length < 30) {
      console.error('[validate-registry] Missing or short description for', p)
      failed = true
    }
  }

  // 3. relatedSlugs: extract and validate
  const relatedRe = /relatedSlugs:\s*\[([\s\S]*?)\]/g
  while ((m = relatedRe.exec(content)) !== null) {
    const inner = m[1]
    const slugs = (inner.match(/'(\/[^']+)'/g) || []).map((s) => s.slice(1, -1))
    for (const slug of slugs) {
      if (!validPaths.has(slug)) {
        console.error('[validate-registry] relatedSlugs references non-existent path:', slug)
        failed = true
      } else if (!indexablePaths.has(slug)) {
        console.error('[validate-registry] relatedSlugs references non-indexable path:', slug)
        failed = true
      }
    }
  }

  if (failed) {
    process.exit(1)
  }
  console.log('[validate-registry] OK —', pathSet.size, 'SEO paths')
}

main()
