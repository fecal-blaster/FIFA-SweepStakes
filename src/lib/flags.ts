// Map FIFA 3-letter codes → ISO 3166-1 alpha-2 codes for flag emoji/CDN.
// Covers every team in the mock provider plus most current FIFA federations.
const FIFA_TO_ISO2: Record<string, string> = {
  ARG: "AR", FRA: "FR", BRA: "BR", ENG: "GB-ENG", ESP: "ES", POR: "PT",
  NED: "NL", GER: "DE", ITA: "IT", CRO: "HR", BEL: "BE", URU: "UY",
  COL: "CO", MAR: "MA", USA: "US", MEX: "MX", SUI: "CH", DEN: "DK",
  SEN: "SN", JPN: "JP", AUS: "AU", POL: "PL", KOR: "KR", ECU: "EC",
  CAN: "CA", KSA: "SA", TUN: "TN", IRN: "IR", GHA: "GH", CMR: "CM",
  CRC: "CR", SRB: "RS", WAL: "GB-WLS", SCO: "GB-SCT", NIR: "GB-NIR",
  IRL: "IE", AUT: "AT", SWE: "SE", NOR: "NO", FIN: "FI", ISL: "IS",
  TUR: "TR", UKR: "UA", ROU: "RO", BUL: "BG", GRE: "GR", HUN: "HU",
  CZE: "CZ", SVK: "SK", SVN: "SI", ALB: "AL", BIH: "BA", MKD: "MK",
  RUS: "RU", BLR: "BY", EGY: "EG", ALG: "DZ", NGA: "NG", CIV: "CI",
  RSA: "ZA", ANG: "AO", MLI: "ML", BFA: "BF", CHN: "CN", THA: "TH",
  VIE: "VN", UAE: "AE", QAT: "QA", IRQ: "IQ", JOR: "JO", LBN: "LB",
  SYR: "SY", PAR: "PY", CHI: "CL", PER: "PE", VEN: "VE", BOL: "BO",
  HON: "HN", PAN: "PA", JAM: "JM", HAI: "HT"
};

// Special British home nations use regional indicators that don't render as
// flags on most platforms — fall back to GB.
const ISO_FALLBACK: Record<string, string> = {
  "GB-ENG": "GB",
  "GB-WLS": "GB",
  "GB-SCT": "GB",
  "GB-NIR": "GB"
};

export function flagEmoji(fifaCode: string | null | undefined): string {
  if (!fifaCode) return "🏳";
  const iso2 = FIFA_TO_ISO2[fifaCode.toUpperCase()];
  if (!iso2) return "🏳";
  const cc = ISO_FALLBACK[iso2] ?? iso2;
  if (cc.length !== 2) return "🏳";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + (cc.charCodeAt(0) - 65),
    base + (cc.charCodeAt(1) - 65)
  );
}

export function flagCdnUrl(fifaCode: string | null | undefined, size: 40 | 80 | 160 = 80): string | null {
  if (!fifaCode) return null;
  const iso2 = FIFA_TO_ISO2[fifaCode.toUpperCase()];
  if (!iso2) return null;
  const cc = (ISO_FALLBACK[iso2] ?? iso2).toLowerCase();
  return `https://flagcdn.com/w${size}/${cc}.png`;
}
