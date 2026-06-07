import { prisma } from "@/lib/db";
import { handleError, notFound, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getProvider } from "@/lib/football";

// Wipe every team in this tournament then re-pull from the configured football
// data provider. Useful when a tournament has stale/duplicate teams from an
// earlier sync that used different external IDs or naming. Cascade rules drop
// associated allocations, score events, and matches with this team.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const t = await prisma.tournament.findUnique({ where: { id: params.id } });
    if (!t) return notFound("Tournament not found");

    const removed = await prisma.team.deleteMany({ where: { tournamentId: t.id } });

    const snapshot = await getProvider().fetchSnapshot(t.competitionCode);
    let created = 0;
    for (const team of snapshot.teams) {
      await prisma.team.create({
        data: {
          tournamentId: t.id,
          externalId: team.externalId,
          name: team.name,
          shortName: team.shortName ?? null,
          code: team.code ?? null,
          crestUrl: team.crestUrl ?? null,
          tier: team.tier ?? 1,
          rankingPoints: team.rankingPoints ?? 1500
        }
      });
      created++;
    }

    await audit({
      action: "TEAMS_RESET",
      tournamentId: t.id,
      adminUserId: admin.id,
      detail: { removed: removed.count, created }
    });
    return ok({ removed: removed.count, created });
  } catch (e) {
    return handleError(e);
  }
}
