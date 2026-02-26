# Global Workflow Tracker — Integrity Audit Report

**Date:** Per current implementation (no code changes).  
**Scope:** Completion emit integrity, duplicate step risk, prompt state, timer accuracy, navigation, memory/performance, risk summary.

---

## PART 1 — Completion Emit Integrity

### 1. Per-tool report

| Tool | # calls | File:line | Can fire >1/job? | Polling duplicate? | Transition duplicate? | Re-render re-trigger? | Retry re-trigger? |
|------|--------|----------|------------------|--------------------|------------------------|----------------------|-------------------|
| **VideoToTranscript** | 3 | `client/src/pages/VideoToTranscript.tsx`: 248, 310, 595 | No | No | No | No | No |
| **VideoToSubtitles** | 3 | `client/src/pages/VideoToSubtitles.tsx`: 170, 225, 533 | No | No | No | No | No |
| **CompressVideo** | 1 | `client/src/pages/CompressVideo.tsx`: 190 | No | No | No | No | No |
| **BurnSubtitles** | 1 | `client/src/pages/BurnSubtitles.tsx`: 196 | No | No | No | No | No |
| **FixSubtitles** | 1 | `client/src/pages/FixSubtitles.tsx`: 200 | No | No | No | No | No |
| **TranslateSubtitles** | 1 | `client/src/pages/TranslateSubtitles.tsx`: 166 | No | No | No | No | No |
| **BatchProcess** | 1 | `client/src/pages/BatchProcess.tsx`: 74 | No | No | No | No | No |

**Exact locations and paths:**

- **VideoToTranscript**
  - **248:** Rehydrate path — first `getJobStatus()` in `run()`; `transition === 'completed'`; then `return`. Runs at most once per rehydrated job.
  - **310:** Rehydrate poll — inside `doPoll()`; `t === 'completed'`; `terminalRef.current = true` and interval cleared. Mutually exclusive with 248 for same job (either first fetch is completed → 248, or polling sees completed → 310).
  - **595:** Active upload poll — inside `applyCompletedTransition()` (called once per job, either after `setTimeout(..., remainingMs)` or immediately). `terminalRef.current = true` set before scheduling, so further poll ticks exit early. One completion path per live job.
- **VideoToSubtitles**
  - **170:** Rehydrate first `getJobStatus()`, `transition === 'completed'`, `return`.
  - **225:** Rehydrate `doPoll()`, `t === 'completed'`. Mutually exclusive with 170 for same job.
  - **533:** Active upload poll, `transition === 'completed'`. Separate flow from rehydrate; one completion per job.
- **CompressVideo, BurnSubtitles, FixSubtitles, TranslateSubtitles:** Single call inside `transition === 'completed'` (or equivalent) with `clearInterval` before; one completion per job.
- **BatchProcess:** Single call in `else` when batch status is completed/partial (not failed); one completion per batch.

**Polling/transition:** Each completion path sets a terminal guard (`terminalRef.current = true` or `clearInterval`) before or with the emit, so the same completion block is not entered again for that job. No double emit from polling.

**React re-renders:** All `emitToolCompleted()` calls are inside async callbacks (poll handlers, `setTimeout`, upload response handler), not during render. Re-renders do not invoke them.

**Retry logic:** No retry path in the audited code re-invokes the same completion block or `setStatus('completed')` for the same job. Retries do not re-trigger emit.

### 2. Canonical completion boundary

- **VideoToTranscript / VideoToSubtitles:** There is **not** a single canonical completion boundary in the file. There are **three** distinct completion boundaries (rehydrate first fetch, rehydrate poll, active upload poll), but they are **mutually exclusive per job**: only one of the three runs for a given job. So effectively one emit per job, but the implementation is multi-path.
- **All other tools:** There is exactly **one** completion boundary per tool (one `transition === 'completed'` block that calls `emitToolCompleted`).
- **Conclusion:** No tool can emit twice for the same job. Multi-path tools (VideoToTranscript, VideoToSubtitles) rely on control flow and terminal refs to ensure only one path runs per job; others have a single path.

