# Pseudo-Streaming Plan (Option B) — Critical Validation

**Purpose:** Adversarial review. No implementation. No plan rewrite. Validation only.

---

## SECTION 1 — Parallel Chunk Ordering Validation

### Current implementation (transcription.ts)

- `transcribeVideoParallel`: `chunkPaths.map((chunkPath, i) => transcribeChunkVerbose(chunkPath, i * offsetStep, ...))` → `Promise.all(...)` → `results.flat().sort((a, b) => a.start - b.start)`.
- Chunks are sent to Whisper in parallel. **Completion order is non-deterministic**: chunk 2 can finish before chunk 1; chunk 0 (0–180s) can finish last.
- Merge happens **once**, after **all** chunks complete, and uses `sort((a,b) => a.start - b.start)`, so the **final** result is always chronological.

### If partial segments are flushed as chunks complete

- **Yes — segments can arrive out of chronological order.** If the worker writes to Redis after each chunk completes, the order of writes is completion order, not time order. So the “partial” view might show e.g. 180–360s before 0–180s. Any client that displays partial in arrival order will show **later** content above **earlier** content until the next poll (or forever if we only append).
- **UX consequences:** Transcript appears to “jump” or show a later section then fill in the beginning; users may think the transcript is wrong or broken. For 1-hour video with ~20 chunks, the effect is pronounced. Reading order is destroyed.
- **Safest mitigation strategies:**
  1. **Sort on server before write:** When flushing partial to Redis, merge new chunk segments with existing partial and **sort by `start`** before storing. Then every GET returns chronological partial. Requires worker to read-modify-write Redis (or maintain in-memory merged+sorted list and write that). Race: two chunk callbacks could still write in wrong order; need a single writer (e.g. sequential flush from one loop) or version/sequence so GET only uses the latest full snapshot.
  2. **Sort on client:** Client always sorts `partialSegments` by `start` before rendering. Simple and fixes order, but if server sends overlapping or duplicate segments (e.g. two chunks with same start range due to bug), client sort doesn’t dedupe. Prefer server as source of sorted truth.
  3. **Sequential partial processing:** Don’t flush per chunk from the parallel path. Instead, run chunks **sequentially** for the “partial streaming” path: process chunk 0 → flush → chunk 1 → flush → … Then partial is always chronological. **Downside:** Total time to completion increases (no parallel speedup for the partial stream). Plan’s “progressive merge” assumes parallel + flush; that directly creates out-of-order risk.
- **Is sequential partial safer than parallel partial streaming?** **Yes.** Sequential partial guarantees chronological order and avoids read-modify-write races in Redis. Trade-off: longer time to first partial and longer total processing time unless you keep parallel for “final” and add a separate sequential “partial” pipeline (complex and duplicate work). Recommendation: if you keep parallel, **must** sort (and ideally dedupe) on server before every partial write, and serialize writes (e.g. one async queue per job) so no two chunk callbacks write interleaved.

---

## SECTION 2 — Payload & Memory Stress Test

**Assumptions:** 1-hour video, 8,000+ segments, poll every 1.5 s.

### Redis memory growth

- ~8,000 segments × ~80–150 bytes each (start, end, text) ≈ **640 KB–1.2 MB per job** for full partial. 50 concurrent long jobs → **32–60 MB** in Redis for partial alone. Plan’s “100 KB” cap for response implies trimming; if worker still writes “full partial” to Redis, Redis holds the full set until TTL. So: **cap what’s written to Redis too** (e.g. last 500 segments or 100 KB), not only what GET returns. Otherwise Redis becomes a memory risk under load.
- **Proposed hard cap:** Store in Redis at most 500 segments or 100 KB per job; worker trims before write. TTL 1 hour. Monitor Redis memory per key pattern.

### GET /api/job payload size

