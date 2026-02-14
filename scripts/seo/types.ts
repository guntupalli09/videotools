/**
 * Unified keyword candidate from any source.
 * Used by collectors and decision engine.
 */
export type TrendSignal = 'rising' | 'top' | 'stable' | 'seasonal'

export type SearchIntent = 'transactional' | 'informational' | 'navigational' | 'unknown'

export type SuggestedPageType =
  | 'UPDATE_EXISTING_PAGE'
  | 'CREATE_NEW_PAGE'
  | 'FAQ_ONLY'
  | 'IGNORE'

export interface KeywordCandidate {
  phrase: string
  sources: string[]
  trend_signal: TrendSignal
  estimated_intent: SearchIntent
  relevance_score: number
  risk_score: number
  suggested_page_type: SuggestedPageType
  /** Best-fit existing path (if UPDATE_EXISTING_PAGE or FAQ_ONLY). */
  existing_path?: string
  /** Suggested slug for new page (if CREATE_NEW_PAGE). */
  suggested_slug?: string
}

export interface FaqItem {
  q: string
  a: string
}

export interface ProposalAction {
  type: 'UPDATE_EXISTING_PAGE' | 'CREATE_NEW_PAGE' | 'FAQ_ONLY'
  keyword: string
  path?: string
  slug?: string
  reason: string
  relevance_score: number
  /** Set for CREATE_NEW_PAGE; must be unique among indexable pages. */
  intentKey?: string
  /** Optional: explicit FAQ items to add (FAQ_ONLY). If absent, generated from keyword. */
  faq_additions?: FaqItem[]
  /** Optional: intro sentence to append (UPDATE_EXISTING_PAGE). */
  intro_append?: string
  /** Optional: slugs to add to relatedSlugs (UPDATE_EXISTING_PAGE). Must exist and be indexable. */
  related_slugs_add?: string[]
}

export interface SeoProposals {
  generated_at: string
  caps_used: { new_pages: number; updates: number; faq_only: number }
  proposals: ProposalAction[]
  candidates_ignored: number
  raw_candidates_count: number
}

export interface SeoConfig {
  caps: {
    weekly_new_pages_cap: number
    weekly_updates_cap: number
    monthly_new_pages_cap: number
    max_new_pages_per_run: number
    max_updates_per_run: number
  }
  thresholds: {
    minimum_relevance_score: number
    min_content_words: number
    max_content_words: number
    min_internal_links: number
    max_internal_links: number
    min_faq_per_page: number
    max_faq_per_update: number
    max_faq_per_new_page: number
  }
  sources: Record<string, { enabled: boolean; cache_hours?: number; [k: string]: unknown }>
  blacklist_keywords: string[]
  allowlist_head_terms: string[]
  product_keywords: string[]
}
