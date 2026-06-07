"use client";

import { useState } from "react";

// Wraps an explanation with a toggle button that swaps it for a one-line
// dumbed-down version. The "real" content is whatever you pass as children;
// the simple version is the `simple` prop.
export function Eli5({
  simple,
  children
}: {
  simple: string;
  children: React.ReactNode;
}) {
  const [dumb, setDumb] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setDumb((v) => !v)}
          className="text-[11px] uppercase tracking-[0.18em] text-white/55 hover:text-white transition"
        >
          {dumb ? "← Real explanation" : "Explain it like I'm a monkey →"}
        </button>
      </div>
      {dumb ? (
        <p className="text-sm text-white/85 leading-relaxed italic border-l-2 border-white/20 pl-3">
          {simple}
        </p>
      ) : (
        children
      )}
    </div>
  );
}
