"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, SectionHeader, cn } from "@/components/ui";
import type { Prize, PrizeKind } from "@/lib/prizes";
import { totalShareBps, getDefaultPrizes, prizeAmountMinor } from "@/lib/prizes";
import { formatMoney } from "@/lib/money";

type Props = {
  tournamentId: string;
  currency: string;
  initialPrizes: Prize[];
  participants: { id: string; name: string }[];
  /** Live pool = paid participants × buy-in. Used to show what each
   *  percentage works out to in dollars right now. */
  expectedPoolMinor: number;
};

const KIND_LABEL: Record<PrizeKind, string> = {
  PLACEMENT: "Placement",
  WOODEN_SPOON: "Wooden spoon",
  MOST_RED_CARDS: "Most red cards (auto)",
  CATEGORY: "Special prize (manual)"
};

export function PrizeEditor({
  tournamentId,
  currency,
  initialPrizes,
  participants,
  expectedPoolMinor
}: Props) {
  const router = useRouter();
  const [prizes, setPrizes] = useState<Prize[]>(initialPrizes);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function patch(idx: number, body: Partial<Prize>) {
    setPrizes((prev) => prev.map((p, i) => (i === idx ? { ...p, ...body } : p)));
  }

  function setSharePct(idx: number, pctStr: string) {
    const pct = parseFloat(pctStr || "0") || 0;
    patch(idx, { shareBps: Math.max(0, Math.round(pct * 100)) });
  }

  function addPrize(kind: PrizeKind) {
    const nextId = `prize-${Date.now().toString(36)}`;
    const base: Prize = {
      id: nextId,
      label:
        kind === "PLACEMENT"
          ? `${ordinal((prizes.filter((p) => p.kind === "PLACEMENT").length || 0) + 1)} place`
          : kind === "WOODEN_SPOON"
            ? "Wooden spoon (last place)"
            : kind === "MOST_RED_CARDS"
              ? "Most red cards"
              : "Special prize",
      shareBps: 0,
      kind,
      position:
        kind === "PLACEMENT"
          ? (prizes.filter((p) => p.kind === "PLACEMENT").length || 0) + 1
          : undefined
    };
    setPrizes([...prizes, base]);
  }

  function remove(idx: number) {
    setPrizes(prizes.filter((_, i) => i !== idx));
  }

  function loadDefaults() {
    setPrizes(getDefaultPrizes());
  }

  async function save() {
    setPending(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prizes })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setMsg("Saved.");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  const totalBps = totalShareBps(prizes);
  const totalPct = totalBps / 100;
  const totalMatches = Math.abs(totalBps - 10000) < 1;

  return (
    <Card>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <SectionHeader eyebrow="Prizes" title="Prize structure" />
        <Button variant="ghost" size="sm" onClick={loadDefaults} disabled={pending}>
          Load 58 / 22 / 17 / 3 template
        </Button>
      </div>

      <p className="text-sm text-white/65 mb-4">
        Percentages of the actual pool. If someone doesn't pay, every prize
        shrinks proportionally. The template lays out 1st / 2nd / wooden
        spoon / most red cards — equivalent to $350 / $130 / $100 / $20 on a
        $600 pool.
      </p>

      <ul className="space-y-2">
        {prizes.map((p, idx) => {
          const computed = prizeAmountMinor(p, expectedPoolMinor);
          return (
            <li
              key={p.id}
              className="rounded-lg bg-ink-900/60 ring-1 ring-white/8 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded ring-1",
                    p.kind === "PLACEMENT"
                      ? "bg-gold-500/10 text-gold-400 ring-gold-500/30"
                      : p.kind === "WOODEN_SPOON"
                        ? "bg-live-500/10 text-live-400 ring-live-500/30"
                        : p.kind === "MOST_RED_CARDS"
                          ? "bg-live-500/10 text-live-400 ring-live-500/30"
                          : "bg-cyan-500/10 text-cyan-400 ring-cyan-500/30"
                  )}
                >
                  {KIND_LABEL[p.kind]}
                </span>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-[11px] text-white/45 hover:text-live-400"
                >
                  remove
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <label className="block sm:col-span-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Label
                  </span>
                  <input
                    type="text"
                    value={p.label}
                    onChange={(e) => patch(idx, { label: e.target.value })}
                    className="mt-1 w-full rounded-md bg-ink-900/80 ring-1 ring-white/10 px-2 py-1.5 text-white text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Share (%)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={(p.shareBps / 100).toString()}
                    onChange={(e) => setSharePct(idx, e.target.value)}
                    className="mt-1 w-full rounded-md bg-ink-900/80 ring-1 ring-white/10 px-2 py-1.5 text-white text-sm scoreboard-num text-right"
                  />
                </label>
              </div>
              <p className="text-[11px] text-white/55">
                Currently worth <strong className="text-white">{formatMoney(computed, currency)}</strong> at
                the live pool of {formatMoney(expectedPoolMinor, currency)}.
              </p>
              {p.kind === "PLACEMENT" && (
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Position
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={p.position ?? 1}
                    onChange={(e) =>
                      patch(idx, { position: Math.max(1, parseInt(e.target.value || "1", 10)) })
                    }
                    className="mt-1 w-20 rounded-md bg-ink-900/80 ring-1 ring-white/10 px-2 py-1.5 text-white text-sm"
                  />
                </label>
              )}
              {p.kind === "CATEGORY" && (
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Awarded to (manual)
                  </span>
                  <select
                    value={p.awardedParticipantId ?? ""}
                    onChange={(e) =>
                      patch(idx, { awardedParticipantId: e.target.value || undefined })
                    }
                    className="mt-1 w-full rounded-md bg-ink-900/80 ring-1 ring-white/10 px-2 py-1.5 text-white text-sm"
                  >
                    <option value="">— not awarded yet —</option>
                    {participants.map((pp) => (
                      <option key={pp.id} value={pp.id}>
                        {pp.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => addPrize("PLACEMENT")} disabled={pending}>
          + Placement
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addPrize("WOODEN_SPOON")} disabled={pending}>
          + Wooden spoon
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addPrize("MOST_RED_CARDS")} disabled={pending}>
          + Most red cards
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addPrize("CATEGORY")} disabled={pending}>
          + Special prize
        </Button>
      </div>

      <div
        className={cn(
          "mt-4 rounded-lg ring-1 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2",
          totalMatches
            ? "bg-lime-500/10 ring-lime-500/30 text-lime-400"
            : "bg-gold-500/10 ring-gold-500/30 text-gold-400"
        )}
      >
        <span>
          Total share: <strong>{totalPct.toFixed(2)}%</strong>
        </span>
        <span>
          {totalMatches
            ? "= 100% ✓"
            : `should sum to 100% (off by ${(100 - totalPct).toFixed(2)}%)`}
        </span>
      </div>

      {err && <p className="mt-3 text-sm text-live-400">{err}</p>}
      {msg && <p className="mt-3 text-sm text-lime-400">{msg}</p>}

      <div className="mt-4">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save prizes"}
        </Button>
      </div>
    </Card>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
