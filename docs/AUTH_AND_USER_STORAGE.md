# Auth & User Storage (Production)

## Goal

- **Store login details** in a durable DB (survives restarts, multi-instance).
- **Forgot password** keeps working (reset tokens in DB).
- **Login / logout on any device**: same account works everywhere; logout can apply per-device or “everywhere”.

---

## Recommended Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Database** | **PostgreSQL** | Durable, scales, good for relational user/session data. Fits Hetzner/Docker. |
| **ORM** | **Prisma** | Type-safe, migrations, minimal boilerplate. Fits existing TypeScript server. |
| **Sessions** | **DB-backed sessions** | One row per login (device). Enables “log out everywhere” and revoke-by-token. |

---

## Data Model (High Level)

### 1. `users` table (replaces in-memory `Map`)

- `id` (text, PK) – e.g. Stripe `cus_*` or UUID for free users.
- `email` (text, unique, indexed).
- `password_hash` (text, nullable until they set password).
- `plan` (enum: free | basic | pro | agency).
- `stripe_customer_id` (text, unique, nullable).
- `subscription_id` (text, nullable).
- `billing_period_start`, `billing_period_end` (timestamptz, nullable).
- **Setup password (post-checkout)**  
  - `password_setup_token`, `password_setup_expires_at`, `password_setup_used`.
- **Forgot password**  
  - `password_reset_token`, `password_reset_expires_at`.
- **Usage** – either JSONB `usage_this_month` and `overages_this_month`, or separate columns.
- **Limits** – JSONB or columns (from plan).
- `created_at`, `updated_at` (timestamptz).

All current in-memory `User` fields move here; auth and billing keep the same logic, but read/write via Prisma.

### 2. `sessions` table (optional but recommended for “any device”)

- `id` (uuid, PK).
- `user_id` (text, FK → users.id).
- `token_hash` (text) – hash of the JWT or a random session token you issue.
- `expires_at` (timestamptz).
- `created_at` (timestamptz).
- Optional: `user_agent` or `device_info` for “log out everywhere” UI.

**Flow:**

- **Login**: create session row, issue JWT that includes `sessionId` (or sign over session id). Client stores JWT as today.
- **Each request**: validate JWT, then check that `sessions.id` exists and is not expired. If missing/expired → 401.
- **Logout (this device)**: delete the session row for that JWT.
- **Log out everywhere**: delete all `sessions` rows for that `user_id`.

That gives seamless login on any device (same email/password) and controllable logout (per device or all devices).

---

## Forgot Password (Unchanged Concept)

- **Request reset**: find user by email, set `password_reset_token` + `password_reset_expires_at` in DB, send email with link (as today).
- **Reset**: find user by `password_reset_token`, check expiry, set new `password_hash`, clear reset token.

Same API and client flow; only the storage backend switches from memory to DB.

---

## Implementation Order

1. **Add PostgreSQL + Prisma**
   - Docker: add `postgres` service; app connects via `DATABASE_URL`.
   - Prisma schema: `users` (and optionally `sessions`), match current `User` shape.
   - Migrations: create tables.

2. **User layer**
   - Replace in-memory `User` reads/writes with Prisma (`getUser`, `saveUser`, `getUserByEmail`, etc.). Keep the same function signatures so routes stay unchanged.
   - Migrate usage/limits serialization (JSON or columns).

3. **Auth routes**
   - Login: create session row, issue JWT including session id; validate session on protected routes.
   - Logout: delete session by token/session id.
   - (Optional) “Log out all devices”: endpoint that deletes all sessions for the current user.

4. **Client**
   - No change for login/logout/forgot password flow; only backend becomes persistent. Optional: add “Log out everywhere” in account/settings if you add that endpoint.

---

## Env

- `DATABASE_URL` – e.g. `postgresql://user:pass@postgres:5432/videotext` (Docker) or same for host/cloud Postgres.

---

## Summary

- **Best way to store login details**: PostgreSQL + Prisma, with a `users` table holding email, `password_hash`, and all current user fields.
- **Forgot password**: same flow; reset tokens live in `users` (or a small `password_reset_tokens` table if you prefer).
- **Login/logout on any device**: DB-backed sessions (one row per login); logout deletes that row (“this device”) or all rows for the user (“everywhere”). JWTs can stay; validation just adds a DB check against `sessions`.
