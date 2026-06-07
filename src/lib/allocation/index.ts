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
  /** Strength tier — 1 is strongest. Ignored in PURE_RANDOM mode. */
  tier: number;
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

/** Tier-derived strength used by the balancer. Lower tier = higher value.
 *  Returns roughly: tier 1 ≈ 8.0, tier 2 ≈ 5.2, tier 3 ≈ 2.8, tier 4 ≈ 1.0. */
export function teamStrength(tier: number): number {
  const t = Math.max(1, tier);
  return Math.pow(Math.max(0.5, 5 - t), 1.5);
}

// --- canonical serialisation ------------------------------------------------

function canonicalParticipants(ps: AllocationParticipant[]): AllocationParticipant[] {
  return ps.slice().sort((a, b) => a.id.localeCompare(b.id));
}

function canonicalTeams(ts: AllocationTeam[]): AllocationTeam[] {
  return ts.slice().sort((a, b) => a.id.localeCompare(b.id));
}

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
    teams: canonicalTeams(input.teams).map((t) => ({ id: t.id, name: t.name, tier: t.tier })),
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
  // Pad with duplicates so everyone gets the same team count.
  const expanded = buildDealList(teams, participants.length, prng);
  const shuffledTeams = prng.shuffle(expanded);
  const counts = new Map<string, number>();
  const bag = new Map<string, Set<string>>();
  for (const p of participants) {
    counts.set(p.id, 0);
    bag.set(p.id, new Set());
  }
  for (const team of shuffledTeams) {
    const eligible = participants.filter((p) => !bag.get(p.id)!.has(team.id));
    let min = Infinity;
    for (const p of eligible) {
      const c = counts.get(p.id) ?? 0;
      if (c < min) min = c;
    }
    const candidates = eligible.filter((p) => (counts.get(p.id) ?? 0) === min);
    const chosen = candidates[prng.nextInt(candidates.length)];
    bag.get(chosen.id)!.add(team.id);
    counts.set(chosen.id, (counts.get(chosen.id) ?? 0) + 1);
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
  const counts = new Map<string, number>();
  const strengths = new Map<string, number>();
  const bag = new Map<string, Set<string>>();
  for (const p of participants) {
    counts.set(p.id, 0);
    strengths.set(p.id, 0);
    bag.set(p.id, new Set());
  }
  // Build the fixture pair index for clash-avoidance, if we have one.
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

  // Expand the deal list with duplicates so every participant ends up with
  // the same count. Duplicates are spread across tiers for strength balance.
  const expanded = buildDealList(teams, participants.length, prng);

  // Group the expanded list by tier so we deal one tier at a time. Duplicates
  // sit in the same tier as the original.
  const tiers = new Map<number, AllocationTeam[]>();
  for (const t of expanded) {
    if (!tiers.has(t.tier)) tiers.set(t.tier, []);
    tiers.get(t.tier)!.push(t);
  }
  const orderedTiers = [...tiers.keys()].sort((a, b) => a - b);

  // Running totals to drive strength balance.
  const targetStrengthPerPlayer = (() => {
    let totalStrength = 0;
    for (const t of expanded) totalStrength += teamStrength(t.tier);
    return totalStrength / participants.length;
  })();

  for (const tier of orderedTiers) {
    const shuffled = prng.shuffle(tiers.get(tier)!);
    const tierCounts = new Map<string, number>(participants.map((p) => [p.id, 0]));
    for (const team of shuffled) {
      // Step 0: a participant can't own the same team twice. Filter out anyone
      // who already has this team.
      const eligible = participants.filter((p) => !bag.get(p.id)!.has(team.id));
      if (eligible.length === 0) {
        // Pathological: should never happen given duplicates <= participants - 1.
        throw new Error("No eligible participant for team " + team.id);
      }
      // Step 1: tied on minimum overall count.
      let minOverall = Infinity;
      for (const p of eligible) {
        const c = counts.get(p.id) ?? 0;
        if (c < minOverall) minOverall = c;
      }
      const overallCandidates = eligible.filter((p) => (counts.get(p.id) ?? 0) === minOverall);
      // Step 2: tied on minimum tier count.
      let minTier = Infinity;
      for (const p of overallCandidates) {
        const c = tierCounts.get(p.id) ?? 0;
        if (c < minTier) minTier = c;
      }
      const tierCandidates = overallCandidates.filter((p) => (tierCounts.get(p.id) ?? 0) === minTier);
      // Step 3: tied on minimum self-clash count.
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
      // Step 4 (new): tied on max gap below target pool strength. Picks the
      // participant whose running strength is furthest below the ideal —
      // keeps everyone's combined ranking flat.
      let maxGap = -Infinity;
      const gaps = new Map<string, number>();
      for (const p of clashCandidates) {
        const gap = targetStrengthPerPlayer - (strengths.get(p.id) ?? 0);
        gaps.set(p.id, gap);
        if (gap > maxGap) maxGap = gap;
      }
      // Use a small epsilon when comparing floats so PRNG can still kick in.
      const finalCandidates = clashCandidates.filter((p) => (gaps.get(p.id) ?? 0) >= maxGap - 0.0001);
      const chosen = finalCandidates[prng.nextInt(finalCandidates.length)];
      bag.get(chosen.id)!.add(team.id);
      counts.set(chosen.id, (counts.get(chosen.id) ?? 0) + 1);
      tierCounts.set(chosen.id, (tierCounts.get(chosen.id) ?? 0) + 1);
      strengths.set(chosen.id, (strengths.get(chosen.id) ?? 0) + teamStrength(team.tier));
    }
  }
  return participants.map((p) => ({ participantId: p.id, teamIds: [...bag.get(p.id)!] }));
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
