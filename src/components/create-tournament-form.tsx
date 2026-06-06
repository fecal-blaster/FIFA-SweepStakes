"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function CreateTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [competitionCode, setCode] = useState(process.env.NEXT_PUBLIC_DEFAULT_COMP ?? "WC");
  const [buyIn, setBuyIn] = useState("10");
  const [mode, setMode] = useState<"BALANCED" | "PURE_RANDOM">("BALANCED");
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
          buyInMinor: Math.round(parseFloat(buyIn || "0") * 100),
          drawMode: mode
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
      <Field label="Buy-in (per person)">
        <input
          type="number"
          step="0.01"
          min="0"
          value={buyIn}
          onChange={(e) => setBuyIn(e.target.value)}
          className="w-full rounded-lg bg-pitch-900/70 ring-1 ring-pitch-700/40 px-3 py-2 text-white"
        />
      </Field>
      <Field label="Draw mode">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "BALANCED" | "PURE_RANDOM")}
          className="w-full rounded-lg bg-pitch-900/70 ring-1 ring-pitch-700/40 px-3 py-2 text-white"
        >
          <option value="BALANCED">Balanced (recommended)</option>
          <option value="PURE_RANDOM">Pure random</option>
        </select>
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
