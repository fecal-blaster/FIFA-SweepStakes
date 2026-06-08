import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { handleError, notFound, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const ScoringSchema = z
  .object({
    win: z.number().int().min(0).max(100),
    draw: z.number().int().min(0).max(100),
    loss: z.number().int().min(0).max(100),
    qualifyR32: z.number().int().min(0).max(200),
    qualifyR16: z.number().int().min(0).max(200),
    qualifyQF: z.number().int().min(0).max(200),
    qualifySF: z.number().int().min(0).max(200),
    qualifyFinal: z.number().int().min(0).max(200),
    champion: z.number().int().min(0).max(500)
  })
  .nullable();

const PrizeSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().min(1).max(80),
  shareBps: z.number().int().min(0).max(10000),
  kind: z.enum(["PLACEMENT", "WOODEN_SPOON", "MOST_RED_CARDS", "CATEGORY"]),
  position: z.number().int().min(1).max(50).optional(),
  awardedParticipantId: z.string().min(1).max(60).optional()
});

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "DRAW_READY", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
  drawMode: z.enum(["PURE_RANDOM", "BALANCED"]).optional(),
  buyInMinor: z.number().int().min(0).max(1_000_000).optional(),
  registrationDeadline: z.string().datetime().nullable().optional(),
  drawAt: z.string().datetime().nullable().optional(),
  payoutBps: z.array(z.number().int().min(0).max(10000)).min(1).max(8).nullable().optional(),
  prizes: z.array(PrizeSchema).max(20).nullable().optional(),
  scoring: ScoringSchema.optional(),
  discordWebhookUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://discord.com/api/webhooks/") || u.startsWith("https://discordapp.com/api/webhooks/"), {
      message: "Must be a discord.com webhook URL"
    })
    .nullable()
    .optional()
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
        payoutBpsJson:
          input.payoutBps === undefined ? undefined : (input.payoutBps ?? [5000, 3333, 1667]),
        prizesJson:
          input.prizes === undefined
            ? undefined
            : input.prizes === null
              ? Prisma.JsonNull
              : (input.prizes as unknown as Prisma.InputJsonValue),
        scoringJson:
          input.scoring === undefined
            ? undefined
            : input.scoring === null
              ? Prisma.JsonNull
              : (input.scoring as Prisma.InputJsonValue),
        discordWebhookUrl: input.discordWebhookUrl === undefined ? undefined : input.discordWebhookUrl
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
