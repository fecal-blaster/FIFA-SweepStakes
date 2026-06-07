import { prisma } from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await requireAdmin();
    if (params.id === me.id) {
      throw new ApiError(400, "You can't delete your own admin account");
    }
    const count = await prisma.adminUser.count();
    if (count <= 1) {
      throw new ApiError(400, "Can't delete the last admin");
    }
    const target = await prisma.adminUser.findUnique({ where: { id: params.id } });
    if (!target) throw new ApiError(404, "Admin not found");
    await prisma.adminUser.delete({ where: { id: params.id } });
    await audit({
      action: "ADMIN_DELETE",
      adminUserId: me.id,
      detail: { deletedAdminId: target.id, email: target.email }
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
