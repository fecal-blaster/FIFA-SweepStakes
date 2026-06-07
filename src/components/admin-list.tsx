"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, SectionHeader } from "@/components/ui";

type Admin = { id: string; email: string; name: string | null; createdAt: string };

export function AdminList({ currentAdminId }: { currentAdminId: string }) {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      const body = await res.json();
      setAdmins(body.admins ?? []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, password })
      });
      const body = await res.json();
      if (!res.ok || body.error) throw new Error(body.error ?? `Failed (${res.status})`);
      setMsg(`Added admin ${body.admin.email}`);
      setEmail("");
      setName("");
      setPassword("");
      await load();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string, email: string) {
    if (!confirm(`Delete admin ${email}? They will lose access immediately.`)) return;
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Failed (${res.status})`);
      setMsg(`Deleted ${email}`);
      await load();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <Card>
      <SectionHeader eyebrow="Access" title="Admins" />
      <p className="text-sm text-white/65 mb-4">
        Add another admin so multiple people can manage the tournament. New
        admins log in via <code className="text-white/80">/admin/login</code>.
      </p>

      {loading ? (
        <p className="text-sm text-white/45">Loading…</p>
      ) : (
        <ul className="divide-y divide-white/8 mb-4">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <div className="text-sm text-white">{a.name ?? a.email}</div>
                <div className="text-xs text-white/45">{a.email}</div>
              </div>
              {a.id === currentAdminId ? (
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">you</span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => remove(a.id, a.email)}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={create} className="grid sm:grid-cols-3 gap-2">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-white"
        />
        <input
          type="text"
          placeholder="Display name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-white"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-white"
        />
        {err && <p className="sm:col-span-3 text-sm text-live-400">{err}</p>}
        {msg && <p className="sm:col-span-3 text-sm text-lime-400">{msg}</p>}
        <div className="sm:col-span-3">
          <Button type="submit" disabled={creating}>
            {creating ? "Adding…" : "Add admin"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
