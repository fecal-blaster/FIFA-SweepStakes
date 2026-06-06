"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

type T = {
  id: string;
  slug: string;
  status: string;
  drawMode: "PURE_RANDOM" | "BALANCED";
  inviteCode: string;
  competitionCode: string;
};

export function AdminTournamentControls({
  tournament,
  hasActiveDraw
}: {
  tournament: T;
  hasActiveDraw: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [redrawReason, setRedrawReason] = useState("");

  async function call(name: string, fn: () => Promise<Response>) {
    setBusy(name);
    setMsg(null);
    setErr(null);
    try {
      const res = await fn();
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Failed (${res.status})`);
      setMsg(formatMsg(name, body));
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-white">Controls</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          disabled={busy !== null}
          onClick={() =>
            call("sync-teams", () =>
              fetch(`/api/admin/tournaments/${tournament.id}/teams/sync`, { method: "POST" })
            )
          }
        >
          {busy === "sync-teams" ? "Syncing teams…" : "Sync teams from provider"}
        </Button>
        <Button
          disabled={busy !== null || (hasActiveDraw && !redrawReason)}
          onClick={() =>
            call("draw", () =>
              fetch(`/api/admin/tournaments/${tournament.id}/draws`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  mode: tournament.drawMode,
                  redrawReason: hasActiveDraw ? redrawReason : undefined
                })
              })
            )
          }
        >
          {busy === "draw" ? "Running draw…" : hasActiveDraw ? "Run redraw" : "Run draw"}
        </Button>
        <Button
          variant="ghost"
          disabled={busy !== null}
          onClick={() =>
            call("sync-fixtures", () =>
              fetch(`/api/admin/tournaments/${tournament.id}/sync`, { method: "POST" })
            )
          }
        >
          {busy === "sync-fixtures" ? "Syncing fixtures…" : "Sync fixtures & scores"}
        </Button>
      </div>
      {hasActiveDraw && (
        <div className="mt-3">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-pitch-700/70">
              Redraw reason (required to overwrite the active draw)
            </span>
            <input
              type="text"
              maxLength={200}
              value={redrawReason}
              onChange={(e) => setRedrawReason(e.target.value)}
              placeholder="e.g. Team list corrected before draw"
              className="mt-1 w-full rounded-lg bg-pitch-900/70 ring-1 ring-pitch-700/40 px-3 py-2 text-white"
            />
          </label>
        </div>
      )}
      {msg && <p className="mt-3 text-sm text-accent-electric">{msg}</p>}
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      <hr className="my-4 border-pitch-700/40" />
      <p className="text-xs text-pitch-700/80">
        Share the invite link:{" "}
        <code className="text-accent-electric">/join/{tournament.inviteCode}</code>
      </p>
    </Card>
  );
}

function formatMsg(name: string, body: { [k: string]: unknown }): string {
  if (name === "sync-teams") {
    return `Teams synced — created ${body.created}, updated ${body.updated}, total ${body.total}.`;
  }
  if (name === "draw") {
    const d = (body.draw ?? {}) as { seed?: string; verifyHash?: string };
    return `Draw complete. Seed ${d.seed}, hash ${d.verifyHash?.slice(0, 16)}…`;
  }
  if (name === "sync-fixtures") {
    return `Fixtures synced — ${body.matchesUpserted} matches, ${body.scoreEventsCreated} new score events.`;
  }
  return "Done.";
}
