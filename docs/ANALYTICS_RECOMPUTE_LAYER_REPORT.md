# Analytics Recompute Layer — Implementation Report

## Migration name

`20260302035847_add_daily_monthly_metrics_and_indexes`

---

## Tables created

| Table | Primary key | Purpose |
|-------|-------------|--------|
| **DailyMetrics** | `date` (DateTime, midnight UTC) | One row per day: user counts, job counts, processing stats, MRR, churn, new paid. |
| **MonthlyMetrics** | `monthStart` (DateTime, first day of month UTC) | One row per month: user counts, MRR, new/churned MRR, churn rate. |

---

## Indexes added

| Table | Index | Columns |
|-------|--------|---------|
| Job | `Job_createdAt_idx` | `(createdAt)` |
| Job | `Job_completedAt_idx` | `(completedAt)` |
| SubscriptionSnapshot | `SubscriptionSnapshot_periodStart_periodEnd_idx` | `(periodStart, periodEnd)` |
| User | `User_createdAt_idx` | `(createdAt)` |

All are additive; no existing indexes were removed.

---

## Exact SQL used for percentile (p95)

Daily p95 processing time (milliseconds) for completed jobs in the day window:

```sql
SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs")::double precision AS p95
FROM "Job"
WHERE "status" = 'completed'
  AND "completedAt" >= $1
  AND "completedAt" < $2
  AND "processingMs" IS NOT NULL
```

- **Function:** `percentile_cont(0.95)` (continuous percentile, 95th).
- **Window:** Jobs with `completedAt` in `[dayStart, dayEnd)` and non-null `processingMs`.
- **Result:** Cast to `double precision`; script rounds to integer for `p95ProcessingMs`.

---

## Daily metrics formulas (summary)

| Metric | Source |
|--------|--------|
| totalUsers | `COUNT(User)` WHERE `createdAt` < dayEnd |
| newUsers | `COUNT(User)` WHERE `createdAt` IN [dayStart, dayEnd) |
| activeUsers | `COUNT(DISTINCT userId)` FROM Job WHERE `createdAt` IN [dayStart, dayEnd) |
| jobsCreated | `COUNT(Job)` WHERE `createdAt` IN [dayStart, dayEnd) |
| jobsCompleted | `COUNT(Job)` WHERE `status='completed'` AND `completedAt` IN [dayStart, dayEnd) |
| jobsFailed | `COUNT(Job)` WHERE `status='failed'` AND `createdAt` IN [dayStart, dayEnd) |
| avgProcessingMs | `AVG(processingMs)` WHERE completed in day, `processingMs` NOT NULL |
| p95ProcessingMs | `percentile_cont(0.95)` WITHIN GROUP (ORDER BY processingMs) same filter |
| mrrCents | `SUM(priceMonthly)` FROM SubscriptionSnapshot WHERE `status='active'` AND period contains end-of-day |
| churnedUsers | `COUNT(SubscriptionSnapshot)` WHERE `status='canceled'` AND `periodEnd` IN [dayStart, dayEnd) |
| newPaidUsers | `COUNT(SubscriptionSnapshot)` WHERE `periodStart` IN [dayStart, dayEnd) AND `status='active'` |

---

## Monthly metrics formulas (summary)

| Metric | Source |
|--------|--------|
| totalUsers | `COUNT(User)` WHERE `createdAt` < monthEnd |
| newUsers | `COUNT(User)` WHERE `createdAt` IN [monthStart, monthEnd) |
| activeUsers | `COUNT(DISTINCT userId)` FROM Job WHERE `createdAt` IN [monthStart, monthEnd) |
| mrrCents | `SUM(priceMonthly)` WHERE `status='active'` AND period contains end-of-month |
| newMrrCents | `SUM(priceMonthly)` WHERE `periodStart` IN [monthStart, monthEnd) |
| churnedMrrCents | `SUM(priceMonthly)` WHERE `status='canceled'` AND `periodEnd` IN [monthStart, monthEnd) |
| churnRatePercent | (churned snapshots in month) / (distinct users with active subscription at month start) × 100, or NULL if denominator 0 |

---

## Estimated runtime (90 days)

- **Per day:** ~6–12 raw queries (batched with `Promise.all`) + 1 upsert. With indexes, each query is a single table scan or index range scan; expect on the order of **tens of milliseconds per day** on a small/medium DB.
- **90 days:** ~90 × (2–4 batch rounds) ≈ **2–5 minutes** total for daily metrics, plus **&lt;1 minute** for 12 months.
- **Rough total:** **about 3–6 minutes** for `RECOMPUTE_DAYS=90` and `RECOMPUTE_MONTHS=12`. Scale with data size and connection latency.

---

## How to run (including nightly cron)

**One-off (from repo root or server dir):**

```bash
cd server
RECOMPUTE_DAYS=90 RECOMPUTE_MONTHS=12 npx tsx scripts/recomputeMetrics.ts
```

**Env (optional):**

- `RECOMPUTE_DAYS` — default `90`. Days back from today to recompute (daily metrics).
- `RECOMPUTE_MONTHS` — default `12`. Months back to recompute (monthly metrics).
- `DATABASE_URL` — required (e.g. from `.env.development` / `.env.production` or process env).

**Nightly via cron (example):**

Run once per day after midnight UTC so the previous full day is included:

```cron
# Recompute last 90 days + 12 months every day at 01:15 UTC
15 1 * * * cd /path/to/app/server && RECOMPUTE_DAYS=90 RECOMPUTE_MONTHS=12 npx tsx scripts/recomputeMetrics.ts >> /var/log/recomputeMetrics.log 2>&1
```

If the app runs in Docker or a different env, run the same command from the container or a host that has `DATABASE_URL` and Node/tsx:

```bash
# Example: run inside app container
docker exec -e RECOMPUTE_DAYS=90 -e RECOMPUTE_MONTHS=12 your-api-container npx tsx scripts/recomputeMetrics.ts
```

**Idempotency:** The script UPSERTs by `date` (daily) and `monthStart` (monthly). Re-running the same range only overwrites existing rows; safe to run daily or on demand.
