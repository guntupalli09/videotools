/**
 * Brand-specific transcription guideline data.
 * Used by BrandGuidelinePage to render SEO pages for each service's style guide.
 */

export type VerbatimStyle = 'clean' | 'intelligent' | 'strict'

export interface GuidelineRule {
  category: string
  rule: string
  example?: string
}

export interface BrandData {
  brandName: string
  shortName: string
  tagline: string
  description: string
  verbatimStyle: VerbatimStyle
  verbatimDescription: string
  speakerLabelFormat: string
  speakerLabelExample: string
  timestampFormat: string
  timestampRequired: boolean
  inaudibleNotation: string
  crossTalkNotation: string
  fillerWordsPolicy: string
  paragraphRules: string
  musicSoundNotation: string
  quickRules: GuidelineRule[]
  keyDifferences: string[]
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  accentColor: string
  badgeColor: string
}

export type BrandSlug =
  | 'rev-transcript-guidelines'
  | 'rev-transcription-format'
  | 'rev-style-guide'
  | 'rev-captioning-guidelines'
  | 'rev-transcription-requirements'
  | 'rev-ai-transcription-guide'
  | 'gotranscript-guidelines'
  | 'gotranscript-transcription-format'
  | 'gotranscript-style-guide'
  | 'gotranscript-transcription-rules'
  | 'gotranscript-test-guide'
  | 'transcribeme-guidelines'
  | 'transcribeme-transcription-style'
  | 'transcribeme-format-guide'
  | 'transcribeme-style-guide'
  | 'transcribeme-exam-guide'
  | 'scribie-transcription-guidelines'
  | 'scribie-format-guide'
  | 'scribie-transcription-rules'
  | 'scribie-style-guide'
  | 'daily-transcripts-guidelines'
  | 'daily-transcripts-format-guide'
  | 'daily-transcripts-style-guide'
  | 'transcribio-guidelines'
  | 'transcribio-format-guide'
  | 'transcribio-style-guide'
  | 'verbit-transcription-guidelines'
  | 'verbit-format-guide'
  | 'speechpad-transcription-guidelines'
  | 'speechpad-format-guide'
  | 'happy-scribe-transcription-guidelines'
  | 'happy-scribe-format-guide'
  | '3play-media-transcription-guidelines'
  | '3play-media-format-guide'
  | 'gmr-transcription-guidelines'
  | 'gmr-transcript-format-guide'

const REV_DATA: BrandData = {
  brandName: 'Rev',
  shortName: 'Rev',
  tagline: 'The gold standard for transcription formatting',
  description:
    'Rev is one of the most widely used transcription platforms, employing thousands of freelance transcribers. Their style guide is thorough and widely referenced — even by transcribers working for other services.',
  verbatimStyle: 'clean',
  verbatimDescription:
    'Rev uses clean verbatim: remove filler words (um, uh, you know, like) unless they meaningfully change the sentence. False starts are removed. Stutters are removed unless they change meaning.',
  speakerLabelFormat: '[Speaker Name] or [Speaker 1], [Speaker 2]',
  speakerLabelExample: '[John]: The meeting starts at nine.\n[Jane]: That works for me.',
  timestampFormat: '[HH:MM:SS] — optional, used when requested by client',
  timestampRequired: false,
  inaudibleNotation: '[inaudible]',
  crossTalkNotation: '[crosstalk]',
  fillerWordsPolicy:
    'Remove: um, uh, hmm, you know, like (when filler). Keep: if repeated for emphasis (e.g., "um, um, um — I can\'t believe it").',
  paragraphRules:
    'New paragraph for each speaker change. Within a single speaker turn, break after 3–5 sentences or when the topic shifts noticeably.',
  musicSoundNotation: '[music] [laughter] [applause] [background noise]',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Clean verbatim — remove fillers, keep false starts only if meaningful',
      example: '"I — I think we should go" → "I think we should go" (remove stutter)',
    },
    {
      category: 'Speaker labels',
      rule: 'Bracket format: [Speaker 1] or [Name] — followed by colon if needed',
      example: '[John Smith]: Here is my response.',
    },
    {
      category: 'Inaudible audio',
      rule: '[inaudible] — no timestamp required unless client requests',
      example: 'We discussed [inaudible] at length.',
    },
    {
      category: 'Crosstalk',
      rule: '[crosstalk] — used when two speakers talk simultaneously',
      example: '[Speaker 1]: [crosstalk] — yes, exactly.',
    },
    {
      category: 'Timestamps',
      rule: 'Optional by default; format [HH:MM:SS] if requested',
      example: '[00:03:42] And that brings us to the next point.',
    },
    {
      category: 'Numbers',
      rule: 'Spell out one through ten; use numerals for 11 and above',
      example: 'She had three cats and 15 dogs.',
    },
    {
      category: 'Punctuation',
      rule: 'Standard American English punctuation rules apply',
      example: 'Use Oxford comma, em dashes for interruptions.',
    },
    {
      category: 'Non-verbal sounds',
      rule: 'Include only when relevant to context: [laughs] [sighs]',
      example: 'He said [laughs], "I can\'t believe that happened."',
    },
  ],
  keyDifferences: [
    'Rev uses clean verbatim — not strict/full verbatim',
    'Speaker brackets use square brackets [ ], not parentheses',
    'Timestamps are client-optional, not mandatory in every paragraph',
    'Filler words are removed unless meaningful',
    'Numbers: one–ten spelled out, 11+ as numerals',
  ],
  difficultyLevel: 'intermediate',
  accentColor: 'blue',
  badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

