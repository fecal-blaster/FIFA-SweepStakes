"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

function LoginInner() {
  const search = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false
    });
    setPending(false);
    if (!res || res.error) {
      setError("Invalid credentials");
      return;
    }
    const callback = search.get("callbackUrl") ?? "/admin";
    router.push(callback);
  }

  return (
    <div className="max-w-sm mx-auto pt-12">
      <Card>
        <h1 className="text-xl font-semibold text-white">Admin sign in</h1>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-pitch-700/70">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-pitch-900/70 ring-1 ring-pitch-700/40 px-3 py-2 text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-pitch-700/70">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-pitch-900/70 ring-1 ring-pitch-700/40 px-3 py-2 text-white"
            />
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
