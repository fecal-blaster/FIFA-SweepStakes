import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { computeLeaderboard } from "@/lib/leaderboard";
import { distributePrizePool, formatMoney } from "@/lib/money";
import { Card, SectionHeader, StatTile, StatusBadge } from "@/components/ui";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { LiveMatches } from "@/components/live-matches";
import { PrizeCounter } from "@/components/prize-counter";
import { ErrorBoundary } from "@/components/error-boundary";

export const dynamic = "force-dynamic";

export default async function TournamentPage({ params }: { params: { slug: string } }) {
  const tournament = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    include: {
      teams: true,
      participants: true,
      _count: { select: { matches: true } }
    }
  });
  if (!tournament) notFound();

  const board = await computeLeaderboard(tournament.id);
  const payouts = distributePrizePool(
    board.prizePoolMinor,
    (tournament.payoutBpsJson as number[]) ?? [5000, 3333, 1667]
  );

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-pitch-900/80 via-ink-900 to-ink-950 p-8">
        <div className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(600px 300px at 80% 100%, rgba(126,255,50,0.25), transparent 60%), radial-gradient(700px 350px at 0% 0%, rgba(94,240,255,0.12), transparent 60%)"
          }}
        />
        <div className="relative z-10 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={tournament.status} />
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                {tournament.competitionCode}
              </span>
            </div>
            <h1 className="display text-5xl sm:text-6xl text-white leading-none">
              {tournament.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Link
                href={`/t/${tournament.slug}/live`}
                className="inline-flex items-center gap-2 rounded-lg bg-live-500/10 px-3 py-2 text-sm font-medium text-live-400 ring-1 ring-live-500/30 hover:bg-live-500/20 transition"
              >
                <span className="live-dot" /> Live match centre
              </Link>
              <Link
                href={`/t/${tournament.slug}/leaderboard`}
                className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 transition"
              >
                🏆 Leaderboard
              </Link>
              <Link
                href={`/t/${tournament.slug}/draw`}
                className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 transition"
              >
                🎲 Draw & verify
              </Link>
              <Link
                href={`/t/${tournament.slug}/bracket`}
                className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 transition"
              >
                🪜 Bracket
              </Link>
              <Link
                href="/info"
                className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10 hover:text-white hover:bg-white/10 transition"
              >
                ℹ️ How it works
              </Link>
            </div>
          </div>
          <div className="lg:col-span-1 flex flex-col items-start lg:items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">Prize pool</p>
              <ErrorBoundary label="Prize counter">
                <PrizeCounter poolMinor={board.prizePoolMinor} currency={board.currency} />
              </ErrorBoundary>
              <p className="text-xs text-white/45 mt-1">
                {board.participantsPaid} of {board.participantsTotal} paid in
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Participants"
          value={board.participantsTotal}
          accent="cyan"
          hint={`${board.participantsPaid} paid`}
        />
        <StatTile label="Teams" value={tournament.teams.length} />
        <StatTile label="Fixtures" value={tournament._count.matches} />
        <StatTile
          label="Buy-in"
          value={formatMoney(tournament.buyInMinor, tournament.currency)}
          accent="gold"
        />
      </section>

      {/* LIVE STRIP */}
      <section>
        <SectionHeader
          eyebrow="In play now"
          title="Live matches"
          right={
            <Link
              href={`/t/${tournament.slug}/live`}
              className="text-xs text-lime-400 hover:underline"
            >
              Open match centre →
            </Link>
          }
        />
        <ErrorBoundary label="Live matches">
          <LiveMatches
            slug={tournament.slug}
            scope="live"
            size="lg"
            emptyLabel="No matches in play right now — the strip will light up when kickoff happens."
          />
        </ErrorBoundary>
      </section>

      {/* MAIN GRID */}
      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionHeader
            eyebrow="Live"
            title="Leaderboard"
            right={
              <Link
                href={`/t/${tournament.slug}/leaderboard`}
                className="text-xs text-lime-400 hover:underline"
              >
                Full board →
              </Link>
            }
          />
          <ErrorBoundary label="Leaderboard">
            <LiveLeaderboard slug={tournament.slug} initial={board} compact />
          </ErrorBoundary>
        </Card>

        <Card>
          <SectionHeader eyebrow="Prize split" title="Payouts" />
          <ul className="space-y-2 tabular">
            {payouts.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg bg-white/3 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-white/70">
                  <span
                    className={
                      i === 0
                        ? "text-gold-400 text-lg"
                        : i === 1
                          ? "text-silver-400 text-lg"
                          : i === 2
                            ? "text-bronze-400 text-lg"
                            : "text-white/40 text-lg"
                    }
                  >
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "•"}
                  </span>
                  <span className="text-sm">{ordinal(i + 1)} place</span>
                </span>
                <span className="font-semibold text-white scoreboard-num">
                  {formatMoney(p, board.currency)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* RECENT + UPCOMING */}
      <section className="grid lg:grid-cols-2 gap-4">
        <div>
          <SectionHeader eyebrow="Just finished" title="Recent results" />
          <ErrorBoundary label="Recent">
            <LiveMatches slug={tournament.slug} scope="recent" emptyLabel="No completed matches yet." />
          </ErrorBoundary>
        </div>
        <div>
          <SectionHeader eyebrow="Coming up" title="Upcoming fixtures" />
          <ErrorBoundary label="Upcoming">
            <LiveMatches slug={tournament.slug} scope="upcoming" emptyLabel="No upcoming fixtures." />
          </ErrorBoundary>
        </div>
      </section>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
