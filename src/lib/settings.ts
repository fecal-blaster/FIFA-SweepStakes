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

// Loads (or auto-creates on first call) the singleton settings row. Server
// components call this to render branded text. Defaults from the schema kick
// in for any field the admin hasn't overridden.
export async function getSiteSettings(): Promise<SiteSettings> {
  const existing = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return await prisma.siteSettings.create({ data: { id: 1 } });
}

export function parsePills(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 8);
}
