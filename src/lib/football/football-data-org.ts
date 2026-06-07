import type { FootballProvider, ProviderMatch, ProviderSnapshot, ProviderTeam } from "./types";
import type { MatchStage, MatchStatus } from "@prisma/client";

const BASE = "https://api.football-data.org/v4";

// football-data.org stage names → our enum
function mapStage(stage: string): MatchStage {
  switch (stage) {
    case "GROUP_STAGE":
    case "LEAGUE_STAGE":
      return "GROUP";
    case "LAST_16":
    case "ROUND_OF_16":
      return "ROUND_OF_16";
    case "QUARTER_FINALS":
      return "QUARTER_FINAL";
    case "SEMI_FINALS":
      return "SEMI_FINAL";
    case "FINAL":
      return "FINAL";
    case "THIRD_PLACE":
    case "THIRD_PLACE_FINAL":
      return "THIRD_PLACE";
    default:
      return "GROUP";
  }
}

function mapStatus(s: string): MatchStatus {
  switch (s) {
    case "SCHEDULED":
    case "TIMED":
      return "SCHEDULED";
    case "IN_PLAY":
    case "LIVE":
      return "IN_PLAY";
    case "PAUSED":
      return "PAUSED";
    case "FINISHED":
    case "AWARDED":
      return "FINISHED";
    case "POSTPONED":
    case "SUSPENDED":
      return "POSTPONED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "SCHEDULED";
  }
}

type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group?: string | null;
  homeTeam: { id?: number; name?: string };
  awayTeam: { id?: number; name?: string };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null } | null;
  };
};

type FdTeam = {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

export class FootballDataOrgProvider implements FootballProvider {
  name = "football-data-org";
  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "X-Auth-Token": this.apiKey },
      // Always grab fresh data — sync job already cadences requests.
      cache: "no-store"
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`football-data.org ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  async fetchSnapshot(competitionCode: string): Promise<ProviderSnapshot> {
    const [teamsRes, matchesRes] = await Promise.all([
      this.get<{ teams: FdTeam[] }>(`/competitions/${competitionCode}/teams`),
      this.get<{ matches: FdMatch[] }>(`/competitions/${competitionCode}/matches`)
    ]);

    const teams: ProviderTeam[] = teamsRes.teams.map((t) => ({
      externalId: String(t.id),
      name: t.name,
      shortName: t.shortName,
      code: t.tla,
      crestUrl: t.crest,
      tier: 1
    }));

    const matches: ProviderMatch[] = matchesRes.matches.map((m) => {
      const home = m.score.fullTime.home;
      const away = m.score.fullTime.away;
      let winnerSide: "HOME" | "AWAY" | undefined;
      if (m.score.winner === "HOME_TEAM") winnerSide = "HOME";
      else if (m.score.winner === "AWAY_TEAM") winnerSide = "AWAY";
      else if (m.score.penalties) {
        const ph = m.score.penalties.home ?? 0;
        const pa = m.score.penalties.away ?? 0;
        if (ph > pa) winnerSide = "HOME";
        else if (pa > ph) winnerSide = "AWAY";
      }
      return {
        externalId: String(m.id),
        stage: mapStage(m.stage),
        groupName: m.group ?? undefined,
        kickoff: new Date(m.utcDate),
        status: mapStatus(m.status),
        homeTeamExtId: m.homeTeam.id != null ? String(m.homeTeam.id) : undefined,
        awayTeamExtId: m.awayTeam.id != null ? String(m.awayTeam.id) : undefined,
        homeTeamName: m.homeTeam.name ?? undefined,
        awayTeamName: m.awayTeam.name ?? undefined,
        homeScore: home ?? undefined,
        awayScore: away ?? undefined,
        winnerSide
      };
    });

    return { teams, matches };
  }
}
