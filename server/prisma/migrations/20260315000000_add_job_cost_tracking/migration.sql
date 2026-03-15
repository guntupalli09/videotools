-- Add AI cost tracking fields to Job table
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "whisperCostMicros" INTEGER;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "totalAiCostMicros" INTEGER;