const GOTRANSCRIPT_DATA: BrandData = {
  brandName: 'GoTranscript',
  shortName: 'GoTranscript',
  tagline: 'Strict clean verbatim with mandatory timestamps',
  description:
    'GoTranscript is a high-volume transcription platform popular with academic and corporate clients. Their guidelines emphasize precision timestamps and clean verbatim output with strict formatting requirements.',
  verbatimStyle: 'clean',
  verbatimDescription:
    'GoTranscript requires clean verbatim: remove filler words (um, uh, you know), false starts, and repeated words. Natural speech patterns are smoothed for readability while preserving the speaker\'s intent.',
  speakerLabelFormat: 'Speaker 1:, Speaker 2: (or actual names if provided)',
  speakerLabelExample: 'Speaker 1: The report is due on Friday.\nSpeaker 2: I\'ll have it ready by Thursday.',
  timestampFormat: '[HH:MM:SS] — required at start of each speaker segment',
  timestampRequired: true,
  inaudibleNotation: '[inaudible 0:00]',
  crossTalkNotation: '[inaudible 0:00] (simultaneous speech treated as inaudible)',
  fillerWordsPolicy:
    'Remove all filler words: um, uh, hmm, you know, like. Remove false starts and repeated words. Keep meaningful hesitations only.',
  paragraphRules:
    'New paragraph for every speaker change, prefixed with timestamp and speaker label. Within a speaker\'s turn, break every 300–400 characters.',
  musicSoundNotation: '[music] [background noise] [laughter]',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Clean verbatim — remove all fillers and false starts',
      example: '"Um, I think, you know, we should go" → "I think we should go"',
    },
    {
      category: 'Speaker labels',
      rule: 'Speaker 1:, Speaker 2: — colon immediately after label, then space',
      example: 'Speaker 1: Good morning, everyone.',
    },
    {
      category: 'Timestamps',
      rule: '[HH:MM:SS] required at start of every speaker segment',
      example: '[00:02:15] Speaker 1: Let\'s get started.',
    },
    {
      category: 'Inaudible audio',
      rule: '[inaudible H:MM] — include approximate timestamp',
      example: 'The project [inaudible 3:45] was approved.',
    },
    {
      category: 'Numbers',
      rule: 'All numbers as numerals except at sentence start',
      example: 'We have 5 options. Five options were presented.',
    },
    {
      category: 'Contractions',
      rule: 'Keep contractions as spoken (don\'t → don\'t, not do not)',
      example: "We don't have time for that.",
    },
    {
      category: 'Punctuation',
      rule: 'Standard punctuation; use ellipsis (...) for trailing off',
      example: 'I was going to say... never mind.',
    },
    {
      category: 'Paragraph length',
      rule: 'New paragraph every speaker change or every ~300 characters',
      example: 'Each long monologue is broken into digestible chunks.',
    },
  ],
  keyDifferences: [
    'Timestamps are MANDATORY — required at every speaker segment start',
    'Inaudible notation includes approximate timestamp: [inaudible 3:45]',
    'Speaker labels use colon format: Speaker 1: (not brackets)',
    'Numbers are numerals except at sentence start',
    'False starts removed completely',
  ],
  difficultyLevel: 'intermediate',
  accentColor: 'green',
  badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

