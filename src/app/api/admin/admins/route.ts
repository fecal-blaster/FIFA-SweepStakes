import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  email: z.string().email().max(120),
  name: z.string().min(1).max(60).optional(),
  password: z.string().min(8).max(200)
});

export async function GET() {
  try {
    await requireAdmin();
    const admins = await prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: "asc" }
    });
    return ok({ admins });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireAdmin();
    const input = await parseJson(req, CreateSchema);
    const email = input.email.toLowerCase().trim();
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return ok({ error: "An admin with that email already exists" }, 409);
    }
    const created = await prisma.adminUser.create({
      data: {
        email,
        name: input.name ?? null,
        passwordHash: await hashPassword(input.password)
      },
      select: { id: true, email: true, name: true, createdAt: true }
    });
    await audit({
      action: "ADMIN_CREATE",
      adminUserId: me.id,
      detail: { newAdminId: created.id, email: created.email }
    });
    return ok({ admin: created }, 201);
  } catch (e) {
    return handleError(e);
  }
}
