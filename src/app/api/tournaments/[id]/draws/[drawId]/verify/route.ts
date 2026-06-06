import { prisma } from "@/lib/db";
import { handleError, notFound, ok } from "@/lib/api";
import { verifyAllocation } from "@/lib/allocation";

// Public: re-runs the draw from the stored seed and confirms the hash matches.
// Anyone can call this to verify the allocation was not tampered with.
export async function GET(
  _req: Request,
  { params }: { params: { id: string; drawId: string } }
) {
  try {
    const draw = await prisma.draw.findUnique({
      where: { id: params.drawId },
      include: { tournament: { include: { teams: true, participants: true } } }
    });
    if (!draw) return notFound("Draw not found");
    const t = draw.tournament;
    const { ok: matches, computed } = verifyAllocation(
      {
        mode: draw.mode,
        seedSecret: draw.seedSecret,
        participants: t.participants.map((p) => ({ id: p.id, name: p.name })),
        teams: t.teams.map((te) => ({ id: te.id, name: te.name, tier: te.tier }))
      },
      draw.verifyHash
    );
    return ok({
      ok: matches,
      seed: draw.seed,
      verifyHash: draw.verifyHash,
      recomputedVerifyHash: computed.verifyHash,
      inputDigest: draw.inputDigest,
      recomputedInputDigest: computed.inputDigest,
      assignments: computed.assignments
    });
  } catch (e) {
    return handleError(e);
  }
}
