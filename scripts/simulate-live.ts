// Long-running demo simulator: every few seconds, advance random in-play matches
// (random goal, status change at full time) and persist the score events so the
// leaderboard moves. Hits the running server's admin sync API to also trigger
// Socket.IO broadcasts.
//
// Usage: npm run demo:simulate -- <tournament-slug-or-id> [--interval 5000]

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i > -1) return process.argv[i + 1];
  return def;
}

async function tick(tournamentId: string) {
  const live = await prisma.match.findMany({
    where: { tournamentId, status: "IN_PLAY" },
    include: { homeTeam: true, awayTeam: true }
  });
  if (live.length === 0) {
    // Promote one scheduled match to live, if any.
    const next = await prisma.match.findFirst({
      where: { tournamentId, status: "SCHEDULED" },
      orderBy: { kickoff: "asc" }
    });
    if (next) {
      await prisma.match.update({
        where: { id: next.id },
        data: { status: "IN_PLAY", kickoff: new Date(), homeScore: 0, awayScore: 0 }
      });
      console.log(`[sim] kickoff: match ${next.id} promoted to IN_PLAY`);
    }
    return;
  }

  // Pick a random live match. 30% chance of a goal, 10% chance of full time.
  const m = live[Math.floor(Math.random() * live.length)];
  const elapsedMin = (Date.now() - m.kickoff.getTime()) / 60000;
  const r = Math.random();

  if (elapsedMin > 70 && r < 0.2) {
    // Full time.
    const hs = m.homeScore ?? 0;
    const as = m.awayScore ?? 0;
    const winnerSide = hs > as ? "HOME" : as > hs ? "AWAY" : null;
    await prisma.match.update({
      where: { id: m.id },
      data: { status: "FINISHED", winnerSide }
    });
    // Award W/D/L points.
    if (m.homeTeamId && m.awayTeamId) {
      const awards: [string, string, number][] =
        winnerSide === "HOME"
          ? [[m.homeTeamId, "WIN", 3], [m.awayTeamId, "LOSS", 0]]
          : winnerSide === "AWAY"
            ? [[m.awayTeamId, "WIN", 3], [m.homeTeamId, "LOSS", 0]]
            : [[m.homeTeamId, "DRAW", 1], [m.awayTeamId, "DRAW", 1]];
      for (const [teamId, kind, pts] of awards) {
        await prisma.scoreEvent.upsert({
          where: { matchId_teamId_kind: { matchId: m.id, teamId, kind } },
          create: { tournamentId, matchId: m.id, teamId, kind, points: pts },
          update: {}
        });
      }
    }
    console.log(`[sim] FT: ${m.homeTeam?.name} ${hs}-${as} ${m.awayTeam?.name}`);
  } else if (r < 0.35) {
    // Score a goal. Slight home advantage.
    const homeGoal = Math.random() < 0.52;
    const data = homeGoal
      ? { homeScore: (m.homeScore ?? 0) + 1 }
      : { awayScore: (m.awayScore ?? 0) + 1 };
    await prisma.match.update({ where: { id: m.id }, data });
    const newH = homeGoal ? (m.homeScore ?? 0) + 1 : (m.homeScore ?? 0);
    const newA = homeGoal ? (m.awayScore ?? 0) : (m.awayScore ?? 0) + 1;
    console.log(
      `[sim] GOAL ${homeGoal ? m.homeTeam?.name : m.awayTeam?.name}! ${m.homeTeam?.name} ${newH}-${newA} ${m.awayTeam?.name}`
    );
  }
}

async function notifyServer(slug: string) {
  // Tell the running server to re-broadcast so connected clients update.
  const port = process.env.PORT ?? "3000";
  try {
    await fetch(`http://localhost:${port}/api/dev/simulate-pulse?slug=${slug}`, { method: "POST" });
  } catch {
    // Server might be down; sim still updates DB, polling will pick it up.
  }
}

async function main() {
  const idOrSlug = process.argv[2];
  const interval = parseInt(arg("interval", "4000") ?? "4000", 10);
  if (!idOrSlug) {
    console.error("Usage: npm run demo:simulate -- <tournament-slug-or-id> [--interval 4000]");
    process.exit(1);
  }
  const t = await prisma.tournament.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, slug: true, name: true }
  });
  if (!t) {
    console.error(`Tournament not found: ${idOrSlug}`);
    process.exit(1);
  }
  console.log(`[sim] simulating live scores for '${t.name}' every ${interval}ms — Ctrl+C to stop`);

  // Tick forever.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick(t.id);
      await notifyServer(t.slug);
    } catch (e) {
      console.error("[sim] tick error:", e);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
