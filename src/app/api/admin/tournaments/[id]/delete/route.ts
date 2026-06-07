import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ApiError, handleError, ok, parseJson, rateLimited } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { clientKey, consume } from "@/lib/rate-limit";

// Destructive delete behind a password re-check. Cascade rules on the schema
// take care of participants, allocations, draws, matches, audit logs.
const Schema = z.object({
  password: z.string().min(1).max(200),
  confirmName: z.string().min(1).max(120)
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();

    // Rate-limit by admin id so a leaked session can't brute-force the password.
    const rl = consume(`delete:${admin.id}`, { capacity: 5, refillPerSecond: 1 / 30 });
    if (!rl.ok) return rateLimited(rl.retryAfterMs);

    const input = await parseJson(req, Schema);

    const dbAdmin = await prisma.adminUser.findUnique({ where: { id: admin.id } });
    if (!dbAdmin) throw new ApiError(401, "Admin user not found");
    const ok1 = await bcrypt.compare(input.password, dbAdmin.passwordHash);
    if (!ok1) throw new ApiError(401, "Incorrect password");

    const t = await prisma.tournament.findUnique({ where: { id: params.id } });
    if (!t) throw new ApiError(404, "Tournament not found");
    if (input.confirmName.trim().toLowerCase() !== t.name.trim().toLowerCase()) {
      throw new ApiError(400, "Tournament name does not match");
    }

    await prisma.tournament.delete({ where: { id: t.id } });
    await audit({
      action: "TOURNAMENT_DELETE",
      adminUserId: admin.id,
      detail: { id: t.id, name: t.name, slug: t.slug }
    });
    return ok({ ok: true, id: t.id });
  } catch (e) {
    return handleError(e);
  }
}
