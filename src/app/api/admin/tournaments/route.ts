import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { inviteCode, slugify } from "@/lib/util";
import { audit } from "@/lib/audit";
import { wc2026Teams } from "@/lib/fifa-rankings";

const CreateSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  competitionCode: z.string().min(1).max(16),
  buyInMinor: z.number().int().min(0).max(1_000_000),
  currency: z.string().length(3).default("GBP"),
  drawMode: z.enum(["PURE_RANDOM", "BALANCED"]).default("BALANCED"),
  registrationDeadline: z.string().datetime().optional(),
  drawAt: z.string().datetime().optional(),
  payoutBps: z.array(z.number().int().min(0).max(10000)).min(1).max(8).optional()
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const input = await parseJson(req, CreateSchema);
    const baseSlug = slugify(input.name);
    // Ensure unique slug if a tournament with this name already exists.
    let slug = baseSlug;
    for (let i = 2; i < 100; i++) {
      const exists = await prisma.tournament.findUnique({ where: { slug } });
      if (!exists) break;
      slug = `${baseSlug}-${i}`;
    }
    const t = await prisma.tournament.create({
      data: {
        name: input.name,
        slug,
        competitionCode: input.competitionCode,
        buyInMinor: input.buyInMinor,
        currency: input.currency,
        drawMode: input.drawMode,
        registrationDeadline: input.registrationDeadline ? new Date(input.registrationDeadline) : null,
        drawAt: input.drawAt ? new Date(input.drawAt) : null,
        inviteCode: inviteCode(8),
        status: "REGISTRATION_OPEN",
        payoutBpsJson: input.payoutBps ?? [5000, 3333, 1667]
      }
    });

    // Auto-seed only when there's no real football data provider configured.
    // With an API key, the admin should click "Sync teams" so the database
    // gets the provider's external IDs — those are what later link fixtures
    // to teams. Hard-coding fake external IDs here breaks fixture sync.
    let seededTeams = 0;
    const hasRealProvider =
      !!process.env.FOOTBALL_DATA_API_KEY &&
      (process.env.FOOTBALL_PROVIDER ?? "football-data-org") !== "mock";
    if (input.competitionCode.toUpperCase() === "WC" && !hasRealProvider) {
      const field = wc2026Teams().sort((a, b) => b.points - a.points);
      await prisma.team.createMany({
        data: field.map((team, i) => ({
          tournamentId: t.id,
          externalId: `fifa-${team.code}`,
          name: team.name,
          shortName: team.name,
          code: team.code,
          tier: Math.min(4, Math.max(1, Math.floor((i / field.length) * 4) + 1)),
          rankingPoints: team.points
        })),
        skipDuplicates: true
      });
      seededTeams = field.length;
    }

    await audit({
      action: "TOURNAMENT_CREATE",
      tournamentId: t.id,
      adminUserId: admin.id,
      detail: { name: t.name, slug: t.slug, seededTeams }
    });
    return ok({ tournament: t, seededTeams }, 201);
  } catch (e) {
    return handleError(e);
  }
}
