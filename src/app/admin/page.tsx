import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentAdmin } from "@/lib/session";
import { Card, Button, StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { CreateTournamentForm } from "@/components/create-tournament-form";
import { AdminList } from "@/components/admin-list";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const admin = await currentAdmin();
  if (!admin) return null; // middleware redirects to /admin/login
  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { participants: true, teams: true } } }
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Admin</h1>
        <span className="text-xs text-pitch-700/80">{admin.email}</span>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-white">Create tournament</h2>
        <CreateTournamentForm />
      </Card>

      <AdminList currentAdminId={admin.id} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Tournaments</h2>
        {tournaments.length === 0 ? (
          <Card>
            <p className="text-sm text-pitch-700/80">No tournaments yet.</p>
          </Card>
        ) : (
          tournaments.map((t) => (
            <Card key={t.id} className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">{t.name}</h3>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-xs text-white/55 mt-0.5">
                  {t._count.participants} participants · {t._count.teams} teams · Buy-in{" "}
                  {formatMoney(t.buyInMinor, t.currency)} · Invite{" "}
                  <code className="text-lime-400">{t.inviteCode}</code>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" href={`/t/${t.slug}`}>
                  Public
                </Button>
                <Button href={`/admin/tournaments/${t.id}`}>Manage</Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
