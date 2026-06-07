-- Replace the (drawId, teamId) unique constraint with a wider one that also
-- includes participantId, so the same team can be allocated to multiple
-- participants (duplicates) when teams don't divide evenly.
DROP INDEX IF EXISTS "TeamAllocation_drawId_teamId_key";
CREATE UNIQUE INDEX "TeamAllocation_drawId_teamId_participantId_key"
  ON "TeamAllocation"("drawId", "teamId", "participantId");
CREATE INDEX IF NOT EXISTS "TeamAllocation_drawId_teamId_idx"
  ON "TeamAllocation"("drawId", "teamId");
