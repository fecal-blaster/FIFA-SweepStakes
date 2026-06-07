import { prisma } from "@/lib/db";

export type SiteSettings = {
  id: number;
  siteName: string;
  homeEyebrow: string;
  homeTitle: string;
  homeDescription: string;
  homePills: string;
  infoEyebrow: string;
  infoTitle: string;
  infoDescription: string;
  footerText: string;
  logoDataUrl: string | null;
  backdropDataUrl: string | null;
  updatedAt: Date;
};

// Defaults match the schema. Used at build time when DATABASE_URL isn't
// available (Next prerender), and as the seed value when the row is created.
const DEFAULTS: SiteSettings = {
  id: 1,
  siteName: "FIFA Sweepstakes",
  homeEyebrow: "FIFA Sweepstakes",
  homeTitle: "Tournament management for FIFA sweepstakes.",
  homeDescription:
    "Verifiable team draws, live scoring from the official feed, an auto-updating leaderboard, and configurable prize splits.",
  homePills: "Verifiable draws,Live scoring,Configurable prize splits,Self-hosted",
  infoEyebrow: "How it works",
  infoTitle: "Team allocation, scoring, and verification.",
  infoDescription:
    "How teams are distributed across participants, how points are awarded, and how anyone can independently verify a draw.",
  footerText: "FIFA Sweepstakes · self-hosted tournament management.",
  logoDataUrl: null,
  backdropDataUrl: null,
  updatedAt: new Date()
};

// Loads (or auto-creates on first call) the singleton settings row. Server
// components call this to render branded text. If the DB isn't reachable
// (Next.js prerender during docker build with no DATABASE_URL), falls back
// to defaults so the build keeps moving — real values populate at runtime.
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const existing = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    return await prisma.siteSettings.create({ data: { id: 1 } });
  } catch {
    return DEFAULTS;
  }
}

export function parsePills(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 8);
}
