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
    const storedCo = (draw.coOccurrenceJson as [string, string][] | null) ?? undefined;
    // Verify against the snapshot stored at draw time, falling back to current
    // state for older draws that pre-date the snapshot columns. Editing team
    // rankings post-draw must NOT break verification, hence the snapshot.
    const teamSnapshot = (draw.teamSnapshotJson as
      | { id: string; name: string; tier: number; rankingPoints: number }[]
      | null) ?? null;
    const participantSnapshot = (draw.participantSnapshotJson as
      | { id: string; name: string }[]
      | null) ?? null;
    const participants = participantSnapshot
      ? participantSnapshot
      : t.participants.map((p) => ({ id: p.id, name: p.name }));
    const teams = teamSnapshot
      ? teamSnapshot.map((te) => ({
          id: te.id,
          name: te.name,
          tier: te.tier,
          rankingPoints: te.rankingPoints
        }))
      : t.teams.map((te) => ({
          id: te.id,
          name: te.name,
          tier: te.tier,
          rankingPoints: te.rankingPoints
        }));
    const { ok: matches, computed } = verifyAllocation(
      {
        mode: draw.mode,
        seedSecret: draw.seedSecret,
        participants,
        teams,
        coOccurrence: storedCo
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
