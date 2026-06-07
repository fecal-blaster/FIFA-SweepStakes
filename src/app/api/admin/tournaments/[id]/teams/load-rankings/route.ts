import { prisma } from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { lookupRanking } from "@/lib/fifa-rankings";

// Apply the bundled FIFA Men's World Ranking to every team in the tournament
// whose 3-letter code matches a known entry. Teams without a match are left
// alone so the admin can fill those in manually.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const teams = await prisma.team.findMany({
      where: { tournamentId: params.id },
      select: { id: true, code: true }
    });
    let matched = 0;
    let skipped = 0;
    for (const team of teams) {
      const entry = lookupRanking(team.code);
      if (!entry) {
        skipped++;
        continue;
      }
      await prisma.team.update({
        where: { id: team.id },
        data: { rankingPoints: entry.points }
      });
      matched++;
    }
    // Bucket into 4 tiers by quartile after loading so the per-tier pot is
    // already sensible without a second click.
    const sorted = await prisma.team.findMany({
      where: { tournamentId: params.id },
      orderBy: { rankingPoints: "desc" }
    });
    for (let i = 0; i < sorted.length; i++) {
      const tier = Math.min(4, Math.max(1, Math.floor((i / sorted.length) * 4) + 1));
      if (sorted[i].tier !== tier) {
        await prisma.team.update({ where: { id: sorted[i].id }, data: { tier } });
      }
    }
    await audit({
      action: "TEAMS_LOAD_FIFA_RANKINGS",
      tournamentId: params.id,
      adminUserId: admin.id,
      detail: { matched, skipped, total: teams.length }
    });
    return ok({ matched, skipped, total: teams.length });
  } catch (e) {
    return handleError(e);
  }
}
