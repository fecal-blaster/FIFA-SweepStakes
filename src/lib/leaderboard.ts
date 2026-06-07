import { prisma } from "@/lib/db";
import { DEFAULT_SCORING, type ScoringRules } from "@/lib/scoring";
import { distributePrizePool } from "@/lib/money";
import { teamStrength } from "@/lib/allocation";

export type ScoreEventDetail = {
  kind: string;
  /** Human-readable label, e.g. "Win vs Brazil" or "Reach Quarter-final". */
  label: string;
  points: number;
  matchId: string | null;
  at: string; // ISO timestamp
};

export type TeamBreakdown = {
  id: string;
  name: string;
  code: string | null;
  flagUrl: string | null;
  tier: number;
  /** Other participants who also hold this team (shared duplicate). */
  sharedWith: { id: string; name: string }[];
  points: number;
  events: ScoreEventDetail[];
};

export type LeaderboardRow = {
  rank: number;
  participantId: string;
  name: string;
  paid: boolean;
  teams: TeamBreakdown[];
  points: number;
  projectedPrizeMinor: number;
  /** Sum of teamStrength(tier) across this participant's teams. */
  poolStrength: number;
  /** Pool strength as a percentage of the room total. */
  poolStrengthPct: number;
};

export type LeaderboardSummary = {
  rows: LeaderboardRow[];
  prizePoolMinor: number;
  participantsTotal: number;
  participantsPaid: number;
  currency: string;
  /** Ideal pool strength % if perfectly balanced (100 / participants). */
  fairPoolPct: number;
};

const EVENT_LABELS: Record<string, string> = {
  WIN: "Win",
  DRAW: "Draw",
  LOSS: "Loss",
  QUALIFY_R16: "Reach Round of 16",
  QUALIFY_QF: "Reach Quarter-final",
  QUALIFY_SF: "Reach Semi-final",
  QUALIFY_FINAL: "Reach the Final",
  CHAMPION: "Tournament winner"
};

function eventLabel(kind: string, opponentName: string | null): string {
  const base = EVENT_LABELS[kind] ?? kind;
  if ((kind === "WIN" || kind === "DRAW" || kind === "LOSS") && opponentName) {
    return `${base} vs ${opponentName}`;
  }
  return base;
}

export async function computeLeaderboard(tournamentId: string): Promise<LeaderboardSummary> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      participants: {
        include: {
          allocations: {
            where: { draw: { isActive: true } },
            include: {
              team: {
                include: {
                  scoreEvents: {
                    include: {
                      match: {
                        select: {
                          id: true,
                          homeTeamId: true,
                          awayTeamId: true,
                          homeTeam: { select: { name: true } },
                          awayTeam: { select: { name: true } }
                        }
                      }
                    },
                    orderBy: { createdAt: "asc" }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  if (!tournament) throw new Error("Tournament not found");

  const _rules: ScoringRules =
    (tournament.scoringJson as unknown as ScoringRules) ?? DEFAULT_SCORING;
  // Rules already baked into ScoreEvent.points at write time — sum is enough.

  // Build a quick lookup of every participant who owns each teamId — so we can
  // surface "shared with Alice & Bob" on duplicated teams.
  const ownersByTeam = new Map<string, { id: string; name: string }[]>();
  for (const p of tournament.participants) {
    for (const a of p.allocations) {
      const list = ownersByTeam.get(a.team.id) ?? [];
      list.push({ id: p.id, name: p.name });
      ownersByTeam.set(a.team.id, list);
    }
  }

  const rows: Omit<LeaderboardRow, "rank" | "projectedPrizeMinor" | "poolStrengthPct">[] = tournament.participants.map(
    (p) => {
      const teams: TeamBreakdown[] = p.allocations.map((a) => {
        const events: ScoreEventDetail[] = a.team.scoreEvents.map((e) => {
          // Figure out the opponent of the team that scored this event.
          let opponent: string | null = null;
          if (e.match) {
            if (e.match.homeTeamId === a.team.id) {
              opponent = e.match.awayTeam?.name ?? null;
            } else if (e.match.awayTeamId === a.team.id) {
              opponent = e.match.homeTeam?.name ?? null;
            }
          }
          return {
            kind: e.kind,
            label: eventLabel(e.kind, opponent),
            points: e.points,
            matchId: e.matchId,
            at: e.createdAt.toISOString()
          };
        });
        const points = events.reduce((s, ev) => s + ev.points, 0);
        return {
          id: a.team.id,
          name: a.team.name,
          code: a.team.code,
          flagUrl: a.team.flagUrl,
          tier: a.team.tier,
          sharedWith: (ownersByTeam.get(a.team.id) ?? [])
            .filter((o) => o.id !== p.id),
          points,
          events
        };
      });

      const points = teams.reduce((sum, t) => sum + t.points, 0);
      const poolStrength = teams.reduce((s, t) => s + teamStrength(t.tier), 0);
      return { participantId: p.id, name: p.name, paid: p.paid, teams, points, poolStrength };
    }
  );

  const totalStrength = rows.reduce((s, r) => s + r.poolStrength, 0) || 1;

  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const paidCount = tournament.participants.filter((p) => p.paid).length;
  const prizePoolMinor = paidCount * tournament.buyInMinor;
  const payoutBps = (tournament.payoutBpsJson as number[]) ?? [5000, 3333, 1667];
  const prizes = distributePrizePool(prizePoolMinor, payoutBps);

  let rank = 0;
  let lastPoints: number | null = null;
  let lastRank = 0;
  const out: LeaderboardRow[] = rows.map((r, idx) => {
    rank = idx + 1;
    if (lastPoints !== null && r.points === lastPoints) rank = lastRank;
    lastRank = rank;
    lastPoints = r.points;
    const projected = prizes[idx] ?? 0;
    const poolStrengthPct = (r.poolStrength / totalStrength) * 100;
    return { ...r, rank, projectedPrizeMinor: projected, poolStrengthPct };
  });

  return {
    rows: out,
    prizePoolMinor,
    participantsTotal: tournament.participants.length,
    participantsPaid: paidCount,
    currency: tournament.currency,
    fairPoolPct: tournament.participants.length > 0 ? 100 / tournament.participants.length : 0
  };
}
