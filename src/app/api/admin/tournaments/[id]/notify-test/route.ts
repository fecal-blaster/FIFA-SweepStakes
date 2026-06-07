import { handleError, notFound, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { COLOR, notifyTournament } from "@/lib/discord";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const t = await prisma.tournament.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, discordWebhookUrl: true }
    });
    if (!t) return notFound("Tournament not found");
    if (!t.discordWebhookUrl) return notFound("No webhook configured");
    await notifyTournament(t.id, {
      title: "✅ Webhook test",
      description: `Notifications are wired up for **${t.name}**.`,
      color: COLOR.lime,
      timestamp: new Date().toISOString()
    });
    return ok({ sent: true });
  } catch (e) {
    return handleError(e);
  }
}
