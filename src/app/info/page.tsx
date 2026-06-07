import Link from "next/link";
import { Card, SectionHeader } from "@/components/ui";
import { Eli5 } from "@/components/eli5";
import { DEFAULT_SCORING } from "@/lib/scoring";
import { getSiteSettings } from "@/lib/settings";

export const metadata = {
  title: "How it works — FIFA Sweepstakes",
  description: "How teams are drawn, how points work, how to check the draw."
};

export const dynamic = "force-dynamic";

export default async function InfoPage() {
  const r = DEFAULT_SCORING;
  const settings = await getSiteSettings();
  return (
    <div className="space-y-8 sm:space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/8 bg-ink-900/60 p-6 sm:p-10">
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
          <p className="mt-3 text-sm sm:text-base text-white/70 max-w-xl">
            {settings.infoDescription}
          </p>
        </div>
      </section>

      {/* TEAM STRENGTH */}
      <section>
        <SectionHeader eyebrow="Team strength" title="Where the rankings come from" />
        <Card>
          <div className="space-y-3 text-sm text-white/80 leading-relaxed">
            <p>
              Every team has a FIFA world ranking — the same one you'll find
              on FIFA's website. Argentina sit around 1872 points, England 1820,
              and so on down to the minnows. Those numbers are what the draw
              uses to keep things even.
            </p>
            <p>
              You can load the current rankings with one button. If you think
              a team deserves more or less, you can edit it. Up to you.
            </p>
          </div>
        </Card>
      </section>

      {/* THE DRAW */}
      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionHeader eyebrow="The draw" title="How teams get handed out" />
          <div className="space-y-5 text-sm text-white/80 leading-relaxed">
            <Eli5 simple="Everyone gets a mix of good and bad teams. Nobody walks off with all the favourites.">
              <p>
                Without any logic, one person could end up with Argentina,
                France, Brazil, and England while their mate gets stuck with
                Costa Rica, Iran, Tunisia, and Saudi Arabia. Not exactly fair.
              </p>
              <p>
                So the draw does two things. First it makes sure everyone ends
                up with the same number of teams. Then it spreads the strong
                ones around so no single person has a stacked pool.
              </p>
            </Eli5>

            <Eli5 simple="Every team gets handed out once. Whoever has the fewest teams gets the next one.">
              <p className="text-white font-medium">Step 1: hand out every team</p>
              <p>
                The teams are split into four pots — top quarter, second
                quarter, etc. — and then dealt one at a time. Each team goes
                to whoever:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-white/70">
                <li>has the fewest teams so far</li>
                <li>has the fewest from this pot</li>
                <li>doesn't already own a team they'd be playing</li>
                <li>is furthest behind on combined strength</li>
              </ul>
              <p>
                If more than one person ticks every box, the dice rolls and
                picks at random.
              </p>
            </Eli5>

            <Eli5 simple="48 teams don't split evenly into 11 people. So a few teams have two owners. We try to spread that around fairly.">
              <p className="text-white font-medium">Step 2: deal with the leftovers</p>
              <p>
                48 teams across 11 players doesn't divide cleanly. So a handful
                of teams end up with <strong className="text-white">two
                owners</strong>. Both people earn the team's points equally —
                if Brazil wins, you both pick up the points.
              </p>
              <p>
                The draw tries hard to spread the sharing around. Most people
                end up with one shared team and that's it. Nobody gets stuck
                with two unless the maths leaves no choice.
              </p>
            </Eli5>
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Pure random mode" title="If you'd rather not bother" />
          <Eli5 simple="Names in a hat. Pure luck. Whatever happens, happens.">
            <p className="text-sm text-white/80 leading-relaxed">
              Pure random skips all the balancing. Teams get shuffled and
              dealt one at a time, end of story. Quick and chaotic if that's
              what you're after — but you might get screwed.
            </p>
            <p className="mt-3 text-sm text-white/80 leading-relaxed">
              Whichever mode runs is saved with the draw so everyone can see
              what they signed up for.
            </p>
          </Eli5>
        </Card>
      </section>

      {/* WORKED EXAMPLE */}
      <section>
        <SectionHeader eyebrow="The numbers" title="What 48 teams across 11 people looks like" />
        <Card>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <Stat
              label="Teams each"
              value="5"
              tone="lime"
              hint="48 divided by 11, rounded up. Same for everyone."
            />
            <Stat
              label="Teams shared"
              value="7"
              tone="cyan"
              hint="11 × 5 = 55. Minus 48 actual teams = 7 with two owners."
            />
            <Stat
              label="Shared per person"
              value="usually 1"
              tone="gold"
              hint="Most people end up with one. A couple get two when the maths forces it."
            />
          </div>
        </Card>
      </section>

      {/* SCORING */}
      <section>
        <SectionHeader eyebrow="Points" title="How you score" />
        <Card>
          <p className="text-sm text-white/80 mb-5 leading-relaxed">
            Points get added automatically as matches finish. Every group win
            counts, every round your teams reach counts, and winning the
            tournament is a big bonus. Picking up a team that quietly survives
            into the quarter-finals can win you the whole pool.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <ScoringTable
              title="Match results"
              rows={[
                ["Win (group)", `+${r.win}`],
                ["Draw (group)", `+${r.draw}`],
                ["Loss (group)", r.loss === 0 ? "0" : `+${r.loss}`],
                ["Knockout win", `+${r.win}`]
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
          <p className="mt-5 text-xs text-white/55 leading-relaxed">
            Points stack. A team that wins the final picks up the win points,
            the qualify-for-final points, and the champion bonus all together.
          </p>
        </Card>
      </section>

      {/* VERIFICATION */}
      <section>
        <SectionHeader eyebrow="Checking the draw" title="Don't take my word for it" />
        <Card>
          <Eli5 simple="The computer rolls some dice. The secret number is public so anyone can roll the same dice and check we got the same answer.">
            <div className="space-y-3 text-sm text-white/80 leading-relaxed">
              <p>
                Every draw publishes a secret number (a "seed") and a
                fingerprint of the result. The fingerprint covers everything
                that went in: the players, the teams, the rankings, the
                fixtures, and the final allocations. Change anything after the
                fact and the fingerprint won't match.
              </p>
              <p>
                There's a <em>Verify draw</em> button on the draw page. Click
                it and the server re-runs the whole thing from the seed. If
                someone tried to swap a team afterwards, the fingerprints
                wouldn't line up and you'd see it.
              </p>
              <p>
                If a redraw needs to happen — someone forgot to pay, the team
                list was wrong — it gets logged with a reason and the old
                draw stays on record. Nothing gets swept under the rug.
              </p>
            </div>
          </Eli5>
        </Card>
      </section>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2">
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
          Source on GitHub ↗
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

function Stat({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "lime" | "cyan" | "gold";
}) {
  const colour =
    tone === "lime"
      ? "text-lime-400"
      : tone === "cyan"
        ? "text-cyan-400"
        : tone === "gold"
          ? "text-gold-400"
          : "text-white";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">{label}</p>
      <p className={`scoreboard-num text-3xl ${colour}`}>{value}</p>
      {hint && <p className="text-white/55 text-xs mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}
