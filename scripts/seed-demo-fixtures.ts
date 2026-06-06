// Populate a tournament with realistic demo fixtures:
//   - 8 group matches FINISHED with random scores
//   - 4 group matches IN_PLAY now
//   - 8 group matches SCHEDULED soon
//   - A starter set of knockout placeholders
//
// Usage: npm run demo:fixtures -- <tournament-slug-or-id>

import { PrismaClient, type Team } from "@prisma/client";

const prisma = new PrismaClient();

function pick<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function pairs<T>(arr: T[]): [T, T][] {
  const out: [T, T][] = [];
  for (let i = 0; i + 1 < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
  return out;
}

function randomScore(): [number, number] {
  // Mostly low scores like real football.
  const r = Math.random();
  if (r < 0.18) return [0, 0];
  if (r < 0.35) return [1, 0];
  if (r < 0.5) return [2, 1];
  if (r < 0.6) return [1, 1];
  if (r < 0.7) return [3, 0];
  if (r < 0.8) return [2, 0];
  if (r < 0.9) return [3, 1];
  return [Math.floor(Math.random() * 3), Math.floor(Math.random() * 3)];
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: npm run demo:fixtures -- <tournament-slug-or-id>");
    process.exit(1);
  }
  const t = await prisma.tournament.findFirst({
    where: { OR: [{ id: arg }, { slug: arg }] },
    include: { teams: true }
  });
  if (!t) {
    console.error(`Tournament not found: ${arg}`);
    process.exit(1);
  }
  if (t.teams.length < 16) {
    console.error(`Tournament has only ${t.teams.length} teams — need at least 16.`);
    process.exit(1);
  }

  // Wipe existing demo fixtures so this is idempotent during dev.
  await prisma.match.deleteMany({
    where: { tournamentId: t.id, externalId: { startsWith: "demo-" } }
  });
  // Score events tied to those matches cascade.

  const groupTeams = pick(t.teams, 24);
  const finishedTeams = groupTeams.slice(0, 16);
  const liveTeams = groupTeams.slice(16, 24);

  const finishedPairs = pairs(finishedTeams);
  const livePairs = pairs(liveTeams);
  const upcomingPairs = pairs(pick(t.teams, 16));

  const now = Date.now();
  let n = 0;

  for (const [home, away] of finishedPairs) {
    const [hs, as] = randomScore();
    await prisma.match.create({
      data: {
        tournamentId: t.id,
        externalId: `demo-fin-${n++}`,
        stage: "GROUP",
        groupName: String.fromCharCode(65 + (n % 8)),
        kickoff: new Date(now - (n + 1) * 3 * 60 * 60 * 1000),
        status: "FINISHED",
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: hs,
        awayScore: as,
        winnerSide: hs > as ? "HOME" : as > hs ? "AWAY" : null
      }
    });
  }

  // Live: kickoff was 5-70 min ago so live minute is realistic.
  for (const [home, away] of livePairs) {
    const minsAgo = 5 + Math.floor(Math.random() * 60);
    const [hs, as] = randomScore();
    await prisma.match.create({
      data: {
        tournamentId: t.id,
        externalId: `demo-live-${n++}`,
        stage: "GROUP",
        groupName: String.fromCharCode(65 + (n % 8)),
        kickoff: new Date(now - minsAgo * 60 * 1000),
        status: "IN_PLAY",
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: Math.min(hs, 4),
        awayScore: Math.min(as, 4),
        winnerSide: null
      }
    });
  }

  // Upcoming: spread across the next 3 days.
  for (const [home, away] of upcomingPairs) {
    await prisma.match.create({
      data: {
        tournamentId: t.id,
        externalId: `demo-up-${n++}`,
        stage: "GROUP",
        groupName: String.fromCharCode(65 + (n % 8)),
        kickoff: new Date(now + (n + 1) * 90 * 60 * 1000),
        status: "SCHEDULED",
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: null,
        awayScore: null
      }
    });
  }

  // Score events for finished group matches so the leaderboard moves.
  const finishedMatches = await prisma.match.findMany({
    where: { tournamentId: t.id, externalId: { startsWith: "demo-fin-" } }
  });
  let eventCount = 0;
  for (const m of finishedMatches) {
    if (m.homeTeamId == null || m.awayTeamId == null || m.homeScore == null || m.awayScore == null) continue;
    const ensure = async (teamId: string, kind: string, points: number) => {
      await prisma.scoreEvent.upsert({
        where: { matchId_teamId_kind: { matchId: m.id, teamId, kind } },
        create: { tournamentId: t.id, matchId: m.id, teamId, kind, points },
        update: { points }
      });
      eventCount++;
    };
    if (m.homeScore > m.awayScore) {
      await ensure(m.homeTeamId, "WIN", 3);
      await ensure(m.awayTeamId, "LOSS", 0);
    } else if (m.awayScore > m.homeScore) {
      await ensure(m.awayTeamId, "WIN", 3);
      await ensure(m.homeTeamId, "LOSS", 0);
    } else {
      await ensure(m.homeTeamId, "DRAW", 1);
      await ensure(m.awayTeamId, "DRAW", 1);
    }
  }

  await prisma.tournament.update({
    where: { id: t.id },
    data: { status: "LIVE" }
  });

  console.log(
    `[demo] Tournament '${t.name}' now has ${finishedMatches.length} finished, ${livePairs.length} live, ${upcomingPairs.length} upcoming matches and ${eventCount} score events.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
