# Verify Prisma schema in production

Use either **Option A** (script in API container) or **Option B** (psql in Postgres container).

---

## Option A — Script (if `tsx` is available in the API image)

From your **host** (e.g. `/opt/videotools`):

```bash
docker exec videotools-api npx tsx scripts/verifyPrismaProd.ts
```

If your image doesn’t ship `tsx`, use Option B.

---

## Option B — Manual checks with psql

From your **host**, run these against the Postgres container.  
Default compose: user `videotools`, db `videotext`. If you use a password, set `PGPASSWORD` or use `-W`.

### 1. List tables (expect 7)

```bash
docker exec videotools-postgres psql -U videotools -d videotext -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;"
```

You should see: `BatchJobRecord`, `DailyMetrics`, `Feedback`, `Job`, `MonthlyMetrics`, `SubscriptionSnapshot`, `User`.

### 2. User — analytics columns

```bash
docker exec videotools-postgres psql -U videotools -d videotext -c "\d \"User\"" | grep -E "role|utmSource|utmMedium|utmCampaign|firstReferrer|firstSeenAt|lastActiveAt|createdAt"
```

Expect: `role`, `utmSource`, `utmMedium`, `utmCampaign`, `firstReferrer`, `firstSeenAt`, `lastActiveAt`, `createdAt`.

### 3. Job table

```bash
docker exec videotools-postgres psql -U videotools -d videotext -c "\d \"Job\""
```

Expect columns: `id`, `userId`, `toolType`, `status`, `completedAt`, `processingMs`, `planAtRun`, `createdAt`, etc.

### 4. SubscriptionSnapshot — MRR fields

```bash
docker exec videotools-postgres psql -U videotools -d videotext -c "\d \"SubscriptionSnapshot\"" | grep -E "stripeSubscriptionId|stripePriceId|billingInterval|intervalCount"
```

Expect: `stripeSubscriptionId`, `stripePriceId`, `billingInterval`, `intervalCount`.

### 5. DailyMetrics & MonthlyMetrics

```bash
docker exec videotools-postgres psql -U videotools -d videotext -c "\d \"DailyMetrics\""
docker exec videotools-postgres psql -U videotools -d videotext -c "\d \"MonthlyMetrics\""
```

Expect: `DailyMetrics` has `date` (PK), `totalUsers`, `newUsers`, `activeUsers`, `jobsCreated`, `jobsCompleted`, `jobsFailed`, `avgProcessingMs`, `p95ProcessingMs`, `mrrCents`, `churnedUsers`, `newPaidUsers`.  
`MonthlyMetrics` has `monthStart` (PK), `totalUsers`, `newUsers`, `activeUsers`, `mrrCents`, `newMrrCents`, `churnedMrrCents`, `churnRatePercent`.

### 6. Indexes

```bash
docker exec videotools-postgres psql -U videotools -d videotext -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1;"
```

Expect at least: `User_createdAt_idx`, `Job_createdAt_idx`, `Job_completedAt_idx`, `SubscriptionSnapshot_periodStart_periodEnd_idx`.

---

## One-shot SQL checklist (run in psql)

Run inside the Postgres container (e.g. `docker exec -it videotools-postgres psql -U videotools -d videotext`), then paste:

```sql
-- Tables
SELECT 'Table: ' || tablename AS check FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- User analytics columns
SELECT 'User.' || column_name AS check FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'User'
  AND column_name IN ('role','utmSource','lastActiveAt','createdAt') ORDER BY 1;

-- Job exists
SELECT 'Job' AS check WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Job');

-- SubscriptionSnapshot MRR columns
SELECT 'Snapshot.' || column_name AS check FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'SubscriptionSnapshot'
  AND column_name IN ('stripeSubscriptionId','billingInterval','intervalCount') ORDER BY 1;

-- DailyMetrics / MonthlyMetrics
SELECT 'DailyMetrics' AS check WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DailyMetrics');
SELECT 'MonthlyMetrics' AS check WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MonthlyMetrics');

-- Indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('User_createdAt_idx','Job_createdAt_idx','Job_completedAt_idx','SubscriptionSnapshot_periodStart_periodEnd_idx') ORDER BY 1;
```

Interpretation: all expected tables and columns are present if the queries return the expected rows; the last query should return the four index names.
