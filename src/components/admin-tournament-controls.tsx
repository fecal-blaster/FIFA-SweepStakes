"use client";

import { useEffect, useState } from "react";
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
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  // Read the current origin client-side so the invite link works whether the
  // admin is on the LAN, Cloudflare hostname, or local dev.
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  const inviteUrl = origin ? `${origin}/join/${tournament.inviteCode}` : `/join/${tournament.inviteCode}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: select the text element so the user can ⌘C
      const node = document.getElementById("invite-url");
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

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
        <Button
          variant="ghost"
          href={`/api/admin/tournaments/${tournament.id}/export`}
        >
          ⬇ Export JSON
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
      <hr className="my-4 border-white/10" />
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/45 mb-2">
          Share this invite link with participants
        </p>
        <div className="flex flex-wrap items-stretch gap-2">
          <code
            id="invite-url"
            className="flex-1 min-w-0 truncate rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-sm text-lime-400 font-mono"
          >
            {inviteUrl}
          </code>
          <Button variant="ghost" onClick={copyInvite}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-white/45">
          Invite code: <code className="text-white/70">{tournament.inviteCode}</code>
        </p>
      </div>
    </Card>
  );
}

function formatMsg(name: string, body: { [k: string]: unknown }): string {
  if (name === "sync-teams") {
    return `Teams synced — created ${body.created}, updated ${body.updated}, total ${body.total}.`;
  }
  if (name === "draw") {
    const d = (body.draw ?? {}) as {
      seed?: string;
      verifyHash?: string;
      fixturePairs?: number;
      clashFixtures?: number;
      sharedTeams?: number;
      strengthSpreadPct?: number;
    };
    const parts = [`Draw complete. Seed ${d.seed}, hash ${d.verifyHash?.slice(0, 16)}…`];
    if (typeof d.strengthSpreadPct === "number") {
      parts.push(`strength spread ${d.strengthSpreadPct.toFixed(1)}%`);
    }
    if ((d.sharedTeams ?? 0) > 0) {
      parts.push(`${d.sharedTeams} team${d.sharedTeams === 1 ? "" : "s"} duplicated for even counts`);
    }
    if (typeof d.fixturePairs === "number" && d.fixturePairs > 0) {
      parts.push(`${d.clashFixtures ?? 0} self-clash${d.clashFixtures === 1 ? "" : "es"} across ${d.fixturePairs} group fixtures`);
    } else {
      parts.push("no fixtures loaded — sync fixtures first for clash avoidance");
    }
    return parts.join(" · ");
  }
  if (name === "sync-fixtures") {
    return `Fixtures synced — ${body.matchesUpserted} matches, ${body.scoreEventsCreated} new score events.`;
  }
  return "Done.";
}
