/**
 * Server-side rendering helper for build-time prerendering.
 *
 * Two SSR modes are intentionally supported:
 * 1. `react-page`: hand-audited presentational React pages that can be rendered directly.
 * 2. `seo-document`: registry/meta driven semantic HTML for SEO landing pages whose
 *    interactive uploader/editor remains client-only during hydration.
 *
 * This keeps browser-heavy product flows out of Node while ensuring crawlers see
 * headings, paragraphs, FAQs, comparisons, and internal links for every important
 * indexable page.
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import TemiVsVideoText from './pages/TemiVsVideoText'
import VideoTextVsRev from './pages/VideoTextVsRev'
import OtterVsVideoText from './pages/OtterVsVideoText'
import DescriptVsVideoText from './pages/DescriptVsVideoText'
import VideoTextVsTurboScribe from './pages/VideoTextVsTurboScribe'
import BestOtterAlternatives from './pages/BestOtterAlternatives'
import BestDescriptAlternatives from './pages/BestDescriptAlternatives'
import ApiDocs from './pages/ApiDocs'
import ZapierIntegration from './pages/ZapierIntegration'
import { ROUTE_SEO } from './lib/seoMeta'
import { getAllSeoEntries, getPageLabel, getRelatedSuggestionsForEntry, getSeoEntry, type FaqItem, type SeoDeepContent, type SeoRegistryEntry, type SeoTutorialContent } from './lib/seoRegistry'
import { getCanonicalPathForRoute, resolveInternalLinkPath } from './lib/primaryUrls'
import {
  getRouteFamily,
  getFamilySectionTitles,
  getFamilyPrimaryCta,
  getContextualCta,
  getWorkflowStageCtas,
  shouldReplaceRegistryCta,
  buildFamilyDeepContent,
  buildFamilyFaq,
  type RouteFamily,
} from './lib/routeFamilyTemplates'

type SsrMode = 'react-page' | 'seo-document'

interface StaticRouteContent {
  path: string
  title: string
  description: string
  h1: string
  intro: string
  faq?: FaqItem[]
  related?: { path: string; title: string }[]
  deepContent?: SeoDeepContent
  tutorialContent?: SeoTutorialContent
  primaryCta?: { text: string; path: string }
  routeFamily?: RouteFamily
}

const SSR_PAGES: Record<string, React.ComponentType> = {
  '/temi-vs-videotext': TemiVsVideoText,
  '/videotext-vs-rev': VideoTextVsRev,
  '/otter-vs-videotext': OtterVsVideoText,
  '/descript-vs-videotext': DescriptVsVideoText,
  '/videotext-vs-turboscribe': VideoTextVsTurboScribe,
  '/best-otter-alternatives': BestOtterAlternatives,
  '/best-descript-alternatives': BestDescriptAlternatives,
  // Hand-authored pages with substantive, page-specific content (no localStorage/
  // window access at render time) — rendered directly rather than through the
  // generic seo-document template, which is built for tool-landing pages and
  // would duplicate/CTA-mismatch on a technical reference and an integration guide.
  '/docs/api': ApiDocs,
  '/integrations/zapier': ZapierIntegration,
}

const CORE_STATIC_CONTENT: Record<string, Omit<StaticRouteContent, 'path' | 'title' | 'description'>> = {
  '/site-index': {
    h1: 'All VideoText Pages',
    intro: 'Browse VideoText transcription workflows, subtitle utilities, comparison pages, alternatives, style-guide resources, and export helpers from one organized index.',
    primaryCta: { text: 'Choose the right transcript, subtitle, or formatting workflow', path: '/site-index' },
    deepContent: {
      proofPoints: [
        'Find the right workflow quickly, from long-video transcription to subtitle repair, translation, formatting, and tool comparisons.',
        'Every important page links back to core transcription, subtitle, and formatting workflows.',
        'Related pages are grouped so transcript, caption, formatting, and comparison resources stay easy to navigate.',
      ],
      workflowSteps: [
        { title: '1. Browse workflow groups', detail: 'Start with core product pages, alternatives, free tools, and detailed transcript or subtitle resources from one organized page.' },
        { title: '2. Follow task-specific links', detail: 'Related workflow links connect use cases such as YouTube transcripts, meeting notes, subtitle translation, and style-guide formatting.' },
        { title: '3. Compare options', detail: 'Use comparison and alternatives pages to choose the right transcript, subtitle, or formatting workflow before uploading media.' },
      ],
      ctaText: 'Move from raw media to export-ready text',
      ctaPath: '/video-to-transcript',
    },
    faq: [
      { q: 'Why does VideoText have a site index?', a: 'The index gives teams a quick map of transcription, subtitle, formatting, comparison, and free utility pages when they are not sure which workflow to start with.' },
      { q: 'What can I find in the site index?', a: 'You can find core transcription tools, subtitle workflows, style-guide pages, alternatives, samples, blog guides, and free utilities.' },
    ],
    related: [
      { path: '/video-to-transcript', title: 'Video to Transcript' },
      { path: '/video-to-subtitles', title: 'Video to Subtitles' },
      { path: '/alternatives', title: 'Alternatives Hub' },
      { path: '/tools', title: 'Free Tools' },
    ],
  },
  '/guideline-format': {
    h1: 'Transcript Style Guide Formatter for Rev and GoTranscript Rules',
    intro:
      'Turn a raw transcript into a client-ready draft that follows platform-style rules for speaker labels, timestamps, clean verbatim, full verbatim, punctuation, and QA review. Use it before delivery to reduce formatting rework and catch the issues that often trigger marketplace revision requests.',
    primaryCta: { text: 'Apply client transcript formatting rules', path: '/guideline-format' },
    deepContent: {
      proofPoints: [
        'Apply Rev-style paragraph breaks, speaker names, timestamps, and notation rules before client handoff.',
        'Check GoTranscript-style QA details such as label consistency, timestamp placement, inaudible tags, and verbatim level.',
        'Convert rough ASR output into a cleaner delivery draft without manually reformatting every speaker turn.',
      ],
      workflowSteps: [
        { title: '1. Choose the requested guideline', detail: 'Start from Rev, GoTranscript, TranscribeMe, Scribie, or custom client instructions, then adjust rules for clean verbatim, full verbatim, timestamps, and notation style.' },
        { title: '2. Normalize transcript structure', detail: 'Standardize speaker labels, paragraph breaks, capitalization, filler-word handling, and timestamp intervals so the file reads consistently from beginning to end.' },
        { title: '3. Run a QA pass before delivery', detail: 'Review formatting risks such as missing labels, inconsistent brackets, overlong paragraphs, unclear inaudible marks, and timestamp drift before sending the transcript to a reviewer or client.' },
      ],
      outputExamples: [
        { title: 'Rev-ready formatting', body: 'Prepare readable clean verbatim text with consistent speakers, clear paragraphing, and timestamp treatment that matches the client request.' },
        { title: 'GoTranscript QA checklist', body: 'Catch common rejection triggers: wrong timestamp format, mixed speaker labels, missing crosstalk notes, inconsistent punctuation, and unsupported verbatim choices.' },
        { title: 'Client-ready transcript handoff', body: 'Export a polished draft that can move into DOCX, PDF, TXT, or team review with fewer manual formatting passes.' },
      ],
      useCases: [
        { title: 'Freelance transcriptionists', body: 'Reduce revision risk before submitting marketplace jobs that require strict style-guide compliance.' },
        { title: 'Agencies and QA leads', body: 'Give editors a repeatable formatting workflow for client-specific transcript requirements.' },
        { title: 'Creators and researchers', body: 'Turn automated transcripts into readable documents with speaker structure, timestamps, and clean delivery formatting.' },
      ],
      comparisonRows: [
        { feature: 'Clean vs full verbatim', videotext: 'Helps apply filler-word, false-start, and readability rules consistently', alternatives: 'Often leaves editors to enforce verbatim level manually' },
        { feature: 'Timestamp formatting', videotext: 'Supports interval and speaker-turn timestamp workflows for review-ready files', alternatives: 'Requires manual timestamp cleanup after transcription' },
        { feature: 'QA rejection prevention', videotext: 'Surfaces formatting issues before handoff', alternatives: 'Issues are usually found only after reviewer feedback' },
      ],
      ctaText: 'Generate a client-ready formatted transcript',
      ctaPath: '/guideline-format',
    },
    faq: [
      { q: 'Can I format a transcript for Rev-style rules?', a: 'Yes. Use the formatter to apply speaker labels, paragraph structure, timestamp choices, clean verbatim rules, and notation conventions before exporting the transcript.' },
      { q: 'How does this help with GoTranscript QA?', a: 'It gives you a structured pass for common QA issues such as inconsistent speaker labels, incorrect timestamp style, missing inaudible or crosstalk notation, and mismatched clean versus full verbatim settings.' },
      { q: 'What is the difference between clean and full verbatim?', a: 'Clean verbatim removes distracting fillers and false starts for readability. Full verbatim keeps more spoken detail, including fillers, repetitions, and interruptions when the guideline requires them.' },
    ],
    related: [
      { path: '/rev-transcript-guidelines', title: 'Rev Transcript Guidelines' },
      { path: '/gotranscript-guidelines', title: 'GoTranscript Guidelines' },
      { path: '/transcribeme-guidelines', title: 'TranscribeMe Guidelines' },
      { path: '/video-to-transcript', title: 'Video to Transcript' },
      { path: '/samples', title: 'Transcript Samples' },
    ],
  },
  '/video-to-transcript': {
    h1: 'Video to Transcript — Free AI Transcription, 98.5% Accurate',
    intro:
      'Upload any video or paste a YouTube URL and get a full transcript, SRT/VTT subtitles, AI summary, and auto-generated chapters in one pass. VideoText is built for creators, teams, researchers, and agencies that need searchable text from long recordings without manual cleanup.',
    primaryCta: { text: 'Generate transcript, subtitles, summary, and chapters together', path: '/video-to-transcript' },
    deepContent: {
      proofPoints: [
        'One long-video upload produces transcript text, SRT/VTT subtitle files, summaries, chapters, JSON, DOCX, PDF, and share-ready exports.',
        'Handles long recordings from creators, webinars, interviews, courses, meetings, and research sessions without splitting the job across separate tools.',
        'Searchable transcripts make it easier to find quotes, decisions, chapters, action items, and reusable clips inside multi-hour recordings.',
      ],
      workflowSteps: [
        { title: '1. Upload a video or paste a URL', detail: 'Drag in a file or start from a public media URL. Choose language, speaker labels, long-video handling, and export formats before processing.' },
        { title: '2. Generate transcript, subtitles, summary, and chapters', detail: 'VideoText prepares transcript text, captions, summaries, chapters, and structured data in the same workflow, replacing separate transcription, captioning, note-taking, and summarization tools.' },
        { title: '3. Review, edit, and export', detail: 'Copy searchable text, download TXT/DOCX/PDF/JSON, export SRT/VTT captions, share with teammates, or continue into subtitle translation and style-guide formatting.' },
      ],
      outputExamples: [
        { title: 'Searchable transcript', body: 'Turn a long recording into text that can be searched by topic, speaker, quote, decision, or chapter marker.' },
        { title: 'Subtitle files', body: 'Generate SRT and VTT captions for YouTube, Vimeo, courses, webinars, social clips, and accessibility handoffs.' },
        { title: 'Summary and chapters', body: 'Create a concise recap and navigable chapter markers so creators and teams can locate key moments without replaying the full video.' },
      ],
      useCases: [
        { title: 'Creators and marketers', body: 'Repurpose webinars, podcasts, tutorials, and launches into articles, social captions, newsletters, searchable show notes, and clip briefs.' },
        { title: 'Researchers and journalists', body: 'Search interviews, lectures, focus groups, and source footage for exact quotes, themes, timestamps, and supporting evidence.' },
        { title: 'Agencies and teams', body: 'Standardize transcript, subtitle, summary, and client handoff outputs across many recordings and collaborators.' },
      ],
      comparisonRows: [
        { feature: 'Outputs from one upload', videotext: 'Transcript, SRT/VTT, summary, chapters, JSON, DOCX, PDF, and share links', alternatives: 'Usually transcript-only or requires multiple tools' },
        { feature: 'Long recording workflow', videotext: 'Designed for long-video processing, structured outputs, and teammate review', alternatives: 'Often requires separate tools for captions, summaries, chapters, or review handoff' },
        { feature: 'Privacy posture', videotext: 'Files deleted after processing', alternatives: 'Uploads may remain in project libraries' },
      ],
      ctaText: 'Turn long video into structured transcript outputs',
      ctaPath: '/video-to-transcript',
    },
    faq: [
      { q: 'How do I convert a video to a transcript?', a: 'Upload a video file or paste a supported URL, choose your options, and start transcription. VideoText returns transcript text plus optional subtitle, summary, and chapter outputs.' },
      { q: 'Does VideoText generate subtitles too?', a: 'Yes. The same flow can produce SRT and VTT files in addition to the transcript, which makes the page useful for captioning and publishing workflows.' },
      { q: 'Can I use VideoText for long videos?', a: 'Yes. VideoText is designed for long-video processing with transcript text, subtitle files, summaries, chapters, and flexible exports from the same upload.' },
    ],
    related: [
      { path: '/youtube-transcript-generator', title: 'YouTube Transcript Generator' },
      { path: '/video-to-subtitles', title: 'Video to Subtitles' },
      { path: '/translate-subtitles', title: 'Translate Subtitles' },
      { path: '/guideline-format', title: 'Transcript Style Guide Formatter' },
      { path: '/fastest-transcription-tool', title: 'Fastest Transcription Tool' },
    ],
  },
}

function titleToH1(title: string): string {
  return title.replace(/\s*[—–|].*$/, '').trim() || title
}


function getStaticRouteContent(routePath: string): StaticRouteContent | null {
  const canonicalPath = getCanonicalPathForRoute(routePath)
  const family = getRouteFamily(routePath)
  const seoEntry = getSeoEntry(routePath) || getSeoEntry(canonicalPath)
  if (seoEntry) return contentFromSeoEntry(seoEntry, family)

  const meta = ROUTE_SEO[routePath] || ROUTE_SEO[canonicalPath]
  const core = CORE_STATIC_CONTENT[routePath] || CORE_STATIC_CONTENT[canonicalPath]
  if (meta && core) {
    return {
      path: routePath,
      title: meta.title,
      description: meta.description,
      routeFamily: family,
      ...core,
    }
  }

  if (core) {
    const h1 = core.h1 || titleToH1(routePath.slice(1).replace(/-/g, ' '))
    const description = core.intro || `${h1} on VideoText.`
    return {
      path: routePath,
      title: `${h1} | VideoText`,
      description,
      routeFamily: family,
      ...core,
    }
  }

  if (meta) {
    const label = getPageLabel(routePath) || titleToH1(meta.title)
    const familyCta = getFamilyPrimaryCta(family, routePath)
    return {
      path: routePath,
      title: meta.title,
      description: meta.description,
      h1: titleToH1(meta.title),
      intro: meta.description,
      routeFamily: family,
      primaryCta: familyCta,
      deepContent: {
        ...buildFamilyDeepContent(family, label, meta.description),
        ctaText: familyCta.text,
        ctaPath: familyCta.path,
      },
      faq: buildFamilyFaq(family, label, meta.description),
      related: [
        { path: '/video-to-transcript', title: 'Video to Transcript' },
        { path: '/video-to-subtitles', title: 'Video to Subtitles' },
        { path: '/translate-subtitles', title: 'Translate Subtitles' },
        { path: '/guideline-format', title: 'Transcript Style Guide Formatter' },
        { path: '/tools', title: 'Free Transcript and Subtitle Tools' },
      ].filter((item) => item.path !== routePath),
    }
  }

  return null
}

function contentFromSeoEntry(entry: SeoRegistryEntry, family: RouteFamily): StaticRouteContent {
  const contextualCta = getContextualCta(family, entry.path, 'hero')
  const registryCtaText = entry.deepContent?.ctaText || entry.tutorialContent?.ctaText
  const registryCtaPath = entry.deepContent?.ctaPath || entry.tutorialContent?.ctaPath
  const selectedCta = shouldReplaceRegistryCta(registryCtaText) ? contextualCta : { ...contextualCta, text: registryCtaText!, path: registryCtaPath || contextualCta.path }
  const deepContent = entry.deepContent || buildFamilyDeepContent(family, entry.breadcrumbLabel, entry.description)
  return {
    path: entry.path,
    title: entry.title,
    description: entry.description,
    h1: entry.h1,
    intro: entry.intro,
    faq: entry.faq,
    routeFamily: family,
    deepContent: {
      ...deepContent,
      ctaText: shouldReplaceRegistryCta(deepContent.ctaText) ? getContextualCta(family, entry.path, 'footer').text : deepContent.ctaText,
      ctaPath: shouldReplaceRegistryCta(deepContent.ctaText) ? getContextualCta(family, entry.path, 'footer').path : deepContent.ctaPath,
    },
    tutorialContent: entry.tutorialContent,
    related: getRelatedSuggestionsForEntry(entry),
    primaryCta: {
      text: selectedCta.text,
      path: resolveInternalLinkPath(selectedCta.path),
    },
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="vt-workflow-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function StaticSeoDocument({ content }: { content: StaticRouteContent }) {
  const deep = content.deepContent
  const tutorial = content.tutorialContent
  const related = content.related || []
  const primaryCta = content.primaryCta || getFamilyPrimaryCta(content.routeFamily ?? 'generic', content.path)
  const titles = getFamilySectionTitles(content.routeFamily ?? 'generic')

  return (
    <main className="vt-workflow-document">
      <style>{`
        .vt-workflow-document{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:960px;margin:0 auto;padding:48px 20px;color:#111827;line-height:1.65;background:#fff}
        .vt-workflow-eyebrow{color:#1d4ed8;font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px}
        .vt-workflow-document h1{font-size:clamp(34px,6vw,60px);line-height:1.02;margin:0 0 18px;font-weight:500;letter-spacing:-.04em;color:#111827}
        .vt-workflow-intro{font-size:20px;line-height:1.75;color:#374151;margin:0 0 28px;max-width:860px}
        .vt-workflow-actions{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 14px}.vt-workflow-actions a{border-radius:999px;padding:12px 18px;text-decoration:none;font-weight:800}.vt-workflow-primary{background:#6366F1;color:#fff}.vt-workflow-secondary{background:#eef2ff;color:#4338CA}.vt-workflow-contextual-ctas{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 40px}.vt-workflow-contextual-ctas a{display:inline-flex;border:1px solid #e5e7eb;border-radius:999px;padding:8px 12px;color:#374151;background:#fff;text-decoration:none;font-weight:700;font-size:13px}
        .vt-workflow-section{border-top:1px solid #e5e7eb;padding-top:30px;margin-top:34px}.vt-workflow-section h2{font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:500;color:#111827}.vt-workflow-section h3{font-size:18px;margin:0 0 8px;color:#111827}.vt-workflow-section p,.vt-workflow-section li{color:#374151;font-size:16px}.vt-workflow-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}.vt-workflow-card{border:1px solid #e5e7eb;border-radius:12px;padding:18px;background:#fafafa}.vt-workflow-card p{margin:0}.vt-workflow-proof li{margin:8px 0}.vt-workflow-table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}.vt-workflow-table th,.vt-workflow-table td{border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top;padding:12px}.vt-workflow-table th{background:#f9fafb;color:#111827}.vt-workflow-faq details{border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin:10px 0;background:#fff}.vt-workflow-faq summary{cursor:pointer;font-weight:800;color:#111827}.vt-workflow-links{display:flex;flex-wrap:wrap;gap:10px}.vt-workflow-links a{display:inline-flex;border:1px solid #bfdbfe;border-radius:999px;padding:8px 12px;color:#4338CA;background:#faf5ff;text-decoration:none;font-weight:700}.vt-workflow-card--edge{background:#fef9f0;border-color:#fde68a}.vt-workflow-card--platform{background:#f0f9ff;border-color:#bae6fd}
      `}</style>
      <p className="vt-workflow-eyebrow">VideoText workflow guide</p>
      <h1>{content.h1 || titleToH1(content.title)}</h1>
      <p className="vt-workflow-intro">{content.intro || content.description}</p>
      <div className="vt-workflow-actions">
        <a className="vt-workflow-primary" href={primaryCta.path}>{primaryCta.text}</a>
        <a className="vt-workflow-secondary" href="/pricing">Compare workflow capacity</a>
      </div>
      <div className="vt-workflow-contextual-ctas" aria-label="Workflow-specific next steps">
        {getWorkflowStageCtas(content.routeFamily ?? 'generic', content.path).slice(0, 3).map((cta) => (
          <a key={`${cta.stage}-${cta.text}`} href={cta.path}>{cta.text}</a>
        ))}
      </div>

      {deep?.proofPoints?.length ? (
        <Section title={titles.proofPoints}>
          <ul className="vt-workflow-proof">{deep.proofPoints.map((point) => <li key={point}>{point}</li>)}</ul>
        </Section>
      ) : null}

      {deep?.workflowSteps?.length ? (
        <Section title={titles.workflowSteps}>
          <div className="vt-workflow-grid">{deep.workflowSteps.map((step) => <article className="vt-workflow-card" key={step.title}><h3>{step.title}</h3><p>{step.detail}</p></article>)}</div>
        </Section>
      ) : null}

      {tutorial?.steps?.length ? (
        <Section title={titles.workflowSteps}>
          <div className="vt-workflow-grid">{tutorial.steps.map((step) => <article className="vt-workflow-card" key={step.title}><h3>{step.title}</h3><p>{step.detail}</p></article>)}</div>
        </Section>
      ) : null}

      {deep?.outputExamples?.length ? (
        <Section title={titles.outputExamples}>
          <div className="vt-workflow-grid">{deep.outputExamples.map((item) => <article className="vt-workflow-card" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </Section>
      ) : null}

      {deep?.comparisonRows?.length ? (
        <Section title={titles.comparisonRows}>
          <table className="vt-workflow-table">
            <thead><tr><th>Feature</th><th>VideoText</th><th>Alternatives</th></tr></thead>
            <tbody>{deep.comparisonRows.map((row) => <tr key={row.feature}><td>{row.feature}</td><td>{row.videotext}</td><td>{row.alternatives}</td></tr>)}</tbody>
          </table>
        </Section>
      ) : null}

      {deep?.useCases?.length ? (
        <Section title={titles.useCases}>
          <div className="vt-workflow-grid">{deep.useCases.map((item) => <article className="vt-workflow-card" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </Section>
      ) : null}

      {deep?.visualProof?.length ? (
        <Section title={titles.edgeCases}>
          <div className="vt-workflow-grid">{deep.visualProof.map((item) => <article className="vt-workflow-card vt-workflow-card--edge" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </Section>
      ) : null}

      {deep?.technicalExplanation?.length ? (
        <Section title={titles.platformGuidance}>
          <div className="vt-workflow-grid">{deep.technicalExplanation.map((item) => <article className="vt-workflow-card vt-workflow-card--platform" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </Section>
      ) : null}

      {content.faq?.length ? (
        <Section title={titles.faq}>
          <div className="vt-workflow-faq">{content.faq.map((item) => <details open key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div>
        </Section>
      ) : null}

      {related.length ? (
        <Section title={titles.related}>
          <nav className="vt-workflow-links" aria-label="Related workflows">{related.map((item) => <a key={`${item.path}-${item.title}`} href={item.path}>{item.title}</a>)}</nav>
        </Section>
      ) : null}
    </main>
  )
}

export function getSsrPagePaths(): string[] {
  const paths = new Set<string>(Object.keys(SSR_PAGES))
  for (const entry of getAllSeoEntries()) paths.add(entry.path)
  for (const path of Object.keys(CORE_STATIC_CONTENT)) paths.add(path)
  return [...paths].sort()
}

export function getSsrRenderMode(routePath: string): SsrMode | null {
  if (SSR_PAGES[routePath]) return 'react-page'
  return getStaticRouteContent(routePath) ? 'seo-document' : null
}

/**
 * Renders a route to a semantic HTML string. Returns null when the route is not
 * registered for SSR-safe build-time rendering.
 */
export function renderPageToHtml(routePath: string): string | null {
  const Component = SSR_PAGES[routePath]
  try {
    if (Component) {
      return renderToString(
        <StaticRouter location={routePath}>
          <HelmetProvider>
            <Component />
          </HelmetProvider>
        </StaticRouter>
      )
    }

    const content = getStaticRouteContent(routePath)
    if (!content) return null

    return renderToString(
      <StaticRouter location={routePath}>
        <HelmetProvider>
          <StaticSeoDocument content={content} />
        </HelmetProvider>
      </StaticRouter>
    )
  } catch (err) {
    console.error(`[ssr-render] renderToString failed for ${routePath}:`, err)
    return null
  }
}
