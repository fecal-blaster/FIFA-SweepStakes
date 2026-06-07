import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { getSiteSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  siteName: z.string().min(1).max(60).optional(),
  homeEyebrow: z.string().max(80).optional(),
  homeTitle: z.string().max(200).optional(),
  homeDescription: z.string().max(800).optional(),
  homePills: z.string().max(400).optional(),
  infoEyebrow: z.string().max(80).optional(),
  infoTitle: z.string().max(200).optional(),
  infoDescription: z.string().max(800).optional(),
  footerText: z.string().max(400).optional()
});

export async function GET() {
  try {
    await requireAdmin();
    const s = await getSiteSettings();
    return ok(s);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const me = await requireAdmin();
    const input = await parseJson(req, PatchSchema);
    await getSiteSettings(); // ensure row exists
    const updated = await prisma.siteSettings.update({
      where: { id: 1 },
      data: input
    });
    await audit({ action: "SITE_SETTINGS_UPDATE", adminUserId: me.id, detail: input });
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
