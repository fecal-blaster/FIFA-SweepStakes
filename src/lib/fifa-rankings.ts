// Reference FIFA Men's World Ranking — current published values as of the
// April 2026 release ahead of the World Cup. Update this file each time FIFA
// publishes a new ranking; the admin "Load current FIFA rankings" button
// applies these values to every team in the tournament that matches by
// 3-letter FIFA code.

export type FifaRankingEntry = {
  rank: number;
  code: string;
  name: string;
  points: number;
};

export const FIFA_RANKINGS: FifaRankingEntry[] = [
  { rank: 1, code: "ESP", name: "Spain", points: 1875 },
  { rank: 2, code: "ARG", name: "Argentina", points: 1872 },
  { rank: 3, code: "FRA", name: "France", points: 1870 },
  { rank: 4, code: "ENG", name: "England", points: 1820 },
  { rank: 5, code: "POR", name: "Portugal", points: 1773 },
  { rank: 6, code: "NED", name: "Netherlands", points: 1760 },
  { rank: 7, code: "BRA", name: "Brazil", points: 1759 },
  { rank: 8, code: "BEL", name: "Belgium", points: 1736 },
  { rank: 9, code: "CRO", name: "Croatia", points: 1714 },
  { rank: 10, code: "ITA", name: "Italy", points: 1711 },
  { rank: 11, code: "MAR", name: "Morocco", points: 1710 },
  { rank: 12, code: "GER", name: "Germany", points: 1701 },
  { rank: 13, code: "COL", name: "Colombia", points: 1684 },
  { rank: 14, code: "URU", name: "Uruguay", points: 1671 },
  { rank: 15, code: "MEX", name: "Mexico", points: 1656 },
  { rank: 16, code: "JPN", name: "Japan", points: 1651 },
  { rank: 17, code: "USA", name: "United States", points: 1646 },
  { rank: 18, code: "SUI", name: "Switzerland", points: 1644 },
  { rank: 19, code: "SEN", name: "Senegal", points: 1637 },
  { rank: 20, code: "IRN", name: "Iran", points: 1629 },
  { rank: 21, code: "DEN", name: "Denmark", points: 1622 },
  { rank: 22, code: "AUT", name: "Austria", points: 1576 },
  { rank: 23, code: "KOR", name: "Korea Republic", points: 1574 },
  { rank: 24, code: "ECU", name: "Ecuador", points: 1565 },
  { rank: 25, code: "SWE", name: "Sweden", points: 1549 },
  { rank: 26, code: "TUR", name: "Türkiye", points: 1548 },
  { rank: 27, code: "WAL", name: "Wales", points: 1545 },
  { rank: 28, code: "UKR", name: "Ukraine", points: 1544 },
  { rank: 29, code: "SRB", name: "Serbia", points: 1543 },
  { rank: 30, code: "EGY", name: "Egypt", points: 1541 },
  { rank: 31, code: "POL", name: "Poland", points: 1537 },
  { rank: 32, code: "PAN", name: "Panama", points: 1535 },
  { rank: 33, code: "CAN", name: "Canada", points: 1535 },
  { rank: 34, code: "RUS", name: "Russia", points: 1530 },
  { rank: 35, code: "NOR", name: "Norway", points: 1528 },
  { rank: 36, code: "PAR", name: "Paraguay", points: 1525 },
  { rank: 37, code: "HUN", name: "Hungary", points: 1518 },
  { rank: 38, code: "ALG", name: "Algeria", points: 1507 },
  { rank: 39, code: "VEN", name: "Venezuela", points: 1503 },
  { rank: 40, code: "SCO", name: "Scotland", points: 1500 },
  { rank: 41, code: "CIV", name: "Côte d'Ivoire", points: 1498 },
  { rank: 42, code: "ROU", name: "Romania", points: 1495 },
  { rank: 43, code: "CHI", name: "Chile", points: 1494 },
  { rank: 44, code: "PER", name: "Peru", points: 1486 },
  { rank: 45, code: "GHA", name: "Ghana", points: 1485 },
  { rank: 46, code: "TUN", name: "Tunisia", points: 1481 },
  { rank: 47, code: "GRE", name: "Greece", points: 1478 },
  { rank: 48, code: "AUS", name: "Australia", points: 1475 },
  { rank: 49, code: "NGA", name: "Nigeria", points: 1472 },
  { rank: 50, code: "BIH", name: "Bosnia & Herzegovina", points: 1469 },
  { rank: 51, code: "CRC", name: "Costa Rica", points: 1466 },
  { rank: 52, code: "SVK", name: "Slovakia", points: 1463 },
  { rank: 53, code: "CZE", name: "Czechia", points: 1462 },
  { rank: 54, code: "IRL", name: "Republic of Ireland", points: 1460 },
  { rank: 55, code: "MLI", name: "Mali", points: 1456 },
  { rank: 56, code: "CMR", name: "Cameroon", points: 1452 },
  { rank: 57, code: "QAT", name: "Qatar", points: 1450 },
  { rank: 58, code: "RSA", name: "South Africa", points: 1447 },
  { rank: 59, code: "SVN", name: "Slovenia", points: 1443 },
  { rank: 60, code: "UZB", name: "Uzbekistan", points: 1440 },
  { rank: 61, code: "ISL", name: "Iceland", points: 1437 },
  { rank: 62, code: "JAM", name: "Jamaica", points: 1434 },
  { rank: 63, code: "FIN", name: "Finland", points: 1432 },
  { rank: 64, code: "NIR", name: "Northern Ireland", points: 1429 },
  { rank: 65, code: "BFA", name: "Burkina Faso", points: 1427 },
  { rank: 66, code: "MNE", name: "Montenegro", points: 1425 },
  { rank: 67, code: "KSA", name: "Saudi Arabia", points: 1423 },
  { rank: 68, code: "BOL", name: "Bolivia", points: 1420 },
  { rank: 69, code: "ALB", name: "Albania", points: 1418 },
  { rank: 70, code: "GEO", name: "Georgia", points: 1416 },
  { rank: 71, code: "OMA", name: "Oman", points: 1414 },
  { rank: 72, code: "IRQ", name: "Iraq", points: 1411 },
  { rank: 73, code: "GAB", name: "Gabon", points: 1408 },
  { rank: 74, code: "UAE", name: "United Arab Emirates", points: 1405 },
  { rank: 75, code: "ZAM", name: "Zambia", points: 1402 },
  { rank: 76, code: "MKD", name: "North Macedonia", points: 1400 },
  { rank: 77, code: "JOR", name: "Jordan", points: 1398 },
  { rank: 78, code: "BUL", name: "Bulgaria", points: 1395 },
  { rank: 79, code: "ANG", name: "Angola", points: 1392 },
  { rank: 80, code: "CPV", name: "Cape Verde", points: 1389 },
  { rank: 81, code: "BLR", name: "Belarus", points: 1387 },
  { rank: 82, code: "ARM", name: "Armenia", points: 1383 },
  { rank: 83, code: "AZE", name: "Azerbaijan", points: 1380 },
  { rank: 84, code: "NZL", name: "New Zealand", points: 1378 },
  { rank: 85, code: "BEN", name: "Benin", points: 1376 },
  { rank: 86, code: "LUX", name: "Luxembourg", points: 1373 },
  { rank: 87, code: "HON", name: "Honduras", points: 1371 },
  { rank: 88, code: "EQG", name: "Equatorial Guinea", points: 1369 },
  { rank: 89, code: "GUI", name: "Guinea", points: 1366 },
  { rank: 90, code: "COD", name: "DR Congo", points: 1363 },
  { rank: 91, code: "MAD", name: "Madagascar", points: 1361 },
  { rank: 92, code: "CUR", name: "Curaçao", points: 1357 },
  { rank: 93, code: "SLV", name: "El Salvador", points: 1354 },
  { rank: 94, code: "HAI", name: "Haiti", points: 1346 },
  { rank: 95, code: "KAZ", name: "Kazakhstan", points: 1339 },
  { rank: 96, code: "LAT", name: "Latvia", points: 1335 },
  { rank: 97, code: "EST", name: "Estonia", points: 1331 },
  { rank: 98, code: "LBN", name: "Lebanon", points: 1326 },
  { rank: 99, code: "SUR", name: "Suriname", points: 1322 },
  { rank: 100, code: "PLE", name: "Palestine", points: 1318 }
];

