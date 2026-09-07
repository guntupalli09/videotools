/** Shared upgrade messaging — outcome-first, used at peak intent (result + limits). */

export const PRO_PRICE = 7.99
export const PRO_PRICE_LABEL = '$7.99/mo'
export const PRO_ANNUAL_NOTE = 'or $69.99/year (save 27%)'

export const PRO_BENEFIT_BULLETS = [
  'No watermark on exports',
  'PDF, Word, VTT & share links',
  'Videos up to 2 hours + batch (20 files)',
  'Unlimited imports — no monthly cap',
] as const

export type ResultUpgradeTool = 'transcript' | 'subtitles' | 'translation' | 'voice'

export function getResultUpgradeCopy(tool: ResultUpgradeTool, opts?: { wordCount?: number; remaining?: number }) {
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
          'Export clean files (no watermark), share a link with your team, or batch the rest of your folder — flat $7.99/mo, not per minute.',
        bullets: PRO_BENEFIT_BULLETS,
        cta: `Export without limits — ${PRO_PRICE_LABEL}`,
        quotaLine,
      }
    case 'subtitles':
      return {
        headline: 'Subtitles ready — deliver like a pro',
        subhead: 'Remove the watermark, export VTT/ASS, translate, and burn captions in — one flat monthly price.',
        bullets: PRO_BENEFIT_BULLETS,
        cta: `Unlock clean subtitle exports — ${PRO_PRICE_LABEL}`,
        quotaLine,
      }
    case 'translation':
      return {
        headline: 'Translation done — keep the workflow moving',
        subhead: 'Pro unlocks multi-language exports, editing, burn-in, and unlimited monthly imports.',
        bullets: PRO_BENEFIT_BULLETS,
        cta: `Continue without caps — ${PRO_PRICE_LABEL}`,
        quotaLine,
      }
    case 'voice':
      return {
        headline: 'Voice transcript ready',
        subhead: 'Pro removes export watermarks and unlocks longer recordings plus the full VideoText workflow.',
        bullets: PRO_BENEFIT_BULLETS,
        cta: `Unlock voice exports — ${PRO_PRICE_LABEL}`,
        quotaLine,
      }
  }
}

export const UPGRADE_BANNER_COPY = {
  'video-length': {
    text: 'Free plan stops at 30 minutes per file.',
    highlight: 'Pro handles podcasts & meetings up to 2 hours — flat rate, not per minute.',
    cta: `Process longer videos — ${PRO_PRICE_LABEL}`,
  },
  watermark: {
    text: 'Your download includes a watermark on Free.',
    highlight: 'Pro gives clean SRT, VTT, PDF, and Word — ready to send to clients.',
    cta: `Remove watermark — ${PRO_PRICE_LABEL}`,
  },
  queue: {
    text: 'Free uses the standard queue.',
    highlight: 'Pro gets priority processing when you need results faster.',
    cta: `Skip the wait — ${PRO_PRICE_LABEL}`,
  },
  'ai-features': {
    text: 'Summary, chapters & speakers are Pro-only.',
    highlight: 'Get AI summary, chapter markers, and speaker labels on every video.',
    cta: `Unlock AI outputs — ${PRO_PRICE_LABEL}`,
  },
  batch: {
    text: 'Batch upload is a Pro feature.',
    highlight: 'Drop up to 20 videos — one ZIP with every transcript/SRT when done.',
    cta: `Batch process 20 videos — ${PRO_PRICE_LABEL}`,
  },
  voice: {
    text: 'Free voice exports include a watermark.',
    highlight: 'Pro unlocks clean downloads and longer voice workflows.',
    cta: `Clean voice exports — ${PRO_PRICE_LABEL}`,
  },
} as const
