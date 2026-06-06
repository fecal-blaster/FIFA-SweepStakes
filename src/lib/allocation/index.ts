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

export type AllocationInput = {
  mode: DrawMode;
  /** Hex entropy. Anyone with this + the inputs can reproduce the draw. */
  seedSecret: string;
  participants: AllocationParticipant[];
  teams: AllocationTeam[];
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
  leftover: number;
  participantsWithExtra: number;
};

export function planDistribution(numTeams: number, numParticipants: number): DistributionPlan {
  if (numParticipants <= 0) throw new Error("Need at least one participant");
  if (numTeams <= 0) throw new Error("Need at least one team");
  const teamsPerParticipant = Math.floor(numTeams / numParticipants);
  const leftover = numTeams - teamsPerParticipant * numParticipants;
  return { teamsPerParticipant, leftover, participantsWithExtra: leftover };
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

export function computeInputDigest(input: Pick<AllocationInput, "mode" | "participants" | "teams">): string {
  const snapshot = {
    mode: input.mode,
    participants: canonicalParticipants(input.participants).map((p) => ({ id: p.id, name: p.name })),
    teams: canonicalTeams(input.teams).map((t) => ({ id: t.id, name: t.name, tier: t.tier }))
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

function allocatePureRandom(input: AllocationInput, prng: SeededPrng): Assignment[] {
  const teams = canonicalTeams(input.teams);
  const participants = canonicalParticipants(input.participants);
  const shuffledTeams = prng.shuffle(teams);
  const counts = new Map<string, number>();
  const bag = new Map<string, string[]>();
  for (const p of participants) {
    counts.set(p.id, 0);
    bag.set(p.id, []);
  }
  for (const team of shuffledTeams) {
    const chosen = pickNextParticipant(participants, counts, prng);
    bag.get(chosen.id)!.push(team.id);
    counts.set(chosen.id, (counts.get(chosen.id) ?? 0) + 1);
  }
  return participants.map((p) => ({ participantId: p.id, teamIds: bag.get(p.id)! }));
}

function allocateBalanced(input: AllocationInput, prng: SeededPrng): Assignment[] {
  const teams = canonicalTeams(input.teams);
  const participants = canonicalParticipants(input.participants);
  const counts = new Map<string, number>();
  const bag = new Map<string, string[]>();
  for (const p of participants) {
    counts.set(p.id, 0);
    bag.set(p.id, []);
  }
  // Group teams by tier in ascending order (1 = strongest first).
  const tiers = new Map<number, AllocationTeam[]>();
  for (const t of teams) {
    if (!tiers.has(t.tier)) tiers.set(t.tier, []);
    tiers.get(t.tier)!.push(t);
  }
  const orderedTiers = [...tiers.keys()].sort((a, b) => a - b);
  for (const tier of orderedTiers) {
    const shuffled = prng.shuffle(tiers.get(tier)!);
    // Per-tier counts ensure within-tier fairness too — no one gets two from
    // the top tier while another gets none until forced to.
    const tierCounts = new Map<string, number>(participants.map((p) => [p.id, 0]));
    for (const team of shuffled) {
      // Among participants tied on overall count AND tier count, pick randomly.
      let minOverall = Infinity;
      for (const p of participants) {
        const c = counts.get(p.id) ?? 0;
        if (c < minOverall) minOverall = c;
      }
      const overallCandidates = participants.filter((p) => (counts.get(p.id) ?? 0) === minOverall);
      let minTier = Infinity;
      for (const p of overallCandidates) {
        const c = tierCounts.get(p.id) ?? 0;
        if (c < minTier) minTier = c;
      }
      const finalCandidates = overallCandidates.filter((p) => (tierCounts.get(p.id) ?? 0) === minTier);
      const chosen = finalCandidates[prng.nextInt(finalCandidates.length)];
      bag.get(chosen.id)!.push(team.id);
      counts.set(chosen.id, (counts.get(chosen.id) ?? 0) + 1);
      tierCounts.set(chosen.id, (tierCounts.get(chosen.id) ?? 0) + 1);
    }
  }
  return participants.map((p) => ({ participantId: p.id, teamIds: bag.get(p.id)! }));
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
