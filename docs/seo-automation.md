# SEO Automation — Architecture & Operations

## Overview

Production-grade **Automatic SEO** pipeline for VideoText: weekly trend discovery, decision engine with guardrails, safe page updates, and human-in-the-loop PRs by default.

**Hard constraints (non-negotiable):**
- Do not break: upload, transcribe, export, payment, auth, core routing, or APIs.
- No mass low-quality pages; hard caps enforced.
- No wholesale weekly rewrites; only additive, targeted edits.
- No keyword stuffing; all additions must improve UX.
- Every automated change is logged, reviewable, and reversible (git + changelog).
- External paid APIs (Ahrefs/SEMrush) are optional; pipeline runs with free sources only.

---

## Phase 0 — SEO Automation Readiness Report

### Repo discovery summary

| Item | Finding |
|------|--------|
| **Framework** | React 18 + Vite 6 (client); Node/Express (server). |
| **Rendering** | Client-side rendering (CSR). No SSR/SSG. |
| **Routing** | React Router; routes defined in `client/src/App.tsx`. |
| **SEO head tags** | `react-helmet-async` via `client/src/components/Seo.tsx`. Per-route meta in `client/src/lib/seoMeta.ts` (`ROUTE_SEO`, `ROUTE_BREADCRUMB`). |
| **Current pages** | Core: `/`, `/pricing`, `/faq`, `/privacy`, `/terms`, plus 6 core tools + 28 SEO utility routes (same tools, alternate URLs). All in `ROUTE_SEO` and `ROUTE_BREADCRUMB`. |
| **robots.txt** | `client/public/robots.txt` — Allow all, Sitemap URL present. |
| **Sitemap** | Static `client/public/sitemap.xml` — manual; not yet generated from code. |
| **Canonical** | Set per route in `<Seo>` from `canonicalPath`; 404 uses `noindex`. |
| **Redirects** | None in client; SPA so no server redirects for client routes. |
| **Structured data** | Organization + WebApplication (home); BreadcrumbList (tool pages); FAQPage (/faq). |

### Current issues

| Priority | Issue | Recommendation |
|----------|--------|-----------------|
| **P0** | Sitemap is static; new programmatic pages can be missed. | Generate sitemap from `seoMeta` + registry; run in CI and commit or serve dynamically. |
| **P1** | No automated trend → action pipeline. | Use weekly job: collect → decide → propose (PR) → optional apply. |
| **P2** | No single “SEO content registry” for programmatic pages. | Add `client/src/seo/registry.ts` (or repo `seo/registry.json`) for slug, title, meta, FAQs, related links. |

### Safe integration approach

- **No changes to** upload/transcribe/export/payment/auth or core APIs.
- **SEO automation** runs in repo as Node/TS scripts under `scripts/seo/`, invoked by GitHub Actions.
- **Inventory** is derived from existing `ROUTE_SEO` / `ROUTE_BREADCRUMB`; new programmatic pages are added via registry + generator; caps prevent mass creation.
- **Human-in-the-loop:** weekly job produces `seo-proposals.json` and opens a PR with diffs; auto-apply only if explicitly enabled and within caps.

---

## Architecture

### High-level flow

```
[Weekly trigger]
       ↓
[Collectors] → Google Suggest, YouTube Suggest, Reddit (optional: SerpApi, Ahrefs, SEMrush)
       ↓
[KeywordCandidate] → phrase, sources, trend_signal, relevance_score, risk_score, suggested_page_type
       ↓
[Decision engine] → UPDATE_EXISTING_PAGE | CREATE_NEW_PAGE | FAQ_ONLY | IGNORE (with caps)
       ↓
[seo-proposals.json] → list of planned actions
       ↓
[PR] (default) → new/updated pages, sitemap, changelog, summary
       ↓
[Optional] auto-merge if env flag + within caps
```

### Components

1. **Config** (`seo.config.json` at repo root or `scripts/seo/seo.config.json`)
   - Existing SEO pages inventory (or path to client metadata).
   - Caps: `weekly_new_pages_cap`, `weekly_updates_cap`, `monthly_new_pages_cap`.
   - Thresholds: `minimum_relevance_score`, min content length, max FAQs per update.
   - Allowlist/blacklist for keywords and URL slugs.

2. **Collectors** (Phase 1)
   - **SERP/Google Suggest:** Public suggest endpoint (no key); cache 24h.
   - **YouTube Suggest:** Public suggest (no key); cache 24h.
   - **Reddit:** Search/JSON API (no key); strict rate limit.
   - **Optional:** SerpApi (SERP + PAA + Trends), Ahrefs, SEMrush — env keys; skip if missing.

