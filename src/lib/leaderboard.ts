import { prisma } from "@/lib/db";
import { DEFAULT_SCORING, type ScoringRules } from "@/lib/scoring";
import { teamStrength } from "@/lib/allocation";
import { prizeAmountMinor, resolvePrizes, type Prize } from "@/lib/prizes";

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
  rankingPoints: number;
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

export type ResolvedPrize = Prize & {
  /** Participant currently in line for this prize, if computable. */
  winnerParticipantId?: string;
  winnerName?: string;
  /** Computed dollar amount for the current pool. */
  amountMinor: number;
};

export type LeaderboardSummary = {
  rows: LeaderboardRow[];
  prizePoolMinor: number;
  participantsTotal: number;
  participantsPaid: number;
  currency: string;
  /** Ideal pool strength % if perfectly balanced (100 / participants). */
  fairPoolPct: number;
  /** Configured prizes for this tournament with resolved winners. */
  prizes: ResolvedPrize[];
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
          rankingPoints: a.team.rankingPoints,
          sharedWith: (ownersByTeam.get(a.team.id) ?? []).filter((o) => o.id !== p.id),
          points,
          events
        };
      });

      const points = teams.reduce((sum, t) => sum + t.points, 0);
      const poolStrength = teams.reduce(
        (s, t) => s + teamStrength({ tier: t.tier, rankingPoints: t.rankingPoints }),
        0
      );
      return { participantId: p.id, name: p.name, paid: p.paid, teams, points, poolStrength };
    }
  );

  const totalStrength = rows.reduce((s, r) => s + r.poolStrength, 0) || 1;

  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const paidCount = tournament.participants.filter((p) => p.paid).length;
  const prizePoolMinor = paidCount * tournament.buyInMinor;
  const tournamentPrizes = resolvePrizes(tournament.prizesJson, {
    payoutBpsJson: tournament.payoutBpsJson
  });

  // Red-card tally per participant — from match events stored on Match.eventsJson.
  // Counts RED_CARD + YELLOW_RED_CARD against teams in their pool (incl. shared).
  const allMatches = await prisma.match.findMany({
    where: { tournamentId },
    select: { eventsJson: true }
  });
  const redsByTeam = new Map<string, number>();
  for (const m of allMatches) {
    if (!m.eventsJson) continue;
    const events = m.eventsJson as { type: string; teamExtId?: string }[];
    for (const e of events) {
      if (e.type !== "RED_CARD" && e.type !== "YELLOW_RED_CARD") continue;
      if (!e.teamExtId) continue;
      redsByTeam.set(e.teamExtId, (redsByTeam.get(e.teamExtId) ?? 0) + 1);
    }
  }
  // Resolve team external IDs to internal IDs to map back to participants.
  const teams = await prisma.team.findMany({
    where: { tournamentId },
    select: { id: true, externalId: true }
  });
  const extToId = new Map(teams.filter((t) => t.externalId).map((t) => [t.externalId!, t.id]));
  // Sum reds per participant (each team can have multiple allocations).
  const redsByParticipant = new Map<string, number>();
  for (const p of tournament.participants) {
    let count = 0;
    for (const a of p.allocations) {
      // Find externalId for this team
      const team = teams.find((t) => t.id === a.team.id);
      if (!team?.externalId) continue;
      count += redsByTeam.get(team.externalId) ?? 0;
    }
    redsByParticipant.set(p.id, count);
  }
  void extToId;

  // Compute ranks first so we can attribute placement / wooden spoon prizes.
  let rank = 0;
  let lastPoints: number | null = null;
  let lastRank = 0;
  const ranked: (Omit<LeaderboardRow, "projectedPrizeMinor" | "poolStrengthPct">)[] = rows.map(
    (r, idx) => {
      rank = idx + 1;
      if (lastPoints !== null && r.points === lastPoints) rank = lastRank;
      lastRank = rank;
      lastPoints = r.points;
      return { ...r, rank };
    }
  );

  // Wooden spoon: the lowest-ranked PAID participant. Falls back to last
  // overall if everyone is unpaid (unlikely but defensive).
  const paidByRankDesc = ranked.filter((r) => r.paid).slice().reverse();
  const woodenSpoonId = paidByRankDesc[0]?.participantId ?? ranked[ranked.length - 1]?.participantId;

  const placementWinnerIds = new Map<number, string>(); // position -> participantId
  ranked.forEach((r, idx) => placementWinnerIds.set(idx + 1, r.participantId));

  const nameById = new Map(ranked.map((r) => [r.participantId, r.name]));

  // Auto-pick the "most red cards" winner — top of the tally, ties broken by
  // current rank (worst-ranked wins) then by name for stability. Only awards
  // when at least one team in the pool has a red.
  let mostRedsId: string | undefined;
  let mostRedsCount = 0;
  for (const r of ranked) {
    const c = redsByParticipant.get(r.participantId) ?? 0;
    if (c > mostRedsCount) {
      mostRedsCount = c;
      mostRedsId = r.participantId;
    }
  }

  // Attribute prize totals to each participant for the leaderboard display.
  const prizeMinorByParticipant = new Map<string, number>();
  const resolvedPrizes: ResolvedPrize[] = tournamentPrizes.map((p) => {
    let winnerId: string | undefined;
    if (p.kind === "PLACEMENT" && p.position) {
      winnerId = placementWinnerIds.get(p.position);
    } else if (p.kind === "WOODEN_SPOON") {
      winnerId = woodenSpoonId;
    } else if (p.kind === "MOST_RED_CARDS") {
      winnerId = mostRedsId;
    } else if (p.kind === "CATEGORY") {
      winnerId = p.awardedParticipantId;
    }
    const amountMinor = prizeAmountMinor(p, prizePoolMinor);
    if (winnerId) {
      prizeMinorByParticipant.set(
        winnerId,
        (prizeMinorByParticipant.get(winnerId) ?? 0) + amountMinor
      );
    }
    return {
      ...p,
      amountMinor,
      winnerParticipantId: winnerId,
      winnerName: winnerId ? nameById.get(winnerId) : undefined
    };
  });

  const out: LeaderboardRow[] = ranked.map((r) => {
    const poolStrengthPct = (r.poolStrength / totalStrength) * 100;
    return {
      ...r,
      projectedPrizeMinor: prizeMinorByParticipant.get(r.participantId) ?? 0,
      poolStrengthPct
    };
  });

  return {
    rows: out,
    prizePoolMinor,
    participantsTotal: tournament.participants.length,
    participantsPaid: paidCount,
    currency: tournament.currency,
    fairPoolPct: tournament.participants.length > 0 ? 100 / tournament.participants.length : 0,
    prizes: resolvedPrizes
  };
}