- Plan caps response at 500 segments or 100 KB. 500 segments × ~120 bytes ≈ **60 KB** per poll. Poll every 1.5 s → **40 KB/s** sustained per active job. Acceptable for desktop; on mobile networks, 60 KB every 1.5 s can add latency and battery cost.
- **Proposed hard cap:** 500 segments **and** 80 KB total partial payload in response. Reject or trim further if over.

### JSON serialization overhead

- Server serializes `partialSegments` (and optional `partialTranscript`) on every GET for every polling client. Under 100 concurrent polls/s for long jobs, that’s non-trivial CPU. Use a single JSON.stringify of a pre-built object; avoid building large arrays repeatedly. Consider caching the last partial response per job (e.g. in Redis as a string) and returning it if unchanged since last write — but then you need versioning or “dirty” flag so completion clears it.

### Mobile network impact

- 60 KB every 1.5 s on 3G/4G can cause: request queueing, timeouts (plan already has 25 s timeout for GET), and battery drain from radio use. On slow networks, multiple polls can stack; when they resolve out of order, see Section 3.
- **Proposed:** On client, consider **increasing poll interval when partial is present** (e.g. 3 s instead of 1.5 s) to reduce load; or detect slow connection and skip partial rendering (flag) so mobile falls back to progress-only.

### Browser memory footprint

- Client holds `partialSegments` (e.g. 500 segments) in React state. Each poll **replaces** the list (plan’s Option 1). So we allocate a new array every 1.5 s. Old array becomes GC candidate. 500 segments × several objects each → hundreds of KB per snapshot. Not huge, but sustained polling for 5–10 minutes = many allocations.
- **Mitigation:** Replace is correct to avoid merge bugs; ensure no other references retain the old array. Avoid storing partial in refs that outlive the transition to completed.

### GC pressure

- New array every 1.5 s → frequent Gen2 promotions if segments are long-lived. Can cause short freezes on low-end mobile. Cap segment count (500) and avoid keeping multiple copies (e.g. don’t clone partial into both “display” and “export” state).

**Summary — hard limits and caps:**

| What | Limit | Rationale |
|------|--------|------------|
| Redis stored partial per job | 500 segments or 100 KB, TTL 1 h | Bounded memory; failed jobs don’t leak |
| GET response partial | 500 segments, 80 KB | Predictable payload; mobile-friendly |
| Worker write frequency | After each chunk (or at most every N seconds) | Avoid Redis write storm |
| Client poll interval when partial present | Consider 2–3 s on mobile / slow | Reduce network and battery load |

---

## SECTION 3 — Client State Race Conditions

### Out-of-order poll responses

- Poll 1 (t=0) and Poll 2 (t=1500) in flight. Poll 2 returns **completed**; Poll 1 returns **processing** with partial. If Poll 1’s response is processed **after** Poll 2 (e.g. slow network), client could: (1) set `status='completed'` and `result` from Poll 2, then (2) set `partialSegments` from Poll 1, **overwriting or mixing with final state**. So partial could appear **after** completion and corrupt the UI (e.g. show “processing” partial alongside completed result, or overwrite result-derived transcript).
- **Mitigation:** Ignore **any** poll response that has `status !== 'completed'` and `status !== 'failed'` if the client has already transitioned to `completed` or `failed`. I.e. once `status === 'completed'`, do not apply updates from responses that say `processing`. Use a ref: `const terminalRef = useRef(false)`; set when transitioning to completed/failed; in doPoll, if `terminalRef.current` skip applying state. And when applying partial, only do so if `status === 'processing'` **and** not yet terminal.

### Completion response arriving before last partial response

- Same as above. Completion must always win. Ref-based “terminal” guard prevents late partial from being applied after completion.

### Multiple rapid partial updates

- Every 1.5 s a new partial can arrive. Each triggers setState → re-render. With 500 segments and a long transcript DOM, that’s 40 re-renders in 1 minute. React may batch, but still risk of jank on low-end devices.
- **Mitigation:** Throttle: e.g. accept partial update at most every 2–3 s (compare timestamp of last partial update). Or use a ref for “last applied partial version” and only setState if segment count or hash changed to avoid no-op re-renders.

