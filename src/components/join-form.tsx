"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function JoinForm({
  slug,
  inviteCode,
  disabled
}: {
  slug: string;
  inviteCode: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/tournaments/${slug}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, inviteCode })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      router.push(`/t/${slug}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (disabled) {
    return (
      <p className="text-sm text-red-300">
        Registration is not currently open for this tournament.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-pitch-700/70">Name</span>
        <input
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg bg-pitch-900/70 ring-1 ring-pitch-700/40 px-3 py-2 text-white focus:outline-none focus:ring-accent-electric/60"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-pitch-700/70">Email (optional)</span>
        <input
          type="email"
          maxLength={120}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg bg-pitch-900/70 ring-1 ring-pitch-700/40 px-3 py-2 text-white focus:outline-none focus:ring-accent-electric/60"
        />
      </label>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Joining…" : "Join sweepstake"}
      </Button>
    </form>
  );
}
