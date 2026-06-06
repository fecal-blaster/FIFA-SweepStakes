import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, Flag, SectionHeader } from "@/components/ui";
import type { MatchStage } from "@prisma/client";

export const dynamic = "force-dynamic";

const STAGES: MatchStage[] = ["ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];
const STAGE_LABEL: Record<MatchStage, string> = {
  GROUP: "Group",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINAL: "Quarter-finals",
  SEMI_FINAL: "Semi-finals",
  FINAL: "Final",
  THIRD_PLACE: "Third place"
};

export default async function BracketPage({ params }: { params: { slug: string } }) {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    include: {
      matches: {
        where: { stage: { in: STAGES } },
        orderBy: [{ stage: "asc" }, { kickoff: "asc" }],
        include: {
          homeTeam: { select: { name: true, code: true } },
          awayTeam: { select: { name: true, code: true } }
        }
      }
    }
  });
  if (!t) notFound();
  const groups: Record<string, typeof t.matches> = {};
  for (const m of t.matches) (groups[m.stage] ||= []).push(m);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-lime-400">Knockout</p>
        <h1 className="display text-4xl text-white mt-1">{t.name} — Bracket</h1>
      </header>

      <div className="grid md:grid-cols-4 gap-4 overflow-x-auto">
        {STAGES.map((stage) => {
          const rounds = groups[stage] ?? [];
          return (
            <div key={stage} className="space-y-3 min-w-[200px]">
              <h2 className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                {STAGE_LABEL[stage]}
              </h2>
              {rounds.length === 0 && (
                <Card>
                  <p className="text-xs text-white/40">TBD</p>
                </Card>
              )}
              {rounds.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/8 bg-ink-900/60 p-3 hover:border-white/15 transition"
                >
                  <Side
                    name={m.homeTeam?.name ?? "TBD"}
                    code={m.homeTeam?.code ?? null}
                    score={m.homeScore}
                    winner={m.winnerSide === "HOME"}
                  />
                  <div className="my-1.5 h-px bg-white/10" />
                  <Side
                    name={m.awayTeam?.name ?? "TBD"}
                    code={m.awayTeam?.code ?? null}
                    score={m.awayScore}
                    winner={m.winnerSide === "AWAY"}
                  />
                  <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
                    {m.status === "FINISHED"
                      ? "Full time"
                      : m.status === "IN_PLAY"
                        ? "Live"
                        : new Date(m.kickoff).toLocaleString(undefined, {
                            weekday: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Side({
  name,
  code,
  score,
  winner
}: {
  name: string;
  code: string | null;
  score: number | null;
  winner: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Flag code={code} size="md" />
      <span
        className={
          "flex-1 truncate text-sm " + (winner ? "text-lime-400 font-medium" : "text-white")
        }
      >
        {name}
      </span>
      <span
        className={
          "scoreboard-num " + (winner ? "text-lime-400" : "text-white/80")
        }
      >
        {score ?? "–"}
      </span>
    </div>
  );
}
