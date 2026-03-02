-- AlterTable
ALTER TABLE "SubscriptionSnapshot" ADD COLUMN     "billingInterval" TEXT,
ADD COLUMN     "intervalCount" INTEGER,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "SubscriptionSnapshot_stripeSubscriptionId_periodStart_idx" ON "SubscriptionSnapshot"("stripeSubscriptionId", "periodStart");
