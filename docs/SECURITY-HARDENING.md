# Security Hardening Notes

## P2: Auth token storage (F11)

- **Current:** JWT is stored in `localStorage` (`authToken`) and sent as `Authorization: Bearer` on API requests.
- **Risk:** XSS can steal the token. No HttpOnly/Secure/SameSite for the token itself.
- **Defense-in-depth:** Ensure no dangerous `innerHTML` or unsanitized user content in the client. Consider a Content-Security-Policy (CSP) in production (Vercel headers or Caddy) that allows only required origins and scripts.
- **Planned:** Migrate to HttpOnly cookie for session/token with Secure and SameSite, plus CSRF protection. This is a larger change and should be done in a dedicated pass.

## New environment variables (security fixes)

- **REDIS_PASSWORD** (optional): When set, Redis in Docker uses `requirepass`. Set `REDIS_URL=redis://:YOUR_PASSWORD@redis:6379` for api/worker.
- **POSTGRES_PASSWORD** (recommended for production): Used in docker-compose for Postgres and DATABASE_URL. Defaults to `videotools` for local dev only; set a strong value in `.env` for production.