---

## PART 2 — Duplicate Step Risk

### 3. If `emitToolCompleted()` fires twice for the same tool back-to-back

- **Does the store push two steps?**  
  - For **idle:** First call sets `store.steps = [step]` and `status = 'prompt_open'`. Second call hits `if (store.status === 'prompt_open') return` and does nothing. So only one step is ever pushed from idle.
  - For **active:** First call runs `if (last?.toolId !== payload.toolId) store.steps = [...store.steps, step]`; if it’s the same tool as last, it does **not** push. Second call would also see the same `last` and again not push (or would push if it were a different tool). So with two back-to-back same-tool emits in active: first may or may not push (depending on previous step), second does not push because `last.toolId === payload.toolId`. So at most one step is added for the same toolId in active.
- **Does `dedupeConsecutiveSteps()` prevent UI duplication?**  
  **Yes.** Snapshots use `dedupeConsecutiveSteps(store.steps)` in `emit()` (line 123) and `getSnapshot()` (line 206). The UI always receives a list with no consecutive same-toolId steps.
- **Does `dedupeConsecutiveSteps()` prevent persistence duplication?**  
  **Yes.** `persist()` (line 80) writes `dedupeConsecutiveSteps(store.steps)` to sessionStorage. Persisted state never contains consecutive duplicate steps.
- **Prevention at SOURCE vs afterward?**  
  **Both.** (1) **Source:** When `status === 'active'`, `handleToolCompleted()` does not push if `last?.toolId === payload.toolId` (lines 167–170). (2) **Afterward:** All snapshot and persist outputs are passed through `dedupeConsecutiveSteps()`, so any legacy or edge-case duplicates are not shown or saved.

### 4. Guard in `handleToolCompleted()`

- **Is there a guard that prevents pushing when the last step has the same toolId?**  
  **Yes.** In `workflowStore.ts` lines 166–171:
  - When `store.status === 'active'`, the code does `const last = store.steps[store.steps.length - 1]` and only runs `store.steps = [...store.steps, step]` when `last?.toolId !== payload.toolId`.
- **Impact if absent:** Without this guard, two rapid same-tool completions in active state could push two identical steps; `dedupeConsecutiveSteps()` would still hide and persist a single step, but the in-memory `store.steps` could grow with duplicates until next dedupe at read/persist.

---

## PART 3 — Prompt State Integrity

### 5. When `status === 'prompt_open'`

- **Does `handleToolCompleted()` early-return?**  
  **Yes.**  
- **Code path:** `workflowStore.ts` line 150: `if (store.status === 'prompt_open' || store.status === 'completed') return`. No further mutation; no emit.

### 6. When `status === 'completed'`

- **Does `handleToolCompleted()` early-return?**  
  **Yes.**  
- **Code path:** Same line 150: `if (store.status === 'prompt_open' || store.status === 'completed') return`. Workflow remains frozen; no new steps, no emit.

### 7. After refresh

- **If status was `prompt_open`:**  
  `loadPersisted()` returns `status: 'prompt_open'` when parsed status is `'prompt_open'` (line 57). Store is rehydrated with that status; `getSnapshot()`/emit provide it to the UI. **Prompt reappears** (same message and Yes/No).
- **If status was `active`:**  
  `steps` are restored from sessionStorage and passed through `dedupeConsecutiveSteps(steps)` (line 62). **steps[] rehydrate correctly** (and deduplicated).
- **If status was `completed`:**  
  Status and `completedAt` are restored; Tracker renders `status === 'completed'` and the summary (lines 104–110 in WorkflowTracker.tsx). **Summary renders correctly** with `formatMinutes(snapshot.startedAt, snapshot.completedAt)`.
