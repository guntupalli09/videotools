-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "toolId" TEXT,
    "stars" INTEGER,
    "comment" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
