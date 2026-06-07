// Long-running sync worker that pulls fixture + score updates from the
// configured football data provider on a fixed interval. Spawned automatically
// by server.mjs in production; can also be run manually with:
//
//   npx tsx scripts/sync-loop.ts [intervalSeconds]
//
// Interval defaults to 60s (or SYNC_INTERVAL_SECONDS env var if set). Set
// DISABLE_AUTO_SYNC=1 in the environment to skip the auto-spawn; useful when
// you want to run sync as a separate sidecar container instead.

import { prisma } from "../src/lib/db";
import { syncTournament } from "../src/lib/sync";

const intervalSec = (() => {
  const fromArg = parseInt(process.argv[2] ?? "", 10);
  if (Number.isFinite(fromArg) && fromArg > 0) return fromArg;
  const fromEnv = parseInt(process.env.SYNC_INTERVAL_SECONDS ?? "60", 10);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 60;
})();

console.log(`[sync-loop] starting — interval ${intervalSec}s`);

async function tick() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: { in: ["DRAW_READY", "LIVE"] } },
    select: { id: true, slug: true, name: true, status: true }
  });
  if (tournaments.length === 0) {
    console.log("[sync-loop] tick — no active tournaments");
    return;
  }
  for (const t of tournaments) {
    try {
      const report = await syncTournament(t.id);
      console.log(
        `[sync-loop] tick ${t.name}: matches=${report.matchesUpserted} new-events=${report.scoreEventsCreated}${report.championDecided ? " · CHAMPION CROWNED" : ""}`
      );
      // Promote DRAW_READY → LIVE once we see any match status from the API,
      // and LIVE → COMPLETED once a champion is decided.
      if (t.status === "DRAW_READY" && report.matchesUpserted > 0) {
        await prisma.tournament.update({
          where: { id: t.id },
          data: { status: "LIVE" }
        });
        console.log(`[sync-loop] ${t.name}: promoted to LIVE`);
      }
      if (report.championDecided) {
        await prisma.tournament.update({
          where: { id: t.id },
          data: { status: "COMPLETED" }
        });
      }
    } catch (e) {
      console.error(`[sync-loop] ${t.name} failed:`, (e as Error).message);
    }
  }
}

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

async function main() {
  while (!stopping) {
    try {
      await tick();
    } catch (e) {
      console.error("[sync-loop] tick error:", (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[sync-loop] fatal:", e);
  process.exit(1);
});
