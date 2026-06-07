// Fire-and-forget Discord webhook poster. Discord webhook URLs look like
// https://discord.com/api/webhooks/<id>/<token>. We never throw — failure to
// post should not block the request that triggered it.

import { prisma } from "@/lib/db";

type Embed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

export async function postEmbed(webhookUrl: string, embed: Embed): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "FIFA Sweepstakes",
        embeds: [embed]
      })
    });
  } catch (e) {
    console.error("[discord] post failed:", (e as Error).message);
  }
}

export async function notifyTournament(tournamentId: string, embed: Embed): Promise<void> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { discordWebhookUrl: true, name: true }
  });
  if (!t?.discordWebhookUrl) return;
  await postEmbed(t.discordWebhookUrl, {
    ...embed,
    footer: { text: t.name }
  });
}

export const COLOR = {
  lime: 0x7eff32,
  gold: 0xf5c542,
  cyan: 0x5ef0ff,
  live: 0xff2747,
  bronze: 0xd68a4a
};
