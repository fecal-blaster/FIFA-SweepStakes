import { prisma } from "@/lib/db";
import { handleError, ok } from "@/lib/api";

// Force dynamic so this isn't prerendered at build time when DATABASE_URL
// isn't yet available in the build container.
export const dynamic = "force-dynamic";

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
