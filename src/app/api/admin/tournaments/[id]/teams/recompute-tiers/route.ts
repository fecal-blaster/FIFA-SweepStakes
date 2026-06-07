import { prisma } from "@/lib/db";
import { handleError, notFound, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

// Auto-bucket teams into 4 tiers based on rankingPoints quartiles. Admin can
// still override per-team after running this.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const teams = await prisma.team.findMany({
      where: { tournamentId: params.id },
      orderBy: { rankingPoints: "desc" }
    });
    if (teams.length === 0) return notFound("No teams to recompute");

    const total = teams.length;
    let updated = 0;
    for (let i = 0; i < total; i++) {
      const tier = Math.min(4, Math.max(1, Math.floor((i / total) * 4) + 1));
      if (teams[i].tier !== tier) {
        await prisma.team.update({ where: { id: teams[i].id }, data: { tier } });
        updated++;
      }
    }
    await audit({
      action: "TEAMS_RECOMPUTE_TIERS",
      tournamentId: params.id,
      adminUserId: admin.id,
      detail: { updated, total }
    });
    return ok({ updated, total });
  } catch (e) {
    return handleError(e);
  }
}