const TRANSCRIBEME_DATA: BrandData = {
  brandName: 'TranscribeMe',
  shortName: 'TranscribeMe',
  tagline: 'Intelligent verbatim with human-in-the-loop QA',
  description:
    'TranscribeMe uses a distributed workforce model with strict quality tiers. They use intelligent verbatim — more nuanced than clean verbatim, preserving speech authenticity while removing distracting fillers.',
  verbatimStyle: 'intelligent',
  verbatimDescription:
    'TranscribeMe uses intelligent verbatim: keep fillers that reveal emotion or emphasis (um, uh when nervous or hesitant), remove purely habitual ones. Preserve false starts that show speaker reconsideration.',
  speakerLabelFormat: '[Name] or [Speaker 1] in brackets at line start',
  speakerLabelExample: '[John]: I reviewed the contract last night.\n[Sarah]: And what did you find?',
  timestampFormat: 'Not required in transcript body; used in speaker segments only if requested',
  timestampRequired: false,
  inaudibleNotation: '[inaudible]',
  crossTalkNotation: '[crosstalk]',
  fillerWordsPolicy:
    'Keep fillers that carry meaning (nervousness, emphasis, hesitation). Remove purely habitual "you know", "like", "basically" used as filler. Use judgement.',
  paragraphRules:
    'New paragraph every speaker change. Break long monologues every 4–6 sentences. Avoid very short or very long paragraphs.',
  musicSoundNotation: '[music] [noise] [laughter] [applause]',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Intelligent verbatim — keep meaningful fillers, remove habitual ones',
      example: 'Keep: "Um... I\'m not sure about this" (hesitation)\nRemove: "You know, it was, like, amazing"',
    },
    {
      category: 'Speaker labels',
      rule: 'Brackets with colon: [Name]: or [Speaker 1]:',
      example: '[Dr. Johnson]: The results were positive.',
    },
    {
      category: 'Inaudible audio',
      rule: '[inaudible] — without timestamp',
      example: 'The client mentioned [inaudible] as a priority.',
    },
    {
      category: 'Timestamps',
      rule: 'Not required unless client specifies; format [HH:MM:SS] if used',
      example: 'Usually clean transcript without timestamps.',
    },
    {
      category: 'Numbers',
      rule: 'Spell out one through nine; numerals for 10 and above',
      example: 'We had five participants and 12 observers.',
    },
    {
      category: 'False starts',
      rule: 'Keep false starts that show reconsideration; remove pure stutters',
      example: 'Keep: "I was — actually, let me rephrase that." Remove: "I-I-I think so."',
    },
    {
      category: 'Emphasis words',
      rule: 'Do NOT use all-caps for emphasis; use standard casing',
      example: 'Wrong: "It was AMAZING". Right: "It was amazing."',
    },
    {
      category: 'Paragraph breaks',
      rule: 'New paragraph per speaker; break every 4–6 sentences within turns',
      example: 'Balanced paragraphs improve readability.',
    },
  ],
  keyDifferences: [
    'Intelligent verbatim — nuanced filler word handling requiring judgement',
    'Brackets format for speaker labels: [Name]:',
    'No mandatory timestamps unless client requests',
    'False starts: keep reconsiderations, remove pure stutters',
    'Numbers: one–nine spelled out, 10+ as numerals',
  ],
  difficultyLevel: 'advanced',
  accentColor: 'blue',
  badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

const SCRIBIE_DATA: BrandData = {
  brandName: 'Scribie',
  shortName: 'Scribie',
  tagline: 'Full verbatim with strict 4-pass quality review',
  description:
    'Scribie offers both full verbatim and non-verbatim modes. Their 4-pass quality review system means transcripts go through multiple checks. Full verbatim is the default — every word, filler, and false start is captured.',
  verbatimStyle: 'strict',
  verbatimDescription:
    'Scribie default is full verbatim: capture every word including um, uh, false starts, repetitions, and stutters exactly as spoken. Non-verbatim mode (clean) is available but not the default.',
  speakerLabelFormat: 'Speaker 1:, Speaker 2: at line start, no brackets',
  speakerLabelExample: 'Speaker 1: Um, I think the, the project is on track.\nSpeaker 2: Right, right.',
  timestampFormat: '[MM:SS] required at start of each paragraph',
  timestampRequired: true,
  inaudibleNotation: '[inaudible]',
  crossTalkNotation: '[crosstalk]',
  fillerWordsPolicy:
    'Full verbatim: keep ALL fillers — um, uh, hmm, you know, like, right, okay. Include repetitions and false starts exactly as spoken.',
  paragraphRules:
    'New paragraph every speaker change with timestamp. Paragraphs kept to 4–6 lines maximum. Each paragraph starts with [MM:SS] Speaker N:',
  musicSoundNotation: '[music] [background noise] [applause] [laughter]',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Full verbatim — capture EVERY word, filler, and false start',
      example: '"Um, I, I think — you know — the the project is good." → keep exactly as spoken',
    },
    {
      category: 'Speaker labels',
      rule: 'Speaker 1:, Speaker 2: — no brackets, colon after label',
      example: '[00:45] Speaker 1: Um, so I was thinking...',
    },
    {
      category: 'Timestamps',
      rule: '[MM:SS] required at start of EVERY paragraph',
      example: '[02:15] Speaker 1: Let me explain the...',
    },
    {
      category: 'Inaudible audio',
      rule: '[inaudible] — no timestamp in the notation itself',
      example: 'We discussed [inaudible] which was very interesting.',
    },
    {
      category: 'Crosstalk',
      rule: '[crosstalk] — when two speakers talk at the same time',
      example: 'Speaker 1: [crosstalk] — I agree with that point.',
    },
    {
      category: 'Numbers',
      rule: 'All numbers as spoken; use numerals for clarity with large numbers',
      example: '"twenty five" → "25"; "three" can stay as "three"',
    },
    {
      category: 'Punctuation',
      rule: 'Standard punctuation; use em dash (—) for abrupt interruptions',
      example: 'She was going to say — but he interrupted.',
    },
    {
      category: 'Paragraph length',
      rule: 'Maximum 4–6 lines; start each paragraph with timestamp',
      example: 'Every paragraph is self-contained with its own timestamp.',
    },
  ],
  keyDifferences: [
    'Full verbatim by default — every filler word must be included',
    'Timestamps [MM:SS] are mandatory at every paragraph start',
    'Speaker labels use no brackets: Speaker 1: not [Speaker 1]:',
    'Crosstalk notation is explicitly supported',
    'All repetitions and false starts kept exactly as spoken',
  ],
  difficultyLevel: 'intermediate',
  accentColor: 'orange',
  badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
}

