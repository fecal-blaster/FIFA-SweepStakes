import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { emitTournament } from "@/lib/io";
import { DEFAULT_SCORING, type ScoringRules } from "@/lib/scoring";

// Manual score override. Re-derives points using the tournament's current
// scoring rules so the leaderboard updates immediately.
const Schema = z.object({
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  status: z.enum(["SCHEDULED", "IN_PLAY", "PAUSED", "FINISHED", "POSTPONED", "CANCELLED"]).optional(),
  // For knockout matches that finish level after extra time, the admin must
  // tell us who won on penalties.
  winnerSide: z.enum(["HOME", "AWAY"]).nullable().optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; matchId: string } }
) {
  try {
    const admin = await requireAdmin();
    const input = await parseJson(req, Schema);
    const match = await prisma.match.findFirst({
      where: { id: params.matchId, tournamentId: params.id },
      include: { tournament: true }
    });
    if (!match) throw new ApiError(404, "Match not found");

    const rules: ScoringRules =
      (match.tournament.scoringJson as unknown as ScoringRules) ?? DEFAULT_SCORING;

    // Decide the winner — explicit override beats score comparison.
    let winnerSide: "HOME" | "AWAY" | null = null;
    if (input.winnerSide !== undefined) {
      winnerSide = input.winnerSide;
    } else if (input.homeScore > input.awayScore) {
      winnerSide = "HOME";
    } else if (input.awayScore > input.homeScore) {
      winnerSide = "AWAY";
    } else {
      winnerSide = match.stage === "GROUP" ? null : null;
    }

    const status = input.status ?? "FINISHED";

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        status,
        winnerSide
      }
    });

    // Wipe existing W/D/L + CHAMPION events for this match so we can rewrite
    // them from the new score. QUALIFY_* events stay — those come from the
    // teams appearing in later-round fixtures, not from this match.
    await prisma.scoreEvent.deleteMany({
      where: {
        matchId: match.id,
        kind: { in: ["WIN", "DRAW", "LOSS", "CHAMPION"] }
      }
    });

    if (status === "FINISHED" && match.homeTeamId && match.awayTeamId) {
      const home = match.homeTeamId;
      const away = match.awayTeamId;
      const create = (teamId: string, kind: string, points: number) =>
        prisma.scoreEvent.create({
          data: { tournamentId: match.tournamentId, matchId: match.id, teamId, kind, points }
        });

      if (match.stage === "GROUP") {
        if (input.homeScore > input.awayScore) {
          await Promise.all([
            create(home, "WIN", rules.win),
            create(away, "LOSS", rules.loss)
          ]);
        } else if (input.awayScore > input.homeScore) {
          await Promise.all([
            create(away, "WIN", rules.win),
            create(home, "LOSS", rules.loss)
          ]);
        } else {
          await Promise.all([
            create(home, "DRAW", rules.draw),
            create(away, "DRAW", rules.draw)
          ]);
        }
      } else {
        // Knockout: winner gets WIN, loser gets LOSS.
        if (winnerSide === "HOME") {
          await Promise.all([
            create(home, "WIN", rules.win),
            create(away, "LOSS", rules.loss)
          ]);
        } else if (winnerSide === "AWAY") {
          await Promise.all([
            create(away, "WIN", rules.win),
            create(home, "LOSS", rules.loss)
          ]);
        }
        if (match.stage === "FINAL" && winnerSide) {
          const champion = winnerSide === "HOME" ? home : away;
          await create(champion, "CHAMPION", rules.champion);
        }
      }
    }

    await audit({
      action: "MATCH_MANUAL_OVERRIDE",
      tournamentId: match.tournamentId,
      adminUserId: admin.id,
      detail: {
        matchId: match.id,
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        status,
        winnerSide
      }
    });

    emitTournament(match.tournamentId, "match:update", { matchId: match.id });
    emitTournament(match.tournamentId, "leaderboard:update", {});

    return ok({ match: updated });
  } catch (e) {
    return handleError(e);
  }
}
