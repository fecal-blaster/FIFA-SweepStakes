ALTER TABLE "Match" ADD COLUMN "eventsJson" JSONB;
ALTER TABLE "Match" ADD COLUMN "lastEventsFetchedAt" TIMESTAMP(3);
