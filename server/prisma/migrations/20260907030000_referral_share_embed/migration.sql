-- Referral program fields on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredByUserId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusImportCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralSignupCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX IF NOT EXISTS "User_referredByUserId_idx" ON "User"("referredByUserId");

-- Transcript share owner plan snapshot (branding on public pages)
ALTER TABLE "TranscriptShare" ADD COLUMN IF NOT EXISTS "ownerPlan" TEXT NOT NULL DEFAULT 'free';

-- Referral signup audit
CREATE TABLE IF NOT EXISTS "ReferralSignup" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "refereeUserId" TEXT NOT NULL,
    "bonusCredits" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralSignup_refereeUserId_key" ON "ReferralSignup"("refereeUserId");
CREATE INDEX IF NOT EXISTS "ReferralSignup_referrerUserId_idx" ON "ReferralSignup"("referrerUserId");

ALTER TABLE "ReferralSignup" DROP CONSTRAINT IF EXISTS "ReferralSignup_referrerUserId_fkey";
ALTER TABLE "ReferralSignup" ADD CONSTRAINT "ReferralSignup_referrerUserId_fkey"
  FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralSignup" DROP CONSTRAINT IF EXISTS "ReferralSignup_refereeUserId_fkey";
ALTER TABLE "ReferralSignup" ADD CONSTRAINT "ReferralSignup_refereeUserId_fkey"
  FOREIGN KEY ("refereeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
