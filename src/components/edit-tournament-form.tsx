"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, SectionHeader } from "@/components/ui";
import { dateTimeLocalForInput, dateTimeLocalToIso, timezoneLabel } from "@/lib/format";

const CURRENCIES = [
  "GBP", "USD", "EUR", "AUD", "CAD", "NZD", "CHF", "JPY", "SEK", "NOK", "DKK"
];

type Props = {
  tournament: {
    id: string;
    name: string;
    currency: string;
    buyInMinor: number;
    competitionCode: string;
    drawMode: "PURE_RANDOM" | "BALANCED";
    registrationDeadline: string | null;
    drawAt: string | null;
  };
};

export function EditTournamentForm({ tournament }: Props) {
  const router = useRouter();
  const [name, setName] = useState(tournament.name);
  const [currency, setCurrency] = useState(tournament.currency);
  const [buyIn, setBuyIn] = useState((tournament.buyInMinor / 100).toString());
  const [drawMode, setDrawMode] = useState(tournament.drawMode);
  // Inputs render and accept wall-clock values in APP_TZ (Pacific/Auckland
  // by default), so an admin in any timezone sees the times the players see.
  const [regDeadline, setRegDeadline] = useState(dateTimeLocalForInput(tournament.registrationDeadline));
  const [drawAt, setDrawAt] = useState(dateTimeLocalForInput(tournament.drawAt));
  const tzLabel = timezoneLabel();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          currency,
          buyInMinor: Math.round(parseFloat(buyIn || "0") * 100),
          drawMode,
          registrationDeadline: dateTimeLocalToIso(regDeadline),
          drawAt: dateTimeLocalToIso(drawAt)
        })
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

  return (
    <Card>
      <SectionHeader eyebrow="Settings" title="Edit tournament" />
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
        <Field label="Name">
          <input
            type="text"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
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
            className={inputClass}
          />
        </Field>
        <Field label="Draw mode">
          <select
            value={drawMode}
            onChange={(e) => setDrawMode(e.target.value as "BALANCED" | "PURE_RANDOM")}
            className={inputClass}
          >
            <option value="BALANCED">Balanced</option>
            <option value="PURE_RANDOM">Pure random</option>
          </select>
        </Field>
        <Field label={`Registration closes (${tzLabel})`}>
          <input
            type="datetime-local"
            value={regDeadline}
            onChange={(e) => setRegDeadline(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={`Draw date (${tzLabel})`}>
          <input
            type="datetime-local"
            value={drawAt}
            onChange={(e) => setDrawAt(e.target.value)}
            className={inputClass}
          />
        </Field>
        {err && <p className="sm:col-span-2 text-sm text-live-400">{err}</p>}
        {msg && <p className="sm:col-span-2 text-sm text-lime-400">{msg}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

const inputClass =
  "w-full rounded-lg bg-ink-900/70 ring-1 ring-white/10 px-3 py-2 text-white focus:outline-none focus:ring-lime-500/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.25em] text-white/45">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
