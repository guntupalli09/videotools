# Adaptive Upload Tuning

## 1) Summary of adaptive algorithm

- **Phase 1 — Start safe:** Chunked upload starts with **5 MB** chunk size and **2** parallel requests (desktop). Mobile starts with **4 MB** and **1** parallel. Existing latency probe is still run and kept (e.g. for mobile 200MB+ and for `getConnectionProbeIfNeeded`); initial values are these safe defaults so adaptive can override after the first few chunks.
- **Phase 2 — Metrics:** For each chunk we record `startTime`, `endTime`, `uploadDuration`, `effectiveThroughputMbps`, `retryCount`, and `stallDetected` (when `uploadDuration > 2×` rolling average of previous durations). A rolling window of the first 3–4 chunk metrics is kept in an in-memory `AdaptiveState` (`avgThroughput`, `retryRate`, `chunksUploaded`, `stabilityScore`, `chunkMetrics`).
- **Phase 3 — Decision engine (after 3 successful chunks):**
  - **Upgrade (high speed):** If `avgThroughput > 25 Mbps`, `retryRate === 0`, no stalls, and not mobile → set **parallel = 3** (capped at 3). Log: "Adaptive mode: high speed". Optional UX: "High-speed mode enabled".
  - **Downgrade (congestion):** If `retryRate > 0` OR any stall OR `avgThroughput < 8 Mbps` → set **parallel = 1**. Log: "Adaptive mode: congestion control". Optional UX: "Stabilizing connection...".
  - **Caps:** Chunk size never exceeds **8 MB**, parallel never exceeds **3**; mobile parallel never exceeds **2**.
- **Phase 4 — Dynamic adjustment:** If the decision engine downgrades (or has already run), the new parallel is used **only for remaining chunks**. Upload is not restarted; chunk size and totalChunks are unchanged (server contract). Only the number of concurrent chunk requests (parallel) is reduced for the rest of the run.
- **Phase 5 — Safety:** No API route or request/response changes; no change to chunk assembly or retry mechanism; chunk resume behavior and fallbacks are unchanged.
- **Phase 6 — Optional UX:** `UploadProgressOptions.onAdaptiveStatus?(message)` is called (non-blocking) with: "Optimizing connection...", "High-speed mode enabled", or "Stabilizing connection...". Main progress UI is unchanged.

## 2) Files modified

- **`client/src/lib/api.ts`**
  - Added `onAdaptiveStatus?: (message: string) => void` to `UploadProgressOptions`.
  - Added adaptive constants, `ChunkMetric`, and `AdaptiveState` types.
  - Initial chunk/parallel set to 5 MB / 2 (desktop) and 4 MB / 1 (mobile); latency probe logic kept but initial values use these safe defaults; cap at 8 MB.
  - `uploadChunk` now returns `Promise<ChunkMetric>` and records per-chunk timing, throughput, and retry count.
  - Added `rollingAvgDuration`, `runAdaptiveDecisionEngine()`, and in-loop collection of metrics with rolling window; after 3 chunks the engine runs once and sets `currentParallel` (1 or 3, with caps).
  - Main loop uses mutable `currentParallel` and `batchSize` so remaining chunks use the updated parallelism without restarting the upload.

## 3) Confirmation no breaking changes introduced

- **API:** No changes to `/api/upload/init`, `/api/upload/chunk`, or `/api/upload/complete`; same request/response schema and usage.
- **Chunked flow:** Init still sends `totalChunks` and `chunkSize`; chunks are still sent by index with the same body/headers; complete is unchanged. Chunk size and totalChunks are **fixed for the lifetime of the upload**; only client-side concurrency (parallel) changes mid-upload.
- **Resume:** `getChunkedUploadState` / `setChunkedUploadState` and resume-by-uploadId behavior unchanged; existing chunk size is still used when resuming.
- **Retries:** Per-chunk retry count and backoff are unchanged; we only **observe** retry count for the adaptive decision.
- **Fallback:** If adaptive never runs (e.g. &lt; 3 chunks) or the engine leaves parallel unchanged, behavior is the same as before except for the new safe initial 5 MB / 2.

## 4) How congestion is prevented

- **Start safe:** Beginning at 5 MB and 2 parallel avoids overloading the path before we have data.
- **Observe retries and stalls:** Any retry (`retryRate > 0`) or stall (`uploadDuration > 2×` rolling average) triggers **congestion control**: parallel is set to 1 for all remaining chunks, reducing concurrent load and retries.
- **Low throughput:** If observed throughput drops below 8 Mbps, we also switch to 1 parallel so we don’t add more concurrent streams on a slow link.
- **Caps:** Parallel is capped at 3 (2 on mobile); chunk size is capped at 8 MB so we never send oversized chunks even when upgrading.

## 5) Worst-case fallback behavior

- **Fewer than 3 chunks:** The decision engine never runs; upload uses the initial 5 MB / 2 (or 4 MB / 1 on mobile) for the whole run. Same as a fixed safe upload.
- **Probe or metrics missing:** Initial values don’t depend on probe result for desktop (we use 5 MB / 2). If metrics are missing or incomplete, the engine doesn’t upgrade/downgrade and we keep the current `currentParallel` (initial 2).
- **Downgrade:** Once we set parallel to 1, we keep it at 1 for the rest of the upload; remaining chunks are sent one at a time, minimizing congestion and retries.
- **Resume:** Resumed uploads use the stored chunk size and initial parallel (2); adaptive can run again on the resumed run after 3 new chunks complete, so we can still downgrade if the connection is bad.
