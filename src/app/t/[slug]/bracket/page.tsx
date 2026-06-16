import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Flag } from "@/components/ui";
import type { MatchStage, MatchStatus } from "@prisma/client";
import { formatShortKickoff } from "@/lib/format";

export const dynamic = "force-dynamic";

// Stages we render on the bracket page (no group fixtures here).
const KO_STAGES: MatchStage[] = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL"
];

type MatchRow = {
  id: string;
  stage: MatchStage;
  status: MatchStatus;
  kickoff: Date;
  homeScore: number | null;
  awayScore: number | null;
  winnerSide: string | null;
  homeTeam: { id: string; name: string; code: string | null } | null;
  awayTeam: { id: string; name: string; code: string | null } | null;
  homeTeamFallback: string | null;
  awayTeamFallback: string | null;
};

export default async function BracketPage({ params }: { params: { slug: string } }) {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    include: {
      matches: {
        where: { stage: { in: [...KO_STAGES, "FINAL", "THIRD_PLACE"] } },
        orderBy: [{ stage: "asc" }, { kickoff: "asc" }],
        include: {
          homeTeam: { select: { id: true, name: true, code: true } },
          awayTeam: { select: { id: true, name: true, code: true } }
        }
      }
    }
  });
  if (!t) notFound();

  // Owner attribution from active draw — quick lookup map for the team cards.
  const allocations = await prisma.teamAllocation.findMany({
    where: { tournamentId: t.id, draw: { isActive: true } },
    select: {
      teamId: true,
      participant: { select: { name: true } }
    }
  });
  const ownersByTeam = new Map<string, string[]>();
  for (const a of allocations) {
    const list = ownersByTeam.get(a.teamId) ?? [];
    list.push(a.participant.name);
    ownersByTeam.set(a.teamId, list);
  }

  // Split each knockout stage's matches into a left half and a right half
  // (ordered by kickoff). This mirrors the FotMob/FIFA bracket convention
  // where the bracket folds toward the centre.
  const stageMatches: Record<MatchStage, MatchRow[]> = {
    GROUP: [],
    ROUND_OF_32: [],
    ROUND_OF_16: [],
    QUARTER_FINAL: [],
    SEMI_FINAL: [],
    FINAL: [],
    THIRD_PLACE: []
  };
  for (const m of t.matches) stageMatches[m.stage].push(m as MatchRow);

  function split(stage: MatchStage): { left: MatchRow[]; right: MatchRow[] } {
    const all = stageMatches[stage];
    const half = Math.floor(all.length / 2);
    return { left: all.slice(0, half), right: all.slice(half) };
  }

  const r32 = split("ROUND_OF_32");
  const r16 = split("ROUND_OF_16");
  const qf = split("QUARTER_FINAL");
  const sf = split("SEMI_FINAL");
  const finalMatch = stageMatches.FINAL[0] ?? null;
  const bronzeMatch = stageMatches.THIRD_PLACE[0] ?? null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-lime-400">Knockout</p>
        <h1 className="display text-3xl sm:text-4xl text-white mt-1">{t.name} — Bracket</h1>
      </header>

      <div className="overflow-x-auto pb-4">
        <div
          className="min-w-[1100px] grid gap-2"
          style={{
            gridTemplateColumns:
              "minmax(155px, 1fr) minmax(155px, 1fr) minmax(155px, 1fr) minmax(155px, 1fr) minmax(170px, 1.1fr) minmax(155px, 1fr) minmax(155px, 1fr) minmax(155px, 1fr) minmax(155px, 1fr)"
          }}
        >
          {/* Stage headers */}
          <StageHeader label="Round of 32" />
          <StageHeader label="Round of 16" />
          <StageHeader label="Quarter-finals" />
          <StageHeader label="Semi-finals" />
          <StageHeader label="Final" centered />
          <StageHeader label="Semi-finals" align="right" />
          <StageHeader label="Quarter-finals" align="right" />
          <StageHeader label="Round of 16" align="right" />
          <StageHeader label="Round of 32" align="right" />

          {/* Left half */}
          <Column matches={r32.left} ownersByTeam={ownersByTeam} side="left" />
          <Column matches={r16.left} ownersByTeam={ownersByTeam} side="left" />
          <Column matches={qf.left} ownersByTeam={ownersByTeam} side="left" />
          <Column matches={sf.left} ownersByTeam={ownersByTeam} side="left" />

          {/* Centre: Final + Bronze + Trophy */}
          <CentrePiece final={finalMatch} bronze={bronzeMatch} ownersByTeam={ownersByTeam} />

          {/* Right half (mirrored — text aligns right via prop, connectors flip) */}
          <Column matches={sf.right} ownersByTeam={ownersByTeam} side="right" />
          <Column matches={qf.right} ownersByTeam={ownersByTeam} side="right" />
          <Column matches={r16.right} ownersByTeam={ownersByTeam} side="right" />
          <Column matches={r32.right} ownersByTeam={ownersByTeam} side="right" />
        </div>
      </div>

      <p className="text-xs text-white/40 max-w-2xl leading-relaxed">
        Knockout fixtures populate automatically as the group stage decides
        which teams advance — usually within a few minutes of each result
        being final.
      </p>
    </div>
  );
}

