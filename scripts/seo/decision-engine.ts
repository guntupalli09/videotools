/**
 * Decision engine: map keyword candidates to actions (UPDATE_EXISTING_PAGE, CREATE_NEW_PAGE, FAQ_ONLY, IGNORE)
 * with caps and guardrails. Deterministic and auditable.
 */
import type { KeywordCandidate, SeoConfig, ProposalAction } from './types'
import {
  loadRoutesInventory,
  findBestExistingPath,
  getExistingIntentKeys,
} from './registry'

/** Relevance above this → UPDATE_EXISTING_PAGE; below → FAQ_ONLY when path exists. */
const FAQ_ONLY_RELEVANCE_MAX = 0.5

export function runDecisionEngine(
  candidates: KeywordCandidate[],
  config: SeoConfig
): { proposals: ProposalAction[]; ignored: number } {
  const inventory = loadRoutesInventory()
  const existingIntentKeys = getExistingIntentKeys()
  const caps = config.caps
  const minRelevance = config.thresholds.minimum_relevance_score
  let newCount = 0
  let updateCount = 0
  let faqOnlyCount = 0
  const maxFaqOnlyPerRun = Math.max(2, caps.max_updates_per_run)
  const proposals: ProposalAction[] = []
  const seenPathsUpdate = new Set<string>()
  const seenPathsFaq = new Set<string>()
  const seenNewSlugs = new Set<string>()

  for (const c of candidates) {
    if (c.risk_score >= 1) continue
    if (c.relevance_score < minRelevance) continue

    const existingPath = findBestExistingPath(c.phrase, inventory)

    if (existingPath) {
      const highRelevance = c.relevance_score >= FAQ_ONLY_RELEVANCE_MAX
      if (highRelevance) {
        if (updateCount >= caps.max_updates_per_run) continue
        if (seenPathsUpdate.has(existingPath)) continue
        seenPathsUpdate.add(existingPath)
        updateCount++
        proposals.push({
          type: 'UPDATE_EXISTING_PAGE',
          keyword: c.phrase,
          path: existingPath,
          reason: `High relevance (${c.relevance_score}); add section + 2–5 FAQs + internal links`,
          relevance_score: c.relevance_score,
        })
      } else {
        if (faqOnlyCount >= maxFaqOnlyPerRun) continue
        if (seenPathsFaq.has(existingPath)) continue
        seenPathsFaq.add(existingPath)
        faqOnlyCount++
        proposals.push({
          type: 'FAQ_ONLY',
          keyword: c.phrase,
          path: existingPath,
          reason: `Minor variant; add 2–5 FAQs to best-fit page (relevance ${c.relevance_score})`,
          relevance_score: c.relevance_score,
        })
      }
      continue
    }

    const slug = c.phrase.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (slug.length < 5) continue
    if (seenNewSlugs.has(slug)) continue
    const newPath = '/' + slug
    if (inventory.includes(newPath)) continue // duplicate path / canonical conflict
    if (existingIntentKeys.has(slug)) continue // intentKey already taken (cannibalization guard)
    if (newCount >= caps.max_new_pages_per_run) continue
    seenNewSlugs.add(slug)
    newCount++
    proposals.push({
      type: 'CREATE_NEW_PAGE',
      keyword: c.phrase,
      slug: slug.slice(0, 60),
      reason: `New intent; no existing page fit; relevance ${c.relevance_score}`,
      relevance_score: c.relevance_score,
      intentKey: slug.slice(0, 60),
    })
  }

  const ignored = candidates.length - proposals.length
  return { proposals, ignored }
}