const DAILY_TRANSCRIPTS_DATA: BrandData = {
  brandName: 'Daily Transcripts',
  shortName: 'Daily Transcripts',
  tagline: 'Clean verbatim optimized for daily content creators',
  description:
    'Daily Transcripts (DailyTranscripts.com) specializes in fast turnaround for podcasters, YouTubers, and content creators. Their guidelines are creator-friendly with clean verbatim as standard.',
  verbatimStyle: 'clean',
  verbatimDescription:
    'Daily Transcripts uses clean verbatim: remove all filler words and false starts. Output should read naturally as written text while accurately reflecting what was said.',
  speakerLabelFormat: 'Name: or Speaker 1: at paragraph start',
  speakerLabelExample: 'Host: Welcome to the show, everyone.\nGuest: Thanks for having me.',
  timestampFormat: '[HH:MM:SS] — optional, requested per-order',
  timestampRequired: false,
  inaudibleNotation: '[inaudible]',
  crossTalkNotation: '[crosstalk]',
  fillerWordsPolicy:
    'Remove: um, uh, hmm, you know, like (filler), basically (filler). Clean for readability. Keep words that form part of a sentence.',
  paragraphRules:
    'New paragraph per speaker. For monologues, break every 5–7 sentences or at natural topic shifts.',
  musicSoundNotation: '[music] [laughter] [applause] [background noise]',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Clean verbatim — professional, readable output',
      example: '"Um, so, you know, today we\'re gonna talk about..." → "Today we\'re going to talk about..."',
    },
    {
      category: 'Speaker labels',
      rule: 'Name: or Speaker 1: — no brackets, colon after name',
      example: 'Host: Let\'s dive right in.',
    },
    {
      category: 'Timestamps',
      rule: 'Optional; [HH:MM:SS] format if requested by client',
      example: 'Most orders do not require timestamps.',
    },
    {
      category: 'Inaudible audio',
      rule: '[inaudible] — placeholder for unclear audio',
      example: 'The next step is [inaudible] which completes the process.',
    },
    {
      category: 'Numbers',
      rule: 'Spell out one through ten, numerals for 11+',
      example: 'She has five books and 20 audiobooks.',
    },
    {
      category: 'Contractions',
      rule: 'Keep contractions as natural — don\'t expand to "do not"',
      example: "We can't wait to share this with you.",
    },
    {
      category: 'Formatting',
      rule: 'Standard paragraph format; no bullet points in transcript',
      example: 'Flowing prose format throughout.',
    },
    {
      category: 'Non-verbal',
      rule: 'Include relevant sounds: [laughter], [applause] — skip minor background noise',
      example: 'He replied [laughter], "I never thought of that!"',
    },
  ],
  keyDifferences: [
    'Creator-focused clean verbatim — highly readable output',
    'Speaker labels without brackets: Name: not [Name]:',
    'No mandatory timestamps — most orders skip them',
    'Natural contractions preserved as spoken',
    'Minor background sounds omitted; relevant ones included',
  ],
  difficultyLevel: 'beginner',
  accentColor: 'teal',
  badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
}

const TRANSCRIBIO_DATA: BrandData = {
  brandName: 'Transcribio',
  shortName: 'Transcribio',
  tagline: 'AI-assisted transcription with human review guidelines',
  description:
    'Transcribio offers an AI-plus-human workflow for transcription. Human reviewers correct and refine AI-generated transcripts, following clear guidelines for consistency and accuracy.',
  verbatimStyle: 'clean',
  verbatimDescription:
    'Transcribio uses clean verbatim for human review: reviewers clean filler words from AI output and correct errors while preserving the speaker\'s natural tone.',
  speakerLabelFormat: '[Speaker 1]:, [Speaker 2]: — bracketed format',
  speakerLabelExample: '[Speaker 1]: The AI draft needs minor corrections.\n[Speaker 2]: Agreed, let\'s review together.',
  timestampFormat: '[HH:MM:SS] — optional per client preference',
  timestampRequired: false,
  inaudibleNotation: '[inaudible]',
  crossTalkNotation: '[crosstalk]',
  fillerWordsPolicy:
    'Remove filler words from AI output during review. Keep intentional pauses and meaningful hesitations.',
  paragraphRules:
    'New paragraph per speaker. Review AI paragraph breaks and adjust for natural reading flow.',
  musicSoundNotation: '[music] [background noise] [laughter]',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Clean verbatim — remove fillers from AI output during human review',
      example: 'AI: "Um, so the results were, uh, positive." → "The results were positive."',
    },
    {
      category: 'Speaker labels',
      rule: '[Speaker N]: format — brackets, colon after closing bracket',
      example: '[Speaker 1]: Let me walk you through the findings.',
    },
    {
      category: 'AI corrections',
      rule: 'Correct homophones, proper nouns, and domain-specific terms',
      example: 'AI: "We discussed the roll" → "We discussed the role"',
    },
    {
      category: 'Inaudible audio',
      rule: '[inaudible] — where AI could not transcribe clearly',
      example: 'The quarterly target is [inaudible].',
    },
    {
      category: 'Timestamps',
      rule: 'Client-optional; [HH:MM:SS] format when requested',
      example: '[00:05:30] Speaker 1: Now moving to the next topic.',
    },
    {
      category: 'Punctuation review',
      rule: 'Correct AI punctuation errors; apply standard English rules',
      example: 'Fix comma splices and run-on sentences in AI output.',
    },
    {
      category: 'Formatting',
      rule: 'Clean up AI paragraph breaks for natural reading',
      example: 'Merge short fragments; split overly long paragraphs.',
    },
    {
      category: 'Numbers',
      rule: 'Numerals for all numbers per AI output convention; spell out if client specifies',
      example: 'Default: "We have 5 items." If specified: "We have five items."',
    },
  ],
  keyDifferences: [
    'Human review of AI output — focus on correction over transcription from scratch',
    'Correct AI errors: homophones, proper nouns, domain terminology',
    'Bracketed speaker labels: [Speaker 1]: format',
    'Emphasis on punctuation and paragraph flow corrections',
    'Timestamps optional — most orders omit them',
  ],
  difficultyLevel: 'intermediate',
  accentColor: 'blue',
  badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

