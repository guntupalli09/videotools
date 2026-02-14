# SEO Refactor — Baseline Snapshot (Phase 1)

**Date:** 2025-02-14  
**Purpose:** Regression baseline before refactoring to programmatic SEO engine. All public SEO pages, metadata, and behavior recorded.

---

## 1. Public SEO pages (alternate URLs only)

These are the **27 SEO wrapper pages** that reuse one of the 7 core tools. Canonical tool URLs are unchanged and not listed here.

| # | URL (path) | Expected H1 | Primary tool | Breadcrumb label |
|---|------------|-------------|--------------|------------------|
| 1 | /video-to-text | Video to Text Online | video-to-transcript | Video to Text |
| 2 | /mp4-to-text | MP4 to Text Online | video-to-transcript | MP4 to Text |
| 3 | /mp4-to-srt | MP4 to SRT Online | video-to-subtitles | MP4 to SRT |
| 4 | /subtitle-generator | Subtitle Generator Online | video-to-subtitles | Subtitle Generator |
| 5 | /srt-translator | SRT Translator Online | translate-subtitles | SRT Translator |
| 6 | /meeting-transcript | Meeting Transcript — Turn Meetings into Text | video-to-transcript | Meeting Transcript |
| 7 | /speaker-diarization | Speaker-Separated Video Transcripts — Instantly Online | video-to-transcript | Speaker Diarization |
| 8 | /video-summary-generator | Video Summary Generator — Decisions, Actions, Key Points | video-to-transcript | Video Summary Generator |
| 9 | /video-chapters-generator | Video Chapters Generator — Section Headings from Transcript | video-to-transcript | Video Chapters Generator |
| 10 | /keyword-indexed-transcript | Keyword-Indexed Transcript — Topic Index from Video | video-to-transcript | Keyword Indexed Transcript |
| 11 | /srt-to-vtt | SRT to VTT — Subtitle Format Conversion | video-to-subtitles | SRT to VTT |
| 12 | /subtitle-converter | Subtitle Converter — SRT, VTT, TXT | video-to-subtitles | Subtitle Converter |
| 13 | /subtitle-timing-fixer | Subtitle Timing Fixer — Fix Overlaps and Gaps | fix-subtitles | Subtitle Timing Fixer |
| 14 | /subtitle-validation | Subtitle Validation — Check Timing and Format | fix-subtitles | Subtitle Validation |
| 15 | /subtitle-translator | Subtitle Translator — SRT/VTT to Any Language | translate-subtitles | Subtitle Translator |
| 16 | /multilingual-subtitles | Multilingual Subtitles — Multiple Languages from One File | translate-subtitles | Multilingual Subtitles |
| 17 | /subtitle-language-checker | Subtitle Language Checker — Detect and Translate | translate-subtitles | Subtitle Language Checker |
| 18 | /subtitle-grammar-fixer | Subtitle Grammar Fixer — Auto-Correct Caption Text | fix-subtitles | Subtitle Grammar Fixer |
| 19 | /subtitle-line-break-fixer | Subtitle Line Break Fixer — Fix Long Lines and Wrapping | fix-subtitles | Subtitle Line Break Fixer |
| 20 | /hardcoded-captions | Hardcoded Captions — Burn Subtitles into Video | burn-subtitles | Hardcoded Captions |
| 21 | /video-with-subtitles | Video with Subtitles — Add Captions to Video | burn-subtitles | Video with Subtitles |
| 22 | /video-compressor | Video Compressor — Reduce File Size Online | compress-video | Video Compressor |
| 23 | /reduce-video-size | Reduce Video Size — Compress Without Losing Quality | compress-video | Reduce Video Size |
| 24 | /batch-video-processing | Batch Video Processing — Multiple Videos at Once | batch-process | Batch Video Processing |
| 25 | /bulk-subtitle-export | Bulk Subtitle Export — SRT for Many Videos | batch-process | Bulk Subtitle Export |
| 26 | /bulk-transcript-export | Bulk Transcript Export — Text for Many Videos | batch-process | Bulk Transcript Export |

---

## 2. Verification checklist (per URL)

For each URL above, verify:

- [ ] **URL resolves** — no 404, same path (no redirect)
- [ ] **H1** — matches expected H1 in table
- [ ] **CTA** — primary upload/action area visible
- [ ] **Tool** — correct core tool renders (upload → process → export)
- [ ] **Meta** — `<title>`, `<meta name="description">`, canonical match path
- [ ] **Breadcrumbs** — BreadcrumbList present; UI breadcrumb shows Home → [Breadcrumb label]
- [ ] **FAQ** — when FAQs exist, section visible and FAQPage schema valid

---

## 3. Metadata source (current)

- **ROUTE_SEO** — `client/src/lib/seoMeta.ts` (title, description per path)
- **ROUTE_BREADCRUMB** — `client/src/lib/seoMeta.ts` (breadcrumb items per path)
- **JSON-LD** — AppSeo injects BreadcrumbList for tool/SEO pages; FAQPage only on /faq; Organization/WebApplication on home

---

## 4. Navigation & tool behavior

