"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, cn } from "@/components/ui";
import { matchClock } from "@/lib/match-clock";

export type MatchCardData = {
  id: string;
  stage: string;
  groupName: string | null;
  status: string;
  kickoff: string;
  homeName: string;
  homeCode: string | null;
  homeScore: number | null;
  homeOwner: { id: string; name: string } | null;
  awayName: string;
  awayCode: string | null;
  awayScore: number | null;
  awayOwner: { id: string; name: string } | null;
  winnerSide: "HOME" | "AWAY" | null;
};

export function MatchCard({
  match,
  size = "md"
}: {
  match: MatchCardData;
  size?: "sm" | "md" | "lg";
}) {
  // Track previous score so we can flash on increment.
  const [popHome, setPopHome] = useState(false);
  const [popAway, setPopAway] = useState(false);
  const prevHome = useRef(match.homeScore);
  const prevAway = useRef(match.awayScore);
  useEffect(() => {
    if (match.homeScore != null && prevHome.current != null && match.homeScore > prevHome.current) {
      setPopHome(true);
      const t = setTimeout(() => setPopHome(false), 900);
      return () => clearTimeout(t);
    }
    prevHome.current = match.homeScore;
  }, [match.homeScore]);
  useEffect(() => {
    if (match.awayScore != null && prevAway.current != null && match.awayScore > prevAway.current) {
      setPopAway(true);
      const t = setTimeout(() => setPopAway(false), 900);
      return () => clearTimeout(t);
    }
    prevAway.current = match.awayScore;
  }, [match.awayScore]);

  // Tick the clock locally each second so the minute counter feels alive.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (match.status !== "IN_PLAY") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [match.status]);
  const clock = matchClock(match.status, new Date(match.kickoff), new Date(Date.now() + tick * 0));

  const scoreSize =
    size === "lg" ? "text-4xl sm:text-5xl" : size === "sm" ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl";
  const isLive = clock.kind === "live";
  const isFinal = clock.kind === "finished";
  const sameOwner =
    match.homeOwner && match.awayOwner && match.homeOwner.id === match.awayOwner.id;

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-ink-900/60 backdrop-blur",
        "transition",
        isLive ? "border-live-500/40 shadow-livepulse" : "border-white/5 hover:border-white/10"
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-white/45 min-w-0 truncate">
          <span className="truncate">{match.stage.replace(/_/g, " ")}</span>
          {match.groupName && <span className="hidden xs:inline">· Group {match.groupName}</span>}
        </div>
        <ClockBadge clock={clock} />
      </div>

      {sameOwner && (
        <div className="mx-3 mt-2 rounded-md bg-gold-500/10 ring-1 ring-gold-500/30 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-gold-400 text-center">
          ⚡ {match.homeOwner!.name}'s teams clash
        </div>
      )}

      <div className="px-3 pb-3 pt-2 space-y-2">
        <Row
          name={match.homeName}
          code={match.homeCode}
          score={match.homeScore}
          owner={match.homeOwner}
          dim={isFinal && match.winnerSide === "AWAY"}
          highlight={match.winnerSide === "HOME"}
          pop={popHome}
          scoreSize={scoreSize}
          status={match.status}
        />
        <Row
          name={match.awayName}
          code={match.awayCode}
          score={match.awayScore}
          owner={match.awayOwner}
          dim={isFinal && match.winnerSide === "HOME"}
          highlight={match.winnerSide === "AWAY"}
          pop={popAway}
          scoreSize={scoreSize}
          status={match.status}
        />
      </div>
    </div>
  );
}

function Row({
  name,
  code,
  score,
  owner,
  dim,
  highlight,
  pop,
  scoreSize,
  status
}: {
  name: string;
  code: string | null;
  score: number | null;
  owner: { id: string; name: string } | null;
  dim: boolean;
  highlight: boolean;
  pop: boolean;
  scoreSize: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Flag code={code} size="lg" />
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "truncate font-medium leading-tight text-sm sm:text-base",
            dim ? "text-white/40" : highlight ? "text-lime-400" : "text-white"
          )}
        >
          {name}
        </div>
        <div
          className={cn(
            "text-[9px] sm:text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.18em] leading-tight truncate mt-0.5",
            owner ? (dim ? "text-white/30" : "text-cyan-400/85") : "text-white/35"
          )}
        >
          {owner ? owner.name : "—"}
        </div>
      </div>
      <div
        className={cn(
          "scoreboard-num tabular shrink-0",
          scoreSize,
          dim ? "text-white/30" : highlight ? "text-lime-400" : "text-white",
          pop && "animate-score-pop"
        )}
      >
        {score == null ? (status === "SCHEDULED" ? "–" : "0") : score}
      </div>
    </div>
  );
}

function ClockBadge({ clock }: { clock: ReturnType<typeof matchClock> }) {
  if (clock.kind === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-live-400">
        <span className="live-dot" /> {clock.label}
      </span>
    );
  }
  if (clock.kind === "finished") {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
        Full time
      </span>
    );
  }
  if (clock.kind === "half_time") {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
        Half time
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
      {clock.label}
    </span>
  );
}
