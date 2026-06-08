// Provider-agnostic interface for live football data.
// New providers (api-football, sportradar, ...) plug in by implementing this.

import type { MatchStage, MatchStatus } from "@prisma/client";

export type ProviderTeam = {
  externalId: string;
  name: string;
  shortName?: string;
  code?: string;
  crestUrl?: string;
  tier?: number; // 1 = strongest pot, when the provider exposes seeding
  rankingPoints?: number; // FIFA-world-ranking-style score
};

export type ProviderMatch = {
  externalId: string;
  stage: MatchStage;
  groupName?: string;
  kickoff: Date;
  status: MatchStatus;
  homeTeamExtId?: string;
  awayTeamExtId?: string;
  /** Always populated by the provider, even for knockouts pre-decided
   *  ("Winners Group A"). Used when the team isn't linked yet. */
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  /** "HOME" | "AWAY" — including the side that won after penalties. */
  winnerSide?: "HOME" | "AWAY";
};

export type ProviderSnapshot = {
  teams: ProviderTeam[];
  matches: ProviderMatch[];
};

export type ProviderMatchEvent = {
  /** RED_CARD | YELLOW_RED_CARD | YELLOW_CARD | GOAL | PENALTY | OWN_GOAL | SUBSTITUTION | ... */
  type: string;
  /** External team id this event belongs to. */
  teamExtId?: string;
  /** Minute in the match (1-90+). */
  minute?: number;
  player?: string;
};

export interface FootballProvider {
  name: string;
  fetchSnapshot(competitionCode: string): Promise<ProviderSnapshot>;
  /** Per-match events. Returns null if the provider doesn't support it
   *  (e.g. mock provider). */
  fetchMatchEvents?(externalMatchId: string): Promise<ProviderMatchEvent[] | null>;
}
