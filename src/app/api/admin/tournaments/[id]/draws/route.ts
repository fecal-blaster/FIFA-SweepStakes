import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { generateSeed } from "@/lib/allocation/seed";
import { runAllocation, type AllocationInput } from "@/lib/allocation";
import { audit } from "@/lib/audit";
import { emitTournament } from "@/lib/io";

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
      include: { teams: true, participants: true, draws: { where: { isActive: true } } }
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

    const allocationInput: AllocationInput = {
      mode,
      seedSecret: seed.secret,
      participants: tournament.participants.map((p) => ({ id: p.id, name: p.name })),
      teams: tournament.teams.map((t) => ({ id: t.id, name: t.name, tier: t.tier }))
    };
    const result = runAllocation(allocationInput);

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
        redrawReason: input.redrawReason
      }
    });

    emitTournament(tournament.slug, "draw:complete", {
      drawId: draw.id,
      seed: seed.display,
      verifyHash: result.verifyHash
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
          createdAt: draw.createdAt
        },
        assignments: result.assignments
      },
      201
    );
  } catch (e) {
    return handleError(e);
  }
}
