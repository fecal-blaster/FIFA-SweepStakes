import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, SectionHeader } from "@/components/ui";
import { DEFAULT_SCORING, type ScoringRules } from "@/lib/scoring";
import { distributePrizePool, formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function TournamentInfoPage({ params }: { params: { slug: string } }) {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    include: { participants: { where: { paid: true }, select: { id: true } } }
  });
  if (!t) notFound();

  const rules: ScoringRules = (t.scoringJson as unknown as ScoringRules) ?? DEFAULT_SCORING;
  const usingDefaultScoring = t.scoringJson === null;
  const payoutBps = (t.payoutBpsJson as number[]) ?? [5000, 3333, 1667];
  const pool = t.participants.length * t.buyInMinor;
  const projectedPrizes = distributePrizePool(pool, payoutBps);

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

      {/* FAIRNESS */}
      <Card>
        <SectionHeader
          eyebrow={t.drawMode === "BALANCED" ? "Balanced draw" : "Pure random"}
          title={
            t.drawMode === "BALANCED"
              ? "Why no-one gets all the favourites"
              : "Pure random draw"
          }
        />
        {t.drawMode === "BALANCED" ? (
          <div className="space-y-3 text-sm text-white/75 leading-relaxed">
            <p>
              Teams are sorted into <span className="text-lime-400">strength tiers</span>{" "}
              (Tier 1 = strongest pot, Tier 4 = weakest). Each tier is shuffled
              independently with a cryptographically secure PRNG. The system deals
              one team at a time, always to the participant with the{" "}
              <span className="text-lime-400">lowest current count</span> from that
              tier — with random tie-breaks so it stays unpredictable.
            </p>
            <p>
              Result: with 32 teams across 4 tiers and 8 participants, everyone gets
              exactly one team from each tier. With 10 participants, two of them
              get an extra team — but never two top-tier teams. The distribution is
              always within ±1 across the room.
            </p>
          </div>
        ) : (
          <p className="text-sm text-white/75 leading-relaxed">
            All teams sit in one pool, shuffled with a cryptographic PRNG and dealt
            round-robin. Quick and unpredictable — variance is half the fun.
          </p>
        )}
      </Card>

      {/* SCORING */}
      <Card>
        <SectionHeader
          eyebrow={usingDefaultScoring ? "Default scoring" : "Custom scoring"}
          title="Points for this tournament"
        />
        <p className="text-sm text-white/70 mb-5">
          Points are awarded automatically as matches finish. Group-stage results
          and knockout progression both count.
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
              ["Round of 16", `+${rules.qualifyR16}`],
              ["Quarter-final", `+${rules.qualifyQF}`],
              ["Semi-final", `+${rules.qualifySF}`],
              ["Final", `+${rules.qualifyFinal}`],
              ["Tournament winner", `+${rules.champion}`]
            ]}
          />
        </div>
        <p className="mt-4 text-xs text-white/45">
          Points stack — a team that wins the final picks up the W points, the
          qualify-for-final points, and the champion bonus.
        </p>
      </Card>

      {/* PRIZE SPLIT */}
      <Card>
        <SectionHeader
          eyebrow={`Prize pool currently ${formatMoney(pool, t.currency)}`}
          title="Payouts"
        />
        <ul className="grid sm:grid-cols-2 gap-2">
          {payoutBps.map((bp, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-2"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "•"}
                </span>
                <span className="text-sm text-white/75">
                  {ordinal(i + 1)} place ({(bp / 100).toFixed(2)}%)
                </span>
              </span>
              <span className="scoreboard-num text-lime-400">
                {formatMoney(projectedPrizes[i] ?? 0, t.currency)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* VERIFICATION */}
      <Card>
        <SectionHeader eyebrow="Trust, but verify" title="Auditing the draw" />
        <p className="text-sm text-white/70 leading-relaxed">
          Every draw publishes a seed (e.g.{" "}
          <code className="text-lime-400">fifa2026-9a7c4d</code>) plus a SHA-256
          verify hash. Anyone can re-run the draw from the seed and confirm the
          hashes match — see the{" "}
          <Link href={`/t/${t.slug}/draw`} className="text-lime-400 hover:underline">
            draw page
          </Link>{" "}
          for the seed, hash, and a one-click verifier.
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
