/**
 * Run all enabled collectors and return a unified list of keyword phrases (deduplicated).
 */
import type { KeywordCandidate, TrendSignal, SearchIntent, SuggestedPageType } from '../types'
import { collectSerpSuggestions } from './serp-suggest'
import { collectYoutubeSuggestions } from './youtube-suggest'
import { collectRedditKeywords } from './reddit'
import { collectSerpApiSuggestions } from './optional-serp'
import type { SeoConfig } from '../types'

function normalizePhrase(p: string): string {
  return p
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 80)
}

function scoreRelevance(phrase: string, productKeywords: string[]): number {
  const lower = phrase.toLowerCase()
  let score = 0
  for (const kw of productKeywords) {
    if (lower.includes(kw.toLowerCase())) score += 0.25
  }
  if (score > 1) score = 1
  return Math.round(score * 100) / 100
}

function scoreRisk(phrase: string, blacklist: string[]): number {
  const lower = phrase.toLowerCase()
  for (const b of blacklist) {
    if (lower.includes(b.toLowerCase())) return 1
  }
  return 0
}

export async function runCollectors(config: SeoConfig): Promise<KeywordCandidate[]> {
  const seeds = config.product_keywords.slice(0, 15)
  const phraseToMeta = new Map<
    string,
    { sources: Set<string>; trend: TrendSignal; intent: SearchIntent }
  >()

  const add = (
    phrase: string,
    source: string,
    trend: TrendSignal = 'stable',
    intent: SearchIntent = 'transactional'
  ) => {
    const n = normalizePhrase(phrase)
    if (n.length < 3) return
    const existing = phraseToMeta.get(n)
    if (existing) {
      existing.sources.add(source)
      return
    }
    phraseToMeta.set(n, {
      sources: new Set([source]),
      trend,
      intent,
    })
  }

  const src = config.sources

  if (src.serp_suggest?.enabled) {
    const cacheHours = src.serp_suggest.cache_hours ?? 24
    const maxQueries = src.serp_suggest.max_queries ?? 20
    const map = await collectSerpSuggestions(seeds, maxQueries)
    for (const [seed, suggestions] of map) {
      for (const s of suggestions) {
        add(s, 'serp_suggest', 'stable', 'transactional')
      }
    }
  }

  if (src.youtube_suggest?.enabled) {
    const maxQueries = src.youtube_suggest.max_queries ?? 20
    const map = await collectYoutubeSuggestions(seeds, maxQueries)
    for (const [, suggestions] of map) {
      for (const s of suggestions) {
        add(s, 'youtube_suggest', 'stable', 'transactional')
      }
    }
  }

  if (src.reddit?.enabled) {
    const maxPosts = src.reddit.max_posts ?? 50
    const delayMs = src.reddit.rate_limit_delay_ms ?? 2000
    const phrases = await collectRedditKeywords(seeds.slice(0, 5), maxPosts, delayMs)
    for (const p of phrases) {
      add(p, 'reddit', 'stable', 'informational')
    }
  }

  if (src.serp_api?.enabled && process.env[src.serp_api.env_key || 'SERP_API_KEY']) {
    const map = await collectSerpApiSuggestions(seeds.slice(0, 10))
    for (const [, suggestions] of map) {
      for (const s of suggestions) {
        add(s, 'serp_api', 'stable', 'transactional')
      }
    }
  }

  const minRelevance = config.thresholds.minimum_relevance_score
  const candidates: KeywordCandidate[] = []

  for (const [phrase, meta] of phraseToMeta) {
    const relevance = scoreRelevance(phrase, config.product_keywords)
    const risk = scoreRisk(phrase, config.blacklist_keywords)
    if (risk >= 1) continue
    if (relevance < minRelevance) continue
    const suggested: SuggestedPageType = relevance >= 0.5 ? 'UPDATE_EXISTING_PAGE' : 'FAQ_ONLY'
    candidates.push({
      phrase,
      sources: [...meta.sources],
      trend_signal: meta.trend,
      estimated_intent: meta.intent,
      relevance_score: relevance,
      risk_score: risk,
      suggested_page_type: suggested,
    })
  }

  return candidates.sort((a, b) => b.relevance_score - a.relevance_score)
}
