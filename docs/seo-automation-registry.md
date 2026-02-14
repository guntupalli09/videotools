# SEO automation → registry

Proposals from the weekly SEO pipeline (**CREATE_NEW_PAGE**, **UPDATE_EXISTING_PAGE**, **FAQ_ONLY**) are applied by editing the **client registry only**. Automation never creates new route files.

## Guardrails (decision engine)

- **Weekly caps:** `max_new_pages_per_run`, `max_updates_per_run` (see `seo.config.json`).
- **Duplicate path:** If the suggested slug already exists in `routes-inventory` (e.g. `/video-to-text`), the candidate is skipped (canonical conflict).
- **Content thresholds:** `min_content_words`, `max_faq_per_update`, etc. used when generating content for proposals.

## Applying proposals

1. **CREATE_NEW_PAGE** — Add a new entry to `REGISTRY` in `client/src/lib/seoRegistry.ts` with:
   - `path`: `'/' + slug` (from proposal)
   - `title`, `description`, `h1`, `intro`, `breadcrumbLabel`, `toolKey`, `relatedSlugs`, `faq`
   - Pick `toolKey` from the canonical tool that best fits the intent.
   - Run `node scripts/seo/sync-routes-from-registry.js` so sitemap/inventory include the new path.

2. **UPDATE_EXISTING_PAGE** — Edit the existing entry in `REGISTRY` for `path`: adjust `intro`, add/update FAQs, or meta as needed.

3. **FAQ_ONLY** — Edit the `faq` array of the existing entry for `path`; add 2–5 FAQs.

After any registry edit:

- Run `node scripts/seo/validate-registry.js`.
- Run `node scripts/seo/sync-routes-from-registry.js` (for new paths).
- Regenerate sitemap if needed; run `node scripts/seo/validate-sitemap.js`.
