import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { computeLeaderboard } from "@/lib/leaderboard";
import { formatMoney } from "@/lib/money";
import { Card, Flag, SectionHeader, StatTile } from "@/components/ui";
import { PrizeCounter } from "@/components/prize-counter";

export const dynamic = "force-dynamic";

export default async function ParticipantPage({
  params
}: {
  params: { slug: string; participantId: string };
}) {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, name: true, currency: true }
  });
  if (!t) notFound();

  const board = await computeLeaderboard(t.id);
  const me = board.rows.find((r) => r.participantId === params.participantId);
  if (!me) notFound();

  const winningTeams = me.teams.filter((tm) => tm.points > 0);
  const goingTeams = me.teams.filter((tm) => tm.points === 0);
  const totalTeams = me.teams.length;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-pitch-900/60 via-ink-900/80 to-ink-950 p-8">
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(700px 350px at 90% 10%, rgba(126,255,50,0.25), transparent 60%)"
          }}
        />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-lime-400">
              {t.name}
            </p>
            <h1 className="display text-5xl text-white mt-1">{me.name}</h1>
            <p className="text-sm text-white/55 mt-1">
              Sitting {ordinal(me.rank)} of {board.rows.length}
              {!me.paid && " · marked unpaid"}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">Points</p>
              <p className="scoreboard-num text-6xl text-white">{me.points}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                Projected prize
              </p>
              <PrizeCounter poolMinor={me.projectedPrizeMinor} currency={t.currency} />
            </div>
          </div>
        </div>
      </section>

      {/* QUICK STATS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Rank" value={`#${me.rank}`} accent="cyan" />
        <StatTile label="Teams" value={totalTeams} />
        <StatTile label="Scoring" value={winningTeams.length} accent="lime" hint="teams on the board" />
        <StatTile
          label="Yet to score"
          value={goingTeams.length}
          hint="teams still on zero"
        />
      </section>

      {/* TEAMS WITH BREAKDOWN */}
      <section>
        <SectionHeader eyebrow="Your teams" title="Where the points came from" />
        <div className="grid sm:grid-cols-2 gap-3">
          {me.teams.map((tm) => (
            <Card key={tm.id} className="p-4">
              <div className="flex items-center gap-3">
                <Flag code={tm.code} size="xl" />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold truncate">{tm.name}</div>
                  <div className="text-[11px] text-white/45 uppercase tracking-[0.18em]">
                    {tm.code}
                  </div>
                </div>
                <div
                  className={
                    "scoreboard-num text-3xl " +
                    (tm.points > 0 ? "text-lime-400" : "text-white/30")
                  }
                >
                  {tm.points}
                </div>
              </div>
              {tm.events.length > 0 ? (
                <ul className="mt-3 space-y-1 divide-y divide-white/5">
                  {tm.events.map((ev, i) => (
                    <li key={i} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="text-white/65 truncate pr-2">{ev.label}</span>
                      <span
                        className={
                          "scoreboard-num shrink-0 " +
                          (ev.points > 0 ? "text-lime-400" : "text-white/30")
                        }
                      >
                        {ev.points > 0 ? `+${ev.points}` : "0"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-white/40">
                  No matches played yet for this team.
                </p>
              )}
            </Card>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href={`/t/${t.slug}`}
          className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 transition"
        >
          ← Tournament home
        </Link>
        <Link
          href={`/t/${t.slug}/leaderboard`}
          className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 transition"
        >
          Full leaderboard
        </Link>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
