import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name: z.string().min(1).max(60).trim(),
  email: z.string().email().max(120).optional().or(z.literal("")),
  paid: z.boolean().optional()
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const input = await parseJson(req, CreateSchema);
    const participant = await prisma.participant.create({
      data: {
        tournamentId: params.id,
        name: input.name,
        email: input.email || null,
        paid: input.paid ?? false
      }
    });
    await audit({
      action: "PARTICIPANT_ADMIN_CREATE",
      tournamentId: params.id,
      adminUserId: admin.id,
      detail: { participantId: participant.id }
    });
    return ok({ participant }, 201);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return handleError(new Error("A participant with that name already exists"));
    }
    return handleError(e);
  }
}
