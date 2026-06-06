import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  email: z.string().email().max(120).nullable().optional(),
  paid: z.boolean().optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; pid: string } }
) {
  try {
    const admin = await requireAdmin();
    const input = await parseJson(req, PatchSchema);
    const participant = await prisma.participant.update({
      where: { id: params.pid },
      data: input
    });
    await audit({
      action: "PARTICIPANT_UPDATE",
      tournamentId: params.id,
      adminUserId: admin.id,
      detail: { participantId: participant.id, changes: input }
    });
    return ok({ participant });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; pid: string } }
) {
  try {
    const admin = await requireAdmin();
    await prisma.participant.delete({ where: { id: params.pid } });
    await audit({
      action: "PARTICIPANT_DELETE",
      tournamentId: params.id,
      adminUserId: admin.id,
      detail: { participantId: params.pid }
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
