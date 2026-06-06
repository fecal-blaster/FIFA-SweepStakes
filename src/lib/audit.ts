import { prisma } from "@/lib/db";

export async function audit(opts: {
  action: string;
  tournamentId?: string;
  adminUserId?: string;
  detail?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      action: opts.action,
      tournamentId: opts.tournamentId,
      adminUserId: opts.adminUserId,
      detailJson: opts.detail ? (opts.detail as object) : undefined
    }
  });
}
