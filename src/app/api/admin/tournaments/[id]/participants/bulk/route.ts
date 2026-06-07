import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const Schema = z.object({
  // Free-form text — split on newlines server-side so the UI can be a single textarea.
  names: z.string().max(20_000),
  paid: z.boolean().optional()
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const input = await parseJson(req, Schema);
    // Split on lines and commas, trim, dedupe, drop empties.
    const seen = new Set<string>();
    const names = input.names
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 60)
      .filter((s) => {
        const k = s.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

    const existing = await prisma.participant.findMany({
      where: { tournamentId: params.id, name: { in: names } },
      select: { name: true }
    });
    const existingSet = new Set(existing.map((p) => p.name.toLowerCase()));
    const toCreate = names.filter((n) => !existingSet.has(n.toLowerCase()));

    if (toCreate.length > 0) {
      await prisma.participant.createMany({
        data: toCreate.map((name) => ({
          tournamentId: params.id,
          name,
          paid: input.paid ?? false
        })),
        skipDuplicates: true
      });
    }

    await audit({
      action: "PARTICIPANTS_BULK_IMPORT",
      tournamentId: params.id,
      adminUserId: admin.id,
      detail: { attempted: names.length, created: toCreate.length, skipped: names.length - toCreate.length }
    });

    return ok({
      created: toCreate.length,
      skipped: names.length - toCreate.length,
      total: names.length
    });
  } catch (e) {
    return handleError(e);
  }
}
