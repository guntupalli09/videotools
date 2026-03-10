# Audit Gaps — Categorized by Fix Difficulty

**Purpose:** Fix all gaps without breaking functionality. Categories:
- **1. Surgical/Minimal** — Small, isolated changes; low risk
- **2. Medium** — Clear fixes needing moderate care
- **3. Hard** — Structural changes; needs careful execution and testing

---

## 1. SURGICAL AND MINIMAL (Easy to Fix)

### Infrastructure
| Gap | Location | Fix |
|-----|----------|-----|
| Postgres password visible in env block | docker-compose.yml:47,52 | `${POSTGRES_PASSWORD:-videotools}` is standard; move to `.env` only (no default in compose). Already uses env substitution — ensure `.env` is not committed. |
| No memory/CPU limits on containers | docker-compose.yml | Add `deploy.resources.limits` per service. 2–4 lines per service. |
| Redis has no maxmemory policy | docker-compose.yml | Add `command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru` (or similar). |

### Code — Quick Wins
| Gap | Location | Fix |
|-----|----------|-----|
| Silent catch on alert/digest | index.ts:255–257 | Replace `.catch(() => {})` with `.catch((e) => log.warn({ msg: 'Alert failed', error: (e as Error)?.message }))`. Same for digest. |
| `(j.data as any)?.userId` bypasses TypeScript | upload.ts:163 | Add `JobData` type and use `(j.data as JobData)?.userId`. |
| Error response format inconsistent | Various routes | Standardize: always return `{ message: string }` (or `{ error: string }` consistently). Audit all `res.status().json()`. |
| No Server-Timing headers | index.ts | Add middleware to set `Server-Timing` on responses. Optional, low impact. |

### Configuration
| Gap | Location | Fix |
|-----|----------|-----|
| vercel.json Cache-Control on index.html | vercel.json:14 | Change `/:path*/index.html` to `no-cache, no-store` (SPA index should not be cached). |
| No robots.txt | client/public | Exists at `client/public/robots.txt` — verify it’s included in Vercel build output. |

### Security — Low-Risk
| Gap | Location | Fix |
|-----|----------|-----|
| Stripe webhook "lacks visible validation" | stripeWebhook.ts:312 | Code uses `stripe.webhooks.constructEvent(buf, sig, webhookSecret)` — validates. Add explicit comment. |

---

## 2. MEDIUM (Can Be Fixed)

### Reliability
| Gap | Location | Fix |
|-----|----------|-----|
| EMERGENCY_AGE_MS=15min too aggressive | fileCleanup.ts:10 | Increase to 30–45 min. Add check: skip files that appear in active Bull jobs (or have mtime < job start + buffer). |
| FILE_MAX_AGE=1hr can delete mid-job | fileCleanup.ts:9 | Increase to 2–3 hr, or cross-check against active jobs before deleting. |
| Chunk assembly has no locking | upload.ts (chunk handler) | Add mutex per uploadId (e.g. `async-mutex`) around chunk write + assembly. |
| createPartialWriter Redis may not close on crash | videoProcessor.ts | Wrap in try/finally and call `writer.close()` in finally. |
| File stability wait 400ms | videoProcessor.ts:291 | Increase to 800–1000ms for slow disks; make configurable via env. |

### Memory & Resources
| Gap | Location | Fix |
|-----|----------|-----|
| chunkUploadMeta never pruned | upload.ts:39 | Prune on /complete (already done). Add TTL-based cleanup: remove entries older than 2–4 hr (abandoned uploads). |
| generateBatchZip error path doesn't release handles | videoProcessor.ts:211–213 | In `archive.on('error')`, call `output.destroy()`, `archive.abort()`, and `reject`. |
| batch marked "partial" when 100% fail | videoProcessor.ts:205 | Use `batch.failedVideos === batch.totalVideos ? 'failed' : batch.failedVideos > 0 ? 'partial' : 'completed'`. |

