import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, StatusBadge, Flag } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { participants: true, teams: true } },
      participants: { where: { paid: true }, select: { id: true } }
    }
  });

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-ink-900/60 p-10">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(700px 350px at 90% 10%, rgba(255,255,255,0.05), transparent 60%)"
          }}
        />
        <div className="relative z-10 max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/55 mb-3">
            ◇ Sweepstake HQ
          </p>
          <h1 className="display text-5xl sm:text-7xl text-white leading-[0.95]">
            FIFA sweepstakes
            <br />
            <span className="text-white/70">for the lads.</span>
          </h1>
          <p className="mt-5 text-base text-white/70 max-w-xl">
            Bin the spreadsheet, draw the teams, watch the points roll in. Live
            scores, an auto-updating leaderboard, and prize splits that work
            themselves out by full time.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <FeaturePill icon="🎲" text="No-one stitches the draw" />
            <FeaturePill icon="📺" text="Scores update themselves" />
            <FeaturePill icon="🏆" text="Prize maths sorted" />
            <FeaturePill icon="🍻" text="Banter-ready leaderboard" />
          </div>
          <div className="mt-5">
            <Link
              href="/info"
              className="inline-flex items-center gap-2 rounded-lg bg-lime-500/10 px-3.5 py-2 text-sm font-medium text-lime-400 ring-1 ring-lime-500/30 hover:bg-lime-500/20 transition"
            >
              How it works →
            </Link>
          </div>
        </div>
      </section>

      {/* TOURNAMENTS LIST */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">All competitions</p>
            <h2 className="display text-3xl text-white">Tournaments</h2>
          </div>
          <Link href="/admin" className="text-sm text-lime-400 hover:underline">
            Admin →
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <Card>
            <p className="text-white/60">
              No tournaments yet. Sign in as admin to create one.
            </p>
          </Card>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {tournaments.map((t) => {
              const pool = t.participants.length * t.buyInMinor;
              return (
                <li key={t.id}>
                  <Link href={`/t/${t.slug}`} className="block group">
                    <div className="relative rounded-2xl border border-white/8 bg-gradient-to-br from-ink-900/80 to-ink-950 p-5 overflow-hidden transition hover:border-lime-500/40 hover:shadow-glow">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-500/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                            {t.competitionCode}
                          </p>
                          <h3 className="display text-2xl text-white mt-1">{t.name}</h3>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <Metric label="Pool" value={formatMoney(pool, t.currency)} accent="lime" />
                        <Metric label="Players" value={String(t._count.participants)} />
                        <Metric label="Teams" value={String(t._count.teams)} />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function FeaturePill({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/80 ring-1 ring-white/10">
      <span aria-hidden>{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function Metric({
  label,
  value,
  accent = "default"
}: {
  label: string;
  value: string;
  accent?: "default" | "lime";
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.25em] text-white/40">{label}</div>
      <div
        className={
          "scoreboard-num text-xl mt-0.5 " +
          (accent === "lime" ? "text-lime-400" : "text-white")
        }
      >
        {value}
      </div>
    </div>
  );
}
