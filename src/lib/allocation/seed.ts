import { createHash, randomBytes } from "node:crypto";

export type GeneratedSeed = {
  /** Human-readable seed shown publicly, e.g. "fifa2026-9a7c4d". */
  display: string;
  /** Full hex entropy used by the PRNG. Public after the draw — that's the point. */
  secret: string;
};

/**
 * Generate a fresh draw seed from a cryptographically secure source.
 * The display form is a convenient label; the secret is the actual PRNG key.
 */
export function generateSeed(label?: string): GeneratedSeed {
  const bytes = randomBytes(16);
  const secret = bytes.toString("hex");
  const tag = (label ?? `fifa${new Date().getUTCFullYear()}`).toLowerCase().replace(/[^a-z0-9]/g, "");
  return {
    display: `${tag}-${secret.slice(0, 6)}`,
    secret
  };
}

/** Stable digest helper used by both input snapshot and verify hash. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