- **startedAt:** Restored when `saved.startedAt != null` (line 109). **Restored correctly.**
- **completedAt:** Restored when `saved.completedAt != null` (line 110). **Restored correctly.**

---

## PART 4 — Timer Accuracy

### 8. Confirmation

- **startedAt set only once:**  
  **Yes.** Set only in `handleToolCompleted()` when `store.status === 'idle'`: `if (store.startedAt === null) store.startedAt = Date.now()` (line 159). In `idle` we then set `status = 'prompt_open'`, so that branch is not entered again for this workflow. In `active` we do **not** set or overwrite `startedAt`.
- **startedAt not overwritten on subsequent completions:**  
  **Confirmed.** The `active` branch (lines 165–174) never assigns `store.startedAt`.
- **completedAt set only in `userChoseNo()`:**  
  **Yes.** Only assignment is in `userChoseNo()` at line 186: `store.completedAt = Date.now()`.
- **Duration:**  
  **Yes.** WorkflowTracker uses `formatMinutes(snapshot.startedAt, snapshot.completedAt)` = `Math.round((completedAt - startedAt) / 60000)` (WorkflowTracker.tsx lines 17–19, 105–106).

### 9. After refresh mid-workflow

- **Duration remains correct:**  
  **Yes.** `startedAt` and `completedAt` are persisted and rehydrated (lines 79–84, 109–110). After refresh, the same values are used; duration is recalculated from them.
- **startedAt resets unexpectedly:**  
  **No.** No code path overwrites `startedAt` after it is set in the `idle` branch; rehydration only sets it from saved state when present.

---

## PART 5 — Navigation Behavior

### 10. `userSelectedNextTool()`

- **Is `navigate()` triggered from the React layer (WorkflowTracker)?**  
  **Yes.** In `WorkflowTracker.tsx` lines 82–89, the `<select onChange>` handler calls `userSelectedNextTool(option)` then `navigate(option.pathname)`. `useNavigate()` is used in the component (line 22).
- **Is `navigate()` ever triggered from the store module?**  
  **No.** The store (`workflowStore.ts`) has no import of `react-router-dom` and no reference to `navigate`. Only the Tracker triggers navigation.
- **Could navigation fire twice?**  
  **Unlikely in normal use.** The handler runs once per native `onChange` (one selection). Resetting `e.target.value = ''` (line 84) does not by itself trigger another `onChange`. Double navigation would require two separate user selections or a bug elsewhere, not this handler alone.

### 11. Refresh while dropdown is open

- **State restore:**  
  sessionStorage is rehydrated at module load; `status` and `steps` restore. **State restores safely.**
- **Dropdown reopen:**  
  Dropdown is shown when `status === 'active'` (lines 67–102). After refresh, if status was `active`, the Tracker re-renders with `active` and shows the same steps + dropdown. So the dropdown **reappears** in the same logical state; it is not “stuck open” from before refresh.
- **Inconsistent UI state:**  
  Dropdown selection is uncontrolled (`defaultValue=""`). After refresh there is no in-memory “selected value” from before; the dropdown shows “Next tool…”. No inconsistency identified beyond normal SPA rehydration.

---

## PART 6 — Memory and Performance

### 12. Confirmation

- **Only WorkflowTracker subscribes to the emitter:**  
  **Yes.** Only `WorkflowTracker.tsx` imports `on` and `off` from `workflowStore` and subscribes (lines 4–5, 26–28). Tool pages only import `emitToolCompleted` (grep: no tool page imports `on`, `off`, or `getSnapshot`).
- **No tool page subscribes to workflow store:**  
  **Confirmed.** Tool pages import only `emitToolCompleted` from `../workflow/workflowStore`.
- **No global re-renders when workflow changes:**  
  **Yes.** Only the Tracker subscribes; only it receives `workflow:change` and calls `setSnapshot(s)`. Tool pages do not re-render due to workflow updates.
