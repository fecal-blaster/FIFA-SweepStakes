"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { io, type Socket } from "socket.io-client";
import { MatchCard, type MatchCardData } from "./match-card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function LiveMatches({
  slug,
  scope = "live",
  emptyLabel,
  size = "md"
}: {
  slug: string;
  scope?: "live" | "upcoming" | "recent" | "all";
  emptyLabel?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { data, mutate } = useSWR<{ matches: MatchCardData[] }>(
    `/api/tournaments/${slug}/matches?scope=${scope}`,
    fetcher,
    { refreshInterval: scope === "live" ? 5000 : 30000 }
  );
  useEffect(() => {
    let socket: Socket | null = null;
    try {
      socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
      socket.emit("subscribe:tournament", slug);
      socket.on("match:update", () => mutate());
      socket.on("match:goal", () => mutate());
    } catch {}
    return () => {
      socket?.disconnect();
    };
  }, [slug, mutate]);

  const matches = data?.matches ?? [];
  if (matches.length === 0) {
    return (
      <p className="text-sm text-white/50">
        {emptyLabel ?? "Nothing here yet."}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} size={size} />
      ))}
    </div>
  );
}
