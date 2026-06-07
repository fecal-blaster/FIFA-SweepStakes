"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

const CURRENCIES = [
  { code: "GBP", label: "£ GBP — Pound" },
  { code: "USD", label: "$ USD — US Dollar" },
  { code: "EUR", label: "€ EUR — Euro" },
  { code: "AUD", label: "A$ AUD — Australian Dollar" },
  { code: "CAD", label: "C$ CAD — Canadian Dollar" },
  { code: "NZD", label: "NZ$ NZD — New Zealand Dollar" },
  { code: "CHF", label: "₣ CHF — Swiss Franc" },
  { code: "JPY", label: "¥ JPY — Japanese Yen" },
  { code: "SEK", label: "kr SEK — Swedish Krona" },
  { code: "NOK", label: "kr NOK — Norwegian Krone" },
  { code: "DKK", label: "kr DKK — Danish Krone" }
];

export function CreateTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [competitionCode, setCode] = useState(process.env.NEXT_PUBLIC_DEFAULT_COMP ?? "WC");
  const [currency, setCurrency] = useState("GBP");
  const [buyIn, setBuyIn] = useState("10");
  const [mode, setMode] = useState<"BALANCED" | "PURE_RANDOM">("BALANCED");
  const [regDeadline, setRegDeadline] = useState("");
  const [drawAt, setDrawAt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          competitionCode,
          currency,
          buyInMinor: Math.round(parseFloat(buyIn || "0") * 100),
          drawMode: mode,
          registrationDeadline: regDeadline ? new Date(regDeadline).toISOString() : undefined,
          drawAt: drawAt ? new Date(drawAt).toISOString() : undefined
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const body = await res.json();
      router.push(`/admin/tournaments/${body.tournament.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 grid sm:grid-cols-2 gap-3">
      <Field label="Name">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="World Cup 2026 — Office"
          className="w-full rounded-lg bg-pitch-900/70 ring-1 ring-pitch-700/40 px-3 py-2 text-white"
        />
      </Field>
      <Field label="Competition code">
        <input
          type="text"
          required
          value={competitionCode}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-lg bg-pitch-900/70 ring-1 ring-pitch-700/40 px-3 py-2 text-white"
        />
      </Field>
      <Field label="Currency">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-lg bg-ink-900/70 ring-1 ring-white/10 px-3 py-2 text-white"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Buy-in (per person)">
        <input
          type="number"
          step="0.01"
          min="0"
          value={buyIn}
          onChange={(e) => setBuyIn(e.target.value)}
          className="w-full rounded-lg bg-ink-900/70 ring-1 ring-white/10 px-3 py-2 text-white"
        />
      </Field>
      <Field label="Draw mode">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "BALANCED" | "PURE_RANDOM")}
          className="w-full rounded-lg bg-ink-900/70 ring-1 ring-white/10 px-3 py-2 text-white"
        >
          <option value="BALANCED">Balanced (recommended)</option>
          <option value="PURE_RANDOM">Pure random</option>
        </select>
      </Field>
      <Field label="Registration closes (optional)">
        <input
          type="datetime-local"
          value={regDeadline}
          onChange={(e) => setRegDeadline(e.target.value)}
          className="w-full rounded-lg bg-ink-900/70 ring-1 ring-white/10 px-3 py-2 text-white"
        />
      </Field>
      <Field label="Draw date (optional)">
        <input
          type="datetime-local"
          value={drawAt}
          onChange={(e) => setDrawAt(e.target.value)}
          className="w-full rounded-lg bg-ink-900/70 ring-1 ring-white/10 px-3 py-2 text-white"
        />
      </Field>
      {error && <p className="text-sm text-red-300 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create tournament"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-pitch-700/70">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
