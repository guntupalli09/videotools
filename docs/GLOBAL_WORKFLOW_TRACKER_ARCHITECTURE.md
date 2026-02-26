# Global Workflow Tracker — Architecture Proposal (Refined)

**Status:** Proposal only. No implementation. No changes to existing code.

**Goal:** A fixed bottom Workflow Tracker that persists across tool pages, does not scroll with content, avoids unnecessary re-renders, survives route changes, and does not affect tool performance or processing pipelines.

**Refined constraints:**

- **No Zustand.** Use a module-scoped store + tiny event emitter.
- **Only WorkflowTracker subscribes** to store changes (via emitter).
- **Tools only emit** completion events; they do not read from the store.
- **Workflow timer starts** on the first `toolCompleted()` event.
- **Ignore `toolCompleted()`** when status is `'prompt_open'` or `'completed'`.
- **Explicit navigation** after user selects next tool (defined in §6).
- **Explicit behavior** when `toolCompleted()` fires after workflow is `'completed'` (defined in §6).
- **Layout:** No dynamic padding toggle; tracker height is deterministic to avoid reflow.

---

## 1. Behavior Summary

| Trigger | Behavior |
|--------|-----------|
| Tool finishes successfully | Show prompt: *"Do you want to continue to the next tool in your workflow?"* |
| User selects **YES** | Add step to workflow; show dropdown to select next tool; append to chain; **navigate to selected tool** (see §6). |
| User selects **NO** | Freeze workflow; show *"Workflow completed in XX minutes"*; lock further additions. |

**Constraints:** No slowdown to TTFB, no layout shift, no hydration mismatch, no full-page re-renders on tracker state update, no changes to core tool logic, billing, or async processing.

---

## 2. State Strategy: Module-Scoped Store + Event Emitter

**Chosen approach: No Zustand. Module-scoped plain object + tiny event emitter. Only WorkflowTracker subscribes.**

- **Store:** Single plain object in module scope. Mutated synchronously by a small set of functions (`handleToolCompleted`, `userChoseYes`, `userChoseNo`, `userSelectedNextTool`). Tools **never** read from the store.
- **Emitter:** Tiny pub/sub: `on(event, fn)`, `off(event, fn)`, `emit(event, payload)`. Emit `'workflow:change'` when store state changes; payload is the new state snapshot (or store reference). Tracker is the **only** subscriber.
- **WorkflowTracker:** On mount: subscribe to `'workflow:change'` and sync to React state. On unmount: unsubscribe. Only this component re-renders on workflow updates; tool pages do not subscribe.
- **Tools:** Import only `emitToolCompleted({ toolId, pathname })`. They emit; they do not subscribe or read. No new dependencies; emitter lives in the same module as the store.

---

## 3. Rendering and Layout

**Rendering:** Layout wrapper (sibling to main/Footer), no portal. Tracker is inside the same `min-h-screen flex flex-col` div as `<main>` and `<Footer>`. `position: fixed; bottom: 0` so it does not scroll with content.

**Layout constraints (mandatory):**

- **No dynamic padding.** Do not toggle `padding-bottom` on `<main>` or any parent based on tracker visibility. Layout must not change when the tracker appears or disappears.
- **Deterministic tracker height.** The tracker DOM element must always have the same height to avoid reflow. **Option A (recommended):** Tracker always renders a fixed-height container (e.g. 56px or 64px). When "hidden" (idle), the bar is still present with empty or placeholder content so height never changes. **Option B:** Tracker always renders the same number of lines (fixed height); content varies but vertical space is constant. No mounting/unmounting that changes height.
- **Overlap:** The fixed bar may overlap the bottom of page content. Do not compensate with padding; design so critical CTAs are above the fold or accept overlap.

**Placement in tree:** Same level as `<Footer />` and `<Toaster />`; `<WorkflowTracker />` after Footer. z-index above main, below modals/toasts.

---

## 4. Tool Completion and Timer

**Detection:** Tools call `emitToolCompleted({ toolId, pathname })` once when they have already set `status === 'completed'` (same block as existing success handling). No change to upload, polling, or transcription logic.

**Timer start:** Set `startedAt = Date.now()` on the **first** `toolCompleted()` that is not ignored (i.e. when transitioning from `idle` to `prompt_open`). Do not start the timer when the user clicks "Yes"; it has already started on first completion.

**Ignore rules:** When `handleToolCompleted(payload)` runs:
- If `status === 'prompt_open'`: do nothing; do not add a step, do not reopen prompt, do not update `startedAt`. (User has not yet answered; avoid duplicate prompts or overwriting.)
- If `status === 'completed'`: do nothing; workflow is frozen. See §6 for behavior when a tool completes after the user has already clicked "No".

**Duration:** When user clicks "No", set `completedAt = Date.now()` and display minutes as `Math.round((completedAt - startedAt) / 60000)` (or equivalent). `startedAt` is set on first accepted `toolCompleted()`; `completedAt` on "No".

---

## 5. Component Tree

