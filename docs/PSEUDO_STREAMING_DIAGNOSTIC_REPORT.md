# Pseudo-Streaming Diagnostic Report

**Purpose:** Understand why users only see live transcript for ~5–6 seconds and why progress appears as 0 → 25 → 55 → 100.  
**Scope:** Analysis and reporting only. No code changes, refactors, or optimizations.

---

## PART 1 — Backend Timing Analysis

### Sources

- `server/src/services/transcription.ts`
- `server/src/workers/videoProcessor.ts`

### 1. When exactly is `job.progress(...)` called?

**video-to-transcript** (videoProcessor.ts):

| Order | Progress value | When |
|-------|-----------------|------|
| 1 | 5 | Start of job (before any tool-specific work). |
| 2 | 12 | Only if trim is applied (after `trimVideoSegment`). |
| 3 | 15 | After `validateVideoDuration`. |
| 4 | 22 | Only in diarization path, before `transcribeWithDiarization`. |
| 5 | 25 | In verbose path (summary/chapters/export), **before** `transcribeVideoVerbose`. |
| 6 | 30 | Only in plain path (no summary/chapters), before `transcribeVideo`. |
| 7 | 55 | **After** transcription finishes, before summary/chapters. |
| 8 | 70 | After summary/chapters, before export formats. |
| 9 | 75 | After export formats, before ZIP. |
| 10 | 100 | At end of `processJob`, after result is built. |

There is **no** `job.progress()` call during the transcription call itself. Progress is set to 25 (or 22/30) before transcription and to 55 only after it completes.

### 2. What progress values are set and at what logical stages?

- **0:** Initial/client state or before first progress update.
- **5:** Job started.
- **12:** Post-trim (optional).
- **15:** Duration validated.
- **22 / 25 / 30:** Pre-transcription (path-dependent).
- **55:** Transcription done; pre–summary/chapters.
- **70–75:** Post–summary/chapters and exports.
- **100:** Job completed.

So the **0 → 25 → 55 → 100** pattern is: start → pre-transcription → post-transcription → post-summary/exports → done. The long gap is between 25 and 55 (entire transcription).

### 3. During parallel transcription

**When does each chunk complete?**  
Chunks are run with `Promise.all` in `transcribeVideoParallel`. Each chunk is up to `CHUNK_DURATION_SEC` (180 s). Completion order is non-deterministic (Whisper latency per chunk).

**When is `onPartial` invoked?**  
Only when a chunk completes **and** it extends the contiguous prefix:

- `resultsByIndex[i] = segs` is set when chunk `i` finishes.
- `k` = highest index such that `resultsByIndex[0..k]` are all defined.
- If `k > lastContiguousK`, then `onPartial(mergeContiguousSegments(resultsByIndex, k))` is called and `lastContiguousK = k`.

So partials are emitted only when the “contiguous tip” moves (chunk 0, then 1, then 2, …). Out-of-order completions (e.g. chunk 2 before 0) do **not** trigger a partial until chunk 0 (and then 1) have completed.

**How many partial writes for a typical long video?**

- **Short video (< 150 s):** Uses single-call path in `transcribeVideoVerbose`. **One** `onPartial` call, after the single Whisper response returns (no partials during the request).
- **Long video (≥ 150 s):** Uses `transcribeVideoParallel`. Number of partials = number of chunks that complete in order and extend the prefix. With 180 s chunks: e.g. 3 min → 1 chunk (1 partial); 20 min → 7 chunks (up to 7 partials); 60 min → 20 chunks (up to 20 partials). Each partial is at most one “contiguous prefix” update (one per chunk index 0, 1, 2, …).

### 4. Does progress change during chunk completion?

**No.** Progress is **not** updated during transcription. It stays at 25 (or 22/30) for the whole transcription phase and jumps to 55 only after `transcribeVideoVerbose` / `transcribeVideo` returns. So chunk completions do not move the progress bar.

### 5. Is there any interpolation between chunk completions?

**No.** There is no progress interpolation. Progress is only set at the fixed steps listed above.

---

### Step-by-step lifecycle timelines

**Short video (single chunk, &lt; 150 s, e.g. 2 min):**

```
T0   → upload complete; job starts
T1   → progress 5
T2   → progress 15 (duration validated)
T3   → progress 25 (verbose path)
T4   → transcribeVideoVerbose runs: extractAudio → single Whisper API call (blocking, ~30–90+ s)
T5   → Whisper returns; onPartial(segments) called once → pushed to partialWriter queue
T6   → drain writes one payload to Redis (partialVersion 1, partialSegments)
T7   → progress 55 (transcription done)
T8   → progress 70, 75 (summary/chapters/export)
T9   → progress 100; partialWriter.closeAndFlush(); deleteJobPartial
```

