import type { MatchStage } from "@prisma/client";

export type ScoringRules = {
  win: number;
  draw: number;
  loss: number;
  qualifyR32: number;
  qualifyR16: number;
  qualifyQF: number;
  qualifySF: number;
  qualifyFinal: number;
  champion: number;
};

export const DEFAULT_SCORING: ScoringRules = {
  win: 3,
  draw: 1,
  loss: 0,
  qualifyR32: 3,
  qualifyR16: 5,
  qualifyQF: 10,
  qualifySF: 15,
  qualifyFinal: 20,
  champion: 30
};

export function pointsForResult(
  rules: ScoringRules,
  side: "HOME" | "AWAY" | "DRAW" | "LOSS"
): number {
  if (side === "DRAW") return rules.draw;
  if (side === "LOSS") return rules.loss;
  return rules.win;
}

// Returns the qualification award a team receives by *advancing into* a stage.
export function qualifyPoints(rules: ScoringRules, intoStage: MatchStage): number {
  switch (intoStage) {
    case "ROUND_OF_32":
      return rules.qualifyR32;
    case "ROUND_OF_16":
      return rules.qualifyR16;
    case "QUARTER_FINAL":
      return rules.qualifyQF;
    case "SEMI_FINAL":
      return rules.qualifySF;
    case "FINAL":
      return rules.qualifyFinal;
    default:
      return 0;
  }
}

export const QUALIFY_KIND: Record<MatchStage, string | null> = {
  GROUP: null,
  ROUND_OF_32: "QUALIFY_R32",
  ROUND_OF_16: "QUALIFY_R16",
  QUARTER_FINAL: "QUALIFY_QF",
  SEMI_FINAL: "QUALIFY_SF",
  FINAL: "QUALIFY_FINAL",
  THIRD_PLACE: null
};
