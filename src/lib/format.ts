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

// --- datetime-local <-> ISO helpers (always pinned to APP_TZ / NZT) ---

/**
 * Convert an ISO/Date timestamp to a value suitable for an
 * <input type="datetime-local">, formatted in the app's pinned timezone.
 * The input element doesn't know about timezones; it just shows whatever
 * "YYYY-MM-DDTHH:MM" string we give it. So we have to do the conversion
 * ourselves so the user sees NZT regardless of their browser timezone.
 */
export function dateTimeLocalForInput(input: Date | string | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  // 24h hour "24" can show up at midnight in some locales — normalise.
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/**
 * Convert a "YYYY-MM-DDTHH:MM" value from <input type="datetime-local"> into
 * an ISO timestamp, treating the input as APP_TZ wall-clock time. Necessary
 * because `new Date(value)` would treat it as the browser's local time —
 * which would be wrong for any admin not sitting in NZT.
 */
export function dateTimeLocalToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  // Parse the wall-clock parts the user typed.
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [, yStr, moStr, dStr, hStr, miStr] = m;
  const y = parseInt(yStr, 10);
  const mo = parseInt(moStr, 10);
  const da = parseInt(dStr, 10);
  const h = parseInt(hStr, 10);
  const mi = parseInt(miStr, 10);
  // Brute force: build a UTC time, ask Intl what that UTC reads as in TZ,
  // measure the offset, then correct. Handles DST automatically.
  // First guess: assume UTC == wall clock, then shift by the timezone offset.
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  const offsetMs = tzOffsetMs(new Date(guess), TZ);
  return new Date(guess - offsetMs).toISOString();
}

function tzOffsetMs(at: Date, tz: string): number {
  // Difference between TZ's wall clock and UTC at the given instant.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(at);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const tzMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second")
  );
  return tzMs - at.getTime();
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