- **Core tool URLs** (unchanged): /video-to-transcript, /video-to-subtitles, /translate-subtitles, /fix-subtitles, /burn-subtitles, /compress-video, /batch-process
- **Tool flows** — upload → process → export; no changes to API, auth, or payment
- **CrossToolSuggestions** — rendered inside each tool component (e.g. VideoToTranscript suggests Video → Subtitles)

---

## 5. Regression baseline summary

- **Total SEO wrapper URLs:** 26
- **Core tools:** 7 (VideoToTranscript, VideoToSubtitles, TranslateSubtitles, FixSubtitles, BurnSubtitles, CompressVideo, BatchProcess)
- **Routing:** Explicit `<Route path="..." element={<...Page />} />` in App.tsx for each SEO path
- **Meta:** Centralized in seoMeta.ts; Seo component receives title, description, canonical, jsonLd from AppSeo

This document is the baseline for Phase 6 regression verification.

---

## 6. Upgrade baseline (Phase 0) — SEO machine upgrades

**Date:** 2025-02-14

### 6.1 Current CI and automation

- **Workflow:** `.github/workflows/seo-weekly.yml`
  - **Trigger:** Monday 00:00 UTC cron + `workflow_dispatch`
  - **Job `seo-pipeline`:** checkout → `npm install` → `npm run seo:weekly` → `npm run seo:verify` → upload artifact (`seo-proposals.json`, `changelog.md`)
  - **Job `open-pr`:** checkout → download artifact → `npm run seo:changelog` → `npm run seo:sitemap` → **peter-evans/create-pull-request@v6** (branch `seo/weekly-proposals`, commits changelog + sitemap; does **not** edit `seoRegistry.ts`)

- **PR creation today:** GitHub Action `create-pull-request` commits only:
  - Regenerated `scripts/seo/output/changelog.md`
  - Regenerated `client/public/sitemap.xml`
  - Proposals remain in `seo-proposals.json` for human review; **no automated registry edits**.

### 6.2 Registry and validators

- **SEO source of truth:** `client/src/lib/seoRegistry.ts`
  - **Shape:** `SeoRegistryEntry`: path, title, description, h1, intro, faq, breadcrumbLabel, toolKey, relatedSlugs. No `indexable`, `intentKey`, or `canonicalGroup` yet.
- **Validators:**
  - `scripts/seo/validate-registry.js` — duplicate paths, title/description length, relatedSlugs reference valid paths (CORE_PATHS ∪ registry paths).
  - `scripts/seo/validate-sitemap.js` — sitemap URLs match `routes-inventory.json` exactly (no indexable filter yet).
- **Inventory:** `scripts/seo/sync-routes-from-registry.js` writes `scripts/seo/routes-inventory.json` (STATIC_ROUTES + all registry paths). Used by decision engine, generate-sitemap, validate-sitemap.

### 6.3 Files to be modified (by phase)

| Phase | File(s) | Why |
|-------|---------|-----|
| 2 | `client/src/lib/seoRegistry.ts` | Add `indexable?: boolean` (default true). |
| 2 | `client/src/lib/seoMeta.ts` | Optional: single `STATIC_INDEXABLE` set if we exclude any static route from sitemap (else derive: all static = indexable). |
| 2 | `scripts/seo/validate-registry.js` | Fail if relatedSlugs targets non-indexable; optionally validate indexable shape. |
| 2 | `scripts/seo/registry.ts` | Add `getIndexablePaths()` (parse registry + static) for sitemap. |
| 2 | `scripts/seo/generate-sitemap.ts` | Include only indexable paths. |
| 2 | `scripts/seo/validate-sitemap.js` | Expect sitemap to match indexable inventory only. |
| 3 | `client/src/lib/seoRegistry.ts` | Add `intentKey` (required), `canonicalGroup?`. |
| 3 | `scripts/seo/validate-registry.js` | Duplicate intentKey/canonicalGroup checks; missing intentKey = fail. |
| 3 | `scripts/seo/decision-engine.ts` | Assign intentKey for CREATE_NEW_PAGE; block on conflict. |
| 1 | `scripts/seo/apply-proposals-to-registry.ts` (new) | Apply proposals → patch seoRegistry.ts (AST or marker-based). |
| 1 | `.github/workflows/seo-weekly.yml` | Run apply-proposals → sync → validate-registry → generate-sitemap → validate-sitemap; commit registry + sitemap; PR body with summary. |
| 4 | `scripts/seo/smoke-seo-output.ts` (new) | Fetch 10 URLs; assert title, description, canonical, BreadcrumbList, FAQPage. |
| 4 | CI | Run smoke after build; fail PR on failure. |
| 5 | `docs/SEO-SSR-SSG-FEASIBILITY.md` (new) | Assessment only; no SSR/SSG implementation if Vite SPA. |

### 6.4 Phase 6 — No-duplication check (done)

- **SEO pages:** Single source of truth = `client/src/lib/seoRegistry.ts`. No parallel registry.
- **Static routes meta:** Only in `seoMeta.ts` (`STATIC_ROUTE_SEO`). Scripts use a `STATIC_ROUTES` path list in `sync-routes-from-registry.js` and `registry.ts`; that list should match the keys of `STATIC_ROUTE_SEO` (same set, no meta duplication).
- **Indexable:** Derived from registry (`indexable` flag) and static routes (all indexable); sitemap and validators use `getIndexablePaths()` from `registry.ts` (reads registry file, no second source).
