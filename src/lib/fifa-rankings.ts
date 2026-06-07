// Reference FIFA Men's World Ranking — approximate values as of the most recent
// publication cycle. Used by the admin tier editor: the "Load FIFA Rankings"
// button matches teams by 3-letter code (FIFA TLA) and fills in rankingPoints,
// and the editor surfaces each team's current world position so admins can
// see at a glance whether the per-tournament rankings line up with reality.
//
// Update this list each time FIFA publishes a new ranking. Match by `code` (TLA)
// which is the same field stored on Team.

export type FifaRankingEntry = {
  rank: number;
  code: string; // FIFA 3-letter code (e.g. ENG, ARG)
  name: string;
  points: number;
};

export const FIFA_RANKINGS: FifaRankingEntry[] = [
  { rank: 1, code: "ARG", name: "Argentina", points: 1886 },
  { rank: 2, code: "ESP", name: "Spain", points: 1854 },
  { rank: 3, code: "FRA", name: "France", points: 1854 },
  { rank: 4, code: "ENG", name: "England", points: 1819 },
  { rank: 5, code: "BRA", name: "Brazil", points: 1776 },
  { rank: 6, code: "NED", name: "Netherlands", points: 1758 },
  { rank: 7, code: "POR", name: "Portugal", points: 1755 },
  { rank: 8, code: "BEL", name: "Belgium", points: 1739 },
  { rank: 9, code: "ITA", name: "Italy", points: 1726 },
  { rank: 10, code: "GER", name: "Germany", points: 1719 },
  { rank: 11, code: "CRO", name: "Croatia", points: 1712 },
  { rank: 12, code: "MAR", name: "Morocco", points: 1694 },
  { rank: 13, code: "COL", name: "Colombia", points: 1679 },
  { rank: 14, code: "URU", name: "Uruguay", points: 1679 },
  { rank: 15, code: "JPN", name: "Japan", points: 1652 },
  { rank: 16, code: "USA", name: "United States", points: 1648 },
  { rank: 17, code: "MEX", name: "Mexico", points: 1646 },
  { rank: 18, code: "SUI", name: "Switzerland", points: 1643 },
  { rank: 19, code: "SEN", name: "Senegal", points: 1635 },
  { rank: 20, code: "IRN", name: "Iran", points: 1631 },
  { rank: 21, code: "DEN", name: "Denmark", points: 1630 },
  { rank: 22, code: "AUT", name: "Austria", points: 1581 },
  { rank: 23, code: "KOR", name: "Korea Republic", points: 1568 },
  { rank: 24, code: "ECU", name: "Ecuador", points: 1567 },
  { rank: 25, code: "SWE", name: "Sweden", points: 1556 },
  { rank: 26, code: "UKR", name: "Ukraine", points: 1553 },
  { rank: 27, code: "WAL", name: "Wales", points: 1549 },
  { rank: 28, code: "TUR", name: "Türkiye", points: 1548 },
  { rank: 29, code: "SRB", name: "Serbia", points: 1545 },
  { rank: 30, code: "EGY", name: "Egypt", points: 1541 },
  { rank: 31, code: "CAN", name: "Canada", points: 1538 },
  { rank: 32, code: "POL", name: "Poland", points: 1538 },
  { rank: 33, code: "NOR", name: "Norway", points: 1530 },
  { rank: 34, code: "PAR", name: "Paraguay", points: 1527 },
  { rank: 35, code: "RUS", name: "Russia", points: 1521 },
  { rank: 36, code: "HUN", name: "Hungary", points: 1518 },
  { rank: 37, code: "PAN", name: "Panama", points: 1513 },
  { rank: 38, code: "VEN", name: "Venezuela", points: 1505 },
  { rank: 39, code: "ALG", name: "Algeria", points: 1503 },
  { rank: 40, code: "SCO", name: "Scotland", points: 1502 },
  { rank: 41, code: "ROU", name: "Romania", points: 1499 },
  { rank: 42, code: "GHA", name: "Ghana", points: 1493 },
  { rank: 43, code: "CZE", name: "Czechia", points: 1492 },
  { rank: 44, code: "SVK", name: "Slovakia", points: 1491 },
  { rank: 45, code: "PER", name: "Peru", points: 1488 },
  { rank: 46, code: "GRE", name: "Greece", points: 1487 },
  { rank: 47, code: "CHI", name: "Chile", points: 1485 },
  { rank: 48, code: "IRL", name: "Republic of Ireland", points: 1484 },
  { rank: 49, code: "CRC", name: "Costa Rica", points: 1483 },
  { rank: 50, code: "AUS", name: "Australia", points: 1480 },
  { rank: 51, code: "CIV", name: "Côte d'Ivoire", points: 1479 },
  { rank: 52, code: "BIH", name: "Bosnia & Herzegovina", points: 1477 },
  { rank: 53, code: "TUN", name: "Tunisia", points: 1473 },
  { rank: 54, code: "NGA", name: "Nigeria", points: 1471 },
  { rank: 55, code: "CMR", name: "Cameroon", points: 1466 },
  { rank: 56, code: "QAT", name: "Qatar", points: 1465 },
  { rank: 57, code: "SVN", name: "Slovenia", points: 1462 },
  { rank: 58, code: "MLI", name: "Mali", points: 1460 },
  { rank: 59, code: "RSA", name: "South Africa", points: 1457 },
  { rank: 60, code: "ISL", name: "Iceland", points: 1454 },
  { rank: 61, code: "UZB", name: "Uzbekistan", points: 1452 },
  { rank: 62, code: "JAM", name: "Jamaica", points: 1450 },
  { rank: 63, code: "NIR", name: "Northern Ireland", points: 1449 },
  { rank: 64, code: "FIN", name: "Finland", points: 1446 },
  { rank: 65, code: "MNE", name: "Montenegro", points: 1444 },
  { rank: 66, code: "BFA", name: "Burkina Faso", points: 1441 },
  { rank: 67, code: "KSA", name: "Saudi Arabia", points: 1438 },
  { rank: 68, code: "ALB", name: "Albania", points: 1434 },
  { rank: 69, code: "BOL", name: "Bolivia", points: 1431 },
  { rank: 70, code: "OMA", name: "Oman", points: 1428 },
  { rank: 71, code: "GEO", name: "Georgia", points: 1424 },
  { rank: 72, code: "IRQ", name: "Iraq", points: 1421 },
  { rank: 73, code: "GAB", name: "Gabon", points: 1418 },
  { rank: 74, code: "ZAM", name: "Zambia", points: 1415 },
  { rank: 75, code: "UAE", name: "United Arab Emirates", points: 1412 },
  { rank: 76, code: "MKD", name: "North Macedonia", points: 1410 },
  { rank: 77, code: "JOR", name: "Jordan", points: 1407 },
  { rank: 78, code: "BUL", name: "Bulgaria", points: 1405 },
  { rank: 79, code: "BLR", name: "Belarus", points: 1402 },
  { rank: 80, code: "ANG", name: "Angola", points: 1399 },
  { rank: 81, code: "CPV", name: "Cape Verde", points: 1396 }
];

// Index by code so lookups are O(1).
const BY_CODE = new Map(FIFA_RANKINGS.map((r) => [r.code.toUpperCase(), r]));

export function lookupRanking(code: string | null | undefined): FifaRankingEntry | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase()) ?? null;
}
