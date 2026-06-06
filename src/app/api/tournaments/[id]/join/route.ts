import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handleError, ok, parseJson, rateLimited } from "@/lib/api";
import { clientKey, consume } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const JoinSchema = z.object({
  name: z.string().min(1).max(60).trim(),
  email: z.string().email().max(120).optional().or(z.literal("")),
  inviteCode: z.string().min(4).max(16)
});

// Self-registration: identified by the tournament's invite code.
// Heavy rate-limit because this is public.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const rl = consume(clientKey(req, "join"), { capacity: 5, refillPerSecond: 0.1 });
    if (!rl.ok) return rateLimited(rl.retryAfterMs);

    const input = await parseJson(req, JoinSchema);
    const tournament = await prisma.tournament.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] }
    });
    if (!tournament) throw new ApiError(404, "Tournament not found");
    if (tournament.inviteCode.toUpperCase() !== input.inviteCode.toUpperCase()) {
      throw new ApiError(403, "Invalid invite code");
    }
    if (tournament.status !== "REGISTRATION_OPEN") {
      throw new ApiError(409, "Registration is not open");
    }
    if (tournament.registrationDeadline && tournament.registrationDeadline < new Date()) {
      throw new ApiError(409, "Registration deadline has passed");
    }
    const participant = await prisma.participant.create({
      data: {
        tournamentId: tournament.id,
        name: input.name,
        email: input.email || null
      }
    });
    await audit({
      action: "PARTICIPANT_SELF_REGISTER",
      tournamentId: tournament.id,
      detail: { participantId: participant.id }
    });
    return ok({ participant: { id: participant.id, name: participant.name } }, 201);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return handleError(new ApiError(409, "A participant with that name already exists"));
    }
    return handleError(e);
  }
}
