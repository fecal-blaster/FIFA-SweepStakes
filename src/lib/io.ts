import type { Server as IOServer } from "socket.io";
import { prisma } from "@/lib/db";

// The custom server (server.mjs) attaches the socket.io instance to globalThis
// so API route handlers can emit events without a circular import.
type WithIo = typeof globalThis & { fifaIo?: IOServer };

/**
 * Emit to a tournament room. `idOrSlug` accepts either — we always emit to the
 * slug-keyed room since clients subscribe by slug.
 */
export function emitTournament(idOrSlug: string, event: string, payload: unknown): void {
  const g = globalThis as WithIo;
  if (!g.fifaIo) return; // no-op in build / pre-server contexts
  // We only know the slug at the call site sometimes — if it looks like a cuid
  // (starts with "cm"), resolve to slug. Best-effort and async-fire-and-forget.
  if (idOrSlug.startsWith("cm") && idOrSlug.length > 20) {
    prisma.tournament
      .findUnique({ where: { id: idOrSlug }, select: { slug: true } })
      .then((t) => {
        if (t) g.fifaIo!.to(`t:${t.slug}`).emit(event, payload);
      })
      .catch(() => {});
    return;
  }
  g.fifaIo.to(`t:${idOrSlug}`).emit(event, payload);
}