So for short video: **one** partial write, at the very end of transcription. The client can only start seeing “live” transcript after T6, and the job typically completes shortly after (T7–T9), so the “live” window is short.

**Long video (parallel chunks, ≥ 150 s, e.g. 20 min):**

```
T0    → upload complete; job starts
T1    → progress 5, 15, 25
T2    → extractAudio, splitAudioIntoChunks (e.g. 7 chunks)
T3    → Promise.all(transcribeChunkVerbose × 7) — all running in parallel
T4    → first chunk (e.g. chunk 0) completes → onPartial(prefix 0) → drain writes to Redis
T5    → next chunk (e.g. chunk 1) completes → onPartial(prefix 0..1) → drain writes
…     → further chunks complete in arbitrary order; partial only when contiguous k increases
T6    → last chunk completing and contiguous k reaches N-1 → last onPartial
T7    → Promise.all resolves; progress 55
T8    → progress 70, 75, 80, 100; closeAndFlush; deleteJobPartial
```

Progress does not move between T1 and T7. Partials appear at T4, T5, … T6, but the **progress bar stays at 25** until T7.

---

## PART 2 — Redis Partial Timing

### Source

`server/src/utils/jobPartial.ts` (`createPartialWriter`, drain loop, `setJobPartial`).

### 1. How often is `createPartialWriter.onPartial` called?

- **Short video (single-call path):** Once, when the single Whisper response is received and segments are available.
- **Long video (parallel path):** Up to once per chunk, and only when that chunk extends the contiguous prefix (so at most N times for N chunks). Timing follows chunk completion order (and ordering constraint), not a fixed interval.

So it is **event-driven** (chunk/single-call completion), not time-based.

### 2. Does partial writing wait for chunk group?

Yes, in the sense that:

- In **parallel** path: a partial is only emitted when the contiguous prefix grows (chunk 0, then 0+1, then 0+1+2, …). So each write is “one more chunk’s worth” of segments, not a raw single-chunk result.
- The **drain** is sequential: each `onPartial` pushes one payload to `pendingWrites`; the drain loop processes them one at a time and calls `setJobPartial` for each. So writes are serialized per job.

### 3. Is there batching?

No. Each `onPartial(segments)` produces one payload (version increment, one segment list). The drain does not merge multiple `onPartial` calls into one Redis write; it writes each payload as soon as it is shifted from `pendingWrites`. So one `onPartial` → one Redis SET (after previous writes have been flushed).

### 4. Is flush happening immediately or delayed?

- **Per write:** Each payload is written to Redis as soon as the drain loop picks it from `pendingWrites`. There is no deliberate delay.
- **At job end:** `closeAndFlush()` sets `closed = true`, wakes the drain if it was waiting, and awaits `drainDonePromise` so all pending writes complete before the job continues. So flush is “immediate” in the sense of no extra delay; the only delay is the drain processing queue and Redis latency.

### Typical partial update counts

- **3-minute video:** &lt; 150 s → single-call path → **1** partial (at end of transcription).
- **20-minute video:** 7 chunks (180 s each) → up to **7** partials (one per contiguous prefix update).
- **60-minute video:** 20 chunks → up to **20** partials.

Actual count for long videos can be lower if the client stops polling (e.g. job completes) before all contiguous updates are written and read.

---

## PART 3 — Client Polling Timeline

### Sources

- `client/src/pages/VideoToTranscript.tsx` (doPoll, partialSegments, status)
- `client/src/lib/jobPolling.ts` (interval, lifecycle)

### 1. Poll interval

`JOB_POLL_INTERVAL_MS = 1500` (1.5 s). Polling is `setInterval(doPoll, 1500)` plus an immediate `doPoll()` after upload response.

### 2. When does doPoll run first?

Immediately after `uploadFileWithProgress` returns: `doPoll()` is called once, then `setInterval(doPoll, 1500)` schedules subsequent polls. So first poll is at T+0 (relative to “processing” phase start).

### 3. What happens when `response.status === 'processing'`?

- `setProgress(jobStatus.progress ?? 0)`.
- If `jobStatus.partialVersion != null` and `jobStatus.partialVersion > lastPartialVersionRef.current`:  
  `lastPartialVersionRef.current = jobStatus.partialVersion` and `setPartialSegments(jobStatus.partialSegments ?? [])`.
- Lifecycle is driven by `getJobLifecycleTransition(jobStatus)`; for `'processing'` the transition is `'continue'`, so polling continues. No transition to completed/failed.

So while status is `'processing'`, the client updates progress and, when the API returns a higher `partialVersion`, updates the live transcript (`partialSegments`).

