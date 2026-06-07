import { prisma } from "@/lib/db";
import { handleError, notFound, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getProvider } from "@/lib/football";
import { syncTournament } from "@/lib/sync";

// Wipe every team in this tournament then re-pull from the configured football
// data provider. Useful when a tournament has stale/duplicate teams from an
// earlier sync that used different external IDs or naming.
//
// Cascade: optional Match relations to teams are nulled, NOT deleted. So we
// also re-run a full fixture sync afterwards — that re-links the matches to
// the freshly-pulled teams using the provider's external IDs.
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

    // Re-link fixtures to the new teams by external ID. Any matches that
    // existed before the wipe will pick up their new team references; new
    // fixtures will be upserted as usual.
    let syncReport;
    try {
      syncReport = await syncTournament(t.id);
    } catch (e) {
      syncReport = { error: (e as Error).message };
    }

    await audit({
      action: "TEAMS_RESET",
      tournamentId: t.id,
      adminUserId: admin.id,
      detail: { removed: removed.count, created, syncReport }
    });
    return ok({ removed: removed.count, created, fixtures: syncReport });
  } catch (e) {
    return handleError(e);
  }
}
