# SEO Automation — API Keys & Where to Add Them

**None of these keys are required.** The pipeline runs with free sources only (Google suggest, YouTube suggest, Reddit). Add keys only if you want optional data from paid APIs.

---

## Optional API keys

| Key | Service | Used for | Free tier |
|-----|---------|----------|-----------|
| **SERP_API_KEY** | [SerpApi](https://serpapi.com/) | Google autocomplete / SERP / PAA (extra suggestions) | 100 searches/month |
| **AHREFS_API_KEY** | Ahrefs | Keywords (stub in repo; wire their API if you have a key) | Limited trial |
| **SEMRUSH_API_KEY** | SEMrush | Keywords (stub in repo; wire their API if you have a key) | Limited trial |

**GSC (Google Search Console):** Not implemented. There is no GSC key; the pipeline does not ingest GSC data. Use GSC manually. If you add GSC API later, Google uses OAuth or a service account JSON, not a simple key.

If a key is missing, the job logs “not configured” and skips that source; it does **not** fail.

---

## Where to add them

### 1. Local runs (e.g. `npm run seo:weekly`)

**Option A – Repo root `.env` (recommended)**  
Create or edit a file at the **repo root** (same folder as `package.json`):

```
# Optional SEO sources (leave blank to use only free sources)
SERP_API_KEY=your_serpapi_key_here
# AHREFS_API_KEY=optional
# SEMRUSH_API_KEY=optional
```

The weekly script will load this file when present. Keep `.env` out of git (it’s already in `.gitignore`).

**Option B – Environment variables in the shell**  
- **PowerShell:** `$env:SERP_API_KEY = "your_key"; npm run seo:weekly`  
- **Bash:** `export SERP_API_KEY=your_key && npm run seo:weekly`

---

### 2. GitHub Actions (CI)

Add secrets in the repo, then reference them in the workflow.

1. In GitHub: **Repo → Settings → Secrets and variables → Actions**.
2. **New repository secret** for each key you use, e.g.:
   - Name: `SERP_API_KEY`  
   - Value: your SerpApi key
3. The workflow already passes `SERP_API_KEY` into the “Run SEO weekly job” step. To use Ahrefs/SEMrush in CI as well, add secrets `AHREFS_API_KEY` and `SEMRUSH_API_KEY` and pass them in the same step (see below).

**Workflow snippet (already in `.github/workflows/seo-weekly.yml`):**

```yaml
- name: Run SEO weekly job
  run: npm run seo:weekly
  env:
    SERP_API_KEY: ${{ secrets.SERP_API_KEY }}
    # Optional: add if you set these secrets
    # AHREFS_API_KEY: ${{ secrets.AHREFS_API_KEY }}
    # SEMRUSH_API_KEY: ${{ secrets.SEMRUSH_API_KEY }}
```

---

## Enabling SerpApi in the pipeline

By default SerpApi is **off** in config. To use it:

1. Add `SERP_API_KEY` (locally in `.env` or in GitHub Secrets).
2. In **`scripts/seo/seo.config.json`**, set SerpApi to enabled:

```json
"serp_api": { "enabled": true, "env_key": "SERP_API_KEY", "cache_hours": 24 }
```

Save the file and run `npm run seo:weekly` (or let the weekly workflow run). The job will then call SerpApi in addition to the free sources.

---

## Other env vars (not API keys)

| Variable | Where | Purpose |
|----------|--------|---------|
| **SITE_URL** | Optional; e.g. `.env` or workflow | Base URL for sitemap (default: `https://www.videotext.io`). Set in the workflow for sitemap generation. |
| **SITEMAP_PING** | Optional | Set to `0` or `false` to disable pinging Google/Bing after generating the sitemap. |
| **SITEMAP_OUTPUT** | Optional | Override path for the generated sitemap file. |

---

## Summary

- **Required:** none.  
- **Optional:** `SERP_API_KEY` (and optionally Ahrefs/SEMrush) in **repo root `.env`** for local runs, and in **GitHub Actions → Secrets** for CI.  
- **Enabling SerpApi:** set `serp_api.enabled` to `true` in `scripts/seo/seo.config.json` and provide `SERP_API_KEY`.
