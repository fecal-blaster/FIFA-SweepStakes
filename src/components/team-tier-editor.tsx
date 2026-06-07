"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Flag, SectionHeader, cn } from "@/components/ui";

type TeamRow = {
  id: string;
  name: string;
  code: string | null;
  tier: number;
};

const TIER_LABELS: Record<number, string> = {
  1: "T1 · Top contenders",
  2: "T2 · Strong sides",
  3: "T3 · Outsiders",
  4: "T4 · Long shots"
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
  const [sort, setSort] = useState<"name" | "tier">("tier");
  const [filter, setFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const t of teams) c[t.tier] = (c[t.tier] ?? 0) + 1;
    return c;
  }, [teams]);

  // Ideal split for a 32-team or 48-team field is even buckets of 8 or 12.
  // We approximate "ideal per tier" as round(total/4) for a quick guide rail.
  const idealPerTier = Math.round(teams.length / 4);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = teams.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || (t.code ?? "").toLowerCase().includes(q)
    );
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return a.tier - b.tier || a.name.localeCompare(b.name);
    });
  }, [teams, sort, filter]);

  async function setTier(id: string, tier: number) {
    setErr(null);
    setSavingId(id);
    // Optimistic update so the UI feels instant.
    const before = teams;
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, tier } : t)));
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/teams/${id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tier })
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setTeams(before);
      setErr((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <SectionHeader eyebrow="Team strength" title="Tier editor" />
        <div className="text-xs text-white/50">
          {teams.length} teams · ideal split ≈ {idealPerTier} per tier
        </div>
      </div>

      <p className="text-sm text-white/65 mb-4">
        Sort the teams into four strength tiers before running the draw. Tier 1
        is the strongest pot, Tier 4 the weakest. Even buckets give the
        cleanest strength balance.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[1, 2, 3, 4].map((tier) => {
          const c = counts[tier] ?? 0;
          const off = Math.abs(c - idealPerTier);
          return (
            <div
              key={tier}
              className={cn(
                "rounded-lg ring-1 px-3 py-2 bg-ink-900/60",
                off === 0
                  ? "ring-lime-500/30"
                  : off <= 1
                    ? "ring-white/10"
                    : "ring-gold-500/30"
              )}
            >
              <div className={cn("text-[10px] uppercase tracking-[0.18em]", TIER_COLOUR[tier])}>
                {TIER_LABELS[tier]}
              </div>
              <div className="scoreboard-num text-xl text-white mt-0.5">{c}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="search"
          placeholder="Filter teams…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[180px] rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-lime-500/40"
        />
        <div className="inline-flex rounded-lg ring-1 ring-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setSort("tier")}
            className={cn(
              "px-3 py-2 text-xs",
              sort === "tier" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"
            )}
          >
            By tier
          </button>
          <button
            type="button"
            onClick={() => setSort("name")}
            className={cn(
              "px-3 py-2 text-xs",
              sort === "name" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"
            )}
          >
            By name
          </button>
        </div>
      </div>

      {err && <p className="mb-2 text-sm text-live-400">{err}</p>}

      <ul className="grid sm:grid-cols-2 gap-1.5 max-h-[480px] overflow-y-auto pr-1">
        {visible.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-1.5"
          >
            <Flag code={t.code} size="md" />
            <span className="flex-1 min-w-0 truncate text-sm text-white">{t.name}</span>
            <span className={cn("text-[10px] uppercase tracking-[0.18em] w-6 text-right", TIER_COLOUR[t.tier])}>
              T{t.tier}
            </span>
            <select
              value={t.tier}
              disabled={savingId === t.id}
              onChange={(e) => setTier(t.id, parseInt(e.target.value, 10))}
              className="rounded-md bg-ink-900/80 ring-1 ring-white/10 px-2 py-1 text-sm text-white focus:outline-none focus:ring-lime-500/40"
              aria-label={`Tier for ${t.name}`}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      {visible.length === 0 && (
        <p className="text-sm text-white/50">No teams match that filter.</p>
      )}
    </Card>
  );
}
