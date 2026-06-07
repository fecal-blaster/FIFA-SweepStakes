import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Flag, SectionHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

type Standing = {
  teamId: string;
  name: string;
  code: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

function gd(s: Standing): number {
  return s.goalsFor - s.goalsAgainst;
}

export default async function GroupsPage({ params }: { params: { slug: string } }) {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    include: {
      matches: {
        where: { stage: "GROUP" },
        include: {
          homeTeam: { select: { id: true, name: true, code: true } },
          awayTeam: { select: { id: true, name: true, code: true } }
        }
      }
    }
  });
  if (!t) notFound();

  // Group key → standings map.
  const groups = new Map<string, Map<string, Standing>>();

  function ensure(group: string, team: { id: string; name: string; code: string | null }): Standing {
    let g = groups.get(group);
    if (!g) {
      g = new Map();
      groups.set(group, g);
    }
    let s = g.get(team.id);
    if (!s) {
      s = {
        teamId: team.id,
        name: team.name,
        code: team.code,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0
      };
      g.set(team.id, s);
    }
    return s;
  }

  for (const m of t.matches) {
    if (!m.groupName || !m.homeTeam || !m.awayTeam) continue;
    // Pre-create rows even before kickoff so the group table shows the line-up.
    const h = ensure(m.groupName, m.homeTeam);
    const a = ensure(m.groupName, m.awayTeam);
    if (m.status !== "FINISHED" || m.homeScore == null || m.awayScore == null) continue;
    h.played++;
    a.played++;
    h.goalsFor += m.homeScore;
    h.goalsAgainst += m.awayScore;
    a.goalsFor += m.awayScore;
    a.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      h.wins++;
      h.points += 3;
      a.losses++;
    } else if (m.homeScore < m.awayScore) {
      a.wins++;
      a.points += 3;
      h.losses++;
    } else {
      h.draws++;
      a.draws++;
      h.points += 1;
      a.points += 1;
    }
  }

  const groupNames = [...groups.keys()].sort();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-lime-400">Group stage</p>
          <h1 className="display text-4xl text-white">{t.name} — Standings</h1>
        </div>
        <Link href={`/t/${t.slug}`} className="text-xs text-lime-400 hover:underline">
          ← Tournament home
        </Link>
      </header>

      {groupNames.length === 0 ? (
        <Card>
          <p className="text-sm text-white/55">
            No group matches yet — once the fixtures are loaded the standings will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {groupNames.map((group) => {
            const rows = [...groups.get(group)!.values()].sort(
              (a, b) =>
                b.points - a.points ||
                gd(b) - gd(a) ||
                b.goalsFor - a.goalsFor ||
                a.name.localeCompare(b.name)
            );
            return (
              <Card key={group}>
                <SectionHeader eyebrow="Group" title={group} />
                <table className="w-full text-sm tabular">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      <th className="text-left pl-1 py-1.5">Team</th>
                      <th className="py-1.5 px-1 text-right" title="Played">P</th>
                      <th className="py-1.5 px-1 text-right" title="Wins">W</th>
                      <th className="py-1.5 px-1 text-right" title="Draws">D</th>
                      <th className="py-1.5 px-1 text-right" title="Losses">L</th>
                      <th className="py-1.5 px-1 text-right" title="Goal difference">GD</th>
                      <th className="py-1.5 px-1 text-right text-lime-400" title="Points">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((r, idx) => (
                      <tr key={r.teamId}>
                        <td className="py-1.5 pl-1">
                          <span className="flex items-center gap-2">
                            <span className="w-4 text-white/40 text-xs">{idx + 1}</span>
                            <Flag code={r.code} size="sm" />
                            <span className="text-white truncate">{r.name}</span>
                          </span>
                        </td>
                        <td className="py-1.5 px-1 text-right text-white/65">{r.played}</td>
                        <td className="py-1.5 px-1 text-right text-white/65">{r.wins}</td>
                        <td className="py-1.5 px-1 text-right text-white/65">{r.draws}</td>
                        <td className="py-1.5 px-1 text-right text-white/65">{r.losses}</td>
                        <td className="py-1.5 px-1 text-right text-white/65">{gd(r) >= 0 ? `+${gd(r)}` : gd(r)}</td>
                        <td className="py-1.5 px-1 text-right scoreboard-num text-lime-400">{r.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