3. **Decision engine** (Phase 2)
   - Maps each candidate to one action: UPDATE_EXISTING_PAGE, CREATE_NEW_PAGE, FAQ_ONLY, IGNORE.
   - Enforces caps and thresholds; duplicate/near-duplicate detection; “thin content” guardrails.

4. **SEO content registry**
   - Defines programmatic page definitions (slug, title, meta, H1, sections, FAQs, related links).
   - Maps keyword groups to pages; used by generator and sitemap.

5. **Sitemap generator**
   - Reads registry + ROUTE_SEO; outputs `sitemap.xml` with lastmod; ping optional.

6. **Weekly job** (GitHub Actions)
   - Runs collectors → decision engine → writes `seo-proposals.json`.
   - By default: open PR with proposals + optional file changes (new/updated pages, sitemap, changelog).
   - Optional auto-merge only when env flag set and changes within caps.

### Guardrails (defaults; configurable)

- `weekly_new_pages_cap`: 2  
- `weekly_updates_cap`: 3  
- `monthly_new_pages_cap`: 8  
- Minimum relevance score for any action.  
- Duplicate detection (canonical + near-duplicate).  
- New pages: unique title/meta, 300–800 words useful content, 3–8 internal links, 3–6 FAQs, breadcrumbs, canonical, OG, in sitemap.  
- Never create pages for ultra-broad head terms unless allowlisted; never rewrite existing pages wholesale; no URL structure changes.

---

## Operations

### Running the weekly job locally

```bash
# From repo root (requires Node 18+)
npm run seo:weekly
```

Output: `scripts/seo/output/seo-proposals.json` (and optionally `changelog.md`).

### Running in CI (GitHub Actions)

- Workflow: `.github/workflows/seo-weekly.yml`
- Schedule: weekly (e.g. Monday 00:00 UTC).
- Steps: checkout → setup Node → install deps → run `npm run seo:weekly` → upload `seo-proposals.json` → optional “open PR” step (e.g. with gh CLI or a small script).

### Applying proposals (human-in-the-loop)

1. Review `seo-proposals.json` and the PR diff.
2. Verify guardrails and caps.
3. Merge when satisfied; deployment picks up new/updated pages and sitemap.

### Verification checklist

- [ ] View-source: meta description, canonical, JSON-LD on key pages.
- [ ] No `noindex` on public pages (only 404).
- [ ] Sitemap includes all public pages and new programmatic pages.
- [ ] Build passes; new routes resolve and return 200.
- [ ] Content length and uniqueness within thresholds.
- [ ] Lighthouse: no major regressions; Rich Results test for FAQ/Organization.

---

## Optional APIs (free tier)

| Service | Use | Key env | Free tier |
|--------|-----|---------|-----------|
| **SerpApi** | Google SERP, PAA, Trends | `SERP_API_KEY` | 100 searches/month |
| **Ahrefs** | Keywords / volume | `AHREFS_API_KEY` | Limited free trial |
| **SEMrush** | Keywords / volume | `SEMRUSH_API_KEY` | Limited free trial |

If keys are not set, collectors log “not configured” and skip; job does not fail.

---

## File layout

```
docs/
  seo-automation.md          # This doc
scripts/
  seo/
    seo.config.json          # Caps, thresholds, allowlist/blacklist
    types.ts                 # KeywordCandidate, Proposal, etc.
    collectors/
      index.ts               # Run all collectors
      serp-suggest.ts        # Google suggest (no key)
      youtube-suggest.ts     # YouTube suggest (no key)
      reddit.ts              # Reddit search (no key)
      optional-serp.ts         # SerpApi (optional key)
    optional-ahrefs-semrush.ts # Ahrefs/SEMrush stubs (optional keys)
    decision-engine.ts       # Score, filter, decide action
    registry.ts              # Load inventory + SLUG_TO_PRIMARY
    run-weekly.ts            # Main: collect → decide → output proposals + changelog
    write-changelog.ts       # Write changelog from proposals (CI)
    verify.ts                # Caps and inventory verification
    generate-sitemap.ts      # Generate sitemap; optional ping Google/Bing
    output/
      seo-proposals.json     # Generated proposals (in PR)
      changelog.md           # Human-readable summary
client/
  src/
    lib/
      seoMeta.ts             # Existing ROUTE_SEO, ROUTE_BREADCRUMB
    seo/
      registry.ts            # (Optional) programmatic page definitions
.github/
  workflows/
    seo-weekly.yml           # Weekly job: run pipeline, artifact, open PR
```

---

## Changelog

- **Initial:** Phase 0 readiness report, architecture, guardrails, and pipeline design. Implementation: collectors (SERP/YouTube/Reddit), decision engine, config, registry loader, sitemap generator, weekly job script, GitHub Actions workflow.
