// Standalone fixture/score sync runner. Schedule with cron / Unraid User Scripts:
//   docker exec fifa-sweepstakes node /app/scripts/sync-fixtures.js
// or:
//   npm run sync:fixtures

import { prisma } from "../src/lib/db";
import { syncTournament } from "../src/lib/sync";

async function main() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: { in: ["DRAW_READY", "LIVE"] } },
    select: { id: true, name: true }
  });
  if (tournaments.length === 0) {
    console.log("No live tournaments to sync.");
    return;
  }
  for (const t of tournaments) {
    try {
      const report = await syncTournament(t.id);
      console.log(`[sync] ${t.name}:`, report);
      if (report.matchesUpserted > 0 && report.scoreEventsCreated > 0) {
        await prisma.tournament.update({ where: { id: t.id }, data: { status: "LIVE" } });
      }
      if (report.championDecided) {
        await prisma.tournament.update({ where: { id: t.id }, data: { status: "COMPLETED" } });
      }
    } catch (e) {
      console.error(`[sync] ${t.name} failed:`, e);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
