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
};

export type ProviderMatch = {
  externalId: string;
  stage: MatchStage;
  groupName?: string;
  kickoff: Date;
  status: MatchStatus;
  homeTeamExtId?: string;
  awayTeamExtId?: string;
  homeScore?: number;
  awayScore?: number;
  /** "HOME" | "AWAY" — including the side that won after penalties. */
  winnerSide?: "HOME" | "AWAY";
};

export type ProviderSnapshot = {
  teams: ProviderTeam[];
  matches: ProviderMatch[];
};

export interface FootballProvider {
  name: string;
  fetchSnapshot(competitionCode: string): Promise<ProviderSnapshot>;
}
