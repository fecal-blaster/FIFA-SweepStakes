import { prisma } from "@/lib/db";
import { handleError, notFound, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { getProvider } from "@/lib/football";
import { audit } from "@/lib/audit";

// Pulls teams from the configured football provider for this tournament's
// competitionCode and upserts them. Existing tier values are preserved.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const t = await prisma.tournament.findUnique({ where: { id: params.id } });
    if (!t) return notFound("Tournament not found");

    const snapshot = await getProvider().fetchSnapshot(t.competitionCode);
    let created = 0;
    let updated = 0;
    for (const team of snapshot.teams) {
      // Match on externalId (best), then 3-letter code (handles renames like
      // "Korea Republic" vs "South Korea"), then exact name. Stops duplicates
      // from creeping in when a previous auto-seed used different identifiers
      // than the provider.
      const matchOr: { externalId?: string; code?: string; name?: string }[] = [
        { externalId: team.externalId }
      ];
      if (team.code) matchOr.push({ code: team.code });
      matchOr.push({ name: team.name });
      const existing = await prisma.team.findFirst({
        where: { tournamentId: t.id, OR: matchOr }
      });
      if (existing) {
        await prisma.team.update({
          where: { id: existing.id },
          data: {
            externalId: team.externalId,
            name: team.name,
            shortName: team.shortName,
            code: team.code,
            crestUrl: team.crestUrl,
            // Only set tier if currently the default and provider gave one
            tier: existing.tier === 1 && team.tier ? team.tier : existing.tier,
            // Same for rankingPoints — only seed it if still on the default 1500
            rankingPoints:
              existing.rankingPoints === 1500 && team.rankingPoints
                ? team.rankingPoints
                : existing.rankingPoints
          }
        });
        updated++;
      } else {
        await prisma.team.create({
          data: {
            tournamentId: t.id,
            externalId: team.externalId,
            name: team.name,
            shortName: team.shortName,
            code: team.code,
            crestUrl: team.crestUrl,
            tier: team.tier ?? 1,
            rankingPoints: team.rankingPoints ?? 1500
          }
        });
        created++;
      }
    }
    await audit({
      action: "TEAMS_SYNC",
      tournamentId: t.id,
      adminUserId: admin.id,
      detail: { created, updated, total: snapshot.teams.length }
    });
    return ok({ created, updated, total: snapshot.teams.length });
  } catch (e) {
    return handleError(e);
  }
}
