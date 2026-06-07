"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, SectionHeader } from "@/components/ui";

export function DiscordConfig({
  tournamentId,
  initialUrl
}: {
  tournamentId: string;
  initialUrl: string | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [pending, setPending] = useState<"save" | "test" | "clear" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function patch(value: string | null) {
    setMsg(null);
    setErr(null);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ discordWebhookUrl: value })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Failed (${res.status})`);
    }
  }

  async function save() {
    setPending("save");
    try {
      await patch(url.trim() || null);
      setMsg("Saved.");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  async function test() {
    setPending("test");
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/notify-test`, {
        method: "POST"
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setMsg("Test message sent — check your Discord channel.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  async function clear() {
    setPending("clear");
    try {
      await patch(null);
      setUrl("");
      setMsg("Webhook removed.");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <SectionHeader eyebrow="Notifications" title="Discord webhook" />
      <p className="text-sm text-white/70 mb-3">
        Drop a Discord channel webhook URL here and the bot will post when the
        draw runs, when matches finish, and when a champion's crowned. Create
        one in Discord under <em>Channel → Edit Channel → Integrations →
        Webhooks → New Webhook</em>, then copy its URL.
      </p>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://discord.com/api/webhooks/..."
        className="w-full rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-lime-500/40"
      />
      {err && <p className="mt-3 text-sm text-live-400">{err}</p>}
      {msg && <p className="mt-3 text-sm text-lime-400">{msg}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={save} disabled={pending !== null}>
          {pending === "save" ? "Saving…" : "Save"}
        </Button>
        {initialUrl && (
          <Button variant="ghost" onClick={test} disabled={pending !== null}>
            {pending === "test" ? "Sending…" : "Send test message"}
          </Button>
        )}
        {initialUrl && (
          <Button variant="ghost" onClick={clear} disabled={pending !== null}>
            {pending === "clear" ? "Removing…" : "Remove webhook"}
          </Button>
        )}
      </div>
    </Card>
  );
}
