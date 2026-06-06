// All money flows through minor units (pence/cents) as integers — no float drift.

export function formatMoney(minor: number, currency = "GBP"): string {
  const value = minor / 100;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Split a prize pool by basis-points payout shares.
 * Uses largest-remainder rounding so the totals reconcile exactly to `pool`.
 */
export function distributePrizePool(poolMinor: number, payoutBps: number[]): number[] {
  const totalBps = payoutBps.reduce((a, b) => a + b, 0);
  if (totalBps === 0) return payoutBps.map(() => 0);
  const exact = payoutBps.map((bps) => (poolMinor * bps) / totalBps);
  const floor = exact.map((v) => Math.floor(v));
  let remainder = poolMinor - floor.reduce((a, b) => a + b, 0);
  // Hand out the remaining pence to the entries with the largest fractional part.
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = floor.slice();
  for (const { i } of order) {
    if (remainder <= 0) break;
    out[i] += 1;
    remainder -= 1;
  }
  return out;
}

export function totalBuyIns(participantCount: number, buyInMinor: number): number {
  return participantCount * buyInMinor;
}

export function outstandingBuyIns(unpaidCount: number, buyInMinor: number): number {
  return unpaidCount * buyInMinor;
}
