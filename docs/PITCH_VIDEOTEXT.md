# VideoText — Product & Pitch Document

**Purpose:** Explain the product, its structure, how it works, how we outperform competitors, all features, backend handling, current limitations, and future improvements. Use this for investors, partners, and positioning.

---

## 1. Performance: Is This Industry-Leading?

**Observed result:** 1 hour 53 minutes (113 min) of video, 705 MB, transcribed in **2 minutes 25 seconds**.

- **Realtime factor:** 113 minutes of content in 2.42 minutes of processing ≈ **47× realtime** (we process ~47 minutes of audio per minute of wall-clock time).
- **Why it’s so fast:** Long videos (≥ 2.5 min) use **parallel chunked transcription**: audio is split into ~3-minute chunks, each chunk is sent to Whisper in parallel, then segments are merged. Wall-clock time is driven by the slowest batch of chunks, not the sum of all chunks. Optional **GPU-accelerated FFmpeg** (`FFMPEG_USE_GPU=true`) speeds up audio extraction.
- **Industry context:** Many providers quote “faster than realtime” (e.g. 2–10×). Single-node Whisper on a high-end GPU often lands in the ~8–20× range for a single long file. VideoText’s **47×** is achieved by parallelizing across chunks and (when used) robust cloud Whisper capacity. For a **nearly 2-hour, 705 MB** file, this is **top-tier** and can be fairly described as **industry-leading** for a single-file, upload-based transcription product.

---

## 2. What VideoText Is

VideoText is a **professional video-utilities platform**: transcribe video to text, generate and translate subtitles, fix timing, burn captions, compress video, and batch process. We focus on **speed**, **privacy** (we don’t store your data), and **one coherent pipeline** for all tools.

- **Frontend:** React + Vite, route-level code splitting, PWA-ready, mobile-optimised uploads (chunked, retries, connection probe).
- **Backend:** Express API, Bull queue (Redis), tier-aware routing (normal vs priority queue), Stripe billing, optional PostgreSQL for users/auth.
- **Processing:** FFmpeg (audio extraction, burn, compress), OpenAI Whisper (transcription), parallel chunking for long videos, optional GPU. Result caching (same user + file + options) for instant repeat runs.

---

## 3. Solid Structure: How the Product Is Built

### 3.1 One Pipeline for All Tools

Every tool uses the same backbone:

```
Client (upload) → API (validate, enqueue) → Redis/Bull (queue) → Worker (tool pipeline) → Download
```

- **Upload:** Single file, dual file (burn), or chunked for large files. Batch = multiple files, one batch job.
- **Validation:** Plan limits (duration, size, concurrent jobs, batch limits) enforced at the API before a job is queued.
- **Queue:** Two queues when load is high: normal (all tiers) and priority (Pro/Agency when queue length > 50). Job priority by plan (Agency > Pro > Basic > Free).
- **Worker:** One worker process; per-tool `switch (toolType)` runs the right pipeline (transcription, subtitles, translate, fix, burn, compress, batch). Outputs written to temp storage; client downloads via API.
- **Cleanup:** Temp files and caches are cleared by design; we do not retain user content.

This gives **predictable behaviour**, **one place to enforce limits**, and **clear observability** (request ID, job ID, logs, Sentry).

### 3.2 Tier Limits (Single Source of Truth)

All limits live in `server/src/utils/limits.ts` and are used by API, worker, and (where relevant) client preflight:

| Tier   | Minutes/month | Max duration | Max file size | Concurrent jobs | Languages | Batch |
|--------|----------------|--------------|---------------|------------------|-----------|--------|
| Free   | 60             | 15 min       | 2 GB          | 1                | 1         | No     |
| Basic  | 450            | 45 min       | 5 GB          | 1                | 2         | No     |
| Pro    | 1,200          | 120 min      | 10 GB         | 2                | 5         | Yes (20 videos, 60 min total) |
| Agency | 3,000          | 240 min      | 20 GB         | 3                | 10        | Yes (100 videos, 300 min total) |

Paid tiers get **priority queue** when the queue is long, **higher job priority**, and (when queue ≥ 20) **tier-aware max job runtime** so one long job doesn’t block others indefinitely.

### 3.3 No Data Retention

We process files and delete them. Uploads and generated outputs are not stored for training or reuse beyond optional **result caching** (same user + same file + same options, TTL configurable). Privacy and “we don’t store your data” are in the app (Privacy, FAQ, Pricing, Home) and are a core product commitment.

---

## 4. How It Works (End-to-End)

