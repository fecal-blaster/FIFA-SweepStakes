import type { FootballProvider, ProviderSnapshot } from "./types";

// 32 teams roughly seeded by current FIFA strength, grouped into 4 tiers of 8.
// Used in dev when no API key is configured, and to seed local demos.
const TIERS: { tier: number; teams: { name: string; code: string }[] }[] = [
  { tier: 1, teams: [
    { name: "Argentina", code: "ARG" },
    { name: "France", code: "FRA" },
    { name: "Brazil", code: "BRA" },
    { name: "England", code: "ENG" },
    { name: "Spain", code: "ESP" },
    { name: "Portugal", code: "POR" },
    { name: "Netherlands", code: "NED" },
    { name: "Germany", code: "GER" }
  ]},
  { tier: 2, teams: [
    { name: "Italy", code: "ITA" },
    { name: "Croatia", code: "CRO" },
    { name: "Belgium", code: "BEL" },
    { name: "Uruguay", code: "URU" },
    { name: "Colombia", code: "COL" },
    { name: "Morocco", code: "MAR" },
    { name: "USA", code: "USA" },
    { name: "Mexico", code: "MEX" }
  ]},
  { tier: 3, teams: [
    { name: "Switzerland", code: "SUI" },
    { name: "Denmark", code: "DEN" },
    { name: "Senegal", code: "SEN" },
    { name: "Japan", code: "JPN" },
    { name: "Australia", code: "AUS" },
    { name: "Poland", code: "POL" },
    { name: "South Korea", code: "KOR" },
    { name: "Ecuador", code: "ECU" }
  ]},
  { tier: 4, teams: [
    { name: "Canada", code: "CAN" },
    { name: "Saudi Arabia", code: "KSA" },
    { name: "Tunisia", code: "TUN" },
    { name: "Iran", code: "IRN" },
    { name: "Ghana", code: "GHA" },
    { name: "Cameroon", code: "CMR" },
    { name: "Costa Rica", code: "CRC" },
    { name: "Serbia", code: "SRB" }
  ]}
];

export class MockProvider implements FootballProvider {
  name = "mock";
  async fetchSnapshot(_competitionCode: string): Promise<ProviderSnapshot> {
    const teams = TIERS.flatMap((t) =>
      t.teams.map((team, i) => ({
        externalId: `mock-${team.code}`,
        name: team.name,
        shortName: team.name,
        code: team.code,
        crestUrl: `https://flagcdn.com/w80/${team.code.toLowerCase().slice(0, 2)}.png`,
        tier: t.tier
      }))
    );
    return { teams, matches: [] };
  }
}
