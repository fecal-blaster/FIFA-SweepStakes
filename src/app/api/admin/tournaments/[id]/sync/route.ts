import { handleError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { syncTournament } from "@/lib/sync";
import { audit } from "@/lib/audit";
import { emitTournament } from "@/lib/io";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const report = await syncTournament(params.id);
    await audit({
      action: "FIXTURES_SYNC",
      tournamentId: params.id,
      adminUserId: admin.id,
      detail: report
    });
    if (report.scoreEventsCreated > 0) {
      const t = await prisma.tournament.findUnique({ where: { id: params.id }, select: { slug: true } });
      if (t) emitTournament(t.slug, "leaderboard:update", report);
    }
    return ok(report);
  } catch (e) {
    return handleError(e);
  }
}
