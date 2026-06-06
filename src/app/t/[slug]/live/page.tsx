import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, SectionHeader } from "@/components/ui";
import { LiveMatches } from "@/components/live-matches";

export const dynamic = "force-dynamic";

export default async function LivePage({ params }: { params: { slug: string } }) {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true }
  });
  if (!t) notFound();
  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-live-400 flex items-center gap-2">
          <span className="live-dot" /> Match centre
        </p>
        <h1 className="display text-4xl text-white mt-1">{t.name}</h1>
      </header>

      <section>
        <SectionHeader eyebrow="In play now" title="Live matches" />
        <LiveMatches slug={params.slug} scope="live" size="lg" emptyLabel="No matches in play right now." />
      </section>

      <section>
        <SectionHeader eyebrow="Coming up" title="Upcoming fixtures" />
        <LiveMatches slug={params.slug} scope="upcoming" emptyLabel="No upcoming fixtures." />
      </section>

      <section>
        <SectionHeader eyebrow="Just finished" title="Recent results" />
        <LiveMatches slug={params.slug} scope="recent" emptyLabel="No completed matches yet." />
      </section>
    </div>
  );
}
