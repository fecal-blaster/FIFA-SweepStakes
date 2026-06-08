// Tournament prize structure — supports placement (1st, 2nd…), wooden spoon
// (last place by points), and special category prizes (most red cards, etc.)
// that the admin awards manually.
//
// Tournament.prizesJson stores the canonical structure when present; if it's
// null we synthesise placements from the legacy payoutBpsJson + pool size.

export type PrizeKind = "PLACEMENT" | "WOODEN_SPOON" | "MOST_RED_CARDS" | "CATEGORY";

export type Prize = {
  /** Stable identifier used by the admin editor and award-pinning. */
  id: string;
  /** Human label shown in the UI, e.g. "1st place" or "Most red cards". */
  label: string;
  /** Share of the pool in basis points (10000 = 100%). Prizes auto-scale
   *  with the actual money collected, so missing buy-ins shrink everything
   *  proportionally. */
  shareBps: number;
  kind: PrizeKind;
  /** Only set for PLACEMENT prizes — 1 = winner, 2 = runner-up, etc. */
  position?: number;
  /** When set, this prize is locked to a specific participant (used for
   *  CATEGORY prizes the admin awards manually). PLACEMENT, WOODEN_SPOON
   *  and MOST_RED_CARDS derive their winner automatically. */
  awardedParticipantId?: string;
};

// Default: 58.33% / 21.67% / 16.67% / 3.33% (≈ $350/$130/$100/$20 for a
// $600 pool). Sum to 10000 bps.
const DEFAULT_PRIZES: Prize[] = [
  { id: "first", label: "1st place", shareBps: 5833, kind: "PLACEMENT", position: 1 },
  { id: "second", label: "2nd place", shareBps: 2167, kind: "PLACEMENT", position: 2 },
  { id: "wooden", label: "Wooden spoon (last place)", shareBps: 1667, kind: "WOODEN_SPOON" },
  { id: "red", label: "Most red cards", shareBps: 333, kind: "MOST_RED_CARDS" }
];

/** Parse the JSON stored on Tournament.prizesJson, with conservative
 *  validation. Returns null if the value isn't a usable structure. */
export function parsePrizes(raw: unknown): Prize[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Prize[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const r2 = r as Partial<Prize> & Record<string, unknown> & { amountMinor?: unknown };
    if (typeof r2.id !== "string" || typeof r2.label !== "string") continue;
    const kind = r2.kind;
    if (
      kind !== "PLACEMENT" &&
      kind !== "WOODEN_SPOON" &&
      kind !== "MOST_RED_CARDS" &&
      kind !== "CATEGORY"
    ) {
      continue;
    }
    // shareBps is the new field; fall back to deriving from old amountMinor
    // entries during the % migration (a one-off — anyone with prizes saved
    // pre-% release won't have shareBps yet).
    const shareBps =
      typeof r2.shareBps === "number"
        ? Math.max(0, Math.floor(r2.shareBps))
        : typeof r2.amountMinor === "number"
          ? 0 // best-effort migration: zero until admin re-saves
          : 0;
    out.push({
      id: r2.id,
      label: r2.label,
      shareBps,
      kind,
      position: typeof r2.position === "number" ? r2.position : undefined,
      awardedParticipantId:
        typeof r2.awardedParticipantId === "string" ? r2.awardedParticipantId : undefined
    });
  }
  return out;
}

/** Resolve prizes for a tournament, falling back to the legacy
 *  payoutBpsJson when prizesJson hasn't been set. */
export function resolvePrizes(
  prizesJson: unknown,
  legacy: { payoutBpsJson: unknown }
): Prize[] {
  const parsed = parsePrizes(prizesJson);
  if (parsed && parsed.length > 0) return parsed;
  // Synthesise from payoutBpsJson — placement prizes only.
  const payoutBps = (legacy.payoutBpsJson as number[] | null) ?? [5000, 3333, 1667];
  return payoutBps.map((bps, i) => ({
    id: `placement-${i + 1}`,
    label: `${ordinal(i + 1)} place`,
    shareBps: bps,
    kind: "PLACEMENT" as const,
    position: i + 1
  }));
}

export function getDefaultPrizes(): Prize[] {
  return DEFAULT_PRIZES.map((p) => ({ ...p }));
}

/** Convert a basis-points share to actual money for the current pool. */
export function prizeAmountMinor(prize: Prize, poolMinor: number): number {
  return Math.floor((poolMinor * prize.shareBps) / 10000);
}

export function totalShareBps(prizes: Prize[]): number {
  return prizes.reduce((s, p) => s + p.shareBps, 0);
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
