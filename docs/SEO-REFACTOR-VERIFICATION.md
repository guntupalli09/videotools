# SEO Refactor — Regression Verification (Phase 6)

Use this checklist to verify no regressions after the programmatic SEO refactor.

## Pre-requisites

- Build passes: `npm run build`
- Dev server runs: `npm run dev` (in client)

## Per-URL checks (SEO wrapper pages only)

For each of these URLs, open the page and confirm:

| Check | Description |
|-------|-------------|
| **URL resolves** | Same path, no 404, no redirect |
| **H1** | Matches expected H1 (see baseline) |
| **CTA** | Upload zone or primary action visible |
| **Tool** | Correct tool renders (same as before) |
| **Meta** | `<title>` and `<meta name="description">` match seoMeta / registry |
| **Breadcrumbs** | UI breadcrumb: Home → [page label] |
| **FAQ** | FAQ section present when applicable |
| **JSON-LD** | BreadcrumbList + FAQPage (when FAQs) in page source |

## Sample URLs to test (smoke)

1. `/video-to-text` → VideoToTranscript, H1 "Video to Text Online"
2. `/subtitle-generator` → VideoToSubtitles, H1 "Subtitle Generator Online"
3. `/subtitle-translator` → TranslateSubtitles, H1 "Subtitle Translator — SRT/VTT to Any Language"
4. `/video-compressor` → CompressVideo, H1 "Video Compressor — Reduce File Size Online"
5. `/bulk-subtitle-export` → BatchProcess, H1 "Bulk Subtitle Export — SRT for Many Videos"

## Global checks

- [ ] **Server APIs** — Upload, process, export unchanged (no API or auth changes)
- [ ] **Build** — `npm run build` succeeds
- [ ] **Console** — No errors on loading any SEO page
- [ ] **Prefetch** — Hover/focus on nav links still prefetches (SeoToolPage chunk)
- [ ] **404** — Unknown path (e.g. `/unknown-seo-page`) shows NotFound, no crash

## Automation

- [ ] **routes-inventory.json** — After adding a new SEO entry to `client/src/lib/seoRegistry.ts`, run `node scripts/seo/sync-routes-from-registry.js` to refresh; then sitemap includes the new URL.
- [ ] **Sitemap** — `npx tsx scripts/seo/generate-sitemap.ts` (or equivalent) produces sitemap from routes-inventory.

## Result

- **Date run:** _______________
- **Result:** PASS / FAIL
- **Notes:** _______________
