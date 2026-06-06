import { prisma } from "@/lib/db";
import { handleError, notFound, ok } from "@/lib/api";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "all";
    const t = await prisma.tournament.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true }
    });
    if (!t) return notFound("Tournament not found");

    const where: Prisma.MatchWhereInput = { tournamentId: t.id };
    if (scope === "live") where.status = { in: ["IN_PLAY", "PAUSED"] };
    if (scope === "upcoming") where.status = { in: ["SCHEDULED"] };
    if (scope === "recent") where.status = { in: ["FINISHED"] };

    const matches = await prisma.match.findMany({
      where,
      orderBy:
        scope === "recent"
          ? { kickoff: "desc" }
          : scope === "upcoming"
            ? { kickoff: "asc" }
            : [{ status: "asc" }, { kickoff: "asc" }],
      take: scope === "recent" ? 12 : 50,
      include: {
        homeTeam: { select: { name: true, code: true } },
        awayTeam: { select: { name: true, code: true } }
      }
    });
    return ok({
      matches: matches.map((m) => ({
        id: m.id,
        stage: m.stage,
        groupName: m.groupName,
        status: m.status,
        kickoff: m.kickoff.toISOString(),
        homeName: m.homeTeam?.name ?? "TBD",
        homeCode: m.homeTeam?.code ?? null,
        homeScore: m.homeScore,
        awayName: m.awayTeam?.name ?? "TBD",
        awayCode: m.awayTeam?.code ?? null,
        awayScore: m.awayScore,
        winnerSide: m.winnerSide
      }))
    });
  } catch (e) {
    return handleError(e);
  }
}
