-- Add rankingPoints with a sensible default.
ALTER TABLE "Team" ADD COLUMN "rankingPoints" INTEGER NOT NULL DEFAULT 1500;
-- Backfill from existing tier so the strength balancer still has signal:
--   T1 → 1900, T2 → 1750, T3 → 1600, T4 → 1450
UPDATE "Team" SET "rankingPoints" = 1900 - GREATEST(0, "tier" - 1) * 150;
