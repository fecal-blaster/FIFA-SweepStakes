import Link from "next/link";
import { Card, SectionHeader } from "@/components/ui";
import { Eli5 } from "@/components/eli5";
import { DEFAULT_SCORING } from "@/lib/scoring";
import { getSiteSettings } from "@/lib/settings";

export const metadata = {
  title: "How it works — FIFA Sweepstakes",
  description:
    "How the draw works, what gets you points, and why no-one can rig it."
};

export const dynamic = "force-dynamic";

export default async function InfoPage() {
  const r = DEFAULT_SCORING;
  const settings = await getSiteSettings();
  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-ink-900/60 p-8 sm:p-10">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(700px 350px at 90% 10%, rgba(255,255,255,0.04), transparent 60%)"
          }}
        />
        <div className="relative z-10 max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/55 mb-3">
            {settings.infoEyebrow}
          </p>
          <h1 className="display text-3xl sm:text-4xl text-white leading-tight">
            {settings.infoTitle}
          </h1>
          <p className="mt-3 text-white/70 max-w-xl">
            {settings.infoDescription}
          </p>
        </div>
      </section>

      {/* RANKINGS — INPUT */}
      <section>
        <SectionHeader eyebrow="Source of truth" title="Every team has a FIFA ranking" />
        <Card>
          <div className="space-y-3 text-sm text-white/75 leading-relaxed">
            <p>
              The draw doesn't care about gut feel. Each team carries an actual
              <span className="text-lime-400"> FIFA Men's World Ranking score</span>{" "}
              — Argentina around 1886, France around 1854, England around 1819,
              all the way down. Tournament admins can pre-load the current
              list with one click and tweak any number that doesn't match
              their view.
            </p>
            <p>
              Those numbers feed the strength balancer directly, so a player
              holding 3 strong teams won't quietly outweigh a player holding
              5 weaker ones — they'll both end up with the same combined
              pool strength, plus or minus a sliver.
            </p>
          </div>
        </Card>
      </section>

      {/* FAIRNESS — ALGORITHM */}
      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionHeader
            eyebrow="Strength-balanced allocation"
            title="How the balanced draw works"
          />
          <div className="space-y-4 text-sm text-white/75 leading-relaxed">
            <Eli5 simple="Each participant gets a fair mix of strong and weak teams. Their combined ranking ends up roughly equal across the room.">
              <p>
                A pure random draw can hand one participant Argentina, France,
                Brazil, and England while another gets Costa Rica, Iran,
                Tunisia, and Saudi Arabia. The balanced mode prevents that.
              </p>
              <p>The draw runs in two passes.</p>
            </Eli5>

            <Eli5 simple="Round one: deal every team once. Always to whoever has the fewest so far.">
              <p className="text-white font-medium">Pass 1 — deal every team once.</p>
              <p>
                Teams get sorted into four pots (top 25% by ranking → Tier 1,
                etc.). The system deals one team at a time. When more than one
                participant could take a team, it narrows the field through
                these tie-breakers, in order:
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-white/70">
                <li>Fewest teams overall</li>
                <li>Fewest teams from this pot</li>
                <li>
                  Fewest of your existing teams that this one would play in the
                  group stage <span className="text-white/45">(reduces self-clashes)</span>
                </li>
                <li>
                  Furthest below the fair pool-strength share{" "}
                  <span className="text-white/45">(keeps combined rankings flat)</span>
                </li>
              </ol>
              <p>
                If multiple candidates are still tied, the cryptographic PRNG
                picks between them.
              </p>
            </Eli5>

            <Eli5 simple="Round two: not enough teams to go round evenly? Two people share one. We try to make sure nobody has to share twice.">
              <p className="text-white font-medium">Pass 2 — top up to equal counts.</p>
              <p>
                When 48 teams don't divide evenly across, say, 11 players, some
                teams have to be{" "}
                <span className="text-white">shared</span> so everyone ends up
                holding the same number. Both owners earn the team's points
                equally. The algorithm picks each duplicate's source from a
                player who hasn't shared a team yet — so the sharing burden
                spreads across the room instead of doubling up on the same
                person.
              </p>
              <p>
                When the maths force someone to end up with two shared teams
                (true minimum given the player count), it picks the people for
                that role at random.
              </p>
            </Eli5>
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Or skip the maths" title="Pure random mode" />
          <Eli5 simple="No strength balancing or clash avoidance — pure random shuffle.">
            <p className="text-sm text-white/75 leading-relaxed">
              All teams in one pool, shuffled with a cryptographic PRNG, dealt
              round-robin. Still uses duplicates to even out counts and still
              caps the shared-team load, but does not balance strength or
              avoid clashes.
            </p>
            <p className="mt-3 text-sm text-white/75 leading-relaxed">
              The mode is recorded in the draw's audit trail so participants
              always know which one ran.
            </p>
          </Eli5>
        </Card>
      </section>

      {/* DUPLICATES EXAMPLE */}
      <section>
        <SectionHeader eyebrow="Worked example" title="48 teams, 11 players" />
        <Card>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">
                Target per player
              </p>
              <p className="scoreboard-num text-3xl text-lime-400">5</p>
              <p className="text-white/60 mt-1">
                ⌈48 ÷ 11⌉ — everyone holds the same count.
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">
                Duplicates needed
              </p>
              <p className="scoreboard-num text-3xl text-cyan-400">7</p>
              <p className="text-white/60 mt-1">
                11 × 5 − 48 = 7 teams get a second owner.
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">
                Shared-team load
              </p>
              <p className="scoreboard-num text-3xl text-gold-400">≤ 2</p>
              <p className="text-white/60 mt-1">
                Most players end up with one shared team; at most a couple
                with two when maths force it.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* SCORING */}
      <section>
        <SectionHeader eyebrow="Points" title="Default scoring system" />
        <Card>
          <p className="text-sm text-white/70 mb-5">
            Points are awarded automatically as matches finish. Group-stage
            results and knockout progression both count — picking up a team
            that quietly survives to the quarter-finals can win the whole
            thing. Admins can override any of these per tournament.
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
                ["Round of 32", `+${r.qualifyR32}`],
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
            the qualify-for-final points, and the champion bonus.
          </p>
        </Card>
      </section>

      {/* VERIFICATION */}
      <section>
        <SectionHeader eyebrow="Nobody can fiddle the draw" title="Yes, you can check yourself" />
        <Card>
          <Eli5 simple="Computer rolled some dice. Anyone can re-roll with the same secret number and check we got the same answer. No fiddling.">
            <p className="text-sm text-white/70 leading-relaxed">
              Every draw gets a public seed (e.g.{" "}
              <code className="text-white">fifa2026-9a7c4d</code>) plus a
              SHA-256 hash of the whole result. The hash covers the
              participant list, the team list <em className="not-italic">with
              their ranking points</em>, the group-stage fixture list, the
              seed, and the final allocations. Change a single number and the
              hash wouldn't match.
            </p>
            <p className="text-sm text-white/70 leading-relaxed mt-3">
              Click <em>Verify draw</em> on any draw page and the server
              re-runs the whole algorithm from the seed. If a single team got
              shuffled around after the fact, the recomputed hash wouldn't
              match the stored one and you'd see it instantly.
            </p>
            <p className="text-sm text-white/70 leading-relaxed mt-3">
              Redraws are allowed (someone forgot to pay, the team list was
              wrong) but they get logged with a reason and the old draw stays
              visible forever. The whole history is on the public draw page
              so nobody has to take anyone's word for it.
            </p>
          </Eli5>
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
