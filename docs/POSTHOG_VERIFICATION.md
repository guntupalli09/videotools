# PostHog Verification Checklist

## Environment variables

- **Client (build-time):** `VITE_POSTHOG_KEY`, optional `VITE_POSTHOG_HOST` (default `https://app.posthog.com`)
- **Server:** `POSTHOG_KEY`, optional `POSTHOG_HOST` (default `https://app.posthog.com`)

If keys are unset, analytics are no-ops (no errors, no network calls).

---

## Dev-only console logs

- **Frontend:** In dev (`npm run dev`), every event is logged as `[analytics] <event> <props>` in the browser console.
- **Backend:** When `NODE_ENV !== 'production'`, server events are logged as `[analytics] <event> { distinctId, ...properties }` in the server console.

Use these to confirm events fire before checking PostHog.

---

## PostHog dashboard verification

1. **Project setup**
   - In PostHog: Project Settings → Project API Key (used as `VITE_POSTHOG_KEY` / `POSTHOG_KEY`).

2. **Live events**
   - Go to **Activity** or **Events** (live stream).
   - Use the app: open a page, select a file, start an upload, wait for job completion, click Download, open Pricing and click a plan.
   - Confirm events appear within a short delay:
     - `page_viewed` (pathname changes)
     - `file_selected` (tool_type, file_size_bytes)
     - `upload_started` / `upload_completed` (tool_type, upload_mode, job_id)
     - `job_started` / `job_completed` (job_id, processing_time_ms)
     - `result_downloaded` (tool_type, job_id)
     - `plan_clicked` / `plan_upgraded`
     - `job_created`, `processing_started`, `processing_finished` (server-side)

3. **Event properties**
   - Click an event and check properties: `tool_type`, `file_size_bytes`, `upload_mode`, `job_id`, `processing_time_ms`, `plan`, etc.

4. **User identification**
   - After checkout (or with `userId` in localStorage), events should be associated with the same distinct_id (user).
   - Anonymous users still have events (distinct_id = anonymous ID).

5. **Server-side events**
   - Run the server with `POSTHOG_KEY` set; trigger a job (upload → process).
   - In PostHog, filter by event name: `job_created`, `processing_started`, `processing_finished`, `processing_failed`.
   - Check `distinct_id` (job_id or user_id) and properties.

---

## Quick smoke test

1. Set `VITE_POSTHOG_KEY` and `POSTHOG_KEY` in env.
2. Start client and server in dev.
3. Open app → navigate to a tool → select a file → start processing → wait for success → click Download.
4. In browser console: see `[analytics]` lines for page_viewed, file_selected, upload_started, upload_completed, job_started, job_completed, result_downloaded.
5. In server console: see `[analytics]` for job_created, processing_started, processing_finished.
6. In PostHog Live events: see the same events with correct properties.
