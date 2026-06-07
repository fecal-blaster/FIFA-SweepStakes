import type { FootballProvider, ProviderSnapshot, ProviderTeam } from "./types";

// 32 teams roughly matching current (early-2026) FIFA world ranking points.
// Used in dev when no API key is configured. Tier is derived from quartile.
const TEAMS: { name: string; code: string; rankingPoints: number }[] = [
  { name: "Argentina", code: "ARG", rankingPoints: 1886 },
  { name: "France", code: "FRA", rankingPoints: 1854 },
  { name: "Spain", code: "ESP", rankingPoints: 1854 },
  { name: "England", code: "ENG", rankingPoints: 1819 },
  { name: "Brazil", code: "BRA", rankingPoints: 1776 },
  { name: "Netherlands", code: "NED", rankingPoints: 1758 },
  { name: "Portugal", code: "POR", rankingPoints: 1755 },
  { name: "Belgium", code: "BEL", rankingPoints: 1739 },
  { name: "Italy", code: "ITA", rankingPoints: 1726 },
  { name: "Germany", code: "GER", rankingPoints: 1719 },
  { name: "Croatia", code: "CRO", rankingPoints: 1712 },
  { name: "Morocco", code: "MAR", rankingPoints: 1694 },
  { name: "Colombia", code: "COL", rankingPoints: 1679 },
  { name: "Uruguay", code: "URU", rankingPoints: 1679 },
  { name: "Japan", code: "JPN", rankingPoints: 1652 },
  { name: "USA", code: "USA", rankingPoints: 1648 },
  { name: "Mexico", code: "MEX", rankingPoints: 1646 },
  { name: "Switzerland", code: "SUI", rankingPoints: 1643 },
  { name: "Senegal", code: "SEN", rankingPoints: 1635 },
  { name: "Iran", code: "IRN", rankingPoints: 1631 },
  { name: "Denmark", code: "DEN", rankingPoints: 1630 },
  { name: "Korea Republic", code: "KOR", rankingPoints: 1568 },
  { name: "Ecuador", code: "ECU", rankingPoints: 1567 },
  { name: "Serbia", code: "SRB", rankingPoints: 1545 },
  { name: "Canada", code: "CAN", rankingPoints: 1538 },
  { name: "Poland", code: "POL", rankingPoints: 1538 },
  { name: "Ghana", code: "GHA", rankingPoints: 1493 },
  { name: "Costa Rica", code: "CRC", rankingPoints: 1483 },
  { name: "Australia", code: "AUS", rankingPoints: 1480 },
  { name: "Tunisia", code: "TUN", rankingPoints: 1473 },
  { name: "Cameroon", code: "CMR", rankingPoints: 1466 },
  { name: "Saudi Arabia", code: "KSA", rankingPoints: 1438 }
];

// Assign tier 1-4 by rank quartile (8 teams per tier for 32 teams).
function tierForIndex(idx: number, total: number): number {
  const tier = Math.floor((idx / total) * 4) + 1;
  return Math.min(4, Math.max(1, tier));
}

export class MockProvider implements FootballProvider {
  name = "mock";
  async fetchSnapshot(_competitionCode: string): Promise<ProviderSnapshot> {
    // Already sorted by rankingPoints desc.
    const teams: ProviderTeam[] = TEAMS.map((t, i) => ({
      externalId: `mock-${t.code}`,
      name: t.name,
      shortName: t.name,
      code: t.code,
      crestUrl: `https://flagcdn.com/w80/${t.code.toLowerCase().slice(0, 2)}.png`,
      tier: tierForIndex(i, TEAMS.length),
      rankingPoints: t.rankingPoints
    }));
    return { teams, matches: [] };
  }
}