function StageHeader({
  label,
  centered,
  align = "left"
}: {
  label: string;
  centered?: boolean;
  align?: "left" | "right";
}) {
  return (
    <div
      className={
        "text-[10px] uppercase tracking-[0.22em] text-white/45 pb-1 " +
        (centered ? "text-center" : align === "right" ? "text-right" : "text-left")
      }
    >
      {label}
    </div>
  );
}

function Column({
  matches,
  ownersByTeam,
  side
}: {
  matches: MatchRow[];
  ownersByTeam: Map<string, string[]>;
  side: "left" | "right";
}) {
  // space-around stacks the matches with even vertical gaps — combined with
  // the smaller match count of later rounds, the layout naturally takes the
  // shape of a tournament bracket.
  return (
    <div className="flex flex-col justify-around gap-2 min-h-[640px]">
      {matches.map((m) => (
        <MatchBox key={m.id} m={m} ownersByTeam={ownersByTeam} side={side} />
      ))}
      {matches.length === 0 && <Placeholder />}
    </div>
  );
}

function CentrePiece({
  final,
  bronze,
  ownersByTeam
}: {
  final: MatchRow | null;
  bronze: MatchRow | null;
  ownersByTeam: Map<string, string[]>;
}) {
  const champion =
    final?.status === "FINISHED" && final.winnerSide
      ? final.winnerSide === "HOME"
        ? final.homeTeam
        : final.awayTeam
      : null;
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-1">
      {/* Trophy + champion */}
      <div className="text-center">
        <div className="text-4xl mb-1" aria-hidden>
          🏆
        </div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">
          {champion ? "Champion" : "Champion"}
        </div>
        {champion && (
          <div className="mt-1 inline-flex items-center gap-1.5">
            <Flag code={champion.code} size="md" />
            <span className="text-sm font-semibold text-gold-400">{champion.name}</span>
          </div>
        )}
      </div>

      {/* Final match card — gold-trim */}
      {final ? (
        <div className="w-full rounded-xl border border-gold-500/40 bg-gradient-to-br from-gold-500/5 to-transparent p-2.5 shadow-[0_0_24px_-8px_rgba(245,197,66,0.25)]">
          <div className="text-[9px] uppercase tracking-[0.22em] text-gold-400 text-center mb-1.5">
            Final · {formatShortKickoff(final.kickoff)}
          </div>
          <Side
            m={final}
            isHome
            ownersByTeam={ownersByTeam}
            align="centre"
          />
          <div className="my-1 h-px bg-gold-500/15" />
          <Side
            m={final}
            isHome={false}
            ownersByTeam={ownersByTeam}
            align="centre"
          />
        </div>
      ) : (
        <div className="w-full rounded-xl border border-gold-500/20 bg-ink-900/40 p-3 text-center">
          <div className="text-[9px] uppercase tracking-[0.22em] text-gold-400/60 mb-1">
            Final
          </div>
          <div className="text-xs text-white/40">TBD</div>
        </div>
      )}

      {/* Bronze (third-place) final */}
      {bronze && (
        <div className="w-full rounded-lg border border-bronze-400/30 bg-bronze-400/5 p-2">
          <div className="text-[9px] uppercase tracking-[0.22em] text-bronze-400 text-center mb-1">
            Bronze · {formatShortKickoff(bronze.kickoff)}
          </div>
          <Side m={bronze} isHome ownersByTeam={ownersByTeam} compact align="centre" />
          <div className="my-1 h-px bg-bronze-400/15" />
          <Side m={bronze} isHome={false} ownersByTeam={ownersByTeam} compact align="centre" />
        </div>
      )}
    </div>
  );
}

