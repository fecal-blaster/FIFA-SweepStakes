"use client";

import { AnimatedNumber } from "./animated-number";

// Always-en formatter so SSR and client renders produce byte-identical output.
const fmt = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function PrizeCounter({
  poolMinor,
  currency
}: {
  poolMinor: number;
  currency: string;
}) {
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  return (
    <div className="flex items-baseline gap-1">
      <span className="display text-3xl text-white/70">{symbol}</span>
      <AnimatedNumber
        value={poolMinor / 100}
        format={(n) => fmt.format(n)}
        className="scoreboard-num text-5xl sm:text-6xl text-lime-400 drop-shadow-[0_0_18px_rgba(126,255,50,0.3)]"
      />
    </div>
  );
}