const VERBIT_DATA: BrandData = {
  brandName: 'Verbit',
  shortName: 'Verbit',
  tagline: 'Enterprise-grade transcription with AI + specialist review',
  description:
    'Verbit serves enterprise clients in legal, education, and media. Their transcripts meet ADA compliance and legal standards. Specialist transcribers follow strict verbatim and accuracy requirements.',
  verbatimStyle: 'intelligent',
  verbatimDescription:
    'Verbit uses contextual verbatim: capture speech accurately for legal or educational contexts. Keep relevant fillers that indicate hesitation or uncertainty; remove purely habitual ones.',
  speakerLabelFormat: 'Speaker Name: or [Speaker N]: for unknown speakers',
  speakerLabelExample: 'Witness: I was at home all evening.\nAttorney: Can you confirm the time?',
  timestampFormat: '[HH:MM:SS] — required for legal and education tracks',
  timestampRequired: true,
  inaudibleNotation: '[inaudible]',
  crossTalkNotation: '[crosstalk]',
  fillerWordsPolicy:
    'Legal track: keep all fillers for verbatim accuracy. Education/media track: intelligent verbatim — remove habitual fillers, keep meaningful ones.',
  paragraphRules:
    'New paragraph per speaker. Legal: shorter paragraphs (2–3 sentences). Education: natural paragraph length.',
  musicSoundNotation: '[music] [background noise] [applause]',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Contextual verbatim — strict for legal, intelligent for education/media',
      example: 'Legal: capture every filler. Education: remove habitual fillers.',
    },
    {
      category: 'Speaker labels',
      rule: 'Known names as given; unknown speakers as [Speaker N]:',
      example: 'Judge:, Witness:, Attorney:, or [Speaker 1]:',
    },
    {
      category: 'Timestamps',
      rule: '[HH:MM:SS] required — especially for legal depositions',
      example: '[00:12:30] Witness: I recall seeing the document.',
    },
    {
      category: 'Accuracy standard',
      rule: '99%+ word accuracy required for enterprise delivery',
      example: 'Double-check all proper nouns, legal terms, and numbers.',
    },
    {
      category: 'Inaudible audio',
      rule: '[inaudible] — never guess; mark unclear audio',
      example: 'The contract dated [inaudible] was presented.',
    },
    {
      category: 'Legal formatting',
      rule: 'Q&A format for depositions: Q: and A: labels',
      example: 'Q: Where were you on the night of the 5th?\nA: I was home.',
    },
    {
      category: 'Numbers',
      rule: 'Spell out numbers one through nine; numerals for 10+',
      example: 'The witness provided two statements and 14 exhibits.',
    },
    {
      category: 'Non-verbal',
      rule: 'Include: [pause] [sighs] [whispers] when legally relevant',
      example: '[pause] I need a moment to think about that.',
    },
  ],
  keyDifferences: [
    'Enterprise/legal focus — 99%+ accuracy standard',
    'Legal depositions use Q: A: format',
    'Timestamps mandatory for legal and education tracks',
    'Contextual verbatim — rules differ by client track (legal vs. media)',
    '[pause] and non-verbal cues are documented for legal relevance',
  ],
  difficultyLevel: 'advanced',
  accentColor: 'slate',
  badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const SPEECHPAD_DATA: BrandData = {
  brandName: 'Speechpad',
  shortName: 'Speechpad',
  tagline: 'Media-focused clean verbatim for broadcast professionals',
  description:
    'Speechpad specializes in media, broadcast, and entertainment transcription. Their style guide follows broadcast industry standards with clean, professional output suitable for media production workflows.',
  verbatimStyle: 'clean',
  verbatimDescription:
    'Speechpad uses clean verbatim: output should read as professional broadcast copy. Remove all filler words, false starts, and repetitions. Output is suitable for post-production and closed captioning.',
  speakerLabelFormat: 'NAME (all caps): at paragraph start',
  speakerLabelExample: 'HOST: Welcome back to the program.\nGUEST: Thank you for having me.',
  timestampFormat: 'HH:MM:SS — required at start of each line/block',
  timestampRequired: true,
  inaudibleNotation: '(INAUDIBLE)',
  crossTalkNotation: '(CROSSTALK)',
  fillerWordsPolicy:
    'Remove all filler words. Output must be broadcast-clean. Maintain natural sentence structure after removal.',
  paragraphRules:
    'One paragraph per speaker segment, starting with timestamp. Broadcast-style short lines preferred.',
  musicSoundNotation: '(MUSIC) (APPLAUSE) (LAUGHTER) (BACKGROUND NOISE)',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Broadcast clean verbatim — professional, production-ready',
      example: '"Um, welcome to, uh, today\'s program" → "Welcome to today\'s program."',
    },
    {
      category: 'Speaker labels',
      rule: 'ALL CAPS name followed by colon — broadcast convention',
      example: 'ANCHOR: Breaking news tonight.',
    },
    {
      category: 'Timestamps',
      rule: 'HH:MM:SS required at start of every speaker block',
      example: '00:01:30\nANCHOR: And now our top story.',
    },
    {
      category: 'Inaudible audio',
      rule: '(INAUDIBLE) — parentheses, all caps, broadcast standard',
      example: 'The source confirmed (INAUDIBLE) in today\'s briefing.',
    },
    {
      category: 'Sound notations',
      rule: '(MUSIC), (APPLAUSE), etc. — parentheses, all caps',
      example: '(MUSIC)\nHOST: Stay tuned after the break.',
    },
    {
      category: 'Numbers',
      rule: 'Numerals for all numbers in broadcast format',
      example: 'The bill passed 53 to 47.',
    },
    {
      category: 'Punctuation',
      rule: 'Minimal punctuation — periods and commas primarily; avoid semicolons',
      example: 'Broadcast style favors simple, clear sentences.',
    },
    {
      category: 'Formatting',
      rule: 'Short lines for caption readability; max 32 characters per line',
      example: 'Formatted for closed caption display constraints.',
    },
  ],
  keyDifferences: [
    'Broadcast standard — speaker labels in ALL CAPS',
    'Sound notations use PARENTHESES and ALL CAPS: (INAUDIBLE)',
    'Timestamps on separate line before speaker label',
    'Short lines for caption compatibility (max ~32 chars)',
    'Numbers always as numerals in broadcast format',
  ],
  difficultyLevel: 'intermediate',
  accentColor: 'red',
  badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const HAPPY_SCRIBE_DATA: BrandData = {
  brandName: 'Happy Scribe',
  shortName: 'Happy Scribe',
  tagline: 'Multi-language transcription with flexible style options',
  description:
    'Happy Scribe is a European transcription platform supporting 120+ languages. Their platform offers both automatic and human transcription with flexible style guides adapting to client needs.',
  verbatimStyle: 'clean',
  verbatimDescription:
    'Happy Scribe human transcription uses clean verbatim: remove filler words for readability. Automatic transcription preserves speech exactly; human reviewers clean it according to guidelines.',
  speakerLabelFormat: 'Speaker 1:, Speaker 2: or client-specified names',
  speakerLabelExample: 'Speaker 1: The analysis covers three main areas.\nSpeaker 2: Please walk us through each one.',
  timestampFormat: '[HH:MM:SS] — shown in platform editor; exported per client spec',
  timestampRequired: false,
  inaudibleNotation: '[inaudible]',
  crossTalkNotation: '[inaudible] (simultaneous speech marked as inaudible)',
  fillerWordsPolicy:
    'Remove: um, uh, you know, like (filler). Keep words forming part of the meaning. Default to readable output.',
  paragraphRules:
    'Speaker change = new paragraph. Long turns broken every 200–300 words. Platform auto-segments; human reviewers adjust.',
  musicSoundNotation: '[music] [noise] [laughter]',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Clean verbatim for human transcription; AI output may vary',
      example: 'Human review removes fillers for clean, readable text.',
    },
    {
      category: 'Speaker labels',
      rule: 'Speaker N: format; replaced with actual names when provided',
      example: 'Speaker 1: → Host: (when client provides speaker names)',
    },
    {
      category: 'Multi-language',
      rule: 'Transcribe in original language; note language switches in brackets',
      example: '[Spanish] Muchas gracias. [English] Thank you very much.',
    },
    {
      category: 'Inaudible audio',
      rule: '[inaudible] — mark unclear audio regardless of language',
      example: 'The speaker mentioned [inaudible] as the key factor.',
    },
    {
      category: 'Timestamps',
      rule: 'Platform handles timestamps; export format depends on client order',
      example: 'SRT export includes timestamps; plain text may omit them.',
    },
    {
      category: 'Accents and dialects',
      rule: 'Transcribe spoken words as said, not corrected to standard dialect',
      example: '"gonna" stays "gonna" if spoken; not corrected to "going to"',
    },
    {
      category: 'Numbers',
      rule: 'Spell out one to nine; numerals for 10+; percentages as numerals',
      example: 'Three participants; 15 respondents; 80% completion rate.',
    },
    {
      category: 'Foreign words',
      rule: 'Keep foreign words as spoken; add [?] if uncertain of spelling',
      example: 'The concept of schadenfreude [?] is interesting.',
    },
  ],
  keyDifferences: [
    'Multi-language support — language switches noted in brackets',
    'Accents/dialects preserved as spoken — no correction to standard form',
    'Foreign words kept with [?] if spelling uncertain',
    'Platform-managed timestamps — export format varies by order type',
    'Human review layer on top of AI for 99% accuracy track',
  ],
  difficultyLevel: 'intermediate',
  accentColor: 'yellow',
  badgeColor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
}

