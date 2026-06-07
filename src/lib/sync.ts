import { prisma } from "@/lib/db";
import { getProvider, type ProviderMatch } from "@/lib/football";
import { DEFAULT_SCORING, QUALIFY_KIND, type ScoringRules } from "@/lib/scoring";
import type { MatchStage } from "@prisma/client";
import { emitTournament } from "@/lib/io";
import { COLOR, notifyTournament } from "@/lib/discord";

export type SyncReport = {
  matchesUpserted: number;
  scoreEventsCreated: number;
  championDecided: boolean;
};

// Maps each knockout match to "if a team appears here, it has qualified for X".
const QUALIFIED_BY_APPEARING_IN: Partial<Record<MatchStage, MatchStage>> = {
  ROUND_OF_32: "ROUND_OF_32",
  ROUND_OF_16: "ROUND_OF_16",
  QUARTER_FINAL: "QUARTER_FINAL",
  SEMI_FINAL: "SEMI_FINAL",
  FINAL: "FINAL"
};

export async function syncTournament(tournamentId: string): Promise<SyncReport> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true }
  });
  if (!tournament) throw new Error("Tournament not found");

  const rules: ScoringRules = (tournament.scoringJson as unknown as ScoringRules) ?? DEFAULT_SCORING;
  const teamByExt = new Map(tournament.teams.filter((t) => t.externalId).map((t) => [t.externalId!, t]));

  const snapshot = await getProvider().fetchSnapshot(tournament.competitionCode);

  let matchesUpserted = 0;
  let scoreEventsCreated = 0;
  let championDecided = false;

  for (const m of snapshot.matches) {
    const home = m.homeTeamExtId ? teamByExt.get(m.homeTeamExtId) : undefined;
    const away = m.awayTeamExtId ? teamByExt.get(m.awayTeamExtId) : undefined;
    const data = {
      tournamentId: tournament.id,
      externalId: m.externalId,
      stage: m.stage,
      groupName: m.groupName ?? null,
      kickoff: m.kickoff,
      status: m.status,
      homeTeamId: home?.id ?? null,
      awayTeamId: away?.id ?? null,
      // Persist whatever name the provider gives, even for unlinked
      // (placeholder) knockout sides. The UI falls back to this so
      // upcoming fixtures don't render as "TBD" prematurely.
      homeTeamFallback: m.homeTeamName ?? null,
      awayTeamFallback: m.awayTeamName ?? null,
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      winnerSide: m.winnerSide ?? null
    };
    const existing = await prisma.match.findUnique({ where: { externalId: m.externalId } });
    const match = existing
      ? await prisma.match.update({ where: { id: existing.id }, data })
      : await prisma.match.create({ data });
    matchesUpserted++;

    // Emit a real-time event whenever a score or status actually changes.
    const scoreChanged =
      !existing ||
      existing.homeScore !== data.homeScore ||
      existing.awayScore !== data.awayScore ||
      existing.status !== data.status;
    const justFinished =
      existing?.status !== "FINISHED" &&
      data.status === "FINISHED" &&
      home &&
      away &&
      data.homeScore != null &&
      data.awayScore != null;
    if (scoreChanged) {
      emitTournament(tournament.id, "match:update", {
        matchId: match.id,
        status: data.status,
        homeScore: data.homeScore,
        awayScore: data.awayScore
      });
    }
    if (justFinished && home && away) {
      const winnerName =
        m.winnerSide === "HOME" ? home.name : m.winnerSide === "AWAY" ? away.name : null;
      notifyTournament(tournament.id, {
        title: `Full time — ${home.name} ${data.homeScore}–${data.awayScore} ${away.name}`,
        description:
          m.stage === "FINAL" && winnerName
            ? `🏆 **${winnerName}** are champions.`
            : winnerName
              ? `${winnerName} progress.`
              : "Honours even.",
        color: m.stage === "FINAL" ? COLOR.gold : COLOR.lime,
        fields: [
          { name: "Stage", value: m.stage.replace(/_/g, " "), inline: true },
          ...(m.groupName ? [{ name: "Group", value: m.groupName, inline: true }] : [])
        ],
        timestamp: new Date().toISOString()
      });
    }

    // Qualification points: any team appearing in a knockout fixture has qualified.
    const qualifiesFor = QUALIFIED_BY_APPEARING_IN[m.stage];
    if (qualifiesFor) {
      const kind = QUALIFY_KIND[qualifiesFor];
      const points = qualifyPointsFor(rules, qualifiesFor);
      for (const tId of [home?.id, away?.id]) {
        if (!tId || !kind) continue;
        const created = await ensureScoreEvent({
          tournamentId: tournament.id,
          matchId: match.id,
          teamId: tId,
          kind,
          points
        });
        if (created) scoreEventsCreated++;
      }
    }

    // Match result points (group + knockout).
    if (m.status === "FINISHED" && home && away && m.homeScore != null && m.awayScore != null) {
      // Group: win/draw/loss for both teams.
      if (m.stage === "GROUP") {
        if (m.homeScore > m.awayScore) {
          if (await ensureScoreEvent({ tournamentId: tournament.id, matchId: match.id, teamId: home.id, kind: "WIN", points: rules.win })) scoreEventsCreated++;
          if (await ensureScoreEvent({ tournamentId: tournament.id, matchId: match.id, teamId: away.id, kind: "LOSS", points: rules.loss })) scoreEventsCreated++;
        } else if (m.homeScore < m.awayScore) {
          if (await ensureScoreEvent({ tournamentId: tournament.id, matchId: match.id, teamId: away.id, kind: "WIN", points: rules.win })) scoreEventsCreated++;
          if (await ensureScoreEvent({ tournamentId: tournament.id, matchId: match.id, teamId: home.id, kind: "LOSS", points: rules.loss })) scoreEventsCreated++;
        } else {
          if (await ensureScoreEvent({ tournamentId: tournament.id, matchId: match.id, teamId: home.id, kind: "DRAW", points: rules.draw })) scoreEventsCreated++;
          if (await ensureScoreEvent({ tournamentId: tournament.id, matchId: match.id, teamId: away.id, kind: "DRAW", points: rules.draw })) scoreEventsCreated++;
        }
      } else {
        // Knockout: only the winner gets WIN; loser gets nothing extra.
        const winner = m.winnerSide === "HOME" ? home : m.winnerSide === "AWAY" ? away : null;
        const loser = m.winnerSide === "HOME" ? away : m.winnerSide === "AWAY" ? home : null;
        if (winner) {
          if (await ensureScoreEvent({ tournamentId: tournament.id, matchId: match.id, teamId: winner.id, kind: "WIN", points: rules.win })) scoreEventsCreated++;
        }
        if (loser) {
          if (await ensureScoreEvent({ tournamentId: tournament.id, matchId: match.id, teamId: loser.id, kind: "LOSS", points: rules.loss })) scoreEventsCreated++;
        }
        // Champion: the winner of the FINAL.
        if (m.stage === "FINAL" && winner) {
          if (await ensureScoreEvent({ tournamentId: tournament.id, matchId: match.id, teamId: winner.id, kind: "CHAMPION", points: rules.champion })) {
            scoreEventsCreated++;
            championDecided = true;
          }
        }
      }
    }
  }

  return { matchesUpserted, scoreEventsCreated, championDecided };
}

function qualifyPointsFor(rules: ScoringRules, stage: MatchStage): number {
  switch (stage) {
    case "ROUND_OF_32":
      return rules.qualifyR32;
    case "ROUND_OF_16":
      return rules.qualifyR16;
    case "QUARTER_FINAL":
      return rules.qualifyQF;
    case "SEMI_FINAL":
      return rules.qualifySF;
    case "FINAL":
      return rules.qualifyFinal;
    default:
      return 0;
  }
}

async function ensureScoreEvent(args: {
  tournamentId: string;
  matchId: string;
  teamId: string;
  kind: string;
  points: number;
}): Promise<boolean> {
  // Unique on (matchId, teamId, kind) — replays are idempotent.
  const existing = await prisma.scoreEvent.findUnique({
    where: { matchId_teamId_kind: { matchId: args.matchId, teamId: args.teamId, kind: args.kind } }
  });
  if (existing) {
    if (existing.points !== args.points) {
      // Rules changed mid-tournament — keep history correct.
      await prisma.scoreEvent.update({ where: { id: existing.id }, data: { points: args.points } });
    }
    return false;
  }
  await prisma.scoreEvent.create({ data: args });
  return true;
}
