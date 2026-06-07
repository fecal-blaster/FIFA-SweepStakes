"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, SectionHeader } from "@/components/ui";

export function BulkImport({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [paid, setPaid] = useState(false);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Preview count — split-on-line-or-comma, dedupe, drop empties.
  const previewCount = (() => {
    const seen = new Set<string>();
    return text
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 60)
      .filter((s) => {
        const k = s.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).length;
  })();

  async function submit() {
    setPending(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/participants/bulk`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ names: text, paid })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const body = await res.json();
      setMsg(`Added ${body.created} new participant${body.created === 1 ? "" : "s"} (${body.skipped} already existed).`);
      setText("");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <SectionHeader eyebrow="Bulk add" title="Paste participant names" />
      <p className="text-sm text-white/70 mb-3">
        One name per line (or comma-separated). Duplicates are ignored — paste
        the same list again later and only new names will be added.
      </p>
      <textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Alice\nBob\nCharlie\nDave"}
        className="w-full rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-lime-500/40"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3 justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-white/75">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
            className="accent-lime-500"
          />
          Mark as paid
        </label>
        <span className="text-xs text-white/45">
          {previewCount} unique name{previewCount === 1 ? "" : "s"} ready
        </span>
      </div>
      {err && <p className="mt-3 text-sm text-live-400">{err}</p>}
      {msg && <p className="mt-3 text-sm text-lime-400">{msg}</p>}
      <div className="mt-3">
        <Button onClick={submit} disabled={pending || previewCount === 0}>
          {pending ? "Adding…" : `Add ${previewCount} participant${previewCount === 1 ? "" : "s"}`}
        </Button>
      </div>
    </Card>
  );
}
