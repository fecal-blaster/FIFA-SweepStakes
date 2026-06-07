"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, SectionHeader } from "@/components/ui";

export function DangerZone({
  tournament
}: {
  tournament: { id: string; name: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function destroy() {
    setPending(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}/delete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, confirmName })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setPending(false);
    }
  }

  return (
    <>
      <Card className="border-live-500/30 bg-live-500/5">
        <SectionHeader eyebrow="Danger zone" title="Delete this tournament" />
        <p className="text-sm text-white/70 leading-relaxed">
          Permanently removes the tournament along with all participants, team
          allocations, draws, fixtures, and audit logs. There is no undo.
          Backups (Postgres dumps) are your only recovery path.
        </p>
        <div className="mt-4">
          <Button variant="danger" onClick={() => setOpen(true)}>
            Delete tournament…
          </Button>
        </div>
      </Card>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl glass-strong p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="display text-2xl text-white">Confirm delete</h2>
            <p className="mt-1 text-sm text-white/70">
              To delete <span className="text-white font-medium">{tournament.name}</span>,
              re-enter your admin password and type the tournament's exact name.
              This action is permanent.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                  Admin password
                </span>
                <input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-white focus:outline-none focus:ring-live-500/40"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                  Type the tournament name to confirm
                </span>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={tournament.name}
                  className="mt-1 w-full rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-white focus:outline-none focus:ring-live-500/40"
                />
              </label>
            </div>

            {err && <p className="mt-3 text-sm text-live-400">{err}</p>}

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={destroy}
                disabled={
                  pending ||
                  password.length === 0 ||
                  confirmName.trim().toLowerCase() !== tournament.name.trim().toLowerCase()
                }
              >
                {pending ? "Deleting…" : "Delete forever"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
