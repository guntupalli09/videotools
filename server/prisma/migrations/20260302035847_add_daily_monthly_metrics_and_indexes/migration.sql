-- CreateTable
CREATE TABLE "DailyMetrics" (
    "date" TIMESTAMP(3) NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "newUsers" INTEGER NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "jobsCreated" INTEGER NOT NULL,
    "jobsCompleted" INTEGER NOT NULL,
    "jobsFailed" INTEGER NOT NULL,
    "avgProcessingMs" INTEGER,
    "p95ProcessingMs" INTEGER,
    "mrrCents" INTEGER NOT NULL,
    "churnedUsers" INTEGER NOT NULL,
    "newPaidUsers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetrics_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "MonthlyMetrics" (
    "monthStart" TIMESTAMP(3) NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "newUsers" INTEGER NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "mrrCents" INTEGER NOT NULL,
    "newMrrCents" INTEGER NOT NULL,
    "churnedMrrCents" INTEGER NOT NULL,
    "churnRatePercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyMetrics_pkey" PRIMARY KEY ("monthStart")
);

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_completedAt_idx" ON "Job"("completedAt");

-- CreateIndex
CREATE INDEX "SubscriptionSnapshot_periodStart_periodEnd_idx" ON "SubscriptionSnapshot"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