### State replacement vs delta merging

- Plan prefers full replace. Good: no duplicate segments, no ordering bugs from merge. **Flicker risk:** If server trims to “last 500” and the next poll has a slightly different 500 (e.g. 501–1000 vs 500–1000), the **entire** list changes and the visible content can “jump” (e.g. first segment disappears, new segment at end). So “replace” with a **sliding window** of segments causes content to shift upward every poll. That’s a **major UX regression**: user reads segment 1–10, next poll replaces with segments 11–510; they lose the beginning.
- **Mitigation:** Either (1) server sends **all** partial segments so far (no sliding window), and client replaces in full — then payload grows unbounded unless we cap total (e.g. 500), which brings back the sliding-window jump, or (2) server sends segments with a **stable start index** (e.g. “segments 0–499” then “0–999” then “0–1499”) so client can replace and scroll position is more predictable. Sliding window (always last 500) is **bad** for UX; prefer “growing from start” with a high cap (e.g. 2000) and trim only for response size, or don’t trim by “last N” but by “first N” so the beginning is stable.

### Could transcript flicker?

- **Yes:** If we replace 500 segments with a new 500 that overlaps but isn’t identical (e.g. different trim), React will re-render the list; if keys are index-based, DOM nodes can change and cause flicker. Use stable keys (e.g. `segment.start + '-' + segment.end` or server-supplied id if any). If keys are not stable, list items will remount.

### Could content duplicate?

- With full replace, no. With any delta merge, yes — if not careful. Plan says replace; stick to it.

### Could scroll jump?

- **Yes.** See Section 4. Replace changes DOM height; if we don’t save/restore scroll position, it will jump (often to top or bottom depending on browser).

---

## SECTION 4 — Scroll Behavior Failure Scenarios

### User scrolls up mid-processing

- New partial arrives; we replace list. If we **don’t** auto-scroll and we **don’t** restore scroll position, the scroll position (in pixels or in scrollTop) is preserved by the browser only if the **content above** the viewport doesn’t change length. If we **prepend** or **change** segments above (e.g. sliding window of “last 500” means we remove top and add bottom), the content above shrinks and **scroll position effectively moves** (same scrollTop, different content). So user “scrolls up” to read; next poll removes earlier segments; the same scrollTop now shows different text → **confusing**. Mitigation: don’t use a sliding window that drops the start; or reserve a fixed-height area and “scroll into view” the new segment at the bottom so user who scrolled up keeps their view (complex).

### User selects text mid-processing

- If we replace the entire list (new array reference), React may unmount and remount list items. **Text selection is lost** when the DOM nodes holding the selection are replaced. So user selects a sentence; 1.5 s later partial update replaces list; selection disappears. **Known limitation.** Mitigation: avoid replacing the list while the user has a selection (detect `window.getSelection()` and skip applying partial update, or throttle); or accept the limitation and document it.

### User switches tabs and returns

- Browser may throttle timers; when user returns, multiple polls can fire or catch up. Possible: one response is “completed”, another is “processing” with partial. If we don’t have the terminal ref guard, we can apply the wrong one. Also: when tab is backgrounded, some browsers throttle request completion; when returning, a flood of responses can cause multiple setState in quick succession and one final “completed” — ensure completion wins and partial is cleared.

### Partial → final transition

- **Exact break scenario:** Final result has **different** segment boundaries or text than the last partial (e.g. server-side merge/sort is slightly different, or partial was trimmed). We replace partial with final. **Scroll position:** If we don’t explicitly save scrollTop of the scroll container and restore it after setState, the browser may reset scroll (e.g. to 0). So user was at 50% of partial; we set final transcript; scroll jumps to top → **regression**. **Mitigation:** Before setState(completed), read `scrollContainerRef.current.scrollTop` and `scrollHeight`; after setState and after React has committed (e.g. useEffect or requestAnimationFrame), set `scrollTop` to a value that approximates the same relative position (e.g. `scrollTop = (scrollHeight * ratio)` if content height changed). Non-trivial because final content height differs from partial.

