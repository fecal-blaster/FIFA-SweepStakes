import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { getSiteSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

const Schema = z.object({
  kind: z.enum(["logo", "backdrop"]),
  // null clears the field; a data URL replaces it.
  dataUrl: z
    .string()
    .max(800_000, "Image too large — keep under ~600KB once base64-encoded")
    .nullable()
});

const ALLOWED_PREFIX = /^data:image\/(png|jpeg|jpg|webp|svg\+xml|gif);base64,/i;

export async function POST(req: Request) {
  try {
    const me = await requireAdmin();
    const input = await parseJson(req, Schema);
    if (input.dataUrl && !ALLOWED_PREFIX.test(input.dataUrl)) {
      throw new ApiError(
        400,
        "Expected a data:image/* base64 URL — convert your file with the upload widget"
      );
    }
    await getSiteSettings();
    const data =
      input.kind === "logo" ? { logoDataUrl: input.dataUrl } : { backdropDataUrl: input.dataUrl };
    const updated = await prisma.siteSettings.update({ where: { id: 1 }, data });
    await audit({
      action: "SITE_SETTINGS_IMAGE",
      adminUserId: me.id,
      detail: {
        kind: input.kind,
        cleared: input.dataUrl === null,
        bytes: input.dataUrl ? input.dataUrl.length : 0
      }
    });
    return ok({
      logoDataUrl: updated.logoDataUrl,
      backdropDataUrl: updated.backdropDataUrl
    });
  } catch (e) {
    return handleError(e);
  }
}
