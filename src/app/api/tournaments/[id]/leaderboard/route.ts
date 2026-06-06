import { computeLeaderboard } from "@/lib/leaderboard";
import { handleError, notFound, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await prisma.tournament.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true }
    });
    if (!t) return notFound("Tournament not found");
    const board = await computeLeaderboard(t.id);
    return ok(board);
  } catch (e) {
    return handleError(e);
  }
}
