/** Shared upgrade messaging — outcome-first, used at peak intent (result + limits). */

import type { ProPriceDisplay } from './pricingApi'
import { DEFAULT_PRO_PRICING } from './pricingApi'

export const PRO_PRICE = DEFAULT_PRO_PRICING.monthly.amount
export const PRO_PRICE_LABEL = DEFAULT_PRO_PRICING.priceLabel
export const PRO_ANNUAL_NOTE = DEFAULT_PRO_PRICING.annualNote

export function pricingLabels(pricing: ProPriceDisplay = DEFAULT_PRO_PRICING) {
  return {
    price: pricing.monthly.amount,
    priceLabel: pricing.priceLabel,
    annualNote: pricing.annualNote,
    tier: pricing.tier,
    country: pricing.country,
  }
}

export const PRO_BENEFIT_BULLETS = [
  'No watermark on exports',
  'PDF, Word, VTT & share links',
  'Videos up to 2 hours + batch (20 files)',
  'Unlimited imports — no monthly cap',
] as const

export type ResultUpgradeTool = 'transcript' | 'subtitles' | 'translation' | 'voice'

export function getResultUpgradeCopy(
  tool: ResultUpgradeTool,
  opts?: { wordCount?: number; remaining?: number; pricing?: ProPriceDisplay },
) {
  const pricing = opts?.pricing ?? DEFAULT_PRO_PRICING
  const priceLabel = pricing.priceLabel
  const remaining = opts?.remaining
  const quotaLine =
    remaining === undefined
      ? null
      : remaining === 0
        ? 'All 3 free imports used this month — resets on the 1st.'
        : `${remaining} free import${remaining === 1 ? '' : 's'} left this month.`

  switch (tool) {
    case 'transcript':
      return {
        headline: opts?.wordCount
          ? `${opts.wordCount.toLocaleString()} words transcribed — ship it without limits`
          : 'Transcript ready — unlock professional delivery',
        subhead:
          `Export clean files (no watermark), share a link with your team, or batch the rest of your folder — flat ${priceLabel}, not per minute.`,
        bullets: PRO_BENEFIT_BULLETS,
        cta: `Export without limits — ${priceLabel}`,
        quotaLine,
      }
    case 'subtitles':
      return {
        headline: 'Subtitles ready — deliver like a pro',
        subhead: 'Remove the watermark, export VTT/ASS, translate, and burn captions in — one flat monthly price.',
        bullets: PRO_BENEFIT_BULLETS,
        cta: `Unlock clean subtitle exports — ${priceLabel}`,
        quotaLine,
      }
    case 'translation':
      return {
        headline: 'Translation done — keep the workflow moving',
        subhead: 'Pro unlocks multi-language exports, editing, burn-in, and unlimited monthly imports.',
        bullets: PRO_BENEFIT_BULLETS,
        cta: `Continue without caps — ${priceLabel}`,
        quotaLine,
      }
    case 'voice':
      return {
        headline: 'Voice transcript ready',
        subhead: 'Pro removes export watermarks and unlocks longer recordings plus the full VideoText workflow.',
        bullets: PRO_BENEFIT_BULLETS,
        cta: `Unlock voice exports — ${priceLabel}`,
        quotaLine,
      }
  }
}

export function getUpgradeBannerCopy(pricing: ProPriceDisplay = DEFAULT_PRO_PRICING) {
  const priceLabel = pricing.priceLabel
  return {
  'video-length': {
    text: 'Free plan stops at 30 minutes per file.',
    highlight: 'Pro handles podcasts & meetings up to 2 hours — flat rate, not per minute.',
    cta: `Process longer videos — ${priceLabel}`,
  },
  watermark: {
    text: 'Your download includes a watermark on Free.',
    highlight: 'Pro gives clean SRT, VTT, PDF, and Word — ready to send to clients.',
    cta: `Remove watermark — ${priceLabel}`,
  },
  queue: {
    text: 'Free uses the standard queue.',
    highlight: 'Pro gets priority processing when you need results faster.',
    cta: `Skip the wait — ${priceLabel}`,
  },
  'ai-features': {
    text: 'Summary, chapters & speakers are Pro-only.',
    highlight: 'Get AI summary, chapter markers, and speaker labels on every video.',
    cta: `Unlock AI outputs — ${priceLabel}`,
  },
  batch: {
    text: 'Batch upload is a Pro feature.',
    highlight: 'Drop up to 20 videos — one ZIP with every transcript/SRT when done.',
    cta: `Batch process 20 videos — ${priceLabel}`,
  },
  voice: {
    text: 'Free voice exports include a watermark.',
    highlight: 'Pro unlocks clean downloads and longer voice workflows.',
    cta: `Clean voice exports — ${priceLabel}`,
  },
} as const
}

/** @deprecated Use getUpgradeBannerCopy(pricing) — kept for static imports during migration. */
export const UPGRADE_BANNER_COPY = getUpgradeBannerCopy()
