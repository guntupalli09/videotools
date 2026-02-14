# SEO output verification

Lightweight checks to confirm SEO output is correct after changes.

## Automated (run from repo root)

```bash
# 1. Sync routes from registry
node scripts/seo/sync-routes-from-registry.js

# 2. Validate registry (duplicates, required fields, relatedSlugs)
node scripts/seo/validate-registry.js

# 3. Generate sitemap (if needed)
npx tsx scripts/seo/generate-sitemap.ts

# 4. Validate sitemap (no duplicates, all registry paths present)
node scripts/seo/validate-sitemap.js
```

## Manual / spot checks (several SEO pages)

For a few URLs (e.g. `/video-to-text`, `/subtitle-generator`, `/bulk-subtitle-export`):

| Check | How |
|-------|-----|
| **&lt;title&gt; present** | View page source, find `<title>`; should match registry title + site name |
| **Meta description present** | View source, find `<meta name="description" content="...">`; non-empty, matches registry |
| **Canonical correct** | `<link rel="canonical" href="https://...">` equals current path (no trailing slash) |
| **BreadcrumbList JSON-LD** | View source, find `application/ld+json` with `"@type":"BreadcrumbList"`; items match path |
| **FAQPage JSON-LD** | If page has FAQs, find `"@type":"FAQPage"` with `mainEntity` array |

## robots.txt and sitemap

- **robots.txt** — `Allow: /` so all SEO paths are crawlable; `Sitemap:` URL correct for env.
- **sitemap.xml** — Contains every path from `routes-inventory.json` exactly once (run `validate-sitemap.js`).

## Post-deploy (optional)

- Use a crawler or SEO tool to confirm title/meta/canonical on a sample of live URLs.
- Confirm no 404s for paths in the registry.
