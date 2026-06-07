"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Flag, SectionHeader, cn } from "@/components/ui";
import { lookupRanking } from "@/lib/fifa-rankings";

type TeamRow = {
  id: string;
  name: string;
  code: string | null;
  tier: number;
  rankingPoints: number;
};

const TIER_COLOUR: Record<number, string> = {
  1: "text-gold-400",
  2: "text-silver-400",
  3: "text-bronze-400",
  4: "text-white/50"
};

export function TeamTierEditor({
  tournamentId,
  teams: initialTeams
}: {
  tournamentId: string;
  teams: TeamRow[];
}) {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamRow[]>(initialTeams);
  const [sort, setSort] = useState<"world" | "ranking" | "name" | "tier">("world");
  const [filter, setFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [working, setWorking] = useState<"load" | "recompute" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Augment each team with its current FIFA world rank position (if known).
  const annotated = useMemo(
    () =>
      teams.map((t) => {
        const ref = lookupRanking(t.code);
        return { ...t, worldRank: ref?.rank ?? null, referencePoints: ref?.points ?? null };
      }),
    [teams]
  );

  const stats = useMemo(() => {
    if (teams.length === 0) return null;
    const pts = teams.map((t) => t.rankingPoints).sort((a, b) => a - b);
    const median = pts[Math.floor(pts.length / 2)];
    const mean = Math.round(pts.reduce((s, x) => s + x, 0) / pts.length);
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const t of teams) counts[t.tier] = (counts[t.tier] ?? 0) + 1;
    const unmatched = annotated.filter((t) => t.worldRank === null).length;
    return {
      min: pts[0],
      max: pts[pts.length - 1],
      median,
      mean,
      counts,
      unmatched
    };
  }, [teams, annotated]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = annotated.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || (t.code ?? "").toLowerCase().includes(q)
    );
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "tier") return a.tier - b.tier || b.rankingPoints - a.rankingPoints;
      if (sort === "world") {
        if (a.worldRank == null && b.worldRank == null) return a.name.localeCompare(b.name);
        if (a.worldRank == null) return 1;
        if (b.worldRank == null) return -1;
        return a.worldRank - b.worldRank;
      }
      return b.rankingPoints - a.rankingPoints || a.name.localeCompare(b.name);
    });
  }, [annotated, sort, filter]);

  async function patchTeam(id: string, body: Partial<TeamRow>) {
    setErr(null);
    setSavingId(id);
    const before = teams;
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...body } : t)));
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/teams/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setTeams(before);
      setErr((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function loadFifaRankings() {
    setWorking("load");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/teams/load-rankings`,
        { method: "POST" }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Failed (${res.status})`);
      }
      const body = await res.json();
      setMsg(
        `Loaded current FIFA rankings — ${body.matched} matched, ${body.skipped} skipped (no 3-letter code match).`
      );
      setTeams((prev) =>
        prev.map((t) => {
          const ref = lookupRanking(t.code);
          return ref ? { ...t, rankingPoints: ref.points } : t;
        })
      );
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setWorking(null);
    }
  }

  async function recomputeTiers() {
    setWorking("recompute");
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/teams/recompute-tiers`,
        { method: "POST" }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Failed (${res.status})`);
      }
      const body = await res.json();
      setMsg(`Recomputed tiers — ${body.updated} of ${body.total} teams changed.`);
      const sortedByRanking = [...teams].sort((a, b) => b.rankingPoints - a.rankingPoints);
      setTeams(
        sortedByRanking.map((t, i) => ({
          ...t,
          tier: Math.min(4, Math.max(1, Math.floor((i / sortedByRanking.length) * 4) + 1))
        }))
      );
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setWorking(null);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <SectionHeader eyebrow="Team strength" title="Ranking points" />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={loadFifaRankings} disabled={working !== null}>
            {working === "load" ? "Loading…" : "Load current FIFA rankings"}
          </Button>
          <Button variant="ghost" size="sm" onClick={recomputeTiers} disabled={working !== null}>
            {working === "recompute" ? "Recomputing…" : "Recompute tiers"}
          </Button>
        </div>
      </div>

      <p className="text-sm text-white/65 mb-4">
        Click <em>Load current FIFA rankings</em> to seed every team with its
        current world ranking points. Tiers are then bucketed by quartile
        (top 25% → T1). Edit any number manually to fine-tune; the strength
        balancer uses these directly when drawing.
      </p>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <Stat label="Min" value={stats.min.toLocaleString()} />
          <Stat label="Median" value={stats.median.toLocaleString()} />
          <Stat label="Mean" value={stats.mean.toLocaleString()} />
          <Stat label="Max" value={stats.max.toLocaleString()} />
          <Stat
            label="No FIFA match"
            value={stats.unmatched.toLocaleString()}
            tone={stats.unmatched === 0 ? "lime" : "gold"}
          />
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3, 4].map((tier) => (
            <div
              key={tier}
              className="rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-2"
            >
              <div className={cn("text-[10px] uppercase tracking-[0.18em]", TIER_COLOUR[tier])}>
                T{tier}
              </div>
              <div className="scoreboard-num text-xl text-white mt-0.5">
                {stats.counts[tier] ?? 0}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="search"
          placeholder="Filter teams…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[180px] rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-lime-500/40"
        />
        <div className="inline-flex rounded-lg ring-1 ring-white/10 overflow-hidden">
          {(["world", "ranking", "tier", "name"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={cn(
                "px-3 py-2 text-xs capitalize",
                sort === s ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"
              )}
            >
              By {s}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="mb-2 text-sm text-live-400">{err}</p>}
      {msg && <p className="mb-2 text-sm text-lime-400">{msg}</p>}

      <ul className="grid sm:grid-cols-2 gap-1.5 max-h-[520px] overflow-y-auto pr-1">
        {visible.map((t) => {
          const drift =
            t.referencePoints != null ? t.rankingPoints - t.referencePoints : null;
          return (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-1.5"
            >
              <span className="w-9 text-right text-[11px] tabular text-white/55 shrink-0">
                {t.worldRank != null ? `#${t.worldRank}` : "—"}
              </span>
              <Flag code={t.code} size="md" />
              <span className="flex-1 min-w-0 truncate text-sm text-white">{t.name}</span>
              {drift !== null && drift !== 0 && (
                <span
                  className={cn(
                    "text-[10px] tabular shrink-0",
                    drift > 0 ? "text-lime-400" : "text-live-400"
                  )}
                  title={`${drift > 0 ? "+" : ""}${drift} vs current FIFA points`}
                >
                  {drift > 0 ? "+" : ""}
                  {drift}
                </span>
              )}
              <span className={cn("text-[10px] uppercase tracking-[0.18em] w-6 text-right", TIER_COLOUR[t.tier])}>
                T{t.tier}
              </span>
              <input
                type="number"
                min={0}
                max={3000}
                step={1}
                value={t.rankingPoints}
                disabled={savingId === t.id}
                onChange={(e) => {
                  const v = parseInt(e.target.value || "0", 10);
                  setTeams((prev) => prev.map((x) => (x.id === t.id ? { ...x, rankingPoints: v } : x)));
                }}
                onBlur={(e) => {
                  const v = parseInt(e.target.value || "0", 10);
                  if (v !== initialTeams.find((x) => x.id === t.id)?.rankingPoints) {
                    patchTeam(t.id, { rankingPoints: v });
                  }
                }}
                className="w-20 rounded-md bg-ink-900/80 ring-1 ring-white/10 px-2 py-1 text-right scoreboard-num text-lime-400 text-sm focus:outline-none focus:ring-lime-500/40"
                aria-label={`Ranking points for ${t.name}`}
              />
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && (
        <p className="text-sm text-white/50">No teams match that filter.</p>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "lime" | "gold";
}) {
  const colour =
    tone === "lime" ? "text-lime-400" : tone === "gold" ? "text-gold-400" : "text-white";
  return (
    <div className="rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className={`scoreboard-num text-xl mt-0.5 ${colour}`}>{value}</div>
    </div>
  );
}