- **No layout padding toggles dynamically:**  
  **Yes.** Grep on `App.tsx` for `padding` / `padding-bottom`: no matches. No dynamic padding based on tracker visibility.
- **Tracker height constant:**  
  **Yes.** `WorkflowTracker.tsx` uses `const TRACKER_HEIGHT_PX = 56` and `style={{ height: TRACKER_HEIGHT_PX }}` (lines 14–15, 35–36). No conditional height.

---

## PART 7 — Final Risk Summary

### Confirmed safe behaviors

- One emit per job per tool; completion paths are mutually exclusive or guarded (terminalRef / clearInterval).
- Re-renders and retries do not re-trigger emit.
- `handleToolCompleted()` early-returns for `prompt_open` and `completed`; no mutation when frozen.
- Consecutive same-tool duplicate step: prevented at source (last-step guard in active) and in output (dedupe in snapshot and persist).
- Timer: startedAt set once and not overwritten; completedAt only in userChoseNo(); duration derived from both.
- After refresh: status, steps, startedAt, completedAt rehydrate; prompt/summary and dropdown restore correctly.
- Navigation only from WorkflowTracker; store has no navigate dependency.
- Only WorkflowTracker subscribes; no tool subscribes; no dynamic padding; fixed tracker height.

### Potential instability points

- **Multiple completion paths (VideoToTranscript, VideoToSubtitles):** Three call sites each; correctness relies on control flow and refs. If future changes add a path that can run after a terminal guard is set, or reuse the same job id across flows, duplicate emit could theoretically occur. Mitigated by store-side dedupe and prompt_open guard.
- **Rehydrate vs active path:** If rehydrate and active upload poll could ever both run for the same job (e.g. race on same page), two paths could in theory both see completed. Current design (separate entry points and terminalRef) makes this unlikely; not guaranteed by a single canonical boundary.
- **Dropdown state:** Uncontrolled select; no sync of “selected next tool” to store (by design). No functional bug identified, but “next tool” choice is not persisted if user selects then refreshes before navigating.

### Areas that could be simplified

- **VideoToTranscript / VideoToSubtitles:** Consolidating to a single “job completed” handler that all paths (rehydrate first, rehydrate poll, active poll) call would give one canonical completion boundary per tool and reduce risk of duplicate emit if code is changed later.
- **Dedupe:** Keeping both source guard and `dedupeConsecutiveSteps()` is defensive; the guard alone would be enough for same-tool consecutive dupes; dedupe remains useful for persisted legacy data and any other edge cases.

### Production-safety statement

**Is this workflow system production-safe? Yes, with the stated caveats.**

- Emit integrity: one emit per job in practice; prompt and completed states are protected; timer and persistence behave correctly; no global re-renders or layout shift.
- Duplicate steps are prevented at source and again at read/persist; refresh and navigation are consistent.
- Remaining risks are low and confined to future changes (extra completion paths or ref misuse) and are partly mitigated by store guards and dedupe. No code changes were made in this audit.

---

**File references**

- `client/src/workflow/workflowStore.ts` — store, emitter, handleToolCompleted, dedupe, persist, loadPersisted, userChoseYes/No, userSelectedNextTool, getSnapshot
- `client/src/components/workflow/WorkflowTracker.tsx` — subscription, navigate, height, UI by status
- `client/src/App.tsx` — WorkflowTracker mount, no padding
- `client/src/pages/VideoToTranscript.tsx` — lines 248, 310, 595
- `client/src/pages/VideoToSubtitles.tsx` — lines 170, 225, 533
- `client/src/pages/CompressVideo.tsx` — line 190
- `client/src/pages/BurnSubtitles.tsx` — line 196
- `client/src/pages/FixSubtitles.tsx` — line 200
- `client/src/pages/TranslateSubtitles.tsx` — line 166
- `client/src/pages/BatchProcess.tsx` — line 74
