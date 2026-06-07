"use client";

import { AnimatedNumber } from "./animated-number";
import { currencySymbol } from "@/lib/format";

// Pinned locale + currency-agnostic formatter so SSR and client agree.
const numberFmt = new Intl.NumberFormat("en-NZ", {
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
  const symbol = currencySymbol(currency);
  return (
    <div className="flex items-baseline gap-1">
      <span className="display text-3xl text-white/55">{symbol}</span>
      <AnimatedNumber
        value={poolMinor / 100}
        format={(n) => numberFmt.format(n)}
        className="scoreboard-num text-5xl sm:text-6xl text-white"
      />
    </div>
  );
}
