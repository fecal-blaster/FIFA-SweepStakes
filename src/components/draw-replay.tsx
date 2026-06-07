"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Card, Flag } from "@/components/ui";
import { formatLongKickoff } from "@/lib/format";

type Allocation = {
  participant: { id: string; name: string };
  team: { id: string; name: string; code: string | null; flagUrl: string | null; tier: number };
};

type DrawMeta = {
  id: string;
  seed: string;
  verifyHash: string;
  inputDigest: string;
  mode: string;
  createdAt: string;
};

export function DrawReplay({
  slug,
  draw,
  allocations
}: {
  slug: string;
  draw: DrawMeta;
  allocations: Allocation[];
}) {
  // Ordering: tier ascending then name — gives a satisfying "top pots first" feel.
  const ordered = useMemo(
    () =>
      allocations
        .slice()
        .sort(
          (a, b) =>
            a.team.tier - b.team.tier ||
            a.team.name.localeCompare(b.team.name)
        ),
    [allocations]
  );

  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [verifyState, setVerifyState] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (revealed >= ordered.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setRevealed((n) => n + 1), 550);
    return () => clearTimeout(t);
  }, [playing, revealed, ordered.length]);

  async function verify() {
    setVerifyState("checking");
    setVerifyMsg(null);
    try {
      const res = await fetch(`/api/tournaments/${slug}/draws/${draw.id}/verify`);
      const body = await res.json();
      if (body.ok) {
        setVerifyState("ok");
        setVerifyMsg("Hash matches. Draw is authentic and reproducible from its seed.");
      } else {
        setVerifyState("fail");
        setVerifyMsg(
          `Mismatch. Stored ${body.verifyHash?.slice(0, 12)}… vs recomputed ${body.recomputedVerifyHash?.slice(0, 12)}…`
        );
      }
    } catch (e) {
      setVerifyState("fail");
      setVerifyMsg(String(e));
    }
  }

  // Group by participant so the right-hand panel shows team-per-person.
  const byParticipant = useMemo(() => {
    const map = new Map<string, { name: string; teams: Allocation["team"][] }>();
    for (const a of ordered.slice(0, revealed)) {
      const cur = map.get(a.participant.id) ?? { name: a.participant.name, teams: [] };
      cur.teams.push(a.team);
      map.set(a.participant.id, cur);
    }
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [ordered, revealed]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs text-pitch-700/70 uppercase tracking-widest">Seed</div>
            <code className="text-accent-electric tabular text-lg">{draw.seed}</code>
            <div className="text-xs text-pitch-700/70">
              {draw.mode} · {formatLongKickoff(draw.createdAt)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-pitch-700/70 uppercase tracking-widest">Verify hash</div>
            <code className="text-xs text-pitch-700/90 break-all max-w-md inline-block">{draw.verifyHash}</code>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setRevealed(0);
              setPlaying(true);
            }}
            disabled={playing}
          >
            ▶ Play draw
          </Button>
          <Button variant="ghost" onClick={() => setRevealed(ordered.length)}>
            Reveal all
          </Button>
          <Button variant="ghost" onClick={verify} disabled={verifyState === "checking"}>
            {verifyState === "checking" ? "Verifying…" : "Verify draw"}
          </Button>
        </div>
        {verifyMsg && (
          <div
            className={
              "mt-3 text-sm " +
              (verifyState === "ok" ? "text-accent-electric" : "text-red-300")
            }
          >
            {verifyMsg}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Draw order ({revealed}/{ordered.length})
          </h3>
          <ul className="mt-3 space-y-1.5">
            <AnimatePresence initial={false}>
              {ordered.slice(0, revealed).map((a, i) => (
                <motion.li
                  key={a.team.id}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className="flex items-center justify-between bg-pitch-800/50 ring-1 ring-pitch-700/40 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-6 text-pitch-700/70 tabular">#{i + 1}</span>
                    <span className="text-white font-medium">{a.team.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-pitch-700/70">
                      tier {a.team.tier}
                    </span>
                  </div>
                  <span className="text-sm text-accent-electric">→ {a.participant.name}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">By participant</h3>
          <ul className="mt-3 space-y-3">
            {byParticipant.map(([pid, p]) => (
              <li key={pid}>
                <div className="text-white font-medium">{p.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.teams.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 text-xs bg-pitch-800/70 ring-1 ring-pitch-700/40 rounded px-2 py-0.5"
                    >
                      <Flag code={t.code} size="md" />
                      <span>{t.name}</span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
