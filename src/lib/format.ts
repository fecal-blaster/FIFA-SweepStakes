// Centralised time + money formatters. Pinned timezone and currency so server
// and client renders agree byte-for-byte (no hydration mismatches) and so the
// whole app shows times relevant to the audience.

const TZ = process.env.APP_TZ ?? process.env.TZ ?? "Pacific/Auckland";

export function formatDateTime(
  input: Date | string,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-NZ", { timeZone: TZ, ...opts }).format(d);
}

export function formatShortKickoff(input: Date | string): string {
  return formatDateTime(input, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function formatLongKickoff(input: Date | string): string {
  return formatDateTime(input, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function timezoneLabel(): string {
  return TZ;
}

// Currency / money — Intl handles the local symbol (NZD → "NZ$") cleanly.
const moneyCache = new Map<string, Intl.NumberFormat>();
function fmtFor(currency: string): Intl.NumberFormat {
  let f = moneyCache.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat("en-NZ", { style: "currency", currency });
    } catch {
      f = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });
    }
    moneyCache.set(currency, f);
  }
  return f;
}

export function formatMoneyMinor(minor: number, currency = "NZD"): string {
  return fmtFor(currency).format(minor / 100);
}

export function currencySymbol(currency: string): string {
  // Pull the symbol out of an Intl format of 0 (e.g. "NZ$0.00" → "NZ$").
  const parts = fmtFor(currency).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}