1. **User** selects a file (or pastes a URL for transcript/subtitles) on the relevant tool page. Client runs **preflight** (duration, size) where possible.
2. **Upload:** Small files go as one multipart request; large files use **chunked upload** (init → chunk × N → complete). Server assembles one file and validates type, size, duration, and plan limits.
3. **Enqueue:** API checks **concurrent jobs** for that user and **monthly minutes** (and batch limits for batch uploads). Job is added to Bull (normal or priority queue).
4. **Worker** picks the job, runs the tool pipeline (e.g. extract audio → Whisper with optional parallel chunks → summary/chapters → export). Progress can be reported; on success, output path and download URL are set.
5. **Client** polls job status; when completed, user **downloads** the result. Usage (minutes, translated minutes) is recorded when the job completes.

For **Video → Transcript** and **Video → Subtitles**, long videos (≥ 2.5 min) use **parallel chunked transcription** (split audio into ~3 min chunks, transcribe in parallel, merge segments) so wall-clock time stays low even for 1–2 hour files.

---

## 5. How We Do It Better Than Competitors

| Dimension | VideoText | Typical competitors |
|-----------|-----------|----------------------|
| **Speed (long video)** | ~47× realtime for a 2-hour file (parallel chunking + Whisper) | Often 2–10×; many slow down or cap length for long files |
| **Single pipeline** | One upload → queue → worker → download flow for all tools; same limits and observability | Often separate products or legacy pipelines per feature |
| **Privacy** | Process and delete; no retention; no training on your content | Many retain or use data for training; unclear policies |
| **Tier clarity** | One limits module; enforced at API and worker; clear plan table | Often opaque or inconsistent limits across features |
| **Large file support** | Chunked upload, 2–20 GB by plan; no re-encode on upload | Often size caps or timeouts on big uploads |
| **Transcript value** | One transcript → Transcript, Speakers, Summary, Chapters, Highlights, Keywords, Clean, Exports (and in-app translation) | Often just raw transcript and maybe one extra view |
| **Subtitles** | SRT/VTT, multi-language ZIP, in-app translation viewer, format conversion, dedicated Translate/Fix/Burn tools | Few offer the same combination of generate + translate + fix + burn in one place |
| **Batch** | Pro/Agency: many videos in one batch, one ZIP, error log | Often enterprise-only or no batch |
| **Observability** | Request ID, job ID, structured logs, Sentry, health/ops endpoints | Varies; often limited visibility |

We combine **speed**, **privacy**, **unified architecture**, and **clear limits** in one product.

---

## 6. All Features the Tool Offers

### 6.1 Core Tools (Routes)

| Tool | Route | What it does |
|------|--------|--------------|
| **Video → Transcript** | `/video-to-transcript` | Extract speech to text (upload or URL). Optional summary, chapters, speaker diarization. |
| **Video → Subtitles** | `/video-to-subtitles` | Generate SRT/VTT from video. Multi-language (Basic+: 2, Pro: 5, Agency: 10); optional ZIP. |
| **Translate Subtitles** | `/translate-subtitles` | Translate SRT/VTT to 50+ languages; same timestamps. |
| **Fix Subtitles** | `/fix-subtitles` | Fix timing, grammar, line breaks, remove fillers. |
| **Burn Subtitles** | `/burn-subtitles` | Hardcode SRT/VTT into video (dual upload). |
| **Compress Video** | `/compress-video` | Reduce file size (web / mobile / archive profiles). |
| **Batch Processing** | `/batch-process` | Multiple videos → subtitles in one go (Pro/Agency). |

### 6.2 Video → Transcript: “Tree and Branches”

After one transcript is generated, the **Transcript** view is the trunk. These are derived **client-side** from the same data (no re-fetch):

- **Transcript** — Full text, search, edit segments, copy, export SRT/VTT. **Translate** button: view in English, Hindi, Telugu, Spanish, Chinese, Russian (cached).
- **Speakers** — Paragraphs by speaker (when structure allows).
- **Summary** — AI summary, bullets, action items.
- **Chapters** — Section headings with timestamps.
- **Highlights** — Definitions, conclusions, quotes.
- **Keywords** — Repeated terms linked to sections.
- **Clean** — Fillers removed, casing normalized; original in Transcript.
- **Exports** — TXT, JSON, CSV, Markdown, Notion; paid for full export (e.g. DOCX, PDF).

### 6.3 Video → Subtitles Extras

- Output **SRT** or **VTT**; multi-language → **ZIP**.
- **“View in another language”** — in-app translation of cue text (reading/copy); for translated *files* use Translate Subtitles or multi-language output.
- **Convert format** — SRT ↔ VTT ↔ TXT without re-uploading video.
- Validation **warnings** (e.g. long lines, gaps) returned when relevant; processing still completes.

