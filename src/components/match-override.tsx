"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, SectionHeader } from "@/components/ui";

type MatchRow = {
  id: string;
  stage: string;
  groupName: string | null;
  status: string;
  kickoff: string;
  homeName: string;
  homeScore: number | null;
  awayName: string;
  awayScore: number | null;
};

export function MatchOverride({
  tournamentId,
  slug
}: {
  tournamentId: string;
  slug: string;
}) {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [winnerSide, setWinnerSide] = useState<"" | "HOME" | "AWAY">("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tournaments/${slug}/matches?scope=all`)
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []))
      .catch(() => {});
  }, [slug]);

  const selected = matches.find((m) => m.id === selectedId);
  const isKnockout = selected && selected.stage !== "GROUP";
  const needsWinner =
    isKnockout && parseInt(homeScore || "0", 10) === parseInt(awayScore || "0", 10);

  // When selecting a match, prefill the current score.
  useEffect(() => {
    if (!selected) return;
    setHomeScore(String(selected.homeScore ?? 0));
    setAwayScore(String(selected.awayScore ?? 0));
    setWinnerSide("");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!selected) return;
    setPending(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/matches/${selected.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            homeScore: parseInt(homeScore || "0", 10),
            awayScore: parseInt(awayScore || "0", 10),
            status: "FINISHED",
            winnerSide: needsWinner ? (winnerSide || null) : null
          })
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setMsg(`Saved: ${selected.homeName} ${homeScore}-${awayScore} ${selected.awayName}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <SectionHeader eyebrow="Manual override" title="Set a match score" />
      <p className="text-sm text-white/70 mb-3">
        Useful when the football-data feed is wrong or for tournaments you score
        manually. Saving here re-derives W/D/L points using the tournament's
        current scoring rules; qualification points are not touched.
      </p>

      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/45">Match</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mt-1 w-full rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-white"
        >
          <option value="">— select a match —</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.stage.replace(/_/g, " ")}
              {m.groupName ? ` · Group ${m.groupName}` : ""} —{" "}
              {m.homeName} {m.homeScore ?? "–"}-{m.awayScore ?? "–"} {m.awayName}
              {" · "}
              {m.status}
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <ScoreField
            label={selected.homeName}
            value={homeScore}
            onChange={setHomeScore}
          />
          <ScoreField
            label={selected.awayName}
            value={awayScore}
            onChange={setAwayScore}
          />
          {needsWinner && (
            <div className="sm:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                Knockout draw — who won (penalties / ET)?
              </span>
              <div className="mt-1 flex gap-2">
                <Button
                  variant={winnerSide === "HOME" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setWinnerSide("HOME")}
                >
                  {selected.homeName}
                </Button>
                <Button
                  variant={winnerSide === "AWAY" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setWinnerSide("AWAY")}
                >
                  {selected.awayName}
                </Button>
              </div>
            </div>
          )}
          {err && <p className="sm:col-span-2 text-sm text-live-400">{err}</p>}
          {msg && <p className="sm:col-span-2 text-sm text-lime-400">{msg}</p>}
          <div className="sm:col-span-2">
            <Button
              onClick={save}
              disabled={pending || (needsWinner && !winnerSide)}
            >
              {pending ? "Saving…" : "Save score"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ScoreField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.25em] text-white/45 truncate block">
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-white scoreboard-num text-2xl text-center focus:outline-none focus:ring-lime-500/40"
      />
    </label>
  );
}
