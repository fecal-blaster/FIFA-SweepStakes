// In-memory token bucket. Good enough for a single-instance Unraid deployment.
// Swap to Redis if scaled out.

type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimit = { capacity: number; refillPerSecond: number };

export function consume(key: string, limit: RateLimit): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: limit.capacity, updatedAt: now };
  const elapsedSec = (now - b.updatedAt) / 1000;
  b.tokens = Math.min(limit.capacity, b.tokens + elapsedSec * limit.refillPerSecond);
  b.updatedAt = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(key, b);
    return { ok: true, retryAfterMs: 0 };
  }
  buckets.set(key, b);
  const retryAfterMs = Math.ceil(((1 - b.tokens) / limit.refillPerSecond) * 1000);
  return { ok: false, retryAfterMs };
}

export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  return `${scope}:${ip}`;
}