---

## SECTION 5 — Failure Mode Interactions

### Partial data exists and job fails

- Worker throws; Bull marks job failed. **Worker today does not delete Redis partial key.** So Redis still has `job:partial:${jobId}` with stale partial. GET for that job returns `status: 'failed'`, `result` undefined. Plan says “when completed do not send partial”; it doesn’t say “when failed do not send partial.” If GET naively merges partial for any non-completed state, a **failed** job could still return partial in the response. Client would show failed state; if it also rendered partial from the same response, we’d show “failed” + partial transcript → confusing. **Must:** When building GET response, include partial **only** when `state === 'active'`. For `failed` (and `completed`), do **not** attach partial. Worker: on failure (catch before rethrow), **delete** `job:partial:${jobId}` so no stale partial is ever read.

### Partial exists and user reloads

- User reloads; rehydration runs; GET job. If job still processing, partial appears. If job completed, result only. OK. If job **failed** and we didn’t delete partial, GET could (if buggy) return partial for failed job; client would need to ignore partial when status is failed. So again: only expose partial for `active`; and delete partial on job failure.

### Partial exists and session expires

- Client gets 404 (job not found or forbidden). Client clears persisted job (per current design). Redis partial key is untouched; it will TTL out. No client impact; Redis may hold key until TTL. Acceptable.

### Partial key remains in Redis after failure

- **Current plan and worker:** No explicit delete on failure. So keys accumulate until TTL (1 h). Under high failure rate, Redis holds many partial keys. **Must:** Worker in `catch` block (before rethrow) must delete `job:partial:${jobId}`. Add to plan explicitly.

---

## SECTION 6 — Subtitles Complexity Validation

### Multi-language flow

- `generateMultiLanguageSubtitles`: primary SRT first (full transcription), then translate to additional languages, then ZIP. There is **no** partial until primary is **fully** done. So “partial subtitles” for multi-lang would only show after the full primary SRT exists — i.e. no streaming benefit during the long primary transcription. Only single-language subtitles can stream “as chunks complete.”

### ZIP generation

- ZIP is built at the end when all files exist. No partial ZIP. So partial for multi-lang is meaningless for download; only for **preview** of primary language. Plan Phase D says “partial SRT/segments for video-to-subtitles (single-language path)” — that’s correct; multi-lang is not a good fit for partial.

### SRT structure consistency

- Partial SRT (e.g. first N cues) must be valid SRT: index sequence 1,2,3,…, no half-cue, correct time order. If we flush after each chunk, we have multiple SRT “fragments” (each chunk = one or more cues). Merging them into one SRT requires renumbering indices and ensuring no overlap. Easier to stream **segments** and let client render (or build SRT in memory); don’t stream “partial SRT string” unless we guarantee it’s valid SRT (e.g. only append full cues and renumber).

### Timing offsets

- Chunk N has time offset `(N-1)*180`. Segments from chunk N already have correct global start/end. So timing is fine if we merge segments. No extra offset bug if we use the same logic as final.

### Video preview synchronization

- If we ever add “play video with partial subtitles,” we need cues to be in time order and no gaps that break playback. Partial segments sorted by start are OK; sliding window that drops early segments would break sync for the beginning of the video.

### Should subtitles streaming be Phase 2 instead of Phase 1?

- **Yes.** Reasons: (1) Transcript streaming alone already stresses ordering, payload, scroll, and failure handling; nailing that first reduces variables. (2) Subtitles add SRT validity, multi-lang (no real partial), and possible future video sync; better to validate transcript Phase C in production before adding subtitles. (3) Plan Phase D can be “Phase 2” after transcript partial is stable; no need to ship both in the same release. **Recommendation:** Rename Phase D to “Phase 2” and ship transcript partial (Phases A–C, E–F) first; then add subtitles partial (current D) as a follow-up.

---

## SECTION 7 — Production Risk Score

