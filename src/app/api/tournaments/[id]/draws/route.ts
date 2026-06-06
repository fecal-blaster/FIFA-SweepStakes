import { prisma } from "@/lib/db";
import { handleError, ok } from "@/lib/api";

// Public: lists all draws for a tournament so anyone can audit the history.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await prisma.tournament.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true }
    });
    if (!t) return ok({ draws: [] });
    const draws = await prisma.draw.findMany({
      where: { tournamentId: t.id },
      orderBy: { createdAt: "desc" },
      include: {
        allocations: {
          include: {
            participant: { select: { id: true, name: true } },
            team: { select: { id: true, name: true, code: true, flagUrl: true, tier: true } }
          }
        }
      }
    });
    return ok({ draws });
  } catch (e) {
    return handleError(e);
  }
}