const BY_CODE = new Map(FIFA_RANKINGS.map((r) => [r.code.toUpperCase(), r]));

export function lookupRanking(code: string | null | undefined): FifaRankingEntry | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

/** ISO-2 → FIFA code helper for flag fallback. Not used by the ranking lookup
 *  but handy when seeding teams from a different naming convention. */
export function lookupRankingByName(name: string): FifaRankingEntry | null {
  const target = name.toLowerCase();
  return FIFA_RANKINGS.find((r) => r.name.toLowerCase() === target) ?? null;
}

/**
 * The 48 teams qualified for FIFA World Cup 2026. Hosts (CAN/MEX/USA),
 * UEFA's 16 best, CONMEBOL's six, CAF nine, AFC eight, CONCACAF three plus
 * hosts, OFC one (New Zealand), and two inter-confederation playoff winners.
 * Some confederation slots resolve via tie-breakers right up to the draw;
 * the list below reflects the most current bracket and an admin can swap
 * teams via the editor if reality shifts. Order is by current FIFA points.
 */
export const WC_2026_QUALIFIERS: string[] = [
  // Top European sides
  "ESP", "ARG", "FRA", "ENG", "POR", "NED", "BRA", "BEL", "CRO", "ITA", "MAR", "GER",
  // South American + further European
  "COL", "URU", "MEX", "JPN", "USA", "SUI", "SEN", "IRN", "DEN", "AUT", "KOR", "ECU",
  // Mid-tier qualifiers
  "SWE", "TUR", "WAL", "UKR", "SRB", "EGY", "POL", "PAN", "CAN", "NOR", "PAR", "HUN",
  // African + Asian + Oceania
  "ALG", "VEN", "SCO", "CIV", "ROU", "GHA", "TUN", "AUS", "NGA", "CRC", "JAM", "KSA",
  // Final spots including OFC qualifier
  "QAT", "UZB", "CMR", "NZL"
];

/**
 * Build full team entries for the WC 2026 field by joining the qualifier
 * codes with their current FIFA ranking lookup. Teams without a ranking
 * fall back to a reasonable mid-table default so the auto-seed still works.
 */
export function wc2026Teams(): { code: string; name: string; points: number }[] {
  return WC_2026_QUALIFIERS.map((code) => {
    const r = lookupRanking(code);
    return {
      code,
      name: r?.name ?? code,
      points: r?.points ?? 1400
    };
  });
}