const THREEPLAY_DATA: BrandData = {
  brandName: '3Play Media',
  shortName: '3Play Media',
  tagline: 'ADA-compliant captioning and transcription for education and media',
  description:
    '3Play Media specializes in ADA/Section 508-compliant captioning and transcription for higher education, media, and enterprise. Their standards meet legal accessibility requirements.',
  verbatimStyle: 'intelligent',
  verbatimDescription:
    '3Play Media uses intelligent verbatim for accessibility: capture speech accurately for comprehension and ADA compliance. Keep meaningful fillers; remove habitual ones that impede readability.',
  speakerLabelFormat: '>> SPEAKER NAME: or >> for unnamed speaker changes',
  speakerLabelExample: '>> PROFESSOR: The key concept is equilibrium.\n>> STUDENT: Can you explain that further?',
  timestampFormat: 'Embedded in platform — not in raw transcript text',
  timestampRequired: false,
  inaudibleNotation: '[INAUDIBLE]',
  crossTalkNotation: '[CROSSTALK]',
  fillerWordsPolicy:
    'Intelligent verbatim: remove habitual fillers (um, uh when not meaningful). Keep fillers that indicate thought process or emotion in educational contexts.',
  paragraphRules:
    'Speaker change = >> speaker label on new line. Caption lines: 32-character maximum for display. Sentence-break at natural pauses.',
  musicSoundNotation: '[MUSIC] [APPLAUSE] [LAUGHTER] [BACKGROUND NOISE]',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Intelligent verbatim for ADA compliance and comprehension',
      example: 'Keep: "Um, I — I want to be precise here" (shows careful thinking)\nRemove: habitual "you know" at sentence ends',
    },
    {
      category: 'Speaker labels',
      rule: '>> SPEAKER NAME: format — chevron prefix is 3Play standard',
      example: '>> INSTRUCTOR: Today we cover thermodynamics.',
    },
    {
      category: 'Caption line length',
      rule: 'Maximum 32 characters per caption line for display',
      example: 'Long sentences are split at natural\npause points for readability.',
    },
    {
      category: 'Inaudible audio',
      rule: '[INAUDIBLE] — all caps, brackets, ADA standard notation',
      example: 'The formula for [INAUDIBLE] is derived from...',
    },
    {
      category: 'Sound effects',
      rule: '[MUSIC], [APPLAUSE] etc. — all caps, brackets',
      example: '[MUSIC]\n>> HOST: Welcome back.',
    },
    {
      category: 'Punctuation',
      rule: 'Punctuation required for ADA comprehension; end all sentences properly',
      example: 'Every sentence ends with period, question mark, or exclamation.',
    },
    {
      category: 'Numbers',
      rule: 'Spell out in academic content; numerals in lists and data',
      example: 'Academic: "three variables". Data: "sample size of 150".',
    },
    {
      category: 'Technical terms',
      rule: 'Spell out technical/domain-specific terms exactly; mark uncertain: [sp?]',
      example: 'The coefficient of [sp?] kinematic viscosity...',
    },
  ],
  keyDifferences: [
    'ADA/Section 508 compliance focus — punctuation required for comprehension',
    'Unique >> speaker label format: >> SPEAKER NAME:',
    'Caption line limit: 32 characters max',
    'All-caps bracket notations: [INAUDIBLE], [MUSIC]',
    'Technical terms marked [sp?] when spelling uncertain',
  ],
  difficultyLevel: 'advanced',
  accentColor: 'cyan',
  badgeColor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
}

