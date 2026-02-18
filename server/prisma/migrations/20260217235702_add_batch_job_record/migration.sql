-- CreateTable
CREATE TABLE "BatchJobRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalVideos" INTEGER NOT NULL,
    "totalDuration" INTEGER NOT NULL,
    "processedVideos" INTEGER NOT NULL DEFAULT 0,
    "failedVideos" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "zipPath" TEXT,
    "zipSize" INTEGER,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchJobRecord_pkey" PRIMARY KEY ("id")
);
