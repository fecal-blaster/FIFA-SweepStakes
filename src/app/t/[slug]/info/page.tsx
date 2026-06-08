import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, Flag, SectionHeader } from "@/components/ui";
import { DEFAULT_SCORING, type ScoringRules } from "@/lib/scoring";
import { formatMoney } from "@/lib/money";
import { resolvePrizes } from "@/lib/prizes";

export const dynamic = "force-dynamic";

export default async function TournamentInfoPage({ params }: { params: { slug: string } }) {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    include: {
      teams: { orderBy: { rankingPoints: "desc" } },
      participants: { where: { paid: true }, select: { id: true } }
    }
  });
  if (!t) notFound();

  const rules: ScoringRules = (t.scoringJson as unknown as ScoringRules) ?? DEFAULT_SCORING;
  const usingDefaultScoring = t.scoringJson === null;
  const pool = t.participants.length * t.buyInMinor;
  const prizes = resolvePrizes(t.prizesJson, {
    payoutBpsJson: t.payoutBpsJson
  });

  const teamCount = t.teams.length;
  const playerCount = t.participants.length;
  // Pool-shape stats for the worked example.
  const target = playerCount > 0 ? Math.ceil(teamCount / playerCount) : 0;
  const duplicatesNeeded = playerCount > 0 ? target * playerCount - teamCount : 0;
  const strongest = t.teams[0];
  const weakest = t.teams[t.teams.length - 1];
  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const team of t.teams) tierCounts[team.tier] = (tierCounts[team.tier] ?? 0) + 1;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-lime-400">How it works</p>
          <h1 className="display text-4xl text-white">{t.name}</h1>
        </div>
        <Link href={`/t/${t.slug}`} className="text-xs text-lime-400 hover:underline">
          ← Tournament home
        </Link>
      </header>

      {/* DRAW ALGORITHM */}
      <Card>
        <SectionHeader
          eyebrow={t.drawMode === "BALANCED" ? "Balanced draw" : "Pure random"}
          title={t.drawMode === "BALANCED" ? "How the teams get split" : "Pure random draw"}
        />
        {t.drawMode === "BALANCED" ? (
          <div className="space-y-3 text-sm text-white/75 leading-relaxed">
            <p>
              Each team carries an actual{" "}
              <span className="text-lime-400">FIFA Men's World Ranking score</span>{" "}
              — the same numbers FIFA publishes. The strength balancer uses
              them directly so a player holding 3 strong teams won't outweigh
              one holding 5 weaker ones.
            </p>
            <p className="text-white font-medium">Pass 1 — deal every team once.</p>
            <p>
              Teams are split into four pots by ranking (top quartile → T1).
              The system deals one at a time, narrowing the candidate set:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-white/70">
              <li>Fewest teams so far</li>
              <li>Fewest teams from this pot</li>
              <li>Fewest of your existing teams that this one would play in the group stage</li>
              <li>Furthest below the fair pool-strength share</li>
            </ol>
            <p>
              Cryptographic PRNG picks between any candidates still tied.
            </p>
            <p className="text-white font-medium">Pass 2 — top up to equal counts.</p>
            <p>
              When the team count doesn't divide evenly, some teams become{" "}
              <span className="text-lime-400">shared</span> so everyone holds
              the same number. Both owners earn the team's points equally.
              The algorithm picks each duplicate's source from a player who
              hasn't shared a team yet — so the load spreads across the room
              instead of doubling up on one person.
            </p>
          </div>
        ) : (
          <p className="text-sm text-white/75 leading-relaxed">
            All teams sit in one pool, shuffled with a cryptographic PRNG and
            dealt round-robin. Still uses duplicates so everyone ends up
            holding the same count and still caps the sharing — but skips
            strength balance and clash avoidance. Variance is the whole point.
          </p>
        )}
      </Card>

      {/* WORKED EXAMPLE */}
      {teamCount > 0 && playerCount > 0 && (
        <Card>
          <SectionHeader eyebrow="This tournament" title="The numbers" />
          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Teams" value={teamCount.toString()} />
            <Stat label="Players (paid)" value={playerCount.toString()} />
            <Stat label="Teams each" value={target.toString()} accent="lime" />
            <Stat
              label="Shared teams"
              value={duplicatesNeeded.toString()}
              accent={duplicatesNeeded === 0 ? "default" : "cyan"}
              hint={duplicatesNeeded === 0 ? "divides evenly" : "to even the count"}
            />
          </div>
          {strongest && weakest && (
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <RankSnapshot label="Highest ranked" team={strongest} accent="text-gold-400" />
              <RankSnapshot label="Lowest ranked" team={weakest} accent="text-white/50" />
            </div>
          )}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((tier) => (
              <div
                key={tier}
                className="rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-2"
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                  Pot T{tier}
                </div>
                <div className="scoreboard-num text-xl text-white mt-0.5">
                  {tierCounts[tier] ?? 0}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SCORING */}
      <Card>
        <SectionHeader
          eyebrow={usingDefaultScoring ? "Default scoring" : "Custom scoring"}
          title="Points for this tournament"
        />
        <p className="text-sm text-white/70 mb-5">
          Points are awarded automatically as matches finish. Group-stage
          results and knockout progression both count.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <ScoringTable
            title="Match results"
            rows={[
              ["Win", `+${rules.win}`],
              ["Draw (group only)", `+${rules.draw}`],
              ["Loss", rules.loss === 0 ? "0" : `+${rules.loss}`]
            ]}
          />
          <ScoringTable
            title="Reaching each round"
            rows={[
              ["Round of 32", `+${rules.qualifyR32}`],
              ["Round of 16", `+${rules.qualifyR16}`],
              ["Quarter-final", `+${rules.qualifyQF}`],
              ["Semi-final", `+${rules.qualifySF}`],
              ["Final", `+${rules.qualifyFinal}`],
              ["Tournament winner", `+${rules.champion}`]
            ]}
          />
        </div>
        <p className="mt-4 text-xs text-white/45">
          Points stack — a team that wins the final picks up the W points,
          the qualify-for-final points, and the champion bonus.
        </p>
      </Card>

      {/* PRIZE SPLIT */}
      <Card>
        <SectionHeader
          eyebrow={`Prize pool currently ${formatMoney(pool, t.currency)}`}
          title="Payouts"
        />
        <ul className="grid sm:grid-cols-2 gap-2">
          {prizes.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-2"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">
                  {p.kind === "PLACEMENT"
                    ? p.position === 1
                      ? "🥇"
                      : p.position === 2
                        ? "🥈"
                        : p.position === 3
                          ? "🥉"
                          : "🎖"
                    : p.kind === "WOODEN_SPOON"
                      ? "🥄"
                      : "⭐"}
                </span>
                <span className="text-sm text-white/75">{p.label}</span>
              </span>
              <span className="scoreboard-num text-lime-400">
                {formatMoney(Math.floor((pool * p.shareBps) / 10000), t.currency)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* VERIFICATION */}
      <Card>
        <SectionHeader eyebrow="Trust, but verify" title="Auditing the draw" />
        <p className="text-sm text-white/70 leading-relaxed">
          The draw publishes a public seed and a SHA-256 hash covering the
          participants, the teams <em className="not-italic">with their
          ranking points</em>, the group-stage fixtures, the seed, and the
          final allocations. Change a single number and the hash wouldn't
          match.
        </p>
        <p className="text-sm text-white/70 leading-relaxed mt-3">
          Click <em>Verify draw</em> on the{" "}
          <Link href={`/t/${t.slug}/draw`} className="text-lime-400 hover:underline">
            draw page
          </Link>{" "}
          and the server re-runs the whole algorithm from the seed. If the
          recomputed hash matches the stored one, the draw is exactly what
          it claims to be.
        </p>
      </Card>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function ScoringTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl bg-ink-900/60 ring-1 ring-white/8 p-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">{title}</p>
      <ul className="divide-y divide-white/5">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-center justify-between py-2 text-sm">
            <span className="text-white/75">{label}</span>
            <span className="scoreboard-num text-lime-400">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = "default"
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "lime" | "cyan";
}) {
  const colour =
    accent === "lime" ? "text-lime-400" : accent === "cyan" ? "text-cyan-400" : "text-white";
  return (
    <div className="rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className={`scoreboard-num text-2xl mt-0.5 ${colour}`}>{value}</div>
      {hint && <div className="text-[11px] text-white/45 mt-0.5">{hint}</div>}
    </div>
  );
}

function RankSnapshot({
  label,
  team,
  accent
}: {
  label: string;
  team: { name: string; code: string | null; rankingPoints: number };
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-2">
      <Flag code={team.code} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</div>
        <div className={`text-sm font-medium truncate ${accent}`}>{team.name}</div>
      </div>
      <div className="scoreboard-num text-xl text-white tabular">{team.rankingPoints}</div>
    </div>
  );
}
