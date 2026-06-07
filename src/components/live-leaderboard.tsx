"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { io, type Socket } from "socket.io-client";
import { formatMoney } from "@/lib/money";
import type { LeaderboardSummary, TeamBreakdown } from "@/lib/leaderboard";
import { cn, Flag } from "@/components/ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function LiveLeaderboard({
  slug,
  initial,
  compact = false
}: {
  slug: string;
  initial: LeaderboardSummary;
  compact?: boolean;
}) {
  const { data, mutate } = useSWR<LeaderboardSummary>(
    `/api/tournaments/${slug}/leaderboard`,
    fetcher,
    { fallbackData: initial, refreshInterval: 10000 }
  );
  const prevRanks = useRef<Map<string, number>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let socket: Socket | null = null;
    try {
      socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
      socket.emit("subscribe:tournament", slug);
      socket.on("leaderboard:update", () => mutate());
      socket.on("match:goal", () => mutate());
      socket.on("match:update", () => mutate());
      socket.on("draw:complete", () => mutate());
    } catch {}
    return () => {
      socket?.disconnect();
    };
  }, [slug, mutate]);

  const board = data ?? initial;
  const rows = compact ? board.rows.slice(0, 5) : board.rows;

  const movements = new Map<string, number>();
  for (const r of board.rows) {
    const before = prevRanks.current.get(r.participantId);
    if (before !== undefined) movements.set(r.participantId, before - r.rank);
  }
  useEffect(() => {
    const next = new Map<string, number>();
    for (const r of board.rows) next.set(r.participantId, r.rank);
    prevRanks.current = next;
  }, [board.rows]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ol className="space-y-1.5">
      {rows.map((r) => {
        const move = movements.get(r.participantId) ?? 0;
        const isOpen = expanded.has(r.participantId);
        return (
          <li
            key={r.participantId}
            className={cn(
              "row-enter rounded-lg tabular transition",
              "bg-white/3 hover:bg-white/5 border border-white/5",
              r.rank === 1 &&
                "bg-gradient-to-r from-gold-500/15 via-transparent to-transparent border-gold-500/30"
            )}
          >
            <button
              type="button"
              onClick={() => toggle(r.participantId)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
            >
              <span
                className={cn(
                  "w-8 h-8 inline-flex items-center justify-center rounded-md text-sm font-bold scoreboard-num shrink-0",
                  r.rank === 1 && "bg-gold-500 text-ink-950",
                  r.rank === 2 && "bg-silver-400 text-ink-950",
                  r.rank === 3 && "bg-bronze-400 text-ink-950",
                  r.rank > 3 && "bg-white/5 text-white/60 ring-1 ring-white/10"
                )}
              >
                {r.rank}
              </span>
              <MovementArrow delta={move} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium truncate">{r.name}</span>
                  {!r.paid && (
                    <span className="text-[9px] uppercase tracking-wider text-live-400 ring-1 ring-live-500/30 px-1.5 py-0.5 rounded">
                      unpaid
                    </span>
                  )}
                </div>
                {!compact && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.teams.map((t) => (
                      <span
                        key={t.id}
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5",
                          t.points > 0
                            ? "bg-lime-500/10 ring-1 ring-lime-500/30 text-lime-300"
                            : "bg-white/3 ring-1 ring-white/8 text-white/55"
                        )}
                      >
                        <Flag code={t.code} size="sm" />
                        <span>{t.code ?? t.name}</span>
                        {t.points > 0 && (
                          <span className="ml-0.5 scoreboard-num">+{t.points}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="scoreboard-num text-2xl text-white leading-none">
                  {r.points}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
                  points
                </div>
                <div className="text-[11px] text-lime-400 mt-1 tabular">
                  {formatMoney(r.projectedPrizeMinor, board.currency)}
                </div>
              </div>
              <span
                className={cn(
                  "ml-1 text-white/40 text-sm transition-transform shrink-0",
                  isOpen && "rotate-90"
                )}
                aria-hidden
              >
                ▸
              </span>
            </button>
            {isOpen && <Breakdown teams={r.teams} />}
          </li>
        );
      })}
    </ol>
  );
}

function Breakdown({ teams }: { teams: TeamBreakdown[] }) {
  if (teams.length === 0) {
    return (
      <div className="px-3 pb-3 text-xs text-white/45">No teams allocated yet.</div>
    );
  }
  return (
    <div className="px-3 pb-3 pt-1">
      <div className="rounded-lg bg-ink-900/60 ring-1 ring-white/8 divide-y divide-white/5">
        {teams.map((t) => (
          <div key={t.id} className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Flag code={t.code} size="md" />
              <span className="text-sm text-white font-medium flex-1 truncate">{t.name}</span>
              <span
                className={cn(
                  "scoreboard-num text-sm",
                  t.points > 0 ? "text-lime-400" : "text-white/40"
                )}
              >
                {t.points > 0 ? `+${t.points}` : "0"} pts
              </span>
            </div>
            {t.events.length > 0 ? (
              <ul className="mt-1.5 space-y-0.5 pl-7">
                {t.events.map((e, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-[11px] text-white/65"
                  >
                    <span className="truncate pr-2">{e.label}</span>
                    <span
                      className={cn(
                        "scoreboard-num tabular shrink-0",
                        e.points > 0 ? "text-lime-400" : "text-white/35"
                      )}
                    >
                      {e.points > 0 ? `+${e.points}` : "0"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 pl-7 text-[11px] text-white/35">
                No matches played yet for this team.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MovementArrow({ delta }: { delta: number }) {
  if (delta === 0) return <span className="w-3 text-white/25 text-xs">–</span>;
  if (delta > 0) {
    return (
      <span className="inline-flex items-center text-lime-400 text-xs tabular w-6">
        ▲{delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-live-400 text-xs tabular w-6">
      ▼{Math.abs(delta)}
    </span>
  );
}