### 4. How often does partialSegments state update?

Only when a poll response has `status === 'processing'` and `partialVersion > lastPartialVersionRef.current`. So:

- Update frequency is at most every **1.5 s** (poll interval).
- Updates only occur when the backend has written a new partial to Redis and the client has polled after that write. So the effective cadence is: backend writes partial → next poll (within 0–1.5 s) → state update.

For a short video with one partial at the end, there is at most **one** such update. For long videos, one update per new partial, bounded by poll interval and drain/Redis speed.

### 5. At what point does transcript UI become visible?

The “Live transcript” block is rendered when `uploadPhase === 'processing' && partialSegments.length > 0` (VideoToTranscript.tsx). So it becomes visible on the first poll response that has `partialSegments.length > 0` (and `partialVersion` greater than the ref). That can only happen after the backend has called `onPartial` at least once and the drain has written it to Redis, and the client has polled after that.

### 6. When does status flip to 'completed'?

When `getJobLifecycleTransition(jobStatus) === 'completed'`, i.e. when `jobStatus.status === 'completed'`. Then the client:

- Stops the interval.
- Sets `savedScrollTopRef.current` from the partial scroll container.
- Clears partial: `setPartialSegments([])`.
- Sets `setStatus('completed')` and `setResult(jobStatus.result)`.

So the moment the backend marks the job completed and the client receives that in a poll, the partial area is cleared and the success state is shown.

### Is partial UI visible before 55% progress or only after?

It can be visible **before** the client ever sees 55%:

- Backend: partials are written when chunks (or the single call) complete; progress is set to 55 only **after** transcription returns. So Redis can already have partial data while progress is still 25.
- Client: it displays partial whenever the poll returns `partialVersion`/`partialSegments` with a newer version. So the user can see “live transcript” while progress is still 25 (e.g. long video: first chunk done → partial in Redis → client shows it; progress remains 25 until all chunks are done).

So: partial UI can be visible before 55%. The “0 → 25 → 55 → 100” progress jump is independent of when partials appear; the jump to 55 happens only when the entire transcription phase is done.

---

## PART 4 — UI State Transitions

### 1. When does the partial block appear?

When **both**:

- `uploadPhase === 'processing'`, and  
- `partialSegments.length > 0`,

the “Live transcript” block is shown (with “Live transcript” heading and segment list). So it appears after the first poll that returns a newer `partialVersion` and non-empty `partialSegments`.

### 2. When is the spinner visible?

The `Loader2` spinner and processing copy are shown whenever `status === 'processing'` (inside the `status === 'processing'` block). So from the first moment the job is in processing until transition to completed or failed.

### 3. When does success state replace processing?

On the first poll where `jobStatus.status === 'completed'`. Then the client sets `status` to `'completed'`, sets `result`, and the UI switches to the success block (SuccessState, branch bar, transcript card, etc.). So it’s an immediate switch on that poll.

### 4. Does the partial area disappear instantly on completion?

Yes. On transition to `'completed'`, the client calls `setPartialSegments([])`. The conditional `uploadPhase === 'processing' && partialSegments.length > 0` becomes false (status is no longer `'processing'`), so the “Live transcript” block unmounts and the completed transcript view is shown. There is no separate delay or fade for the partial area.

### 5. Is there any animation that hides the partial quickly?

No. The partial block is conditionally rendered; when `partialSegments` is cleared and status is `'completed'`, it simply stops rendering. No CSS transition or animation is applied to the partial block.

---

## PART 5 — Root Cause Identification

### Why users only see ~5–6 seconds of “live” transcript

**Mechanical cause:**

1. **Short videos (majority of cases, &lt; 2.5 min):**  
   - There is **no** streaming from Whisper. The single-call path runs one blocking `transcriptions.create()` and calls `onPartial` **once**, only after the full response is received.  
   - So the first (and only) partial is written to Redis at the **end** of transcription.  
   - The client then has a short window: it may get that partial on the next poll (0–1.5 s later), then 1–2 more polls while the backend does summary/chapters/export (progress 55 → 70 → 75 → 100). As soon as the job completes, the next poll returns `status: 'completed'`, the client clears `partialSegments`, and the “Live transcript” block disappears.  
   - So the “live” transcript is visible for roughly **one to three poll cycles** (1.5–4.5 s) plus any delay until the first poll after the partial write. That aligns with **~5–6 seconds** of visible live transcript.