const GMR_DATA: BrandData = {
  brandName: 'GMR Transcription',
  shortName: 'GMR Transcription',
  tagline: 'Human-only transcription with strict verbatim standards',
  description:
    'GMR Transcription uses US-based human transcribers only — no AI. Their verbatim standards are comprehensive and enforce strict accuracy for legal, medical, and academic clients.',
  verbatimStyle: 'strict',
  verbatimDescription:
    'GMR Transcription uses strict verbatim: capture every word spoken including all fillers, false starts, repetitions, and stutters. Output reflects exactly what was said with no editorial smoothing.',
  speakerLabelFormat: 'Speaker 1:, Speaker 2: or provided names — no brackets',
  speakerLabelExample: 'Interviewer: Can you tell me about your experience?\nRespondent: Um, yes. I\'ve been working in this field for, uh, ten years.',
  timestampFormat: '[HH:MM:SS] — optional, requested per order',
  timestampRequired: false,
  inaudibleNotation: '[inaudible]',
  crossTalkNotation: '[crosstalk]',
  fillerWordsPolicy:
    'Strict verbatim: include ALL filler words exactly as spoken — um, uh, hmm, you know, like, right, okay. All repetitions and stutters included.',
  paragraphRules:
    'New paragraph per speaker. Long turns broken every 300–400 words at natural pauses.',
  musicSoundNotation: '[music] [laughter] [background noise] [applause]',
  quickRules: [
    {
      category: 'Verbatim level',
      rule: 'Strict verbatim — include every word, filler, and repetition',
      example: '"Um, I, I was there and, uh, we saw the, the evidence." → transcribe exactly',
    },
    {
      category: 'Speaker labels',
      rule: 'Name or Speaker N: — no brackets; colon directly after name',
      example: 'Interviewer: What happened next?\nRespondent: Um, I\'m not sure.',
    },
    {
      category: 'Filler words',
      rule: 'Include ALL: um, uh, hmm, you know, like, right, okay, alright',
      example: '"Um, so, you know, I think, uh, that it\'s, like, important." → transcribe as-is',
    },
    {
      category: 'Inaudible audio',
      rule: '[inaudible] — always mark; never guess at unclear audio',
      example: 'The document titled [inaudible] was referenced.',
    },
    {
      category: 'Crosstalk',
      rule: '[crosstalk] — both speakers attempting to speak simultaneously',
      example: 'Speaker 1: I think — [crosstalk] — yes, exactly.',
    },
    {
      category: 'Numbers',
      rule: 'Write numbers as spoken for strict verbatim',
      example: '"twenty five" → "twenty five" or "25" — match spoken form',
    },
    {
      category: 'Punctuation',
      rule: 'Standard English punctuation; em dash for interruptions (—)',
      example: 'She began to speak — then stopped abruptly.',
    },
    {
      category: 'False starts',
      rule: 'Include all false starts with em dash or comma: "I — I think", "I, I think"',
      example: '"I — I wanted to clarify that point."',
    },
  ],
  keyDifferences: [
    'US-based human transcribers ONLY — no AI used',
    'Strict verbatim — every filler, stutter, and repetition included',
    'No mandatory timestamps — optional per order',
    'False starts included with em dash format: "I — I think"',
    'Never guess at inaudible audio — always mark [inaudible]',
  ],
  difficultyLevel: 'beginner',
  accentColor: 'emerald',
  badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

export const BRAND_DATA_MAP: Record<string, BrandData> = {
  // Rev pages
  'rev-transcript-guidelines': REV_DATA,
  'rev-transcription-format': REV_DATA,
  'rev-style-guide': REV_DATA,
  'rev-captioning-guidelines': { ...REV_DATA, tagline: 'Rev captioning guidelines and timing standards' },
  'rev-transcription-requirements': REV_DATA,
  'rev-ai-transcription-guide': REV_DATA,
  // GoTranscript pages
  'gotranscript-guidelines': GOTRANSCRIPT_DATA,
  'gotranscript-transcription-format': GOTRANSCRIPT_DATA,
  'gotranscript-style-guide': GOTRANSCRIPT_DATA,
  'gotranscript-transcription-rules': GOTRANSCRIPT_DATA,
  'gotranscript-test-guide': { ...GOTRANSCRIPT_DATA, tagline: 'How to pass the GoTranscript qualification test' },
  // TranscribeMe pages
  'transcribeme-guidelines': TRANSCRIBEME_DATA,
  'transcribeme-transcription-style': TRANSCRIBEME_DATA,
  'transcribeme-format-guide': TRANSCRIBEME_DATA,
  'transcribeme-style-guide': TRANSCRIBEME_DATA,
  'transcribeme-exam-guide': { ...TRANSCRIBEME_DATA, tagline: 'Tips to pass the TranscribeMe qualification exam' },
  // Scribie pages
  'scribie-transcription-guidelines': SCRIBIE_DATA,
  'scribie-format-guide': SCRIBIE_DATA,
  'scribie-transcription-rules': SCRIBIE_DATA,
  'scribie-style-guide': SCRIBIE_DATA,
  // Daily Transcripts pages
  'daily-transcripts-guidelines': DAILY_TRANSCRIPTS_DATA,
  'daily-transcripts-format-guide': DAILY_TRANSCRIPTS_DATA,
  'daily-transcripts-style-guide': DAILY_TRANSCRIPTS_DATA,
  // Transcribio pages
  'transcribio-guidelines': TRANSCRIBIO_DATA,
  'transcribio-format-guide': TRANSCRIBIO_DATA,
  'transcribio-style-guide': TRANSCRIBIO_DATA,
  // Verbit pages
  'verbit-transcription-guidelines': VERBIT_DATA,
  'verbit-format-guide': VERBIT_DATA,
  // Speechpad pages
  'speechpad-transcription-guidelines': SPEECHPAD_DATA,
  'speechpad-format-guide': SPEECHPAD_DATA,
  // Happy Scribe pages
  'happy-scribe-transcription-guidelines': HAPPY_SCRIBE_DATA,
  'happy-scribe-format-guide': HAPPY_SCRIBE_DATA,
  // 3Play Media pages
  '3play-media-transcription-guidelines': THREEPLAY_DATA,
  '3play-media-format-guide': THREEPLAY_DATA,
  // GMR Transcription pages
  'gmr-transcription-guidelines': GMR_DATA,
  'gmr-transcript-format-guide': GMR_DATA,
}

export function getBrandDataForPath(path: string): BrandData | null {
  const slug = path.replace(/^\//, '')
  return BRAND_DATA_MAP[slug] ?? null
}