```
App
├── BrowserRouter
│   └── WorkflowProvider                    ← existing (file/SRT reuse)
│       ├── AppSeo
│       ├── PostCheckoutHandler
│       ├── Skip to main content
│       └── div.min-h-screen.flex.flex-col
│           ├── Navigation
│           ├── OfflineBanner
│           ├── main#main (flex-grow)
│           │   ├── Breadcrumb
│           │   └── Routes / RouteTransitionLayout / Outlet  ← tool pages mount here
│           ├── Footer
│           ├── WorkflowTracker             ← NEW: fixed bottom, single mount, fixed height
│           ├── TexErrorBoundary / TexAgent
│           └── Toaster
```

**WorkflowTracker:** Renders a fixed-height bar (content varies by state). Subscribes to `'workflow:change'` only; no props from parent. State: prompt open → [Yes]/[No]; user chose Yes → steps + dropdown; user chose No → "Workflow completed in XX minutes", locked.

---

## 6. State Machine (Updated)

**States:** `idle` | `prompt_open` | `active` | `completed`

```
                    ┌─────────────────────────────────────────────────────────┐
                    │  IDLE                                                    │
                    │  (no steps; tracker bar fixed height, empty/placeholder) │
                    └───────────────────────────┬─────────────────────────────┘
                                                │
                        toolCompleted()         │  ← First completion: set startedAt = Date.now()
                        (accepted)              │     Add step; set status = 'prompt_open'
                                                ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │  PROMPT_OPEN                                            │
                    │  "Do you want to continue to the next tool?" [Yes] [No]  │
                    │  toolCompleted() here → IGNORED (no op)                  │
                    └───────────────┬─────────────────────┬───────────────────┘
                                    │                     │
                          user: Yes │                     │ user: No
                                    ▼                     ▼
                    ┌───────────────────────┐   ┌─────────────────────────────────┐
                    │  ACTIVE                │   │  COMPLETED (frozen)             │
                    │  Steps + dropdown      │   │  completedAt = Date.now()       │
                    │  User selects next     │   │  "Workflow completed in XX min" │
                    │  tool → append +       │   │  toolCompleted() here → IGNORED  │
                    │  NAVIGATE to pathname  │   └─────────────────────────────────┘
                    └───────────┬───────────┘
                                │
                    user selects next tool:
                    1. Append step to steps[]
                    2. Navigate to selected tool's pathname (e.g. navigate(pathname))
                    3. status stays ACTIVE; close dropdown (or show next prompt after that tool completes)
                                │
                    next tool completes (toolCompleted accepted)
                                │
                                └──────────────────────► PROMPT_OPEN (again)
```

**Transition rules:**

- **toolCompleted() accepted** only when `status === 'idle'` or `status === 'active'`. When `idle`: set `startedAt`, add first step, set `prompt_open`. When `active`: add step, set `prompt_open`.
- **toolCompleted() ignored** when `status === 'prompt_open'` or `status === 'completed'`.

---

## 7. Explicit Behaviors

### 7.1 Navigation after selecting next tool

When the user selects the next tool from the dropdown (in `active` state):

1. **Append** the selected tool as the next step in `steps[]`.
2. **Navigate** to that tool's route (e.g. `navigate(selectedTool.pathname)`). Use React Router's `useNavigate()` in the Tracker or pass a navigate callback from the store/module so the Tracker can trigger navigation without being inside a Router child for read-only store subscription.
3. **Close** the dropdown (or clear "next tool" selection). Optionally set status to wait for the next completion (still `active` with one more step in chain).
4. No automatic re-open of the prompt until that tool fires `toolCompleted()` again (then transition to `prompt_open`).

### 7.2 toolCompleted() when workflow is already `completed`

When `status === 'completed'` (user already clicked "No"):

- **Ignore** the event. Do not add a step, do not reopen the prompt, do not change `completedAt` or the displayed summary.
- The completed workflow summary remains visible and locked. If the user runs another tool and it completes, that completion is not part of this workflow. (A future enhancement could offer "Start new workflow?" but is out of scope for this contract.)

---

## 8. Edge Case Handling

| Edge case | Handling |
|-----------|----------|
| **toolCompleted() while prompt_open** | Ignore. No state change; no second prompt. |
| **toolCompleted() while completed** | Ignore. Workflow stays frozen. |
| **User selects same tool they're already on** | Append step; navigate to same pathname (no-op or refresh); acceptable. |
| **Multiple rapid toolCompleted() calls** | First accepted (idle → prompt_open or active → prompt_open); subsequent while prompt_open ignored. |
| **Route change during prompt_open** | Prompt remains visible (tracker is fixed, not inside route). User can still click Yes/No. |
| **Tracker unmount (e.g. strict mode / remount)** | On unmount: unsubscribe from emitter. On mount: subscribe and sync from current store; no reset of store. Store lives in module scope so it survives React unmount. |
| **startedAt already set when second tool completes** | Do not overwrite `startedAt`. It was set on first toolCompleted(); duration remains from that moment to "No". |
| **Deterministic height: content overflow** | Use fixed height + overflow hidden or truncation; never expand the bar. |

