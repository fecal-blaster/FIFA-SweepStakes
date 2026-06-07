import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { generateSeed } from "@/lib/allocation/seed";
import { runAllocation, type AllocationInput } from "@/lib/allocation";
import { audit } from "@/lib/audit";
import { emitTournament } from "@/lib/io";
import { COLOR, notifyTournament } from "@/lib/discord";

const CreateDrawSchema = z.object({
  mode: z.enum(["PURE_RANDOM", "BALANCED"]).optional(),
  // Provide an existing seed secret to *reproduce* a draw. Otherwise generate.
  seedSecret: z.string().regex(/^[0-9a-f]{16,64}$/i).optional(),
  seedLabel: z.string().min(1).max(30).optional(),
  redrawReason: z.string().min(1).max(200).optional()
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const input = await parseJson(req, CreateDrawSchema);
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
      include: {
        teams: true,
        participants: true,
        draws: { where: { isActive: true } },
        // Group-stage fixtures known at draw time → clash-avoidance input.
        // Knockout fixtures depend on group standings so they're unknown here.
        matches: {
          where: {
            stage: "GROUP",
            homeTeamId: { not: null },
            awayTeamId: { not: null }
          },
          select: { homeTeamId: true, awayTeamId: true }
        }
      }
    });
    if (!tournament) throw new ApiError(404, "Tournament not found");
    if (tournament.teams.length === 0) throw new ApiError(409, "No teams configured");
    if (tournament.participants.length === 0) throw new ApiError(409, "No participants registered");
    if (tournament.draws.length > 0 && !input.redrawReason) {
      throw new ApiError(409, "An active draw exists. Provide redrawReason to redraw.");
    }

    const seed = input.seedSecret
      ? { secret: input.seedSecret.toLowerCase(), display: `${(input.seedLabel ?? "redraw").toLowerCase()}-${input.seedSecret.slice(0, 6)}` }
      : generateSeed(input.seedLabel);

    const mode = input.mode ?? tournament.drawMode;

    const coOccurrence: [string, string][] = tournament.matches
      .filter((m): m is { homeTeamId: string; awayTeamId: string } =>
        Boolean(m.homeTeamId) && Boolean(m.awayTeamId)
      )
      .map((m) => [m.homeTeamId, m.awayTeamId] as [string, string]);

    const allocationInput: AllocationInput = {
      mode,
      seedSecret: seed.secret,
      participants: tournament.participants.map((p) => ({ id: p.id, name: p.name })),
      teams: tournament.teams.map((t) => ({
        id: t.id,
        name: t.name,
        tier: t.tier,
        rankingPoints: t.rankingPoints
      })),
      coOccurrence
    };
    const result = runAllocation(allocationInput);

    // Stats for the audit log + admin feedback.
    let clashFixtures = 0;
    const owners = new Map<string, Set<string>>();
    for (const a of result.assignments) {
      for (const tid of a.teamIds) {
        const set = owners.get(tid) ?? new Set<string>();
        set.add(a.participantId);
        owners.set(tid, set);
      }
    }
    for (const [h, a] of coOccurrence) {
      const ho = owners.get(h);
      const ao = owners.get(a);
      if (ho && ao) {
        for (const p of ho) if (ao.has(p)) clashFixtures++;
      }
    }
    const sharedTeams = [...owners.values()].filter((s) => s.size > 1).length;
    // Strength spread across the room — lower is better (0 = perfectly even).
    const strengths = result.assignments.map((a) => {
      const teamTiers = a.teamIds.map((tid) => {
        const t = tournament.teams.find((t) => t.id === tid);
        return t ? t.tier : 4;
      });
      const { teamStrength } = require("@/lib/allocation");
      return teamTiers.reduce((s: number, tier: number) => s + teamStrength(tier), 0);
    });
    const meanStrength = strengths.reduce((s, x) => s + x, 0) / Math.max(1, strengths.length);
    const strengthSpread =
      Math.max(...strengths) - Math.min(...strengths);
    const strengthSpreadPct =
      meanStrength > 0 ? (strengthSpread / meanStrength) * 100 : 0;

    // Snapshot the exact inputs used so verification stays valid even if team
    // rankings or the participant list are edited after the draw.
    const teamSnapshot = tournament.teams.map((t) => ({
      id: t.id,
      name: t.name,
      tier: t.tier,
      rankingPoints: t.rankingPoints
    }));
    const participantSnapshot = tournament.participants.map((p) => ({
      id: p.id,
      name: p.name
    }));

    // Persist atomically: deactivate previous draw, write new draw + allocations.
    const draw = await prisma.$transaction(async (tx) => {
      if (tournament.draws.length > 0) {
        await tx.draw.updateMany({
          where: { tournamentId: tournament.id, isActive: true },
          data: { isActive: false, supersededAt: new Date(), redrawReason: input.redrawReason }
        });
      }
      const created = await tx.draw.create({
        data: {
          tournamentId: tournament.id,
          mode,
          seed: seed.display,
          seedSecret: seed.secret,
          verifyHash: result.verifyHash,
          inputDigest: result.inputDigest,
          coOccurrenceJson: coOccurrence.length > 0 ? (coOccurrence as unknown as object) : undefined,
          teamSnapshotJson: teamSnapshot as unknown as object,
          participantSnapshotJson: participantSnapshot as unknown as object,
          isActive: true
        }
      });
      // Flatten assignments into allocation rows.
      for (const a of result.assignments) {
        for (const teamId of a.teamIds) {
          await tx.teamAllocation.create({
            data: {
              tournamentId: tournament.id,
              drawId: created.id,
              participantId: a.participantId,
              teamId
            }
          });
        }
      }
      await tx.tournament.update({
        where: { id: tournament.id },
        data: { status: "DRAW_READY" }
      });
      return created;
    });

    await audit({
      action: input.redrawReason ? "REDRAW" : "DRAW_RUN",
      tournamentId: tournament.id,
      adminUserId: admin.id,
      detail: {
        drawId: draw.id,
        mode,
        seed: seed.display,
        verifyHash: result.verifyHash,
        redrawReason: input.redrawReason,
        fixturePairs: coOccurrence.length,
        clashFixtures,
        sharedTeams,
        strengthSpreadPct: Math.round(strengthSpreadPct * 10) / 10
      }
    });

    emitTournament(tournament.slug, "draw:complete", {
      drawId: draw.id,
      seed: seed.display,
      verifyHash: result.verifyHash
    });

    notifyTournament(tournament.id, {
      title: input.redrawReason ? "🎲 Redraw complete" : "🎲 Draw complete",
      description: `**${mode}** mode · seed \`${seed.display}\``,
      color: COLOR.cyan,
      fields: result.assignments.map((a) => {
        const p = tournament.participants.find((p) => p.id === a.participantId);
        const teamNames = a.teamIds
          .map((id) => tournament.teams.find((t) => t.id === id)?.name ?? "?")
          .join(", ");
        return { name: p?.name ?? "?", value: teamNames, inline: true };
      }),
      timestamp: new Date().toISOString()
    });

    return ok(
      {
        draw: {
          id: draw.id,
          mode,
          seed: seed.display,
          seedSecret: seed.secret,
          verifyHash: result.verifyHash,
          inputDigest: result.inputDigest,
          createdAt: draw.createdAt,
          fixturePairs: coOccurrence.length,
          clashFixtures,
          sharedTeams,
          strengthSpreadPct: Math.round(strengthSpreadPct * 10) / 10
        },
        assignments: result.assignments
      },
      201
    );
  } catch (e) {
    return handleError(e);
  }
}
