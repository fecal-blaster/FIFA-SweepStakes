import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { computeLeaderboard } from "@/lib/leaderboard";
import { Card, SectionHeader } from "@/components/ui";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { PrizeCounter } from "@/components/prize-counter";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ params }: { params: { slug: string } }) {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true }
  });
  if (!t) notFound();
  const board = await computeLeaderboard(t.id);
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-lime-400">Live</p>
          <h1 className="display text-4xl text-white">{t.name} — Standings</h1>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 text-right">Prize pool</p>
          <PrizeCounter poolMinor={board.prizePoolMinor} currency={board.currency} />
        </div>
      </header>
      <Card>
        <LiveLeaderboard slug={params.slug} initial={board} />
      </Card>
    </div>
  );
}
