# Pipeline Performance Upgrade — Validation Checklist (Phase 9)

This checklist validates the production-safe pipeline performance changes (Phases 0–8) before enabling flags or rolling out widely.

**Feature flags (all default off):** `PROCESSING_V2`, `DEFER_SUMMARY`, `STREAM_PROGRESS`, `STREAM_UPLOAD_ASSEMBLY`, `WORKER_CONCURRENCY_V2`

---

## 1. Automated checks (run before manual QA)

| Check | Command / action | Expected |
|-------|------------------|----------|
| TypeScript | `cd server && npx tsc --noEmit` | Exit 0 |
| Lint | `cd server && npm run lint` (if script exists) or ESLint on `server/src` | No errors |
| No new blocking I/O in worker | Grep `writeFileSync`, `readFileSync`, `unlinkSync` in `server/src/workers/videoProcessor.ts` | Only allowed legacy usage; no new sync in hot path |
| No new blocking I/O in upload | Grep sync calls in `server/src/routes/upload.ts` when `STREAM_UPLOAD_ASSEMBLY` path | Reassembly path uses streams + `fs.promises.unlink` when flag on |

---

## 2. Short video (e.g. &lt; 2.5 min)

| Scenario | Steps | Verify |
|----------|--------|--------|
| Video → Transcript (no summary/chapters) | Upload short video, wait for completion | Result has transcript; no errors; download works |
| Video → Transcript (summary + chapters) | Same with summary/chapters and optional export formats | Summary, chapters, and exports present; progress moves to 100 |
| Video → Transcript (with STREAM_PROGRESS) | Enable `STREAM_PROGRESS`, run same flow | Progress interpolates (25→55); no regression in result |
| Video → Subtitles (single language) | Short video → SRT/VTT | Correct subtitle file; download works |

---

## 3. Long video (e.g. ≥ 2.5 min, chunked transcription)

| Scenario | Steps | Verify |
|----------|--------|--------|
| Video → Transcript | Upload long video, wait for completion | Full transcript; segment order correct; no duplicate or missing segments |
| Partial streaming | Enable partial writer (summary/chapters or export json); poll job | Partials appear in poll response; final result matches; no out-of-order segments |
| DEFER_SUMMARY | Enable `DEFER_SUMMARY`; complete a job | Job completes with result; GET /api/job/:id merges summary/chapters from Redis when ready; GET /api/job/:id/summary returns 200 with summary/chapters or {} |

---

## 4. Multi-language subtitles

| Scenario | Steps | Verify |
|----------|--------|--------|
| Primary + 2 languages | Video → multi-language subtitles | Primary + translated SRTs; ZIP or single download as configured; no regression vs baseline |

---

## 5. Chunked upload (large file)

| Scenario | Steps | Verify |
|----------|--------|--------|
| Chunked upload (legacy path) | `STREAM_UPLOAD_ASSEMBLY` off; upload large file via chunked flow | File reassembles; job runs; result correct |
| Chunked upload (streaming path) | `STREAM_UPLOAD_ASSEMBLY` on; same | Same outcome; no memory spike; reassembly completes |

---

## 6. Terminal guard and completion

| Scenario | Steps | Verify |
|----------|--------|--------|
| Minimum stream visibility | Enable `STREAM_PROGRESS`; run job to completion | Client shows partials for at least ~8 s before switching to final result (or immediate if already &gt; 8 s) |
| Terminal state | Poll until `state === 'completed'` or `'failed'` | Poll stops; no further requests; UI shows final state |
| Rehydrate / new job | Start new job or “process another” | Partial refs and timeout cleared; no carry-over from previous job |

---

## 7. Failure and cleanup

