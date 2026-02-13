# Benchmarks for Advertising

This document describes how to run benchmarks for VideoText so you can cite **reproducible, honest numbers** in ads, landing pages, and Product Hunt.

---

## What we measure

| Metric | Meaning | Use in ads |
|--------|--------|------------|
| **Upload time** | Time from start of upload to job accepted (depends on file size and your connection). | Usually omit; focus on processing. |
| **Processing time** | Server time from file received to transcript/subtitles ready (audio extraction + Whisper). | **Primary:** e.g. “10 min video transcribed in under 2 min.” |
| **Total time** | Upload + queue wait + processing. | “End-to-end in under X min” (specify file size or duration). |
| **Faster than real time** | Ratio = video duration ÷ processing time. | “Transcribe up to ~5× faster than real time.” |

Processing time is **independent of upload**: it depends on **video duration** and server load, not file size. So “X min of video in Y s” is the fairest comparison.

---

## How to run benchmarks

### 1. Video → Transcript

**Prerequisites:** Node 18+, server running (local or deployed), Redis (if your app uses it).

```bash
# From repo root
export API_ORIGIN=http://localhost:3001   # or your deployed API
node scripts/benchmark-runner.js path/to/sample.mp4
```

Optional: save JSON and run several times for averages:

```bash
node scripts/benchmark-runner.js --out benchmark-results.json path/to/sample.mp4
```

**Output:** JSON with `uploadMs`, `totalMs`, `processingMs`, `videoDurationSeconds`, and a one-line summary (e.g. “~4.2x faster than real time”).

### 2. Sample test files

- Use **short clips** (1–5 min) for quick iteration; use **longer clips** (10–30 min) for “real world” numbers.
- Prefer **speech-heavy** content (interviews, talks); avoid music-only or silence.
- Format: MP4 (H.264) or WebM; the pipeline extracts audio and uses Whisper, so resolution matters less than duration.

If you don’t have a sample, you can record a 1–2 min voice clip on your phone and export as MP4, or use a royalty-free clip from a stock site.

### 3. Frontend / load performance

For **“Fast load”** or **“Lighthouse”** claims:

- Build the client: `cd client && npm run build`
- Serve the build (e.g. `npx serve dist`) or deploy to staging.
- Run Lighthouse (Chrome DevTools → Lighthouse) for Performance; cite **First Contentful Paint (FCP)** and **Largest Contentful Paint (LCP)**.
- Our stack: route-level code splitting, PWA precache, no API caching for correctness — see `docs/FRONTEND_BENCHMARK.md`.

---

## Methodology (for transparency)

- **Processing time** is measured **on the server** from “file received” to “transcript/subtitles ready” (no queue wait in the number; queue wait is part of “total time”).
- **Environment:** Results depend on server CPU, Redis, and OpenAI API latency. Run on your **production-like** environment (or a dedicated benchmark instance) and state it in ads (e.g. “on our production servers”).
- **Reproducibility:** Run the same file 2–3 times; use median or average. Cache may make repeat runs faster; for “cold” numbers, use a new file or clear cache between runs if you need to show first-run performance.

---

## Suggested advertising copy

Use these as templates; replace placeholders with **your actual benchmark results**.

### Short (taglines)

- “Transcribe video up to **X× faster than real time**.” (Use your ratio, e.g. 4×.)
- “**10 minutes of video** transcribed in **under 2 minutes**.” (Use your duration → time.)
- “Fast transcription, instant preview, no data stored.”

### Medium (landing / Product Hunt)

- “We benchmark our pipeline on real speech: a **10‑minute video** is typically transcribed in **under 2 minutes** on our servers (upload time depends on your connection).”
- “VideoText is built for speed: **route-level code splitting**, **PWA precache**, and **chunked uploads** so the app stays fast even on mobile.”

### Honest disclaimers (recommended)

- “Benchmarks run on our production-like infrastructure; your upload time depends on your connection and file size.”
- “Processing time is server-side (audio extraction + AI); total time includes upload and queue.”

---

## Where numbers come from in code

- **Server processing time:** `server/src/workers/videoProcessor.ts` — we log `[PROCESSING_TIMING]` and include `processingMs` and `videoDurationSeconds` in the job result for Video → Transcript and Video → Subtitles.
- **Benchmark script:** `scripts/benchmark-runner.js` — uploads a file, polls until done, and reports `uploadMs`, `totalMs`, `processingMs`, `videoDurationSeconds`, and a “faster than real time” ratio.
- **Upload timing (client):** `client/src/lib/api.ts` logs `[UPLOAD_TIMING]` with `upload_duration_ms`; useful for internal analysis, not required for the advertised processing benchmark.

---

## Checklist before publishing numbers

- [ ] Run `scripts/benchmark-runner.js` on at least one representative file (e.g. 5–10 min speech).
- [ ] Note environment (e.g. “Hetzner CX31, OpenAI Whisper”).
- [ ] Use median or average of 2–3 runs if you want a stable number.
- [ ] Add a short disclaimer where you cite the benchmark (e.g. “on our servers, 10 min video; your results may vary with file and connection”).

Using this flow, you can confidently advertise “fast transcription” with numbers that are reproducible and honest.
