import { prisma } from "@/lib/db";
import { handleError, notFound, ok } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await prisma.tournament.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      include: {
        teams: { orderBy: [{ tier: "asc" }, { name: "asc" }] },
        participants: { orderBy: { joinedAt: "asc" } },
        draws: {
          where: { isActive: true },
          take: 1,
          select: {
            id: true,
            mode: true,
            seed: true,
            verifyHash: true,
            inputDigest: true,
            createdAt: true
          }
        },
        _count: { select: { participants: true, matches: true } }
      }
    });
    if (!t) return notFound("Tournament not found");
    return ok({ tournament: t });
  } catch (e) {
    return handleError(e);
  }
}
