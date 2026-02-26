# Security Hardening Notes

## Firewall (UFW) on production server

On the Hetzner (or any Linux) server, enable UFW so only SSH and HTTP/HTTPS are open. Redis and Postgres are not exposed to the host (Redis has no `ports:` in docker-compose; Postgres can stay on 127.0.0.1 or internal only).

**Run on the server (as root or with sudo):**

```bash
# Allow SSH first so you don't lock yourself out
ufw allow 22
ufw allow 80
ufw allow 443
# Optional: if API is on a different port, e.g. 3001 behind Caddy, you don't need to allow 3001 (Caddy listens on 80/443)
ufw enable
ufw status
```

**Important:** Run `ufw allow 22` before `ufw enable`. If SSH is on a non-default port, use that port (e.g. `ufw allow 2222`).

Redis stays on the Docker internal network only (no `ports:` in docker-compose); api and worker connect via `redis:6379`.

## P2: Auth token storage (F11)

- **Current:** JWT is stored in `localStorage` (`authToken`) and sent as `Authorization: Bearer` on API requests.
- **Risk:** XSS can steal the token. No HttpOnly/Secure/SameSite for the token itself.
- **Defense-in-depth:** Ensure no dangerous `innerHTML` or unsanitized user content in the client. Consider a Content-Security-Policy (CSP) in production (Vercel headers or Caddy) that allows only required origins and scripts.
- **Planned:** Migrate to HttpOnly cookie for session/token with Secure and SameSite, plus CSRF protection. This is a larger change and should be done in a dedicated pass.

## New environment variables (security fixes)

- **REDIS_PASSWORD** (optional): When set, Redis in Docker uses `requirepass`. Set `REDIS_URL=redis://:YOUR_PASSWORD@redis:6379` for api/worker.
- **POSTGRES_PASSWORD** (recommended for production): Used in docker-compose for Postgres and DATABASE_URL. Defaults to `videotools` for local dev only; set a strong value in `.env` for production.
