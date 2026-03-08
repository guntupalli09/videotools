-- Processed Stripe webhook event IDs — prevents double-processing on server restart or retry
CREATE TABLE "StripeEventLog" (
    "eventId"     TEXT NOT NULL,
    "eventType"   TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeEventLog_pkey" PRIMARY KEY ("eventId")
);

CREATE INDEX "StripeEventLog_processedAt_idx" ON "StripeEventLog"("processedAt");

-- Purge entries older than 30 days automatically (optional; kept as a manual cron; see fileCleanup)
