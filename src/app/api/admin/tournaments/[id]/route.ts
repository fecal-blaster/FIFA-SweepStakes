import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, notFound, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "DRAW_READY", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
  drawMode: z.enum(["PURE_RANDOM", "BALANCED"]).optional(),
  buyInMinor: z.number().int().min(0).max(1_000_000).optional(),
  registrationDeadline: z.string().datetime().nullable().optional(),
  drawAt: z.string().datetime().nullable().optional(),
  payoutBps: z.array(z.number().int().min(0).max(10000)).min(1).max(8).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const input = await parseJson(req, PatchSchema);
    const t = await prisma.tournament.findUnique({ where: { id: params.id } });
    if (!t) return notFound("Tournament not found");
    const updated = await prisma.tournament.update({
      where: { id: t.id },
      data: {
        name: input.name,
        currency: input.currency,
        status: input.status,
        drawMode: input.drawMode,
        buyInMinor: input.buyInMinor,
        registrationDeadline:
          input.registrationDeadline === undefined ? undefined : input.registrationDeadline ? new Date(input.registrationDeadline) : null,
        drawAt: input.drawAt === undefined ? undefined : input.drawAt ? new Date(input.drawAt) : null,
        payoutBpsJson: input.payoutBps
      }
    });
    await audit({
      action: "TOURNAMENT_UPDATE",
      tournamentId: t.id,
      adminUserId: admin.id,
      detail: input
    });
    return ok({ tournament: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    await prisma.tournament.delete({ where: { id: params.id } });
    await audit({ action: "TOURNAMENT_DELETE", adminUserId: admin.id, detail: { id: params.id } });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
