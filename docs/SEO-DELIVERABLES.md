# SEO Implementation Deliverables

## 1) Keyword Intelligence Table (Phase 1)

Based on live market research (Google Trends, SERP, Reddit/creator communities, competitor and tool landscape):

| Keyword | Estimated Demand | Trend | Search Intent | Competition | Recommended Page Type |
|--------|------------------|-------|---------------|-------------|------------------------|
| video to text | High | Stable | Transactional / Tool | Medium | Core product (existing: /video-to-text) |
| video to transcript | High | Stable | Transactional | Medium | Core product (existing: /video-to-transcript) |
| subtitle generator | High | Stable | Transactional | Medium | Core product (existing: /subtitle-generator) |
| youtube transcript download | High | Stable | Transactional | High | Landing page (add: /youtube-transcript-download) |
| mp4 to srt | Medium | Stable | Transactional | Low–Medium | Core product (existing: /mp4-to-srt) |
| mp4 to text | Medium | Stable | Transactional | Low–Medium | Core product (existing: /mp4-to-text) |
| srt to vtt | Medium | Stable | Transactional | Low | Utility (existing: /srt-to-vtt) |
| subtitle translator | Medium | Stable | Transactional | Medium | Core product (existing: /subtitle-translator) |
| podcast to text | Medium | Rising | Transactional | Medium | Landing (existing: /video-to-transcript + /meeting-transcript) |
| meeting transcript | Medium | Stable | Transactional | Medium | Landing (existing: /meeting-transcript) |
| multilingual subtitles | Medium | Rising | Transactional | Low–Medium | Landing (existing: /multilingual-subtitles) |
| video compressor | Medium | Stable | Transactional | Medium | Core (existing: /video-compressor) |
| burn subtitles into video | Low–Medium | Stable | Transactional | Low | Landing (existing: /burn-subtitles, /hardcoded-captions) |
| fix subtitle timing | Low–Medium | Stable | Transactional | Low | Utility (existing: /fix-subtitles, /subtitle-timing-fixer) |
| batch video transcription | Low–Medium | Stable | Transactional | Low | Landing (existing: /batch-process) |
| speaker diarization | Low | Stable | Informational + Tool | Low | Landing (existing: /speaker-diarization) |
| video summary generator | Low | Rising | Transactional | Low | Landing (existing: /video-summary-generator) |
| video chapters generator | Low | Stable | Transactional | Low | Landing (existing: /video-chapters-generator) |

**Prioritization:** High-intent, stable/rising, realistic competition. Core product pages already exist; focus on technical SEO, schema, internal links, and one high-demand landing (e.g. youtube transcript download) if a dedicated flow is added.

---

## 2) SEO Architecture (Phase 2)

### Site structure (text diagram)

```
Home (/)
├── Core product (money) pages
│   ├── /video-to-transcript (primary)
│   ├── /video-to-subtitles (primary)
│   ├── /translate-subtitles
│   ├── /fix-subtitles
│   ├── /burn-subtitles
│   ├── /compress-video
│   └── /batch-process
├── SEO landing pages (same tools, alternate URLs)
│   ├── Video → text: /video-to-text, /mp4-to-text, /mp4-to-srt, /subtitle-generator
│   ├── Transcript: /meeting-transcript, /speaker-diarization, /video-summary-generator, /video-chapters-generator, /keyword-indexed-transcript
│   ├── Subtitle format: /srt-to-vtt, /subtitle-converter, /subtitle-timing-fixer, /subtitle-validation
│   ├── Translate: /srt-translator, /subtitle-translator, /multilingual-subtitles, /subtitle-language-checker
│   ├── Fix: /subtitle-grammar-fixer, /subtitle-line-break-fixer
│   ├── Burn: /hardcoded-captions, /video-with-subtitles
│   ├── Compress: /video-compressor, /reduce-video-size
│   └── Batch: /batch-video-processing, /bulk-subtitle-export, /bulk-transcript-export
├── Authority / trust
│   ├── /pricing
│   ├── /faq
│   ├── /privacy
│   └── /terms
```

### Internal linking hierarchy

- **Home** → all core tools + pricing + FAQ.
- **Each SEO page** → canonical tool (primary URL) + 2–3 related tools (e.g. subtitle generator → srt to vtt, translate subtitles).
- **Footer** → Tools (home), Pricing, FAQ, Privacy, Terms.
- **Breadcrumbs** → Home > [Tool category] > [Page] on all tool/SEO pages.

### Content system

- **URL slug:** kebab-case, keyword-led (e.g. `/youtube-transcript-download`).
- **SEO title:** Primary keyword + benefit + brand (e.g. "YouTube Transcript Download — Free & Fast | VideoText").
- **Meta description:** 150–160 chars, CTA + differentiation (no signup, free tier).
- **H1:** One per page, matches intent (e.g. "Download YouTube Transcript in Seconds").
- **Sections:** Value prop above fold, how it works, FAQ (3–5 questions), CTA.
- **Structured data:** Organization, WebApplication (home); BreadcrumbList (all); FAQPage (FAQ + key tool pages); SoftwareApplication where applicable.

