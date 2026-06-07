import { SeededPrng, seedFromHex } from "./prng";
import { sha256Hex } from "./seed";

export type DrawMode = "PURE_RANDOM" | "BALANCED";

export type AllocationParticipant = {
  id: string;
  name: string;
};

export type AllocationTeam = {
  id: string;
  name: string;
  /** Strength tier — 1 is strongest. Used as a coarse pot for the balanced
   *  draw and as fallback strength when rankingPoints is missing. */
  tier: number;
  /** FIFA-style numeric ranking. When present (and > 0), this is the source
   *  of truth for strength balance. */
  rankingPoints?: number;
};

/** Pair of team IDs that share a fixture. Order doesn't matter — we sort them
 *  when keying the set so [a,b] and [b,a] are treated as the same pair. */
export type CoOccurrencePair = [string, string];

export type AllocationInput = {
  mode: DrawMode;
  /** Hex entropy. Anyone with this + the inputs can reproduce the draw. */
  seedSecret: string;
  participants: AllocationParticipant[];
  teams: AllocationTeam[];
  /** Fixture-derived pairs of teams that play each other. Used by BALANCED
   *  mode to minimise self-clashes. Optional — omit for pre-fixture draws. */
  coOccurrence?: CoOccurrencePair[];
};

export type Assignment = {
  participantId: string;
  teamIds: string[];
};

export type AllocationResult = {
  assignments: Assignment[];
  /** sha256 of canonical input snapshot (mode + sorted participants + sorted teams). */
  inputDigest: string;
  /** sha256 of seedSecret + inputDigest + canonical assignments. Final attestation. */
  verifyHash: string;
};

export type DistributionPlan = {
  teamsPerParticipant: number;
  /** How many original teams need a duplicate so everyone gets the same count. */
  duplicatesNeeded: number;
  totalSlots: number;
};

export function planDistribution(numTeams: number, numParticipants: number): DistributionPlan {
  if (numParticipants <= 0) throw new Error("Need at least one participant");
  if (numTeams <= 0) throw new Error("Need at least one team");
  // Round up so every participant gets the same count. The shortfall is made
  // up by duplicating teams (same team can be owned by multiple participants).
  const teamsPerParticipant = Math.ceil(numTeams / numParticipants);
  const totalSlots = teamsPerParticipant * numParticipants;
  const duplicatesNeeded = totalSlots - numTeams;
  return { teamsPerParticipant, duplicatesNeeded, totalSlots };
}

/** Strength used by the balancer.
 *  - When `rankingPoints` is provided (FIFA-style score), it's used directly,
 *    rescaled into a smaller numeric range so the math stays well-conditioned.
 *  - Otherwise we fall back to a tier-derived value: tier 1 ≈ 8.0, tier 4 ≈ 1.0.
 *  Either way, "more is stronger". */
export function teamStrength(input: { tier: number; rankingPoints?: number | null }): number {
  if (input.rankingPoints && input.rankingPoints > 0) {
    // FIFA ranks range roughly 1100–1900. Subtract a floor + scale so a top
    // side ends up ~9 and a bottom side ~1 — same ballpark as tier-derived.
    return Math.max(0.5, (input.rankingPoints - 1000) / 100);
  }
  const t = Math.max(1, input.tier);
  return Math.pow(Math.max(0.5, 5 - t), 1.5);
}

// --- canonical serialisation ------------------------------------------------

function canonicalParticipants(ps: AllocationParticipant[]): AllocationParticipant[] {
  return ps.slice().sort((a, b) => a.id.localeCompare(b.id));
}

function canonicalTeams(ts: AllocationTeam[]): AllocationTeam[] {
  return ts.slice().sort((a, b) => a.id.localeCompare(b.id));
}

// Kept as a public helper for tests / external scripts; not used internally
// since the two-pass allocator no longer expands the deal list up-front.
void buildDealList;

