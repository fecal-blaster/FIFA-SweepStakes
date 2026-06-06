import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { DrawReplay } from "@/components/draw-replay";

export const dynamic = "force-dynamic";

export default async function DrawPage({ params }: { params: { slug: string } }) {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    include: {
      draws: {
        orderBy: { createdAt: "desc" },
        include: {
          allocations: {
            include: {
              participant: { select: { id: true, name: true } },
              team: { select: { id: true, name: true, code: true, flagUrl: true, tier: true } }
            }
          }
        }
      }
    }
  });
  if (!t) notFound();
  const active = t.draws.find((d) => d.isActive);
  const past = t.draws.filter((d) => !d.isActive);
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t.name} — Draw</h1>
          <p className="text-sm text-pitch-700/70">
            Verifiable. Reproducible. Permanent record.
          </p>
        </div>
        <Link
          href={`/t/${t.slug}`}
          className="text-xs text-accent-electric hover:underline"
        >
          ← Back to tournament
        </Link>
      </header>

      {!active ? (
        <Card>
          <p className="text-pitch-700/80">No draw has been run yet.</p>
        </Card>
      ) : (
        <DrawReplay
          slug={t.slug}
          draw={{
            id: active.id,
            seed: active.seed,
            verifyHash: active.verifyHash,
            inputDigest: active.inputDigest,
            mode: active.mode,
            createdAt: active.createdAt.toISOString()
          }}
          allocations={active.allocations.map((a) => ({
            participant: a.participant,
            team: a.team
          }))}
        />
      )}

      {past.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-white">Past draws</h2>
          <ul className="mt-3 divide-y divide-pitch-700/30">
            {past.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-white tabular">{d.seed}</div>
                  <div className="text-xs text-pitch-700/70">
                    {d.mode} · superseded {d.supersededAt?.toLocaleString()} ·{" "}
                    {d.redrawReason ?? "no reason recorded"}
                  </div>
                </div>
                <code className="text-[11px] text-pitch-700/80 truncate max-w-[40%]">
                  {d.verifyHash.slice(0, 16)}…
                </code>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