### Auth & Security
| Gap | Location | Fix |
|-----|----------|-----|
| OTP send endpoint no rate limit | auth.ts:117–141 | Add express-rate-limit (e.g. 5/min per IP, 3/min per email). |
| feedback.ts no auth, no rate limit | feedback.ts | Add rate limit (e.g. 5/min per IP). Optional: require JWT for starred feedback. |
| Batch download only checks batchId | batch.ts:340–359 | Validate `getEffectiveUserId(req)` matches `batch.userId` before streaming. |
| jobToken not validated against user | jobs.ts:88–99 | Logic already checks `allowedByToken` OR `allowedByUser`. jobToken is one-time use for anonymous — acceptable. If strict: ensure token in job data is bound to job, not user. Re-verify threat model. |
| Password reset token plaintext | auth.ts / User model | Store `passwordResetTokenHash` (bcrypt) instead of plaintext. Migration + code change. |

### API & Data
| Gap | Location | Fix |
|-----|----------|-----|
| Download endpoint no HTTP range | download.ts | Add `Range` header support for large files. Use `fs.createReadStream` with `start`/`end`. |
| Free users can enqueue past threshold | upload.ts, batch.ts | At soft limit (200), block free users only; allow paid. Use `isQueueAtSoftLimit` + plan check. |
| API key users plan='free' hardcoded | apiKey.ts:52 | Add optional `API_KEYS=key:userId:plan` format; fall back to looking up user plan from DB when key maps to userId. |

### Observability
| Gap | Location | Fix |
|-----|----------|-----|
| No heap memory monitoring | — | Add optional `process.memoryUsage()` log every 5 min when `MEMORY_DEBUG=1`. |
| StripeEventLog no TTL/cleanup | — | Add cron or Prisma job: delete rows older than 90 days. |

### Duplicate Cache (verify)
| Gap | Location | Fix |
|-----|----------|-----|
| duplicate.ts cache key ignores options | duplicate.ts | Code uses `computeOptionsHash(toolType, options)`. Verify `cacheOptions` at upload call includes `targetLanguage`, `additionalLanguages`, etc. If missing, add them. |

---

## 3. HARD (Very Careful Execution)

### Architecture & Scale
| Gap | Location | Fix |
|-----|----------|-----|
| Postgres pool max=10 | db.ts | Prisma 7+ uses adapter; pool config in connection URL. Add `?connection_limit=20` or use PgBouncer. With 2 replicas, 10 each = 20 total. Increase gradually. |
| MAX_GLOBAL_WORKERS=3 | queueConfig.ts:6 | Increase to 4–6 based on CPU. Test under load. |
| No global rate limit on uploads | index.ts / upload routes | Add Redis-backed global rate limit (e.g. 100 req/min across all users). Coordinate with per-user limit. |
| No load-adaptive job timeouts | videoProcessor.ts | Complex: need queue depth + estimated wait. Start with increasing timeouts for Pro; avoid reducing. |
| Redis single point of failure | — | Use Redis Sentinel or Upstash for HA. Major infra change. |
| No horizontal worker scaling | — | Use Kubernetes/Docker Swarm or managed queues (e.g. BullMQ + Redis Cluster). |

### Concurrency & Correctness
| Gap | Location | Fix |
|-----|----------|-----|
| No atomic transaction usage + job | upload.ts, batch.ts | Wrap `enforceUsageLimits` + `addJobToQueue` + `insertJobRecord` in Prisma transaction. Or use idempotency keys. |
| Batch job no uniqueness lock | batch.ts | Add unique constraint or Redis lock per `(userId, batchId)` during creation. |
| Chunk assembly concurrency | upload.ts | Add mutex (see Medium). |

### Memory & Streaming
| Gap | Location | Fix |
|-----|----------|-----|
| generateBatchZip loads entire batch into memory | videoProcessor.ts:195 | Use streaming ZIP (archiver already streams; verify it’s not buffering). If so, switch to `archiver` stream mode properly. |
| Large batch 100×2GB in memory | — | Ensure archiver streams; never read all files into memory. |

