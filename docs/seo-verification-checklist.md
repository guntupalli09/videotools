# SEO Automation — Verification Checklist

Use this after merging SEO changes or when validating the pipeline.

## Automated checks (run `npm run seo:verify`)

- [ ] **Caps:** Proposals respect `max_new_pages_per_run`, `max_updates_per_run`, `weekly_new_pages_cap`, `weekly_updates_cap`.
- [ ] **Proposals format:** `seo-proposals.json` is valid; each UPDATE/FAQ path exists in routes inventory.
- [ ] **Build:** `npm run build` (from repo root) passes.
- [ ] **Routes:** Every new path has a route in `App.tsx` and an entry in `seoMeta.ts` (ROUTE_SEO, ROUTE_BREADCRUMB).
- [ ] **Sitemap:** Generated sitemap includes all public pages; no 404s in sitemap.

## Safety checks (Phase 6)

- [ ] **noindex:** No accidental `noindex` on public pages (only 404 / NotFound).
- [ ] **Canonical:** Every public page has canonical present (handled by `Seo` component).
- [ ] **Sitemap includes new pages:** After adding programmatic pages, run `npm run seo:sitemap` and commit.
- [ ] **Content length:** New pages meet min/max content words and FAQ count from `seo.config.json` thresholds.

## Manual checks (view-source)

- [ ] **Meta:** Each public page has unique `<title>` and `<meta name="description">` (no keyword stuffing).
- [ ] **Canonical:** `<link rel="canonical">` present and points to correct absolute URL (https, no trailing slash).
- [ ] **No noindex on public pages:** Only 404 or intentional noindex pages have `noindex, nofollow`.
- [ ] **JSON-LD:** Home has Organization + WebApplication; tool pages have BreadcrumbList; FAQ page has FAQPage.

## Tools

- **Rich Results (Google):** [Rich Results Test](https://search.google.com/test/rich-results) — paste a URL to validate structured data.
- **Lighthouse:** Run in Chrome DevTools; ensure no major SEO or performance regressions.
- **Search Console:** URL Inspection → request indexing for new or updated URLs after deploy.

## After deploying new/updated pages

1. Request indexing in Search Console for important new URLs.
2. Confirm sitemap is submitted and discoverable (robots.txt references it).
3. Spot-check 2–3 new pages: view-source for meta + JSON-LD, then Rich Results test.
4. Optionally set `SITEMAP_PING=1` when generating sitemap to ping Google/Bing (or rely on GSC sitemap submit).