---

## 3) Pages Created / Optimized

- **Existing and optimized:** All routes in `ROUTE_SEO` have title + description; 20+ SEO landing pages already exist.
- **Technical:** robots.txt de-duplicated; sitemap includes all public routes; canonicals per route via `Seo` component.
- **Schema:** Organization + WebApplication on home; BreadcrumbList on tool pages; FAQPage on FAQ (and optionally on key tool pages).
- **Internal linking:** Breadcrumb component; footer "Tools" link to home; CrossToolSuggestions on tool pages.

---

## 4) Verification Checklist

- [ ] **robots.txt** — Single block, `Allow: /`, Sitemap URL correct.
- [ ] **sitemap.xml** — All public indexable URLs (no /login, /reset-password, etc.), valid XML, correct domain.
- [ ] **Canonical** — Every page has canonical to `https://www.videotext.io{path}` (or `VITE_SITE_URL`).
- [ ] **HTTPS** — Enforced in production; no mixed content.
- [ ] **Titles & meta** — Unique per page, ~50–60 chars title, ~150–160 chars description.
- [ ] **OG/Twitter** — Present on all public pages via `Seo` component.
- [ ] **JSON-LD** — Valid (test with Google Rich Results Test); Organization + WebApplication on home; BreadcrumbList on tools; FAQPage on /faq.
- [ ] **Heading hierarchy** — One H1 per page; H2/H3 logical.
- [ ] **404** — Custom 404 page or fallback; no soft 404s for real URLs.
- [ ] **Core Web Vitals** — LCP, FID, CLS acceptable (Vite + lazy routes support this).

---

## 5) Expected Impact

- **Short-term (1–4 weeks):** Better crawlability and indexation (sitemap + robots); possible uplift in impressions for existing keywords; FAQ rich results may appear for /faq.
- **Long-term (2–6 months):** Compound gains from internal linking and breadcrumbs; more long-tail rankings from SEO landing pages; stronger topical authority for "video to text" and "subtitle" clusters.

---

## 6) Git Diffs Grouped by Phase

- **Phase 3:** `client/public/robots.txt`, `client/src/pages/NotFound.tsx`, `client/src/App.tsx` (404 route).
- **Phase 4:** `client/src/lib/seoMeta.ts` (FAQ schema, ROUTE_BREADCRUMB, getFaqJsonLd, getBreadcrumbJsonLd), `client/src/App.tsx` (jsonLd logic), `client/src/components/Breadcrumb.tsx`.
- **Phase 6:** `client/src/components/Footer.tsx` (Popular tools links), `client/src/components/Breadcrumb.tsx` (visual breadcrumbs).

---

## 7) Measurement & Fast Indexing (Phase 7)

### Crawl / index health checklist

- [ ] **robots.txt** — Open `https://www.videotext.io/robots.txt`. Should show `Allow: /` and `Sitemap: https://www.videotext.io/sitemap.xml`.
- [ ] **Sitemap** — Open `https://www.videotext.io/sitemap.xml`. All public URLs should be listed (no login, reset-password, etc.).
- [ ] **URL Inspection (GSC)** — For key URLs (home, /video-to-transcript, /video-to-text, /faq), use “URL Inspection” and “Request indexing” after deploy.
- [ ] **Coverage report** — In Google Search Console, check Coverage (or Pages) for errors, excluded, and “Indexed” count.
- [ ] **Rich results** — Use [Google Rich Results Test](https://search.google.com/test/rich-results) for homepage (Organization + WebApplication) and `/faq` (FAQPage).

### Submit sitemap

1. Go to [Google Search Console](https://search.google.com/search-console) → your property.
2. Sitemaps → Add a new sitemap → enter: `sitemap.xml` → Submit.
3. Optionally add the same sitemap in Bing Webmaster Tools.

### URLs to request indexing (priority)

After deployment, request indexing in GSC for:

- `https://www.videotext.io/`
- `https://www.videotext.io/video-to-transcript`
- `https://www.videotext.io/video-to-text`
- `https://www.videotext.io/subtitle-generator`
- `https://www.videotext.io/faq`

### KPIs to watch (week 1 and beyond)

| KPI | Where | What to look for |
|-----|--------|-------------------|
| **Impressions** | GSC → Performance | Increase for target keywords (video to text, subtitle generator, etc.). |
| **CTR** | GSC → Performance | Improve titles/descriptions if CTR is low for high-impression queries. |
| **Indexed pages** | GSC → Coverage (or Pages) | Count should align with number of URLs in sitemap; fix any “Discovered – currently not indexed” or errors. |
| **Core Web Vitals** | GSC → Experience | LCP, FID, CLS in “Good” range where possible. |
