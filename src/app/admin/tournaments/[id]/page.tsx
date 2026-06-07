import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, Button, StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { AdminTournamentControls } from "@/components/admin-tournament-controls";
import { EditTournamentForm } from "@/components/edit-tournament-form";
import { ScoringEditor } from "@/components/scoring-editor";
import { DangerZone } from "@/components/danger-zone";
import { BulkImport } from "@/components/bulk-import";
import { MatchOverride } from "@/components/match-override";
import { DiscordConfig } from "@/components/discord-config";
import { TeamTierEditor } from "@/components/team-tier-editor";
import type { ScoringRules } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function AdminTournamentPage({ params }: { params: { id: string } }) {
  const t = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: {
      teams: { orderBy: [{ tier: "asc" }, { name: "asc" }] },
      participants: { orderBy: { joinedAt: "asc" } },
      draws: {
        where: { isActive: true },
        take: 1,
        select: { id: true, seed: true, verifyHash: true, createdAt: true, mode: true }
      }
    }
  });
  if (!t) notFound();
  const active = t.draws[0];
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-white">{t.name}</h1>
            <StatusBadge status={t.status} />
          </div>
          <p className="text-sm text-pitch-700/80 mt-1">
            Slug: <code>{t.slug}</code> · Buy-in {formatMoney(t.buyInMinor, t.currency)} · Invite{" "}
            <code className="text-accent-electric">{t.inviteCode}</code>
          </p>
        </div>
        <Link href="/admin" className="text-xs text-accent-electric hover:underline">
          ← Admin
        </Link>
      </header>

      <AdminTournamentControls
        tournament={{
          id: t.id,
          slug: t.slug,
          status: t.status,
          drawMode: t.drawMode,
          inviteCode: t.inviteCode,
          competitionCode: t.competitionCode
        }}
        hasActiveDraw={!!active}
      />

      <EditTournamentForm
        tournament={{
          id: t.id,
          name: t.name,
          currency: t.currency,
          buyInMinor: t.buyInMinor,
          competitionCode: t.competitionCode,
          drawMode: t.drawMode,
          registrationDeadline: t.registrationDeadline?.toISOString() ?? null,
          drawAt: t.drawAt?.toISOString() ?? null
        }}
      />

      <BulkImport tournamentId={t.id} />

      <MatchOverride tournamentId={t.id} slug={t.slug} />

      <ScoringEditor
        tournamentId={t.id}
        initialScoring={(t.scoringJson as unknown as ScoringRules | null) ?? null}
        initialPayoutBps={(t.payoutBpsJson as number[] | null) ?? null}
      />

      <DiscordConfig tournamentId={t.id} initialUrl={t.discordWebhookUrl} />

      <DangerZone tournament={{ id: t.id, name: t.name }} />

      <section className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-lg font-semibold text-white">
            Participants ({t.participants.length})
          </h2>
          <ul className="mt-3 divide-y divide-pitch-700/30">
            {t.participants.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-white">{p.name}</div>
                  <div className="text-xs text-pitch-700/70">{p.email ?? "—"}</div>
                </div>
                <TogglePaid tid={t.id} pid={p.id} paid={p.paid} />
              </li>
            ))}
            {t.participants.length === 0 && (
              <li className="py-3 text-sm text-pitch-700/70">No participants yet.</li>
            )}
          </ul>
        </Card>
        {t.teams.length === 0 ? (
          <Card>
            <h2 className="text-lg font-semibold text-white">Teams</h2>
            <p className="text-sm text-white/55 mt-2">
              No teams loaded. Use the controls above to sync from the football provider.
            </p>
          </Card>
        ) : (
          <TeamTierEditor
            tournamentId={t.id}
            teams={t.teams.map((team) => ({
              id: team.id,
              name: team.name,
              code: team.code,
              tier: team.tier,
              rankingPoints: team.rankingPoints
            }))}
          />
        )}
      </section>

      {active && (
        <Card>
          <h2 className="text-lg font-semibold text-white">Active draw</h2>
          <p className="text-sm text-pitch-700/70 mt-2">
            Seed: <code className="text-accent-electric">{active.seed}</code> · {active.mode}
          </p>
          <p className="text-xs text-pitch-700/70 mt-1 break-all">
            Hash: <code>{active.verifyHash}</code>
          </p>
          <div className="mt-3">
            <Button href={`/t/${t.slug}/draw`} variant="ghost">
              Open public draw page
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function TogglePaid({ tid, pid, paid }: { tid: string; pid: string; paid: boolean }) {
  // Server-action-style form would be nicer, but a client toggle keeps this file simple.
  return (
    <form
      action={async () => {
        "use server";
        const { prisma } = await import("@/lib/db");
        await prisma.participant.update({ where: { id: pid }, data: { paid: !paid } });
        const { revalidatePath } = await import("next/cache");
        revalidatePath(`/admin/tournaments/${tid}`);
      }}
    >
      <button
        type="submit"
        className={
          "text-xs uppercase tracking-wider px-2 py-1 rounded ring-1 " +
          (paid
            ? "bg-accent-electric/20 text-accent-electric ring-accent-electric/30"
            : "bg-red-500/10 text-red-300 ring-red-400/30")
        }
      >
        {paid ? "Paid" : "Unpaid"}
      </button>
    </form>
  );
}
