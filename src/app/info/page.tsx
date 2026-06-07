import Link from "next/link";
import { Card, SectionHeader } from "@/components/ui";
import { DEFAULT_SCORING } from "@/lib/scoring";

export const metadata = {
  title: "How it works — FIFA Sweepstakes",
  description:
    "How the draw works, what gets you points, and why no-one can rig it."
};

export default function InfoPage() {
  const r = DEFAULT_SCORING;
  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-pitch-900/60 via-ink-900/80 to-ink-950 p-8 sm:p-10">
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(700px 350px at 90% 10%, rgba(126,255,50,0.25), transparent 60%), radial-gradient(600px 300px at 0% 100%, rgba(94,240,255,0.12), transparent 60%)"
          }}
        />
        <div className="relative z-10 max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.4em] text-lime-400 mb-3">
            ◇ The rules
          </p>
          <h1 className="display text-4xl sm:text-5xl text-white leading-[0.95]">
            How this thing
            <br />
            <span className="bg-gradient-to-r from-lime-400 via-cyan-400 to-gold-400 bg-clip-text text-transparent">
              actually works.
            </span>
          </h1>
          <p className="mt-4 text-white/70 max-w-xl">
            How the teams get split up, what earns you points, and how to check
            no-one fiddled the draw. Skim it before the first kickoff.
          </p>
        </div>
      </section>

      {/* FAIRNESS */}
      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionHeader eyebrow="So nobody gets the bin teams" title="The balanced draw, in plain English" />
          <div className="space-y-3 text-sm text-white/75 leading-relaxed">
            <p>
              Without this, Dave pulls Argentina, France, Brazil, and England
              while you end up with Costa Rica, Iran, Tunisia, and Saudi Arabia.
              That's the joke that gets old by the second match.
            </p>
            <p>
              Balanced mode prevents this. Teams are sorted into{" "}
              <span className="text-lime-400 font-medium">strength tiers</span>{" "}
              (Tier 1 = strongest pot, Tier 4 = weakest), and each tier is shuffled
              independently. The system deals one team at a time, always to the
              participant with the{" "}
              <span className="text-lime-400 font-medium">lowest current count</span>{" "}
              from that tier — with random tie-breaks so it stays unpredictable.
            </p>
            <p>
              The result: with 32 teams across 4 tiers of 8 and 8 participants,
              <em className="not-italic text-white"> everyone gets exactly one team
              from each tier</em>. With 10 participants, two of them get an extra
              team — but never two top-tier teams. The distribution is always
              within ±1 across the room.
            </p>
          </div>
          <div className="mt-5 rounded-xl bg-ink-900/60 ring-1 ring-white/8 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">
              Example — 8 players, 32 teams
            </p>
            <div className="grid grid-cols-4 gap-2 text-xs font-mono">
              <TierColumn label="Tier 1" colour="text-gold-400" teams={["ARG", "FRA", "BRA", "ENG", "ESP", "POR", "NED", "GER"]} />
              <TierColumn label="Tier 2" colour="text-silver-400" teams={["ITA", "CRO", "BEL", "URU", "COL", "MAR", "USA", "MEX"]} />
              <TierColumn label="Tier 3" colour="text-bronze-400" teams={["SUI", "DEN", "SEN", "JPN", "AUS", "POL", "KOR", "ECU"]} />
              <TierColumn label="Tier 4" colour="text-white/55" teams={["CAN", "KSA", "TUN", "IRN", "GHA", "CMR", "CRC", "SRB"]} />
            </div>
            <p className="mt-3 text-[11px] text-white/50">
              Each player draws one team per column. Random within the column,
              fair across the room.
            </p>
          </div>
        </Card>

        <Card glow>
          <SectionHeader eyebrow="Or go full chaos" title="Pure random mode" />
          <p className="text-sm text-white/75 leading-relaxed">
            The original sweepstake format. All teams in one pool, shuffled with
            a cryptographic PRNG, dealt round-robin. Quick and brutal — better
            for short tournaments where the variance is half the fun.
          </p>
          <p className="mt-3 text-sm text-white/75 leading-relaxed">
            Admins pick the mode when creating a sweepstake. The choice is
            recorded in the draw's audit trail, so participants always know
            which one they're getting.
          </p>
        </Card>
      </section>

      {/* SCORING */}
      <section>
        <SectionHeader eyebrow="Points" title="Default scoring system" />
        <Card>
          <p className="text-sm text-white/70 mb-5">
            Points are awarded automatically as matches finish. Both group-stage
            results and knockout progression count — so picking up a team that
            quietly survives to the quarter-finals can win the whole thing.
            Admins can override any of these per tournament.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <ScoringTable
              title="Match results"
              rows={[
                ["Win (group)", `+${r.win}`],
                ["Draw (group)", `+${r.draw}`],
                ["Loss (group)", r.loss === 0 ? "0" : `+${r.loss}`],
                ["Win (knockout)", `+${r.win}`]
              ]}
            />
            <ScoringTable
              title="Reaching each round"
              rows={[
                ["Round of 16", `+${r.qualifyR16}`],
                ["Quarter-final", `+${r.qualifyQF}`],
                ["Semi-final", `+${r.qualifySF}`],
                ["Final", `+${r.qualifyFinal}`],
                ["Tournament winner", `+${r.champion}`]
              ]}
            />
          </div>
          <p className="mt-5 text-xs text-white/45">
            Points stack — a team that wins the final picks up the W points,
            the qualify-for-final points,{" "}
            <em className="not-italic">and</em> the champion bonus.
          </p>
        </Card>
      </section>

      {/* VERIFICATION */}
      <section>
        <SectionHeader eyebrow="Nobody can fiddle the draw" title="Yes, you can check yourself" />
        <Card>
          <p className="text-sm text-white/70 leading-relaxed">
            Every draw gets a public seed (e.g.{" "}
            <code className="text-lime-400">fifa2026-9a7c4d</code>) plus a
            SHA-256 hash of the result. Click <em>Verify draw</em> on the draw
            page and the server re-runs the whole thing from the seed — if a
            single team got moved after the fact, the hashes wouldn't match
            and we'd know.
          </p>
          <p className="text-sm text-white/70 leading-relaxed mt-3">
            Redraws are allowed (someone forgot to pay, or the team list was
            wrong) but they get logged with a reason and the old draw stays
            visible. The whole history is on the public draw page so nobody
            has to take anyone's word for it.
          </p>
        </Card>
      </section>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 transition"
        >
          ← Back to tournaments
        </Link>
        <a
          href="https://github.com/fecal-blaster/FIFA-SweepStakes"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10 hover:text-white hover:bg-white/10 transition"
        >
          Source code on GitHub ↗
        </a>
      </div>
    </div>
  );
}

function TierColumn({
  label,
  colour,
  teams
}: {
  label: string;
  colour: string;
  teams: string[];
}) {
  return (
    <div>
      <p className={`text-[10px] uppercase tracking-[0.2em] mb-1.5 ${colour}`}>{label}</p>
      <ul className="space-y-0.5">
        {teams.map((t) => (
          <li key={t} className="text-white/75">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
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
