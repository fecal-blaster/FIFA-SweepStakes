import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError, notFound } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

// Full snapshot of a tournament. Useful for backups before risky changes and
// for keeping a portable record after a season ends.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const t = await prisma.tournament.findUnique({
      where: { id: params.id },
      include: {
        participants: true,
        teams: true,
        draws: { include: { allocations: true } },
        matches: { include: { events: true } },
        auditLogs: true
      }
    });
    if (!t) return notFound("Tournament not found");
    const filename = `${t.slug}-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(t, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    return handleError(e);
  }
}
