import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

const PatchSchema = z.object({
  tier: z.number().int().min(1).max(8).optional(),
  name: z.string().min(1).max(60).optional(),
  code: z.string().min(2).max(4).optional(),
  rankingPoints: z.number().int().min(0).max(3000).optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; teamId: string } }
) {
  try {
    await requireAdmin();
    const input = await parseJson(req, PatchSchema);
    const team = await prisma.team.update({
      where: { id: params.teamId },
      data: input
    });
    return ok({ team });
  } catch (e) {
    return handleError(e);
  }
}