---

## 9. Event Flow

```
Tool page (e.g. VideoToTranscript)
  │ setStatus('completed') (existing)
  │ emitToolCompleted({ toolId, pathname })  ──►  workflow store (module)
  │                                                      │
  │                                                      │ if status !== 'prompt_open' && status !== 'completed':
  │                                                      │   update store (steps, status, startedAt if idle)
  │                                                      │   emit('workflow:change', snapshot)
  │                                                      │
  │                                                      ▼
  │                                            WorkflowTracker (only subscriber)
  │                                            setState(snapshot); re-render
  │
  │ (tool page does not subscribe; no re-render)
```

User clicks [Yes] or [No] or selects next tool → store updates → emit('workflow:change') → only Tracker re-renders. On "next tool" selection: store updates + navigate(pathname) (navigation triggered from Tracker or from store-provided callback).

---

## 10. Risk Assessment

| Risk | Mitigation |
|------|------------|
| **Full-page re-renders** | Only WorkflowTracker subscribes to emitter; tool pages only call emitToolCompleted. |
| **Layout shift / reflow** | No dynamic padding. Tracker always fixed height (same whether idle or visible content). |
| **Hydration mismatch** | No portal; tracker in same React tree. Fixed-height bar with deterministic initial state. |
| **toolCompleted after completed** | Explicit ignore; no state change. |
| **Timer accuracy** | startedAt on first accepted toolCompleted(); completedAt on "No"; duration = completedAt - startedAt. |
| **Navigation** | Explicit: append step + navigate(pathname) on next-tool selection. |

---

## 11. Performance Impact

| Concern | Impact |
|---------|--------|
| **TTFB** | None; no server round-trip; no workflow in HTML. |
| **Re-renders** | Only WorkflowTracker re-renders on workflow change. |
| **Bundle** | Small; no Zustand; tiny emitter + store + Tracker UI. |
| **Layout** | Stable; no padding toggle; fixed bar height. |
| **Async processing** | None; tools emit after they have already completed. |

---

## 12. Final Implementation Contract

### 12.1 Module: workflow store + emitter

- **Store (module-scoped):**
  - `status: 'idle' | 'prompt_open' | 'active' | 'completed'`
  - `steps: Array<{ toolId: string, label: string, pathname: string }>`
  - `startedAt: number | null`
  - `completedAt: number | null`
  - `lastCompletedTool: { toolId, pathname } | null` (optional; for prompt display)
- **Emitter:** `on('workflow:change', fn)`, `off('workflow:change', fn)`, `emit('workflow:change', snapshot)`.
- **Functions (all sync):**
  - `handleToolCompleted(payload: { toolId: string, pathname: string })`: if status is `prompt_open` or `completed`, return. Else if idle: set startedAt, push step, set prompt_open. Else if active: push step, set prompt_open. Then emit.
  - `userChoseYes()`: set status active, clear prompt, emit.
  - `userChoseNo()`: set completedAt, set status completed, emit.
  - `userSelectedNextTool(payload: { toolId, label, pathname })`: append to steps, emit. Caller (Tracker) performs `navigate(pathname)`.
- **Public API for tools:** `emitToolCompleted({ toolId, pathname })` — calls `handleToolCompleted` and that’s it. No return value; tools do not read store.

### 12.2 WorkflowTracker component

- Mount: subscribe to `'workflow:change'`; set local React state from payload (or read store).
- Unmount: unsubscribe.
- Renders: fixed-height container (e.g. 56px). Content by status: idle → empty/placeholder; prompt_open → message + [Yes] [No]; active → steps + dropdown; completed → summary + locked.
- On [Yes]: call `userChoseYes()`.
- On [No]: call `userChoseNo()`.
- On next-tool select: call `userSelectedNextTool(...)`; then `navigate(selected.pathname)` (Tracker must have access to navigate, e.g. useNavigate() or callback from app).

### 12.3 Tool pages

- In the same block where `setStatus('completed')` (and optionally `trackEvent('job_completed', ...)`) is called, add: `emitToolCompleted({ toolId: '<tool-id>', pathname: '/path' })`. One call per success path. Do not read from workflow store; do not subscribe to emitter.

### 12.4 Layout

- No dynamic padding on main or any parent.
- Tracker: always same height; no conditional height or unmount-that-removes-bar.

### 12.5 Tool list (pathname / id)

- video-to-transcript: `/video-to-transcript`
- video-to-subtitles: `/video-to-subtitles`
- batch-process: `/batch-process`
- translate-subtitles: `/translate-subtitles`
- fix-subtitles: `/fix-subtitles`
- burn-subtitles: `/burn-subtitles`
- compress-video: `/compress-video`
- (+ SEO routes that delegate to these tools: call emit with the canonical tool id and pathname used by the app)

---

This document is the refined architecture: module-scoped store + emitter, timer on first toolCompleted(), ignore rules for prompt_open and completed, explicit navigation and post-completed behavior, and deterministic layout with no dynamic padding.