function MatchBox({
  m,
  ownersByTeam,
  side
}: {
  m: MatchRow;
  ownersByTeam: Map<string, string[]>;
  side: "left" | "right";
}) {
  const isLive = m.status === "IN_PLAY" || m.status === "PAUSED";
  const isFinished = m.status === "FINISHED";
  return (
    <div
      className={
        "relative rounded-lg border bg-ink-900/60 p-2 transition " +
        (isLive
          ? "border-live-500/40 shadow-[0_0_18px_-6px_rgba(255,39,71,0.4)]"
          : isFinished
            ? "border-white/15"
            : "border-white/8 hover:border-white/15")
      }
    >
      <Side m={m} isHome ownersByTeam={ownersByTeam} align={side === "right" ? "right" : "left"} />
      <div className="my-1 h-px bg-white/10" />
      <Side m={m} isHome={false} ownersByTeam={ownersByTeam} align={side === "right" ? "right" : "left"} />
      <div
        className={
          "mt-1.5 text-[9px] uppercase tracking-[0.18em] " +
          (isLive
            ? "text-live-400"
            : isFinished
              ? "text-white/50"
              : "text-white/40") +
          (side === "right" ? " text-right" : "")
        }
      >
        {isFinished ? "Full time" : isLive ? "Live" : formatShortKickoff(m.kickoff)}
      </div>
    </div>
  );
}

function Side({
  m,
  isHome,
  ownersByTeam,
  align = "left",
  compact = false
}: {
  m: MatchRow;
  isHome: boolean;
  ownersByTeam: Map<string, string[]>;
  align?: "left" | "right" | "centre";
  compact?: boolean;
}) {
  const team = isHome ? m.homeTeam : m.awayTeam;
  const fallback = isHome ? m.homeTeamFallback : m.awayTeamFallback;
  const score = isHome ? m.homeScore : m.awayScore;
  const winner = m.winnerSide === (isHome ? "HOME" : "AWAY");
  const dim = m.status === "FINISHED" && !winner && m.winnerSide;
  const owners = team ? ownersByTeam.get(team.id) ?? [] : [];
  const name = team?.name ?? fallback ?? "TBD";

  // Layout: flag · name (with owner under) · score
  // Right-aligned columns flip the order so the flag sits closest to the
  // centre of the bracket (visual symmetry with the left side).
  const flipped = align === "right";

  return (
    <div className={"flex items-center gap-1.5 " + (flipped ? "flex-row-reverse" : "")}>
      <Flag code={team?.code ?? null} size={compact ? "sm" : "md"} />
      <div className={"flex-1 min-w-0 " + (flipped ? "text-right" : "text-left")}>
        <div
          className={
            "truncate font-medium leading-tight " +
            (compact ? "text-xs" : "text-sm") +
            " " +
            (dim ? "text-white/40" : winner ? "text-lime-400" : "text-white")
          }
        >
          {name}
        </div>
        {owners.length > 0 && (
          <div
            className={
              "text-[9px] uppercase tracking-[0.16em] truncate " +
              (dim ? "text-white/25" : "text-cyan-400/80")
            }
          >
            {owners.join(", ")}
          </div>
        )}
      </div>
      <span
        className={
          "scoreboard-num shrink-0 " +
          (compact ? "text-base" : "text-lg") +
          " " +
          (dim ? "text-white/30" : winner ? "text-lime-400" : "text-white/85")
        }
      >
        {score ?? "–"}
      </span>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="rounded-lg border border-dashed border-white/8 bg-ink-900/30 p-3 text-center">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">TBD</p>
    </div>
  );
}