| Risk area | Score (1–10) | Justification |
|-----------|--------------|----------------|
| **Backend stability risk** | **5** | New code path (Redis write/read, GET merge); worker must write partial on a path that can throw (e.g. Redis down). If Redis write fails, do we fail the job or skip partial? Skip partial is safer but must be implemented. Bull and job completion are unchanged; failure paths must delete partial key. |
| **Memory risk** | **6** | Redis can grow with concurrent long jobs (1 MB per job × 50 jobs). Plan’s 100 KB/500 segment cap must apply to **stored** partial, not only response. Without a stored cap, memory risk is high. |
| **UX regression risk** | **7** | Scroll jump, out-of-order segments, sliding-window content shift, selection loss, partial-after-completion if race not guarded. Multiple ways for users to see broken or confusing transcript. |
| **Mobile regression risk** | **6** | Payload size and poll frequency can hurt slow networks and battery; GC from frequent replacements can cause jank; small screens make scroll/selection issues more visible. |
| **Deployment complexity risk** | **5** | Feature flags (server + client), new Redis key schema, worker change, GET change, client state. Rollback is clear (flag off), but surface area is non-trivial. |

---

## SECTION 8 — Final Verdict

### Is Option B still the best approach?

- **Conditionally yes.** Option B (Redis partial + GET merge + client render) is a reasonable way to get “pseudo-streaming” without true streaming. The main weaknesses are: (1) **ordering** from parallel chunks, (2) **sliding-window** trim causing content jump, (3) **failure path** not deleting partial, (4) **race** where late partial is applied after completion, and (5) **subtitles** adding scope. Fix those in the plan and implementation, and Option B is still the best **in-repo** approach; no need to switch to a different option (e.g. SSE) unless you want to redesign the pipeline.

### What must be adjusted before implementation?

1. **Worker:** Flush partial only after **merging and sorting** segments by `start` (single writer or serialized updates per job). Never expose unsorted partial.
2. **Worker:** On **failure** (catch before rethrow), **delete** `job:partial:${jobId}`. On success, delete or let TTL; document TTL.
3. **Redis:** Cap **stored** partial (500 segments or 100 KB) in addition to response cap. Worker trims before write.
4. **GET:** Attach partial **only** when `state === 'active'`. Never for `completed` or `failed`.
5. **Client:** **Terminal ref guard:** Once transitioned to completed or failed, ignore any subsequent poll response that is not that terminal state; do not apply partial after completion.
6. **Client:** **Scroll:** Save scroll position before applying final result; restore (or approximate) after setState. Document selection loss.
7. **Partial content policy:** **No sliding window of “last 500”** that drops the beginning. Use “first 500” or “all up to 500” so the start of the transcript is stable; if you need to cap size, cap total segments and trim from the **end** of the list only when exceeding (e.g. keep 0..499, then 0..999, etc.) or accept growing payload and a higher cap (e.g. 2000).

### What must be removed from the plan?

- Remove any implication that “last N segments” (sliding window) is acceptable for the response. Replace with “first N segments” or “all segments so far up to cap.”
- Remove “optionally” from “worker can delete Redis key on success”; make it **required** on both success and failure (or document that TTL is the only cleanup and accept 1 h retention).

### What must be delayed to Phase 2?

- **Subtitles partial (current Phase D):** Delay to Phase 2. Ship transcript pseudo-streaming (Phases A, B, C, E, F) first; validate in production (ordering, scroll, races, memory); then add subtitles partial in a separate phase.
- **Optional:** Scroll stabilization (E) can stay as a later polish phase if initial release uses “scroll to bottom” only when user at bottom and accepts possible jump on partial→final; but documenting and implementing basic scroll save/restore on transition should be in Phase C, not deferred.

---

**Summary:** The plan is workable but has **concrete gaps**: parallel ordering, sliding-window UX, failure cleanup, and client races. Address those and defer subtitles partial; then Option B is defensible for implementation. Without those adjustments, the risk of UX regressions and production bugs is high.
