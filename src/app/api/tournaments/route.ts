import { prisma } from "@/lib/db";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        buyInMinor: true,
        currency: true,
        drawAt: true,
        registrationDeadline: true,
        _count: { select: { participants: true } }
      }
    });
    return ok({ tournaments });
  } catch (e) {
    return handleError(e);
  }
}
