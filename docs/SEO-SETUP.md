# SEO automation — immediate setup

Follow these steps so the SEO pipeline is fully functional for your tool and for others (including CI).

---

## 1. No keys required to run

The pipeline works **without any API keys**. It uses free sources:

- **serp_suggest** (Google-style suggestions)
- **youtube_suggest**
- **reddit**

So you can push code and run `npm run seo:weekly` (or let the weekly workflow run) with zero config.

---

## 2. Local runs: optional API keys (repo root `.env`)

If you want **extra** keyword data (e.g. SerpApi), add keys in a **repo root** `.env` (same folder as `package.json`). Do **not** commit `.env`; it’s in `.gitignore`.

**Template:** copy from the repo root:

```bash
cp .env.example .env
```

Then edit `.env` and set only what you use:

```env
# Optional – uncomment and set if you use them
# SERP_API_KEY=your_serpapi_key
# AHREFS_API_KEY=optional
# SEMRUSH_API_KEY=optional
```

- **SerpApi:** get a key at [serpapi.com](https://serpapi.com/) (free tier ~100 searches/month). Then in **`scripts/seo/seo.config.json`** set `"serp_api": { "enabled": true, ... }` (it’s `false` by default).
- **Ahrefs / SEMrush:** optional; stubs are in the repo; add keys if you have accounts.

The weekly script loads **repo root** `.env` automatically when you run `npm run seo:weekly`.

---

## 3. GitHub Actions (weekly SEO job)

So that the **weekly SEO workflow** can use optional keys and open PRs:

1. **Repo → Settings → Secrets and variables → Actions**
2. Add **repository secrets** (only if you use them):
   - **`SERP_API_KEY`** – value = your SerpApi key  
   - Optionally **`AHREFS_API_KEY`** and **`SEMRUSH_API_KEY`**
3. The workflow (`.github/workflows/seo-weekly.yml`) already passes `SERP_API_KEY` into the “Run SEO weekly job” step. If you add Ahrefs/SEMrush secrets, uncomment those env lines in the workflow and add the secrets.

**Without any secrets:** the workflow still runs; it just uses free sources and may log “SerpApi not configured; skipping.”

---

## 4. Sitemap and apply-proposals (after merging the SEO PR)

The weekly workflow:

1. Runs collectors → decision engine → writes **proposals**
2. Applies **CREATE_NEW_PAGE** (and other) proposals to the registry
3. Syncs routes, validates registry, generates sitemap, validates sitemap
4. Opens a PR with branch `seo/weekly-proposals`

When **you merge** that PR:

- **Sitemap** is regenerated; the workflow uses `SITE_URL: https://www.videotext.io` for sitemap URLs (set in the workflow). No extra env needed unless your production URL is different.
- **Apply proposals:** the workflow runs `npm run seo:apply-proposals`; it reads `scripts/seo/output/seo-proposals.json` from the artifact. No API keys needed for that step.

---

## 5. Quick checklist

| Step | Action |
|------|--------|
| **Push code** | Safe to push. No secrets in repo; `.env` is gitignored. |
| **Others clone** | They get the same code. They can run `npm run seo:weekly` with no keys, or copy `.env.example` → `.env` and add keys locally. |
| **Optional local keys** | Create repo root `.env` from `.env.example`; add `SERP_API_KEY` (and optionally Ahrefs/SEMrush). |
| **Enable SerpApi** | Set `serp_api.enabled: true` in `scripts/seo/seo.config.json` and provide `SERP_API_KEY` (in `.env` or GitHub secret). |
| **CI secrets** | In GitHub: Settings → Secrets → add `SERP_API_KEY` (and optionally `AHREFS_API_KEY`, `SEMRUSH_API_KEY`) if you want the weekly job to use them. |
| **Sitemap URL** | Default is `https://www.videotext.io`. Override in the workflow with `SITE_URL` if your site URL is different. |

---

## 6. GSC (Google Search Console)

**There is no GSC key or GSC integration in the repo.** The pipeline does not pull data from Google Search Console. GSC is used manually (URL Inspection, request indexing, Performance, Coverage) as described in [docs/SEO-DELIVERABLES.md](SEO-DELIVERABLES.md). If you add GSC API ingestion later, Google uses OAuth or a service account JSON file, not a single API key.

---

## 7. More detail

- **API keys and where to set them:** [docs/seo-api-keys.md](seo-api-keys.md)  
- **Automation overview:** [docs/seo-automation.md](seo-automation.md)
