import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emitTournament } from "@/lib/io";

// Dev-only nudge endpoint: the local simulator calls this so the server can
// broadcast live updates to connected clients without going through the full
// admin sync flow. Disabled in production to avoid being misused as a public
// fan-out endpoint.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const t = await prisma.tournament.findUnique({ where: { slug }, select: { id: true, slug: true } });
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
  emitTournament(t.slug, "match:update", { tournamentId: t.id });
  emitTournament(t.slug, "leaderboard:update", { tournamentId: t.id });
  return NextResponse.json({ ok: true });
}