| Scenario | Steps | Verify |
|----------|--------|--------|
| Job failure (e.g. invalid file) | Trigger failure in worker | Job state `failed`; error stored; no unhandled rejection |
| Redis partial cleanup | Job completes or fails | `job:partial:{jobId}` removed (no permanent leak) |
| Deferred summary failure | `DEFER_SUMMARY` on; simulate summary/chapters failure | Job still completes; error logged; GET /api/job/:id and /summary degrade gracefully |
| Job summary TTL | Complete job with `DEFER_SUMMARY`; wait 1h+ (or mock TTL) | Summary key expires; GET /summary returns {} or 404 as designed |

---

## 8. Worker concurrency (WORKER_CONCURRENCY_V2)

| Scenario | Steps | Verify |
|----------|--------|--------|
| Startup | Set `WORKER_CONCURRENCY_V2=true`; start worker | Log shows `workerConcurrencyV2: true`, `availableCPU`, `normalConcurrency`, `priorityConcurrency`; no crash |
| Load | Enqueue 2+ normal + 1 priority job | All complete; no memory blow-up; Redis stable |

---

## 9. Performance metrics (Phase 8)

| Scenario | Steps | Verify |
|----------|--------|--------|
| Upload timing | Single-file and chunked upload | Logs show `upload_end` with `jobId`, `durationMs` (and `chunked: true` for chunked) |
| Transcription timing | Complete a transcript job | Logs show `transcription_timing` with `jobId`, and at least one of `extractAudioMs` / `extractAndSplitMs`, `chunkSplitMs`, `whisperTotalMs` |
| Worker timing | Same job | Logs show `perf_timing` with `summaryMs`, `exportMs` (when applicable), and `totalJobMs` on completion |

---

## 10. Regressions and invariants

| Area | Verify |
|------|--------|
| API contract | No breaking changes to upload or job response shapes; optional fields only |
| Segment order | Transcript and subtitle segments always chronological; no duplicates or gaps from parallel path |
| Billing / usage | Minutes and video count updated as before; no double-count |
| Duplicate detection | Cached result path still works when hash matches |
| Feature flags off | All flags false: behavior matches pre-upgrade baseline |

---

## Sign-off

- [ ] Automated checks (1) passed  
- [ ] Short video (2) passed  
- [ ] Long video + partial (3) passed  
- [ ] Multi-language (4) passed  
- [ ] Chunked upload (5) passed  
- [ ] Terminal guard (6) passed  
- [ ] Failure and cleanup (7) passed  
- [ ] Worker concurrency (8) passed  
- [ ] Performance metrics (9) verified  
- [ ] Regressions (10) confirmed none  

---

## Rollout and next steps

1. **Run automated checks**  
   From repo root: `cd server && npx tsc --noEmit`. No lint script in server by default; add one if you use ESLint.

2. **Validate with flags off**  
   Ensure baseline behavior (all flags unset or false): short/long video, chunked upload, multi-language. Sign off §2–5 and §10.

3. **Enable flags incrementally (one at a time recommended)**  
   Set in environment (e.g. `.env` or platform env):
   - `PROCESSING_V2=true` — single-pass extract+split; validate long-video transcript and timing.
   - `STREAM_UPLOAD_ASSEMBLY=true` — streaming reassembly for chunked uploads; validate large file and memory.
   - `DEFER_SUMMARY=true` — deferred summary/chapters; validate GET job + GET summary and Redis TTL.
   - `STREAM_PROGRESS=true` — progress interpolation + min stream visibility; validate progress bar and 8s minimum partial display.
   - `WORKER_CONCURRENCY_V2=true` — CPU-based concurrency; validate under load and Redis stability.

4. **Monitor after rollout**  
   Use Phase 8 timing logs (`upload_end`, `transcription_timing`, `perf_timing`, `totalJobMs`) and existing observability (queue depth, errors, Redis memory). Roll back by unsetting the flag and redeploying.

5. **Optional: remove or relax flags**  
   After confidence (see PSEUDO_STREAMING_PLAN.md “Final polish”), consider making a flag the default or removing it and deleting the legacy path.

*End of validation checklist.*