### 6.4 Other Capabilities

- **URL input** for Video → Transcript and Video → Subtitles (we download then process).
- **Trim** (start/end) before processing to save time and usage.
- **Result caching** — same user + file + options returns cached result within TTL (configurable).
- **Chunked upload** — reliable for large files and mobile; retries and “slow connection” handling.
- **PWA** — static assets precached; API never cached.
- **Auth** — Email + OTP before checkout; login with email + password after purchase; JWT for API.

---

## 7. How It’s Handled in the Backend

- **API (Express):** Upload routes (single, dual, chunked, batch), job enqueue, usage/limits checks. Auth (OTP, login, JWT). Stripe webhooks for plan and subscription. Health/ops: `/healthz`, `/readyz`, `/version`, `/configz`, `/ops/queue`.
- **Queue (Bull + Redis):** Two queues when busy: normal and priority. Concurrency configurable per queue. Job payload: toolType, filePath(s), userId, plan, options.
- **Worker:** `videoProcessor.ts` — `processJob()` switches on `toolType`, runs the right service (transcription, subtitles, translation, fix, burn, compress, batch), writes output to temp, updates job result, records usage. Optional **tier-aware max runtime** when queue is long.
- **Transcription:** `transcription.ts` — For video ≥ 2.5 min: extract audio (FFmpeg), split into ~3 min chunks, `Promise.all` Whisper per chunk, merge segments. Shorter video: single Whisper call. Same result shape.
- **FFmpeg:** Audio extraction (16 kHz mono for Whisper), burn subtitles, compress video. Optional GPU via `FFMPEG_USE_GPU`.
- **Translation:** OpenAI (or configured provider) for transcript and subtitle translation; multi-language subtitles in parallel where applicable.
- **Limits:** `limits.ts` is the source of truth; used in upload, batch, and worker. Metering (minutes, translated minutes, overage) applied when jobs complete.

---

## 8. Current Limitations

- **Concurrent jobs:** Free/Basic: 1; Pro: 2; Agency: 3. More parallel jobs would require higher concurrency and possibly more workers.
- **Max duration per file:** 15 min (Free) up to 4 h (Agency). Longer content must be split by the user or we’d need to raise/relax limits.
- **Max file size:** 2–20 GB by plan. Very large single files are constrained by upload time and disk on the worker.
- **Batch:** Only Pro/Agency; Free/Basic have no batch. Batch max videos and total duration are fixed per plan.
- **Languages:** Max 1 (Free) to 10 (Agency) for multi-language subtitles; in-app transcript translation is a fixed set (e.g. 6 languages).
- **Storage:** We don’t store content; no “library” or long-term project storage. Everything is process-and-download.
- **Real-time / live:** Not supported; upload (or URL) then process. No live streaming transcription.
- **Custom vocab / branding:** No custom models or branded engines; we rely on Whisper + optional prompt/glossary.
- **Dependency:** Transcription depends on OpenAI Whisper API; availability and cost are external.

---

## 9. Future Possible Fixes and Improvements

- **Higher concurrency:** More worker processes or more jobs per worker for Pro/Agency to reduce wait time under load.
- **Longer max duration / larger files:** Raise limits for Agency (or new tier) and ensure worker disk and time limits allow it.
- **Resumable uploads:** True resumable chunked upload (e.g. TUS or similar) for flaky networks and very large files.
- **Live / streaming transcription:** Separate product or tier for real-time or near-real-time transcription (different architecture).
- **Custom vocabulary / fine-tuning:** Optional custom glossary or domain-specific tuning for accuracy (within provider limits).
- **Project / library:** Optional “projects” with short-lived storage and re-use of past transcripts (with clear retention and privacy rules).
- **More languages:** Expand in-app translation set and multi-language subtitle targets.
- **Batch UX:** Progress per video, partial download, retry failed items without re-uploading the whole batch.
- **Cost and resilience:** Evaluate additional or fallback transcription providers to reduce dependency on a single API and to optimise cost at scale.
- **Self-serve analytics:** Per-user or per-team usage and cost views (without exposing other users’ data).

---

## 10. One-Liner and Taglines

- **One-liner:** “VideoText is a professional video-utilities platform: transcribe, subtitle, translate, fix, burn, and compress in one place—with industry-leading speed and no data retention.”
- **Speed:** “Transcribe a 2-hour movie in under 2.5 minutes.”
- **Privacy:** “We process your files and delete them. We don’t store your data.”
- **Structure:** “One pipeline, one limits engine, one product—built for reliability and scale.”

Use this document as the single source for product narrative, competitor comparison, and roadmap context.
