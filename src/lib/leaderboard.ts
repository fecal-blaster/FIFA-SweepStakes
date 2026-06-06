import { prisma } from "@/lib/db";
import { DEFAULT_SCORING, type ScoringRules } from "@/lib/scoring";
import { distributePrizePool } from "@/lib/money";

export type LeaderboardRow = {
  rank: number;
  participantId: string;
  name: string;
  paid: boolean;
  teams: { id: string; name: string; code: string | null; flagUrl: string | null }[];
  points: number;
  projectedPrizeMinor: number;
};

export type LeaderboardSummary = {
  rows: LeaderboardRow[];
  prizePoolMinor: number;
  participantsTotal: number;
  participantsPaid: number;
  currency: string;
};

export async function computeLeaderboard(tournamentId: string): Promise<LeaderboardSummary> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      participants: {
        include: {
          allocations: {
            where: { draw: { isActive: true } },
            include: { team: { include: { scoreEvents: true } } }
          }
        }
      }
    }
  });
  if (!tournament) throw new Error("Tournament not found");

  const _rules: ScoringRules = (tournament.scoringJson as unknown as ScoringRules) ?? DEFAULT_SCORING;
  // Rules already baked into ScoreEvent.points at write time — sum is enough.

  const rows: Omit<LeaderboardRow, "rank" | "projectedPrizeMinor">[] = tournament.participants.map((p) => {
    const teams = p.allocations.map((a) => ({
      id: a.team.id,
      name: a.team.name,
      code: a.team.code,
      flagUrl: a.team.flagUrl
    }));
    const points = p.allocations.reduce(
      (sum, a) => sum + a.team.scoreEvents.reduce((s, e) => s + e.points, 0),
      0
    );
    return { participantId: p.id, name: p.name, paid: p.paid, teams, points };
  });

  // Sort by points desc, tiebreak by name for stable display.
  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const paidCount = tournament.participants.filter((p) => p.paid).length;
  const prizePoolMinor = paidCount * tournament.buyInMinor;
  const payoutBps = (tournament.payoutBpsJson as number[]) ?? [5000, 3333, 1667];
  const prizes = distributePrizePool(prizePoolMinor, payoutBps);

  // Assign 1226-style competition ranks (ties share rank, next slot skips).
  let rank = 0;
  let lastPoints: number | null = null;
  let lastRank = 0;
  const out: LeaderboardRow[] = rows.map((r, idx) => {
    rank = idx + 1;
    if (lastPoints !== null && r.points === lastPoints) rank = lastRank;
    lastRank = rank;
    lastPoints = r.points;
    const prizeIdx = idx; // projected prize follows finishing order, not shared rank
    const projected = prizes[prizeIdx] ?? 0;
    return { ...r, rank, projectedPrizeMinor: projected };
  });

  return {
    rows: out,
    prizePoolMinor,
    participantsTotal: tournament.participants.length,
    participantsPaid: paidCount,
    currency: tournament.currency
  };
}
