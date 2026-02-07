# User tracking guide for VideoText

How tracking works today and how to add proper user/analytics tracking.

---

## 1. What you have today

### Identity (who is the user?)

| Context | How it works |
|--------|----------------|
| **Anonymous (free)** | Client sends `x-user-id` from `localStorage`, or `demo-user` if none. Server creates/gets a User in memory for that ID. |
| **After Stripe checkout** | Success URL has `?payment=success&session_id=...`. Client calls `getSessionDetails(sessionId)` → server returns `{ userId, plan }`. Client stores `userId` and `plan` in `localStorage`; all later requests use that `userId`. |

So “users” are identified by a string ID (Stripe-backed for paid, or anonymous ID in localStorage). There is no login form; paid identity comes from Stripe checkout.

### Usage (minutes, jobs)

- **Server:** `User` model (in-memory `Map` in `server/src/models/User.ts`) holds `usageThisMonth`: totalMinutes, videoCount, batchCount, etc. Worker updates this when jobs complete.
- **Reset:** Free users reset by calendar month; paid users by Stripe billing period (when you set `billingPeriodEnd` from webhooks).
- **UsageLog** (`server/src/models/UsageLog.ts`): defined but **never called** (`addUsageLog` is not used anywhere). So you have no persistent event log today.

### Analytics (product behavior)

- **Client:** `client/src/lib/analytics.ts` exposes `trackEvent(event, props)`. Events already used: `processing_started`, `processing_completed`, `paywall_shown`, `payment_completed`, etc.
- **Current behavior:** In DEV it only `console.log`s. There is **no backend** (no GA, Plausible, PostHog, etc.), so you don’t see funnels or retention anywhere.

### Persistence

- **Users and usage:** In-memory only. Restart the server → all users and usage (except what Stripe has) are lost. The code comment in `User.ts` says this should be backed by a database.
- **Jobs:** Bull stores job state in **Redis**, so job queue and job status survive restarts. Redis is not used for User or UsageLog.

---

## 2. What “tracking users” usually means

| Goal | What you need |
|------|----------------|
| **See product usage (funnels, retention, which tools are used)** | Product analytics: send client (and optionally server) events to a provider (GA4, Plausible, PostHog, Mixpanel). |
| **Know who did what (per user, over time)** | Persistent user store (DB or Redis) + optional usage/event log. |
| **Know where signups came from (e.g. Product Hunt)** | Capture UTM/referrer on first visit and/or at checkout; store with user or send to analytics. |
| **Billing and limits** | You already have this (User.usageThisMonth + Stripe). To keep it across restarts, persist User (and optionally usage log) to a DB. |

---

## 3. Recommended approaches

### A. Product analytics (behavior) — quick win

Wire your existing `trackEvent()` to one analytics provider so you get:

- Page views and navigation
- Events: processing_started, processing_completed, paywall_shown, checkout started, etc.
- Optional: user ID (anonymous or paid) so you can segment “paid vs free” and retention

**Options:**

1. **Google Analytics 4 (GA4)**  
   - Create a GA4 property, get Measurement ID (`G-XXXX`).  
   - In the client, load `gtag.js` and send events with `gtag('event', eventName, props)`.  
   - In `analytics.ts`: if `window.gtag` exists, call it; else keep console.log for DEV.

2. **Plausible**  
   - Privacy-focused, minimal setup.  
   - Add script tag; use their custom events API for `trackEvent` (e.g. `plausible(eventName, { props: props })`).

3. **PostHog**  
   - Self-host or cloud.  
   - Install `posthog-js`, call `posthog.capture(eventName, props)`.  
   - Gives you events + optional session recording and feature flags.

**Minimal code change:** keep a single `trackEvent()` in your app; inside it, call the chosen provider (and optionally send a hashed or raw userId if you’re comfortable with your privacy policy).

**UTM / referrer for launch:**  
- Capture `document.referrer` and `window.location.search` (UTM params) on first load.  
- Store in sessionStorage or send with the first event (e.g. `first_visit` or `page_view`) so you can attribute “sessions from Product Hunt” in your analytics.

---

### B. Persistent user and usage (who did what, across restarts)

Right now, User and UsageLog are in-memory only. To “track users” in the sense of “know who they are and what they did over time” (and not lose them on restart):

1. **Persist the User store**
   - **Option 1 – PostgreSQL (or SQLite):** Add a `users` table (id, email, plan, stripeCustomerId, usageThisMonth fields, etc.). In `getUser`/`saveUser`, read/write from DB instead of a Map. Same for billing period and overages.
   - **Option 2 – Redis:** Store each user as a key like `user:{userId}` with a JSON or hash of fields; on startup you can hydrate a Map from Redis or read through Redis on every access. Simpler than a full DB but less suited for complex queries or reporting.

2. **Optionally use UsageLog**
   - When a job completes (in the worker), call `addUsageLog({ userId, eventType: 'video_processed', minutesUsed, ... })`.
   - Persist `UsageLog` to the same DB (table `usage_logs`) or to Redis (e.g. a list or stream). Then you can report “minutes per user per day” or “events per user.”

3. **Stripe as source of truth for paid users**
   - You already create/update User from Stripe (checkout + webhooks). Keep doing that; the new part is persisting that User (and usage) so it survives restarts.

---

## 4. Privacy and policy

- **Privacy policy:** You already state you don’t store file content. If you add analytics, say so in the “Cookies and analytics” section (e.g. “We use [X] to understand how the product is used and to improve it.”).
- **User ID in analytics:** For anonymous users you can send a device/session ID (e.g. from localStorage); for paid users you can send the same `userId` you use server-side, or a hash of it, depending on how much you want to segment in the analytics tool.
- **No PII in events:** Prefer not to send email or raw content in event props; stick to tool name, plan, and aggregate counts.

---

## 5. Quick checklist

| Task | Effort | Impact |
|------|--------|--------|
| Wire `trackEvent()` to GA4 or Plausible | Low | See funnels, tool usage, paywall hits |
| Capture UTM/referrer on first visit and send with first event | Low | Attribute Product Hunt (and other) traffic |
| Persist User (and usage) to PostgreSQL | Medium | No data loss on restart; can report “users” and “usage over time” |
| Call `addUsageLog()` in worker and persist to DB | Low–Medium | Per-user usage history and simple reporting |
| Add optional “user ID” to analytics events (anonymous vs paid) | Low | Segment behavior by plan or conversion |

If you tell me which you want first (analytics only vs persistence vs both), I can outline exact code changes (e.g. `analytics.ts` + one provider, or a minimal User persistence layer).
