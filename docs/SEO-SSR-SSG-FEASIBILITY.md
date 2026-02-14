# SEO SSR/SSG Feasibility — VideoText

**Date:** 2025-02-14  
**Stack:** Vite + React SPA (client), Express API (server).  
**Conclusion:** Do **not** implement SSR/SSG in the current repo. Prefer pre-rendering for static SEO pages only, or a future SSR adoption plan in a separate project.

---

## 1. Current architecture

- **Client:** Vite + React, client-side routing (React Router), single `index.html`, all SEO pages rendered by the same `SeoToolPage` template with meta from `seoRegistry.ts`.
- **Server:** Express API for auth, billing, jobs, upload/process/export. No server-rendered HTML today.
- **SEO:** Meta and JSON-LD are set in the client; crawlers that execute JS see the correct title, description, canonical, BreadcrumbList, FAQPage.

---

## 2. Risks of adding SSR/SSG here

- **Routing and build:** Vite is not a full SSR framework. Adding SSR would require a second entry (e.g. `server.ts`) and a different build pipeline, or a move to a framework that supports SSR natively (Next.js, Remix).
- **Tool flows:** Upload, process, export, auth, and payments depend on the current SPA + API split. Changing to SSR could affect how routes, API calls, and client state interact (e.g. redirects, token handling, file uploads).
- **Single source of truth:** SEO content lives in `seoRegistry.ts`. Any SSR/SSG solution must keep this as the only source; duplicating content into another system would violate the no-duplication rule.
- **Regression risk:** High. This codebase is production; a full SSR refactor could break tool flows, routing, or deployment.

---

## 3. Recommendation

**Do not implement SSR or SSG in the current stack.** Prefer one of:

### Option A — Pre-rendering for static SEO pages only (low risk)

- Use **prerender-spa-plugin** (Webpack) or **vite-ssg** (or similar) to pre-render a **fixed set** of static SEO URLs at build time (e.g. home, pricing, FAQ, and a subset of registry-derived SEO tool pages).
- **Constraints:** Only pre-render routes that do not require auth or dynamic API data. Do not pre-render upload/process/export flows.
- **Benefit:** Crawlers that do not run JS get static HTML for key landing and SEO pages. No change to runtime routing or API behavior.
- **Caveat:** Vite’s default build does not include prerender-spa-plugin; you’d need a Vite-compatible prerender step or a separate small pipeline that consumes the built SPA and outputs static HTML for a list of paths derived from `seoRegistry.ts` (and static routes). Keep that list in one place (e.g. script that reads the registry).

### Option B — Future SSR adoption (separate project or major version)

- Plan a **future** move to a framework with built-in SSR/SSG (e.g. Next.js App Router, Remix) as a separate project or major version.
- Migrate routing, data loading, and SEO from the current SPA + `seoRegistry.ts` without duplicating content (e.g. keep registry as the single source, consumed by the new framework).
- Do **not** start this in the current repo if it would require large refactors to tool flows or deployment.

---

## 4. What we do instead (current repo)

- Rely on **client-side meta and JSON-LD** from `seoRegistry.ts` and `seoMeta.ts`.
- Run **SEO smoke tests** (e.g. `scripts/seo/smoke-seo-output.ts`) after build against a served build to assert title, description, canonical, BreadcrumbList, and FAQPage.
- Keep **one source of truth** for SEO: `seoRegistry.ts` for programmatic SEO pages and `STATIC_ROUTE_SEO` in `seoMeta.ts` for static routes.

No SSR/SSG implementation is recommended in this codebase until a low-risk, framework-aligned path (Option A or B) is chosen and scoped without touching upload/process/export/auth/payments.