### Code Organization
| Gap | Location | Fix |
|-----|----------|-----|
| User creation duplicated | upload.ts, batch.ts, auth.ts | Extract `createUserForPlan(userId, plan, ...)` in User model. |
| Raw SQL in adminDashboard/Support | — | Move to repository layer or dedicated service. |
| Multiple separate Redis instances | auth.ts, uploadRateLimit, Bull | Create shared Redis pool; pass to Bull, OTP, rate limit. |
| Error handling inconsistent | Various | Standardize: either always `res.status().json()` or throw to middleware. |

### Testing & CI/CD
| Gap | Location | Fix |
|-----|----------|-----|
| No CI/CD beyond SEO lint | — | Add GitHub Actions: `npm run build`, `npx prisma validate`, optional `npm test`. |
| Zero test coverage | — | Start with API contract tests (e.g. supertest) for critical routes. |

### Database
| Gap | Location | Fix |
|-----|----------|-----|
| Missing index (userId, status) | Prisma schema | Add `@@index([userId, status])` on Job. |
| Missing index (status, periodStart) | SubscriptionSnapshot | Add `@@index([status, periodStart])` for MRR queries. |
| JSON columns no schema validation | User.usageThisMonth etc. | Add Zod/JSON Schema validation in save paths. |
| No deletedAt soft delete | — | Add `deletedAt` to User; filter in queries. Migration + many query updates. |
| Prisma migrations "not visible" | — | Migrations exist at `server/prisma/migrations/`. Document in README. |

### CORS
| Gap | Location | Fix |
|-----|----------|-----|
| *.vercel.app wildcard | index.ts:109 | Replace with explicit Vercel project URL(s) in CORS_ORIGINS. Or use `*.vercel.app` only when `NODE_ENV !== 'production'`. |

### UX & Product
| Gap | Location | Fix |
|-----|----------|-----|
| No warning before 3-import cap | client | Add banner/toast when user has 1–2 imports used. |
| Monthly reset UTC | usageReset | Document; consider user timezone in UI only (backend stays UTC). |
| Failed batch doesn't show which succeeded | client | API already returns `errors[]`; UI should display per-video status. |
| No retry button on failed jobs | client | Add retry that reuses same file if still in session, or prompt re-upload. |
| Audio extraction can fail silently | client | Add fallback UX: "Upload failed, try full video upload." |
| Overage charges not explained | client/pricing | Add tooltip/line: "$5 per 100 extra minutes." |

### SEO
| Gap | Location | Fix |
|-----|----------|-----|
| No og:image / twitter:card | client | Add to Helmet in App or layout. |
| hreflang missing | — | Add for 6 languages. |
| Sitemap not in CI/CD | — | Add sitemap generation to build or cron. |
| Tool pages generic descriptions | — | Add tool-specific meta. |
| Blog/changelog no schema | — | Add Article schema. |

---

## Recommended Fix Order

1. **Week 1 (Surgical):** Alert/digest logging, `(j.data as any)` fix, vercel.json cache, chunkUploadMeta TTL pruning, batch download auth, OTP rate limit, feedback rate limit.
2. **Week 2 (Medium):** FILE_MAX_AGE / EMERGENCY_AGE increases, batch error-path cleanup, batch status logic, StripeEventLog cleanup job, optional createPartialWriter finally.
3. **Week 3+ (Hard):** Pool size, indexes, user creation dedup, CORS tighten, retries (OpenAI/Resend/Stripe), then scaling/infra.

---

## Notes

- **duplicate.ts:** Cache key includes `optionsHash`; confirm all options (language, etc.) are passed at call sites.
- **Stripe webhook:** Signature validation is present via `constructEvent`.
- **Prisma migrations:** Exist in `server/prisma/migrations/`.
