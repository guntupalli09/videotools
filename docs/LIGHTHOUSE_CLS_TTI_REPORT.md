# Lighthouse Report — CLS, Layout Shift, TTI

**Run date:** 2026-02-25  
**Lighthouse version:** 12.3.0  
**Environment:** Local dev server, headless Chrome  
**URLs:** http://localhost:3000 (VideoToTranscript, VideoToSubtitles, Pricing)

---

## Pages audited

| Page | URL | Report file |
|------|-----|-------------|
| VideoToTranscript | http://localhost:3000/video-to-transcript | `client/lighthouse-video-to-transcript.json` |
| VideoToSubtitles | http://localhost:3000/video-to-subtitles | `client/lighthouse-video-to-subtitles.json` |
| Pricing | http://localhost:3000/pricing | `client/lighthouse-pricing.json` |

---

## Results summary

### Cumulative Layout Shift (CLS)

| Page | CLS (numericValue) | displayValue | Score (0–1) | Pass (≤0.1)? |
|------|--------------------|--------------|-------------|--------------|
| VideoToTranscript | 0.458 | 0.458 | 0.19 | **No** |
| VideoToSubtitles | 0.476 | 0.476 | 0.18 | **No** |
| Pricing | 0.476 | 0.476 | 0.18 | **No** |

**Conclusion — No CLS / No layout shift:** **Not confirmed.** All three pages have CLS above the recommended 0.1 threshold. Layout shift is present on all audited pages.

---

### Time to Interactive (TTI)

| Page | TTI (ms) | displayValue | Score (0–1) |
|------|----------|--------------|-------------|
| VideoToTranscript | 32,331 | 32.3 s | 0 |
| VideoToSubtitles | 31,496 | 31.5 s | 0 |
| Pricing | 28,852 | 28.9 s | 0 |

**Conclusion — No TTI regression:** No prior TTI baseline was available in this repo, so regression cannot be measured. Current TTI is high (28–32 s) on all three pages in the local dev run; scores are 0. This is typical for unoptimized dev builds and heavy JS; production builds and real-user conditions would need a separate baseline for regression checks.

---

### Layout-shifts audit (diagnostic)

The “Avoid large layout shifts” (layout-shifts) audit failed with a Lighthouse internal error on VideoToSubtitles and Pricing:

`Required RootCauses gatherer encountered an error: Cannot read properties of undefined (reading 'frame_sequence')`

So detailed layout-shift elements were not reported for those runs. CLS values above still indicate layout shift occurred.

---

## Confirmation checklist (as requested)

| Check | Result |
|-------|--------|
| No CLS | **Not confirmed** — CLS 0.46–0.48 on all three pages (> 0.1). |
| No layout shift | **Not confirmed** — Same CLS values indicate layout shift. |
| No TTI regression | **Cannot confirm** — No baseline; current TTI 28–32 s, no comparison. |

---

## Artifacts

- `client/lighthouse-video-to-transcript.json`
- `client/lighthouse-video-to-subtitles.json`
- `client/lighthouse-pricing.json`

Run with:

```bash
npx lighthouse http://localhost:3000/<path> --output=json --output-path=./lighthouse-<name>.json --chrome-flags="--headless=new --no-sandbox" --quiet
```

No application code was changed for this audit.

---

## Production build re-run (video-to-transcript)

Per request, production was tested to confirm whether CLS/TTI are dev-only or real:

- **Commands:** `npm run build` → `npx serve -s dist -l 5000` → `npx lighthouse http://localhost:5000/video-to-transcript ...`
- **Report:** `client/lighthouse-prod-video-to-transcript.json`

| Metric | Dev (localhost:3000) | Production (localhost:5000) |
|--------|----------------------|----------------------------|
| CLS    | 0.458                | **0.458** (unchanged)      |
| TTI    | 32.3 s               | **4.6 s** (score 0.81)     |

**Conclusion:** CLS ~0.46 is **real in production**, not dev noise. TTI 28–32 s was dev noise; production TTI is acceptable (~4.6 s). See **`docs/CLS_ROOT_CAUSE_ANALYSIS.md`** for ranked CLS causes and primary fix (fonts, route transition, images).

---

## Post–route-transition fix (opacity-only, no transform)

After removing `translateY` from the route transition (opacity-only animation in `index.css`), production was rebuilt, served, and Lighthouse run again on the same URL.

- **Commands:** `npm run build` → `npx serve -s dist -l 5000` → `npx lighthouse http://localhost:5000/video-to-transcript ...`
- **Report:** `client/lighthouse-prod-video-to-transcript.json`

| Metric | Before fix | After route-transition fix |
|--------|------------|----------------------------|
| CLS    | 0.458      | **0.458** (unchanged)      |
| TTI    | 4.6 s      | (not re-checked)           |

**Conclusion:** The route-transition-only change did **not** reduce CLS. Remaining CLS is likely from **fonts** (Google Fonts + `font-display: swap`) and **images without dimensions** (Hero, Unsplash). Next steps: font loading (e.g. `font-display: optional` or preload) and explicit width/height (or aspect-ratio) on images.