2. **Long videos:**  
   - Partials are emitted only when chunks complete and extend the contiguous prefix. Progress stays at 25 for the whole transcription.  
   - If most chunks complete in a short window (e.g. similar Whisper latency), many partials can land in Redis close together; the client might see the “live” block grow for a bit, then completion. If the user’s experience is still “only a few seconds,” it can be because:  
     - They are actually using short videos (single partial at end), or  
     - Completion happens soon after the first few partials (e.g. last chunks finishing quickly), so the UI flips to completed and clears the partial block after a short visible period.

So the **primary** cause is: **partials are produced only at chunk (or single-call) completion, not during transcription.** For short videos, that means exactly one partial at the end, so the “live” window is the few seconds between that write and job completion.

### Why progress appears as 0 → 25 → 55 → 100

- **0:** Initial state or first poll before progress 5 is persisted/read.  
- **25:** Set once before transcription starts (verbose path).  
- **55:** Set once after transcription finishes (before summary/chapters).  
- **100:** Set at job completion.

There is **no** progress update during transcription and **no** interpolation. So the bar stays at 25 for the entire transcription phase (which can be tens of seconds to minutes), then jumps to 55 and quickly to 100. That exactly matches the observed **0 → 25 → 55 → 100** behavior.

### Contributing factors (no fixes proposed)

- **Progress jumps:** Progress is only updated at fixed steps; the long 25→55 gap is by design.  
- **Chunk clustering:** In parallel path, partials are tied to contiguous chunk completion; no per-segment or time-based streaming.  
- **Finalization speed:** After transcription, summary/chapters/export and progress 55→100 are relatively fast, so the job completes soon after the last partial.  
- **UI transition:** On `status === 'completed'`, the client immediately clears partials and shows the final transcript; no extended “live” phase.  
- **Poll frequency:** 1.5 s limits how quickly new partials are seen; it does not by itself shorten the live window—the main limit is that partials are written only at completion points.  
- **Partial flush timing:** Drain writes each partial as soon as it’s dequeued; the dominant effect is **when** `onPartial` is called (only at chunk/single-call completion), not flush delay.

---

## OUTPUT FORMAT SUMMARY

### 1. Timeline diagram (short video, typical “5–6 second” live window)

```
[Client]                    [Backend]
   |                              |
   |  poll (progress 0 or 5)      |
   |  poll (progress 25)          |  progress 25, transcribeVideoVerbose() running
   |  poll (progress 25)          |
   |  ...                         |  Whisper single call (30–90+ s)
   |  poll (progress 25)          |
   |                              |  Whisper returns → onPartial() → drain → Redis
   |  poll (progress 25,           |
   |    partialVersion 1)         |  ← first time client sees "Live transcript"
   |  → partial block visible     |
   |  poll (progress 55, 70…)     |  progress 55, summary/chapters, progress 100
   |  poll (status completed)     |
   |  → partial cleared,          |
   |    success state             |
```

The “live” transcript is visible from the first poll that returns partials until the poll that returns `status: 'completed'` (roughly 1.5–6 s depending on timing).

### 2. Identified bottleneck

- **Primary:** Partials are emitted only at **transcription completion** (single call) or **chunk completion** (parallel). There is no streaming or incremental partial during an active Whisper request.  
- **Secondary:** For short videos, a single partial at the very end plus fast post-transcription steps (55→100) and immediate UI switch on completion yields a short visible “live” window.

### 3. Root cause (mechanical)

- **Single-call path:** One `onPartial` at the end of the Whisper response → one Redis write → client can show it for only a few poll cycles before the job completes and the client clears partials.  
- **Parallel path:** Partials are driven by contiguous chunk completion; progress does not move during transcription (stays at 25), and there is no finer-grained or time-based partial updates.

### 4. Layer responsible

- **Worker/transcription:** Defines **when** partials exist (only at single-call or chunk completion; no streaming).  
- **Worker progress:** Defines the 25→55 jump (no updates during transcription).  
- **Client/UI:** Clears partial and switches to success as soon as `status === 'completed'` (no retention or animation).  

So the **mechanical** cause is mostly **backend**: when and how often `onPartial` is called and when progress is set. The **short visible window** is then the combination of that with **client** behavior (immediate clear on completion).

### 5. Estimated fix categories (for later; no implementation here)

- **Progress interpolation:** Worker could report progress between 25 and 55 based on chunk completion or estimated progress (would not by itself lengthen “live” transcript time).  
- **UI pacing:** Client could keep showing the last partial for a short time after completion, or animate transition (would only change perception, not when partials exist).  
- **Backend change:** True “live” transcript would require either Whisper streaming (if available) or more frequent partials (e.g. time-sliced or segment-based updates during transcription), plus possible progress updates during transcription.  
- **Polling change:** Shorter interval would only reduce latency to the next partial; it would not create more partials or extend the backend “live” window.

---

*End of diagnostic report. No code changes or implementation implied.*