function canonicalAssignments(a: Assignment[]): Assignment[] {
  return a
    .slice()
    .sort((x, y) => x.participantId.localeCompare(y.participantId))
    .map((x) => ({
      participantId: x.participantId,
      teamIds: x.teamIds.slice().sort()
    }));
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function canonicalCoOccurrence(co: CoOccurrencePair[] | undefined): string[] {
  if (!co || co.length === 0) return [];
  const set = new Set<string>();
  for (const [a, b] of co) set.add(pairKey(a, b));
  return [...set].sort();
}

export function computeInputDigest(
  input: Pick<AllocationInput, "mode" | "participants" | "teams" | "coOccurrence">
): string {
  const snapshot = {
    mode: input.mode,
    participants: canonicalParticipants(input.participants).map((p) => ({ id: p.id, name: p.name })),
    teams: canonicalTeams(input.teams).map((t) => ({
      id: t.id,
      name: t.name,
      tier: t.tier,
      rankingPoints: t.rankingPoints ?? null
    })),
    coOccurrence: canonicalCoOccurrence(input.coOccurrence)
  };
  return sha256Hex(JSON.stringify(snapshot));
}

export function computeVerifyHash(
  seedSecret: string,
  inputDigest: string,
  assignments: Assignment[]
): string {
  const payload = {
    seedSecret,
    inputDigest,
    assignments: canonicalAssignments(assignments)
  };
  return sha256Hex(JSON.stringify(payload));
}

// --- allocation strategies --------------------------------------------------

/**
 * Picks the next participant to receive a team — always one with the minimum
 * current count. This is what keeps the distribution within ±1 across the room
 * even when teams don't divide evenly.
 */
// Kept for legacy callers; current modes use the inline narrowing instead.
function pickNextParticipant(
  participants: AllocationParticipant[],
  counts: Map<string, number>,
  prng: SeededPrng
): AllocationParticipant {
  let min = Infinity;
  for (const p of participants) {
    const c = counts.get(p.id) ?? 0;
    if (c < min) min = c;
  }
  const candidates = participants.filter((p) => (counts.get(p.id) ?? 0) === min);
  return candidates[prng.nextInt(candidates.length)];
}
void pickNextParticipant;

function allocatePureRandom(input: AllocationInput, prng: SeededPrng): Assignment[] {
  const teams = canonicalTeams(input.teams);
  const participants = canonicalParticipants(input.participants);
  const target = Math.ceil(teams.length / participants.length);
  const counts = new Map<string, number>();
  const bag = new Map<string, Set<string>>();
  const sharedCount = new Map<string, number>();
  const teamOwners = new Map<string, string[]>();
  for (const p of participants) {
    counts.set(p.id, 0);
    bag.set(p.id, new Set());
    sharedCount.set(p.id, 0);
  }

  // Pass 1: deal originals in random order, no duplicates.
  for (const team of prng.shuffle(teams)) {
    const eligible = participants.filter(
      (p) => !bag.get(p.id)!.has(team.id) && (counts.get(p.id) ?? 0) < target
    );
    let min = Infinity;
    for (const p of eligible) {
      const c = counts.get(p.id) ?? 0;
      if (c < min) min = c;
    }
    const candidates = eligible.filter((p) => (counts.get(p.id) ?? 0) === min);
    const chosen = candidates[prng.nextInt(candidates.length)];
    bag.get(chosen.id)!.add(team.id);
    counts.set(chosen.id, (counts.get(chosen.id) ?? 0) + 1);
    teamOwners.set(team.id, [chosen.id]);
  }

  // Pass 2: deal duplicates to shorts, sourced preferentially from sharedCount=0 owners.
  const shorts = participants.filter((p) => (counts.get(p.id) ?? 0) < target);
  for (const short of prng.shuffle(shorts)) {
    const candidates = teams.filter(
      (t) => !bag.get(short.id)!.has(t.id) && (teamOwners.get(t.id)?.length ?? 0) >= 1
    );
    let minOwnerShared = Infinity;
    const ownerSharedFor = new Map<string, number>();
    for (const t of candidates) {
      const owners = teamOwners.get(t.id) ?? [];
      const minS = Math.min(...owners.map((o) => sharedCount.get(o) ?? 0));
      ownerSharedFor.set(t.id, minS);
      if (minS < minOwnerShared) minOwnerShared = minS;
    }
    const pool = candidates.filter((t) => ownerSharedFor.get(t.id) === minOwnerShared);
    const chosen = pool[prng.nextInt(pool.length)];
    const owners = teamOwners.get(chosen.id)!;
    bag.get(short.id)!.add(chosen.id);
    counts.set(short.id, (counts.get(short.id) ?? 0) + 1);
    if (owners.length === 1) {
      const [first] = owners;
      sharedCount.set(first, (sharedCount.get(first) ?? 0) + 1);
    }
    sharedCount.set(short.id, (sharedCount.get(short.id) ?? 0) + 1);
    owners.push(short.id);
  }

  return participants.map((p) => ({ participantId: p.id, teamIds: [...bag.get(p.id)!] }));
}

function buildDealList(teams: AllocationTeam[], numParticipants: number, prng: SeededPrng): AllocationTeam[] {
  // Pad the team list with duplicates so the count divides evenly across the
  // pool. Duplicates are chosen with strength balance in mind: we pick one
  // team per tier (cycled) so the duplicated rating is spread across pots
  // rather than doubling the strongest team.
  const { duplicatesNeeded } = planDistribution(teams.length, numParticipants);
  if (duplicatesNeeded === 0) return teams.slice();
  const byTier = new Map<number, AllocationTeam[]>();
  for (const t of teams) {
    if (!byTier.has(t.tier)) byTier.set(t.tier, []);
    byTier.get(t.tier)!.push(t);
  }
  const orderedTiers = [...byTier.keys()].sort((a, b) => a - b);
  // Pre-shuffle each tier so the "next duplicate from this tier" pick is random.
  const tierBags = orderedTiers.map((tier) => prng.shuffle(byTier.get(tier)!));
  const extras: AllocationTeam[] = [];
  let tierIdx = 0;
  // Distribute duplicates cyclically across tiers, skipping a tier when it's
  // exhausted. Guaranteed to terminate because numTeams >= duplicatesNeeded.
  while (extras.length < duplicatesNeeded) {
    for (let i = 0; i < tierBags.length && extras.length < duplicatesNeeded; i++) {
      const bag = tierBags[(tierIdx + i) % tierBags.length];
      if (bag.length === 0) continue;
      extras.push(bag.shift()!);
    }
    tierIdx = (tierIdx + 1) % tierBags.length;
  }
  return [...teams, ...extras];
}

function allocateBalanced(input: AllocationInput, prng: SeededPrng): Assignment[] {
  const teams = canonicalTeams(input.teams);
  const participants = canonicalParticipants(input.participants);
  const target = Math.ceil(teams.length / participants.length);
  const totalSlots = target * participants.length;
  const duplicatesNeeded = totalSlots - teams.length;

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const counts = new Map<string, number>();
  const strengths = new Map<string, number>();
  const sharedCount = new Map<string, number>();
  const bag = new Map<string, Set<string>>();
  // teamId → ordered list of participant IDs (first allocation = original).
  const teamOwners = new Map<string, string[]>();
  for (const p of participants) {
    counts.set(p.id, 0);
    strengths.set(p.id, 0);
    sharedCount.set(p.id, 0);
    bag.set(p.id, new Set());
  }

  const coSet = new Set<string>();
  if (input.coOccurrence) {
    for (const [a, b] of input.coOccurrence) coSet.add(pairKey(a, b));
  }
  const clashCount = (participantId: string, teamId: string): number => {
    let c = 0;
    for (const owned of bag.get(participantId)!) {
      if (coSet.has(pairKey(owned, teamId))) c++;
    }
    return c;
  };

  const allTeamStrengthTotal = teams.reduce((s, t) => s + teamStrength(t), 0);
  const targetStrengthPerPlayer = (allTeamStrengthTotal * target) / teams.length;

  // ---- PASS 1: deal each original team exactly once, balanced.
  // Group teams by tier in ascending order (1 = strongest first).
  const tiers = new Map<number, AllocationTeam[]>();
  for (const t of teams) {
    if (!tiers.has(t.tier)) tiers.set(t.tier, []);
    tiers.get(t.tier)!.push(t);
  }
  const orderedTiers = [...tiers.keys()].sort((a, b) => a - b);

  for (const tier of orderedTiers) {
    const shuffled = prng.shuffle(tiers.get(tier)!);
    const tierCounts = new Map<string, number>(participants.map((p) => [p.id, 0]));
    for (const team of shuffled) {
      const eligible = participants.filter(
        (p) => !bag.get(p.id)!.has(team.id) && (counts.get(p.id) ?? 0) < target
      );
      if (eligible.length === 0) throw new Error("No eligible participant for " + team.id);
      // Min overall count.
      let minOverall = Infinity;
      for (const p of eligible) {
        const c = counts.get(p.id) ?? 0;
        if (c < minOverall) minOverall = c;
      }
      const overallCandidates = eligible.filter((p) => (counts.get(p.id) ?? 0) === minOverall);
      // Min tier count.
      let minTier = Infinity;
      for (const p of overallCandidates) {
        const c = tierCounts.get(p.id) ?? 0;
        if (c < minTier) minTier = c;
      }
      const tierCandidates = overallCandidates.filter(
        (p) => (tierCounts.get(p.id) ?? 0) === minTier
      );
      // Min self-clash.
      let minClash = Infinity;
      const candidateClashes = new Map<string, number>();
      for (const p of tierCandidates) {
        const c = clashCount(p.id, team.id);
        candidateClashes.set(p.id, c);
        if (c < minClash) minClash = c;
      }
      const clashCandidates = tierCandidates.filter(
        (p) => candidateClashes.get(p.id) === minClash
      );
      // Strength: furthest below the per-player target.
      let maxGap = -Infinity;
      const gaps = new Map<string, number>();
      for (const p of clashCandidates) {
        const gap = targetStrengthPerPlayer - (strengths.get(p.id) ?? 0);
        gaps.set(p.id, gap);
        if (gap > maxGap) maxGap = gap;
      }
      const finalCandidates = clashCandidates.filter(
        (p) => (gaps.get(p.id) ?? 0) >= maxGap - 0.0001
      );
      const chosen = finalCandidates[prng.nextInt(finalCandidates.length)];
      bag.get(chosen.id)!.add(team.id);
      counts.set(chosen.id, (counts.get(chosen.id) ?? 0) + 1);
      tierCounts.set(chosen.id, (tierCounts.get(chosen.id) ?? 0) + 1);
      strengths.set(chosen.id, (strengths.get(chosen.id) ?? 0) + teamStrength(team));
      teamOwners.set(team.id, [chosen.id]);
    }
  }

  // ---- PASS 2: deal duplicates so everyone reaches `target`. Prefer to source
  // each duplicate from a player whose sharedCount is still 0, so the cost of
  // sharing spreads across the room rather than landing on the same person
  // twice. Receivers (the "short" players) get processed in random order.
  if (duplicatesNeeded > 0) {
    const shorts = participants.filter((p) => (counts.get(p.id) ?? 0) < target);
    for (const short of prng.shuffle(shorts)) {
      // Eligible source teams: anything the short doesn't already own and
      // that already has at least one owner.
      const candidates = teams.filter(
        (t) => !bag.get(short.id)!.has(t.id) && (teamOwners.get(t.id)?.length ?? 0) >= 1
      );
      if (candidates.length === 0) throw new Error("No duplicate candidates for " + short.id);

      // Tie-breaker 1: prefer teams whose existing owner has sharedCount = 0,
      // so we don't pile two shared teams onto the same person.
      let minOwnerShared = Infinity;
      const ownerSharedFor = new Map<string, number>();
      for (const t of candidates) {
        const owners = teamOwners.get(t.id) ?? [];
        const minOwnerS = Math.min(...owners.map((o) => sharedCount.get(o) ?? 0));
        ownerSharedFor.set(t.id, minOwnerS);
        if (minOwnerS < minOwnerShared) minOwnerShared = minOwnerS;
      }
      let pool = candidates.filter((t) => ownerSharedFor.get(t.id) === minOwnerShared);

      // Tie-breaker 2: minimum clash with this short's existing teams.
      let minC = Infinity;
      const clashFor = new Map<string, number>();
      for (const t of pool) {
        const c = clashCount(short.id, t.id);
        clashFor.set(t.id, c);
        if (c < minC) minC = c;
      }
      pool = pool.filter((t) => clashFor.get(t.id) === minC);

      // Tie-breaker 3: pick the team whose strength best closes the gap to
      // this short's target — keeps everyone's pool strength flat.
      const currentStrength = strengths.get(short.id) ?? 0;
      let bestStrength = Infinity;
      const strengthDeltaFor = new Map<string, number>();
      for (const t of pool) {
        const delta = Math.abs(targetStrengthPerPlayer - (currentStrength + teamStrength(t)));
        strengthDeltaFor.set(t.id, delta);
        if (delta < bestStrength) bestStrength = delta;
      }
      pool = pool.filter((t) => (strengthDeltaFor.get(t.id) ?? Infinity) <= bestStrength + 0.0001);

      const chosen = pool[prng.nextInt(pool.length)];
      const owners = teamOwners.get(chosen.id)!;
      bag.get(short.id)!.add(chosen.id);
      counts.set(short.id, (counts.get(short.id) ?? 0) + 1);
      strengths.set(short.id, (strengths.get(short.id) ?? 0) + teamStrength(chosen));
      // When a team transitions from 1 → 2 owners, both owners now have a
      // shared team. The receiver always gets +1; the first owner only gets
      // +1 the *first* time their team becomes shared.
      if (owners.length === 1) {
        const [first] = owners;
        sharedCount.set(first, (sharedCount.get(first) ?? 0) + 1);
      }
      sharedCount.set(short.id, (sharedCount.get(short.id) ?? 0) + 1);
      owners.push(short.id);
    }
  }

  // Silence unused-variable warnings for helpers retained for clarity.
  void teamById;

  return participants.map((p) => ({
    participantId: p.id,
    teamIds: [...bag.get(p.id)!]
  }));
}

// --- public API -------------------------------------------------------------

export function runAllocation(input: AllocationInput): AllocationResult {
  if (input.participants.length === 0) throw new Error("No participants");
  if (input.teams.length === 0) throw new Error("No teams");
  const prng = seedFromHex(input.seedSecret);
  const assignments =
    input.mode === "BALANCED" ? allocateBalanced(input, prng) : allocatePureRandom(input, prng);
  const inputDigest = computeInputDigest(input);
  const verifyHash = computeVerifyHash(input.seedSecret, inputDigest, assignments);
  return { assignments, inputDigest, verifyHash };
}

/**
 * Re-run a draw from its seed and check it matches the stored verify hash.
 * This is the public verification path — given seed + inputs, anyone can prove
 * the saved allocations were not tampered with.
 */
export function verifyAllocation(
  input: AllocationInput,
  expectedVerifyHash: string
): { ok: boolean; computed: AllocationResult } {
  const computed = runAllocation(input);
  return { ok: computed.verifyHash === expectedVerifyHash, computed };
}
