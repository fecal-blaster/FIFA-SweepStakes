import { createHash } from "node:crypto";

// Deterministic CSPRNG: SHA-256 in counter mode keyed by the seed.
// Reproducible from the seed alone — used so anyone can verify a draw.
export class SeededPrng {
  private counter = 0n;
  private block: Buffer = Buffer.alloc(0);
  private offset = 0;

  constructor(private readonly seedBytes: Buffer) {
    if (seedBytes.length < 8) {
      throw new Error("Seed must be at least 8 bytes of entropy");
    }
  }

  private refill(): void {
    const h = createHash("sha256");
    h.update(this.seedBytes);
    const ctr = Buffer.alloc(8);
    ctr.writeBigUInt64BE(this.counter++);
    h.update(ctr);
    this.block = h.digest();
    this.offset = 0;
  }

  private nextUint32(): number {
    if (this.offset + 4 > this.block.length) this.refill();
    const v = this.block.readUInt32BE(this.offset);
    this.offset += 4;
    return v;
  }

  // Uniform integer in [0, max) via rejection sampling.
  nextInt(max: number): number {
    if (!Number.isInteger(max) || max <= 0) {
      throw new Error("max must be a positive integer");
    }
    const limit = Math.floor(0x100000000 / max) * max;
    while (true) {
      const v = this.nextUint32();
      if (v < limit) return v % max;
    }
  }

  // Fisher-Yates shuffle. Returns a new array; input untouched.
  shuffle<T>(input: readonly T[]): T[] {
    const a = input.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export function seedFromHex(hex: string): SeededPrng {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Seed secret must be a hex string");
  }
  return new SeededPrng(Buffer.from(hex, "hex"));
}
