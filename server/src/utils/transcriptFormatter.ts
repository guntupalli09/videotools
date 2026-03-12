/**
 * Deterministic transcript post-processing for readability.
 * Preserves all words; only adjusts whitespace, punctuation, and structure.
 * Runtime target: <10 ms. No AI/LLM calls.
 */

const ABBR_PLACEHOLDER = '\x00ABBR'
const ABBR_MAP: Array<[RegExp, string]> = [
  [/\bMr\./g, `${ABBR_PLACEHOLDER}Mr`],
  [/\bMrs\./g, `${ABBR_PLACEHOLDER}Mrs`],
  [/\bMs\./g, `${ABBR_PLACEHOLDER}Ms`],
  [/\bDr\./g, `${ABBR_PLACEHOLDER}Dr`],
  [/\bProf\./g, `${ABBR_PLACEHOLDER}Prof`],
  [/\bSr\./g, `${ABBR_PLACEHOLDER}Sr`],
  [/\bJr\./g, `${ABBR_PLACEHOLDER}Jr`],
  [/\bU\.S\./g, `${ABBR_PLACEHOLDER}US`],
  [/\bU\.N\./g, `${ABBR_PLACEHOLDER}UN`],
  [/\bNo\./g, `${ABBR_PLACEHOLDER}No`],
  [/\bvs\./g, `${ABBR_PLACEHOLDER}vs`],
  [/\betc\./g, `${ABBR_PLACEHOLDER}etc`],
  [/\be\.g\./g, `${ABBR_PLACEHOLDER}eg`],
  [/\bi\.e\./g, `${ABBR_PLACEHOLDER}ie`],
  [/\bSt\./g, `${ABBR_PLACEHOLDER}St`],
  [/\bAve\./g, `${ABBR_PLACEHOLDER}Ave`],
  [/\bInc\./g, `${ABBR_PLACEHOLDER}Inc`],
  [/\bLtd\./g, `${ABBR_PLACEHOLDER}Ltd`],
  [/\bPh\.D\./g, `${ABBR_PLACEHOLDER}PhD`],
  [/\bC-SPAN\b/g, `${ABBR_PLACEHOLDER}CSPAN`],
]

const ABBR_RESTORE: Array<[string, string]> = [
  [`${ABBR_PLACEHOLDER}Mr`, 'Mr.'],
  [`${ABBR_PLACEHOLDER}Mrs`, 'Mrs.'],
  [`${ABBR_PLACEHOLDER}Ms`, 'Ms.'],
  [`${ABBR_PLACEHOLDER}Dr`, 'Dr.'],
  [`${ABBR_PLACEHOLDER}Prof`, 'Prof.'],
  [`${ABBR_PLACEHOLDER}Sr`, 'Sr.'],
  [`${ABBR_PLACEHOLDER}Jr`, 'Jr.'],
  [`${ABBR_PLACEHOLDER}US`, 'U.S.'],
  [`${ABBR_PLACEHOLDER}UN`, 'U.N.'],
  [`${ABBR_PLACEHOLDER}No`, 'No.'],
  [`${ABBR_PLACEHOLDER}vs`, 'vs.'],
  [`${ABBR_PLACEHOLDER}etc`, 'etc.'],
  [`${ABBR_PLACEHOLDER}eg`, 'e.g.'],
  [`${ABBR_PLACEHOLDER}ie`, 'i.e.'],
  [`${ABBR_PLACEHOLDER}St`, 'St.'],
  [`${ABBR_PLACEHOLDER}Ave`, 'Ave.'],
  [`${ABBR_PLACEHOLDER}Inc`, 'Inc.'],
  [`${ABBR_PLACEHOLDER}Ltd`, 'Ltd.'],
  [`${ABBR_PLACEHOLDER}PhD`, 'Ph.D.'],
  [`${ABBR_PLACEHOLDER}CSPAN`, 'C-SPAN'],
]

/** 1. Normalize whitespace, trim, collapse multiple spaces/newlines */
function normalizeText(s: string): string {
  return s
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
}

/** 2. Normalize quotes to consistent style */
function normalizeQuotes(s: string): string {
  return s
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
}

/** 3. Replace abbreviations with placeholders to avoid sentence-split on period */
function protectAbbreviations(s: string): string {
  let out = s
  for (const [re, placeholder] of ABBR_MAP) {
    out = out.replace(re, placeholder)
  }
  return out
}

/** 4. Split into sentences on . ! ? */
function splitSentences(s: string): string[] {
  return s.split(/(?<=[.!?]["']?)\s+/).filter((x) => x.trim().length > 0)
}

/** 5. Merge conjunction fragments: "And the next point." after previous sentence → attach */
function mergeFragmentSentences(sentences: string[]): string[] {
  if (sentences.length <= 1) return sentences
  const CONJUNCTION_START = /^(and |but |or |so |yet |nor )/i
  const out: string[] = []
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i].trim()
    if (out.length > 0 && CONJUNCTION_START.test(s) && s.length < 80) {
      out[out.length - 1] = out[out.length - 1].trimEnd() + ' ' + s
    } else {
      out.push(s)
    }
  }
  return out
}

/** 6. Group sentences into paragraphs (3–6 per paragraph, break on discourse cues) */
function buildParagraphs(sentences: string[]): string {
  if (sentences.length === 0) return ''
  const DISCOURSE_START = /^(Now,|And so,|But |However,|Meanwhile,|In \d{4},|Six years|One year|Many years)/
  const paragraphs: string[] = []
  let current: string[] = []

  for (let i = 0; i < sentences.length; i++) {
    const sent = sentences[i]
    if (current.length >= 4 && DISCOURSE_START.test(sent)) {
      if (current.length > 0) {
        paragraphs.push(current.join(' '))
        current = []
      }
    } else if (current.length >= 6) {
      paragraphs.push(current.join(' '))
      current = []
    }
    current.push(sent)
  }
  if (current.length > 0) paragraphs.push(current.join(' '))

  return paragraphs.join('\n\n')
}

/** 7. Restore abbreviated placeholders */
function restoreAbbreviations(s: string): string {
  let out = s
  for (const [placeholder, original] of ABBR_RESTORE) {
    out = out.split(placeholder).join(original)
  }
  return out
}

/** 8. Capitalize first letter of each sentence and paragraph */
function fixCapitalization(s: string): string {
  return s.replace(/(^|[.!?]\s+|\n\n)([a-z])/g, (_, before, letter) => before + letter.toUpperCase())
}

/**
 * Main pipeline: format raw transcript for readability.
 * Preserves all words; only adjusts spacing, punctuation, and structure.
 */
export function formatTranscript(rawTranscript: string): string {
  if (!rawTranscript || typeof rawTranscript !== 'string') return rawTranscript || ''
  const t = rawTranscript.trim()
  if (t.length === 0) return rawTranscript

  try {
    let s = normalizeText(t)
    s = normalizeQuotes(s)
    s = protectAbbreviations(s)
    let sentences = splitSentences(s)
    sentences = mergeFragmentSentences(sentences)
    s = buildParagraphs(sentences)
    s = restoreAbbreviations(s)
    s = fixCapitalization(s)
    return s.trim() || rawTranscript
  } catch {
    return rawTranscript
  }
}
