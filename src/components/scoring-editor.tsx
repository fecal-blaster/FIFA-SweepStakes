"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, SectionHeader } from "@/components/ui";
import { DEFAULT_SCORING, type ScoringRules } from "@/lib/scoring";

const DEFAULT_PAYOUT_BPS = [5000, 3333, 1667];

type Props = {
  tournamentId: string;
  initialScoring: ScoringRules | null;
  initialPayoutBps: number[] | null;
};

const SCORING_FIELDS: { key: keyof ScoringRules; label: string; hint: string }[] = [
  { key: "win", label: "Match win", hint: "Group OR knockout" },
  { key: "draw", label: "Draw", hint: "Group only" },
  { key: "loss", label: "Loss", hint: "Group or knockout" },
  { key: "qualifyR16", label: "Reach Round of 16", hint: "Awarded for appearing" },
  { key: "qualifyQF", label: "Reach Quarter-final", hint: "Awarded for appearing" },
  { key: "qualifySF", label: "Reach Semi-final", hint: "Awarded for appearing" },
  { key: "qualifyFinal", label: "Reach the Final", hint: "Awarded for appearing" },
  { key: "champion", label: "Tournament winner", hint: "Bonus on top of W + qualify" }
];

export function ScoringEditor({ tournamentId, initialScoring, initialPayoutBps }: Props) {
  const router = useRouter();
  const [scoring, setScoring] = useState<ScoringRules>(initialScoring ?? DEFAULT_SCORING);
  const [payoutPct, setPayoutPct] = useState<number[]>(
    (initialPayoutBps ?? DEFAULT_PAYOUT_BPS).map((bp) => Math.round((bp / 100) * 100) / 100)
  );
  const [pending, setPending] = useState<"save" | "reset" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const usingDefaults = initialScoring === null;

  const payoutSum = payoutPct.reduce((a, b) => a + b, 0);

  function setScoringField(key: keyof ScoringRules, value: number) {
    setScoring({ ...scoring, [key]: value });
  }

  function setPayoutAt(idx: number, value: number) {
    const next = payoutPct.slice();
    next[idx] = value;
    setPayoutPct(next);
  }

  function addPayoutPlace() {
    if (payoutPct.length >= 8) return;
    setPayoutPct([...payoutPct, 0]);
  }

  function removePayoutPlace(idx: number) {
    if (payoutPct.length <= 1) return;
    setPayoutPct(payoutPct.filter((_, i) => i !== idx));
  }

  async function save() {
    setPending("save");
    setMsg(null);
    setErr(null);
    try {
      // Convert percentages to basis points (10000 = 100%) so the DB stays in integers.
      const payoutBps = payoutPct.map((p) => Math.round(p * 100));
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scoring, payoutBps })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setMsg("Rules and payouts saved. Existing finished matches keep their points; new finishes use these values.");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  async function resetToDefaults() {
    if (!confirm("Reset scoring rules and payout percentages to defaults? Existing match results stay intact.")) return;
    setPending("reset");
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scoring: null, payoutBps: null })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setScoring(DEFAULT_SCORING);
      setPayoutPct(DEFAULT_PAYOUT_BPS.map((bp) => Math.round((bp / 100) * 100) / 100));
      setMsg("Restored to defaults.");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <SectionHeader
          eyebrow={usingDefaults ? "Defaults" : "Custom rules"}
          title="Scoring & payouts"
        />
        <Button variant="ghost" size="sm" onClick={resetToDefaults} disabled={pending !== null}>
          {pending === "reset" ? "Resetting…" : "Reset to defaults"}
        </Button>
      </div>

      <p className="text-xs text-white/55 mb-4">
        Saved values become this tournament's official rules and show up on the
        public &ldquo;How it works&rdquo; page for participants. The reset button
        restores the standard 3/1/0 + qualification bonuses + 50/33/17 prize split.
      </p>

      <div className="grid sm:grid-cols-2 gap-2">
        {SCORING_FIELDS.map((f) => (
          <div
            key={f.key}
            className="flex items-center justify-between gap-3 rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="text-sm text-white">{f.label}</div>
              <div className="text-[11px] text-white/45">{f.hint}</div>
            </div>
            <input
              type="number"
              min={0}
              max={500}
              value={scoring[f.key]}
              onChange={(e) => setScoringField(f.key, parseInt(e.target.value || "0", 10))}
              className="w-20 rounded-md bg-ink-900/80 ring-1 ring-white/10 px-2 py-1 text-right scoreboard-num text-lime-400 focus:outline-none focus:ring-lime-500/40"
            />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">Prize payout (%)</p>
          <button
            type="button"
            onClick={addPayoutPlace}
            disabled={payoutPct.length >= 8}
            className="text-[11px] text-lime-400 hover:underline disabled:opacity-40"
          >
            + Add place
          </button>
        </div>
        <ul className="space-y-2">
          {payoutPct.map((p, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 rounded-lg bg-ink-900/60 ring-1 ring-white/8 px-3 py-2"
            >
              <span className="w-16 text-sm text-white/70">{ordinal(idx + 1)} place</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={p}
                onChange={(e) => setPayoutAt(idx, parseFloat(e.target.value || "0"))}
                className="flex-1 rounded-md bg-ink-900/80 ring-1 ring-white/10 px-2 py-1 text-right scoreboard-num text-lime-400 focus:outline-none focus:ring-lime-500/40"
              />
              <span className="text-sm text-white/55">%</span>
              {payoutPct.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePayoutPlace(idx)}
                  className="text-[11px] text-live-400 hover:underline"
                >
                  remove
                </button>
              )}
            </li>
          ))}
        </ul>
        <p
          className={
            "mt-2 text-xs tabular " +
            (Math.abs(payoutSum - 100) < 0.01 ? "text-white/50" : "text-gold-400")
          }
        >
          Total: {payoutSum.toFixed(2)}% {Math.abs(payoutSum - 100) >= 0.01 && "(should sum to 100)"}
        </p>
      </div>

      {err && <p className="mt-3 text-sm text-live-400">{err}</p>}
      {msg && <p className="mt-3 text-sm text-lime-400">{msg}</p>}

      <div className="mt-4">
        <Button onClick={save} disabled={pending !== null}>
          {pending === "save" ? "Saving…" : "Save rules & payouts"}
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
